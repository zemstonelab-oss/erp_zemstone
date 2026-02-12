import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/role';
import { validate } from '../middleware/validate';
import { notifyAdminsAndHQ, notifyBranchUsers } from '../services/notification';

const prisma = new PrismaClient();
export const extraOrdersRouter = Router();

const createSchema = z.object({
  productId: z.number().int(),
  quantity: z.number().int().positive(),
  reason: z.string().optional(),
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
    const { productId, quantity, reason } = req.body;
    const branchId = req.user!.branchId;
    if (!branchId) { res.status(400).json({ error: '사업소 정보가 없습니다.' }); return; }

    const request = await prisma.extraOrderRequest.create({
      data: { branchId, productId, quantity, reason, requestedBy: req.user!.userId },
      include: { branch: true, product: true },
    });

    await notifyAdminsAndHQ('EXTRA_ORDER', '추가 발주 요청',
      `${request.branch.name} - ${request.product.name} ${quantity}개 추가 발주 요청`);

    res.status(201).json(request);
  } catch { res.status(500).json({ error: '서버 오류' }); }
});

// Approve
extraOrdersRouter.put('/:id/approve', authenticate, requireRole('ADMIN', 'HQ'), async (req: Request, res: Response) => {
  try {
    const request = await prisma.extraOrderRequest.update({
      where: { id: Number(req.params.id) },
      data: { status: 'APPROVED', reviewedBy: req.user!.userId, reviewedAt: new Date() },
      include: { branch: true, product: true },
    });

    await notifyBranchUsers(request.branchId, 'EXTRA_ORDER',
      '추가 발주 승인', `${request.product.name} ${request.quantity}개 추가 발주가 승인되었습니다.`);

    res.json(request);
  } catch { res.status(500).json({ error: '서버 오류' }); }
});

// Reject
extraOrdersRouter.put('/:id/reject', authenticate, requireRole('ADMIN', 'HQ'), async (req: Request, res: Response) => {
  try {
    const request = await prisma.extraOrderRequest.update({
      where: { id: Number(req.params.id) },
      data: { status: 'REJECTED', reviewedBy: req.user!.userId, reviewedAt: new Date() },
      include: { branch: true, product: true },
    });

    await notifyBranchUsers(request.branchId, 'EXTRA_ORDER',
      '추가 발주 거절', `${request.product.name} ${request.quantity}개 추가 발주가 거절되었습니다.`);

    res.json(request);
  } catch { res.status(500).json({ error: '서버 오류' }); }
});
