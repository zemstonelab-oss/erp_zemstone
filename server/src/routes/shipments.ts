import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/role';
import { validate } from '../middleware/validate';
import { recalculateInventory } from '../services/inventory';

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

    const shipments = await prisma.shipment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        branch: true,
        items: { include: { product: true } },
        creator: { select: { name: true } },
      },
    });
    res.json(shipments);
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

    // Update inventory for each item
    for (const item of items) {
      await recalculateInventory(branchId, item.productId);
    }

    res.status(201).json(shipment);
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

    res.json({ success: true });
  } catch { res.status(500).json({ error: '서버 오류' }); }
});
