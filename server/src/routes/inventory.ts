import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';

const prisma = new PrismaClient();
export const inventoryRouter = Router();

inventoryRouter.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const where: any = {};
    if (req.user!.role === 'BRANCH' && req.user!.branchId) {
      where.branchId = req.user!.branchId;
    }
    if (req.query.branchId) {
      where.branchId = Number(req.query.branchId);
    }

    const inventory = await prisma.inventory.findMany({
      where,
      include: { branch: true, product: true },
      orderBy: [{ branchId: 'asc' }, { productId: 'asc' }],
    });

    const result = inventory.map(inv => ({
      ...inv,
      remaining: inv.totalOrdered - inv.totalShipped,
    }));

    res.json(result);
  } catch { res.status(500).json({ error: '서버 오류' }); }
});
