import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/role';
import { validate } from '../middleware/validate';
import { recalculateAllInventory } from '../services/inventory';

const prisma = new PrismaClient();
export const roundsRouter = Router();

const roundSchema = z.object({
  roundNo: z.number().int().positive(),
  orderDate: z.string(),
  memo: z.string().optional(),
  items: z.array(z.object({
    branchId: z.number().int(),
    productId: z.number().int(),
    quantity: z.number().int().min(0),
  })),
});

roundsRouter.get('/', authenticate, async (_req: Request, res: Response) => {
  try {
    const rounds = await prisma.orderRound.findMany({
      orderBy: { roundNo: 'desc' },
      include: { items: { include: { branch: true, product: true } } },
    });
    res.json(rounds);
  } catch { res.status(500).json({ error: '서버 오류' }); }
});

roundsRouter.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const round = await prisma.orderRound.findUnique({
      where: { id: Number(req.params.id) },
      include: { items: { include: { branch: true, product: true } } },
    });
    if (!round) { res.status(404).json({ error: '차수를 찾을 수 없습니다.' }); return; }
    res.json(round);
  } catch { res.status(500).json({ error: '서버 오류' }); }
});

roundsRouter.post('/', authenticate, requireRole('ADMIN'), validate(roundSchema), async (req: Request, res: Response) => {
  try {
    const { roundNo, orderDate, memo, items } = req.body;
    const round = await prisma.orderRound.create({
      data: {
        roundNo,
        orderDate: new Date(orderDate),
        memo,
        createdBy: req.user!.userId,
        items: {
          create: items.filter((i: any) => i.quantity > 0).map((i: any) => ({
            branchId: i.branchId,
            productId: i.productId,
            quantity: i.quantity,
          })),
        },
      },
      include: { items: { include: { branch: true, product: true } } },
    });

    await recalculateAllInventory();
    res.status(201).json(round);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '서버 오류' });
  }
});

roundsRouter.put('/:id', authenticate, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const { roundNo, orderDate, memo, items } = req.body;

    // Delete old items and recreate
    await prisma.orderRoundItem.deleteMany({ where: { roundId: Number(req.params.id) } });

    const round = await prisma.orderRound.update({
      where: { id: Number(req.params.id) },
      data: {
        roundNo,
        orderDate: orderDate ? new Date(orderDate) : undefined,
        memo,
        items: items ? {
          create: items.filter((i: any) => i.quantity > 0).map((i: any) => ({
            branchId: i.branchId,
            productId: i.productId,
            quantity: i.quantity,
          })),
        } : undefined,
      },
      include: { items: { include: { branch: true, product: true } } },
    });

    await recalculateAllInventory();
    res.json(round);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '서버 오류' });
  }
});

roundsRouter.delete('/:id', authenticate, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    await prisma.orderRound.delete({ where: { id: Number(req.params.id) } });
    await recalculateAllInventory();
    res.json({ success: true });
  } catch { res.status(500).json({ error: '서버 오류' }); }
});
