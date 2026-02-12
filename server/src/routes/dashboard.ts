import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';

const prisma = new PrismaClient();
export const dashboardRouter = Router();

dashboardRouter.get('/summary', authenticate, async (_req: Request, res: Response) => {
  try {
    const inventory = await prisma.inventory.findMany();

    let totalOrdered = 0;
    let totalShipped = 0;

    inventory.forEach(inv => {
      totalOrdered += inv.totalOrdered;
      totalShipped += inv.totalShipped;
    });

    const remaining = totalOrdered - totalShipped;
    const shipmentRate = totalOrdered > 0 ? ((totalShipped / totalOrdered) * 100).toFixed(1) : '0';

    res.json({ totalOrdered, totalShipped, remaining, shipmentRate });
  } catch { res.status(500).json({ error: '서버 오류' }); }
});

dashboardRouter.get('/progress', authenticate, async (_req: Request, res: Response) => {
  try {
    const branches = await prisma.branch.findMany({ where: { isActive: true }, orderBy: { id: 'asc' } });
    const inventory = await prisma.inventory.findMany();

    const progress = branches.map(branch => {
      const branchInv = inventory.filter(inv => inv.branchId === branch.id);
      const ordered = branchInv.reduce((sum, inv) => sum + inv.totalOrdered, 0);
      const shipped = branchInv.reduce((sum, inv) => sum + inv.totalShipped, 0);
      const rate = ordered > 0 ? Math.round((shipped / ordered) * 100) : 0;
      return { branchId: branch.id, branchName: branch.name, branchCode: branch.code, ordered, shipped, rate };
    });

    res.json(progress);
  } catch { res.status(500).json({ error: '서버 오류' }); }
});
