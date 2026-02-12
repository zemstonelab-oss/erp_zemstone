import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/role';
import { validate } from '../middleware/validate';
import { notifyAdminsAndHQ, notifyBranchUsers } from '../services/notification';
import { recalculateInventory } from '../services/inventory';
import { logAction } from '../services/audit';

const prisma = new PrismaClient();
export const extraOrdersRouter = Router();

const createSchema = z.object({
  productId: z.number().int(),
  quantity: z.number().int().positive(),
  reason: z.string().optional(),
  memo: z.string().optional(),
  desiredDate: z.string().optional(),
  desiredTime: z.string().optional(),
});

// List
extraOrdersRouter.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const where: any = {};
    if (req.user!.role === 'BRANCH' && req.user!.branchId) {
      where.branchId = req.user!.branchId;
    }
    if (req.query.status) where.status = req.query.status;

    const requests = await prisma.extraOrderRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        branch: true,
        product: true,
        requester: { select: { name: true } },
        reviewer: { select: { name: true } },
      },
    });
    res.json(requests);
  } catch { res.status(500).json({ error: '서버 오류' }); }
});

// Create (BRANCH only)
extraOrdersRouter.post('/', authenticate, requireRole('BRANCH'), validate(createSchema), async (req: Request, res: Response) => {
  try {
    const { productId, quantity, reason, memo, desiredDate, desiredTime } = req.body;
    const branchId = req.user!.branchId;
    if (!branchId) { res.status(400).json({ error: '사업소 정보가 없습니다.' }); return; }

    const request = await prisma.extraOrderRequest.create({
      data: {
        branchId, productId, quantity, reason, memo,
        desiredDate: desiredDate ? new Date(desiredDate) : null,
        desiredTime: desiredTime || null,
        requestedBy: req.user!.userId,
      },
      include: { branch: true, product: true },
    });

    await logAction(req.user!.userId, 'CREATE', 'extra_order', request.id,
      `${request.branch.name} ${request.product.name} ${quantity}개 출고 요청`);

    await notifyAdminsAndHQ('EXTRA_ORDER', '출고 요청',
      `${request.branch.name} - ${request.product.name} ${quantity}개 출고 요청`);

    res.status(201).json(request);
  } catch { res.status(500).json({ error: '서버 오류' }); }
});

// Approve (ADMIN only) — auto-create shipment
extraOrdersRouter.put('/:id/approve', authenticate, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const extraOrder = await prisma.extraOrderRequest.findUnique({
      where: { id: Number(req.params.id) },
      include: { branch: true, product: true },
    });
    if (!extraOrder || extraOrder.status !== 'PENDING') {
      res.status(400).json({ error: '처리할 수 없는 요청입니다.' }); return;
    }

    // Check remaining stock (totalOrdered - totalShipped = remaining at Zemstone level)
    const inventory = await prisma.inventory.findUnique({
      where: { branchId_productId: { branchId: extraOrder.branchId, productId: extraOrder.productId } },
    });
    const totalOrdered = inventory?.totalOrdered || 0;
    const totalShipped = inventory?.totalShipped || 0;
    const remaining = totalOrdered - totalShipped;
    if (remaining < extraOrder.quantity) {
      res.status(400).json({ error: `잔량 부족: 출고 가능 수량 ${remaining}개, 요청 수량 ${extraOrder.quantity}개` }); return;
    }

    // Approve + create shipment in transaction
    const [request, shipment] = await prisma.$transaction(async (tx) => {
      const req_ = await tx.extraOrderRequest.update({
        where: { id: extraOrder.id },
        data: { status: 'APPROVED', reviewedBy: req.user!.userId, reviewedAt: new Date() },
        include: { branch: true, product: true },
      });

      const ship = await tx.shipment.create({
        data: {
          branchId: extraOrder.branchId,
          notes: `출고 요청 #${extraOrder.id} 자동 출고`,
          createdBy: req.user!.userId,
          deliveryStatus: 'PENDING',
          items: {
            create: [{ productId: extraOrder.productId, quantity: extraOrder.quantity }],
          },
        },
        include: { items: true },
      });

      return [req_, ship];
    });

    await recalculateInventory(extraOrder.branchId, extraOrder.productId);

    await notifyBranchUsers(request.branchId, 'EXTRA_ORDER',
      '출고 요청 승인', `${request.product.name} ${request.quantity}개 출고가 승인되어 자동 출고 처리되었습니다.`);

    await logAction(req.user!.userId, 'UPDATE', 'extra_order', extraOrder.id,
      `${extraOrder.branch.name} ${extraOrder.product.name} ${extraOrder.quantity}개 출고 요청 승인`);

    res.json(request);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '서버 오류' });
  }
});

// Reject
extraOrdersRouter.put('/:id/reject', authenticate, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const request = await prisma.extraOrderRequest.update({
      where: { id: Number(req.params.id) },
      data: { status: 'REJECTED', reviewedBy: req.user!.userId, reviewedAt: new Date() },
      include: { branch: true, product: true },
    });

    await notifyBranchUsers(request.branchId, 'EXTRA_ORDER',
      '출고 요청 거절', `${request.product.name} ${request.quantity}개 출고 요청이 거절되었습니다.`);

    await logAction(req.user!.userId, 'UPDATE', 'extra_order', request.id,
      `${request.branch.name} ${request.product.name} ${request.quantity}개 출고 요청 거절`);

    res.json(request);
  } catch { res.status(500).json({ error: '서버 오류' }); }
});
