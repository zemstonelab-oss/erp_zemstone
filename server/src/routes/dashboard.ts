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

dashboardRouter.get('/monthly-trend', authenticate, async (_req: Request, res: Response) => {
  try {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const shipments = await prisma.shipment.findMany({
      where: { createdAt: { gte: sixMonthsAgo } },
      include: { items: true },
    });

    const monthMap: Record<string, number> = {};
    for (let i = 0; i < 6; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i));
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthMap[key] = 0;
    }

    shipments.forEach(s => {
      const key = `${s.createdAt.getFullYear()}-${String(s.createdAt.getMonth() + 1).padStart(2, '0')}`;
      if (key in monthMap) {
        s.items.forEach(item => { monthMap[key] += item.quantity; });
      }
    });

    const result = Object.entries(monthMap).map(([month, quantity]) => ({ month, quantity }));
    res.json(result);
  } catch { res.status(500).json({ error: '서버 오류' }); }
});

dashboardRouter.get('/branch-comparison', authenticate, async (_req: Request, res: Response) => {
  try {
    const branches = await prisma.branch.findMany({ where: { isActive: true } });
    const inventory = await prisma.inventory.findMany();

    const result = branches.map(b => {
      const shipped = inventory.filter(i => i.branchId === b.id).reduce((sum, i) => sum + i.totalShipped, 0);
      return { branchName: b.name, shipped };
    }).filter(r => r.shipped > 0);

    res.json(result);
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
