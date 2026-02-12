import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/role';
import { validate } from '../middleware/validate';
import { recalculateInventory } from '../services/inventory';
import { checkLowStockAndNotify, notifyBranchUsers } from '../services/notification';
import { logAction } from '../services/audit';

const prisma = new PrismaClient();
export const shipmentsRouter = Router();

const shipmentSchema = z.object({
  branchId: z.number().int(),
  deliveryDate: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(z.object({
    productId: z.number().int(),
    quantity: z.number().int().positive(),
  })),
});

shipmentsRouter.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const where: any = {};
    if (req.query.branchId) where.branchId = Number(req.query.branchId);
    if (req.user!.role === 'BRANCH' && req.user!.branchId) {
      where.branchId = req.user!.branchId;
    }
    if (req.query.from || req.query.to) {
      where.createdAt = {};
      if (req.query.from) where.createdAt.gte = new Date(req.query.from as string);
      if (req.query.to) where.createdAt.lte = new Date(req.query.to as string + 'T23:59:59');
    }

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    const [shipments, total] = await Promise.all([
      prisma.shipment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
        include: {
          branch: true,
          items: { include: { product: true } },
          creator: { select: { name: true } },
        },
      }),
      prisma.shipment.count({ where }),
    ]);
    res.json({ data: shipments, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch { res.status(500).json({ error: '서버 오류' }); }
});

shipmentsRouter.post('/', authenticate, requireRole('ADMIN'), validate(shipmentSchema), async (req: Request, res: Response) => {
  try {
    const { branchId, deliveryDate, notes, items } = req.body;

    const shipment = await prisma.shipment.create({
      data: {
        branchId,
        deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
        notes,
        createdBy: req.user!.userId,
        items: {
          create: items.map((i: any) => ({
            productId: i.productId,
            quantity: i.quantity,
          })),
        },
      },
      include: {
        branch: true,
        items: { include: { product: true } },
      },
    });

    // Update inventory and check low stock
    for (const item of items) {
      await recalculateInventory(branchId, item.productId);
      await checkLowStockAndNotify(branchId, item.productId);
    }

    const itemSummary = shipment.items.map(i => `${i.product.name} ${i.quantity}개`).join(', ');
    await logAction(req.user!.userId, 'CREATE', 'shipment', shipment.id,
      `${shipment.branch.name} 출고: ${itemSummary}`);

    res.status(201).json(shipment);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '서버 오류' });
  }
});

// Update delivery status
const statusUpdateSchema = z.object({
  deliveryStatus: z.enum(['PENDING', 'PREPARING', 'IN_TRANSIT', 'DELIVERED']).optional(),
  scheduledDate: z.string().optional().nullable(),
  scheduledTime: z.string().optional().nullable(),
  driverName: z.string().optional().nullable(),
  driverPhone: z.string().optional().nullable(),
  deliveredAt: z.string().optional().nullable(),
});

shipmentsRouter.put('/:id/status', authenticate, requireRole('ADMIN'), validate(statusUpdateSchema), async (req: Request, res: Response) => {
  try {
    const { deliveryStatus, scheduledDate, scheduledTime, driverName, driverPhone, deliveredAt } = req.body;

    const existing = await prisma.shipment.findUnique({ where: { id: Number(req.params.id) } });
    if (!existing) { res.status(404).json({ error: '출고를 찾을 수 없습니다.' }); return; }

    const data: any = {};
    if (deliveryStatus !== undefined) data.deliveryStatus = deliveryStatus;
    if (scheduledDate !== undefined) data.scheduledDate = scheduledDate ? new Date(scheduledDate) : null;
    if (scheduledTime !== undefined) data.scheduledTime = scheduledTime;
    if (driverName !== undefined) data.driverName = driverName;
    if (driverPhone !== undefined) data.driverPhone = driverPhone;
    if (deliveredAt !== undefined) data.deliveredAt = deliveredAt ? new Date(deliveredAt) : null;

    const shipment = await prisma.shipment.update({
      where: { id: Number(req.params.id) },
      data,
      include: { branch: true, items: { include: { product: true } } },
    });

    // Send notification on status change
    if (deliveryStatus) {
      const messages: Record<string, string> = {
        PREPARING: '출고 준비 중입니다',
        IN_TRANSIT: `배송이 시작되었습니다. 예정시간: ${scheduledTime || shipment.scheduledTime || '미정'}`,
        DELIVERED: '배송이 완료되었습니다',
      };
      if (messages[deliveryStatus]) {
        await notifyBranchUsers(shipment.branchId, 'DELIVERY', '배송 상태 변경', messages[deliveryStatus]);
      }
    }

    res.json(shipment);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '서버 오류' });
  }
});

shipmentsRouter.delete('/:id', authenticate, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const shipment = await prisma.shipment.findUnique({
      where: { id: Number(req.params.id) },
      include: { items: true },
    });

    if (!shipment) { res.status(404).json({ error: '출고를 찾을 수 없습니다.' }); return; }

    await prisma.shipment.delete({ where: { id: Number(req.params.id) } });

    for (const item of shipment.items) {
      await recalculateInventory(shipment.branchId, item.productId);
    }

    await logAction(req.user!.userId, 'DELETE', 'shipment', shipment.id, `출고 #${shipment.id} 삭제`);

    res.json({ success: true });
  } catch { res.status(500).json({ error: '서버 오류' }); }
});
