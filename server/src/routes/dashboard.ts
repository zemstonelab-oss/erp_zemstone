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

// Round-level progress (1차~4차별 진행률)
dashboardRouter.get('/round-progress', authenticate, async (req: Request, res: Response) => {
  try {
    const productId = req.query.productId ? Number(req.query.productId) : undefined;

    const rounds = await prisma.orderRound.findMany({
      orderBy: { roundNo: 'asc' },
      include: {
        items: {
          where: productId ? { productId } : undefined,
          include: { product: true },
        },
      },
    });

    // For each round, get total ordered qty from items
    // And get total shipped qty from shipments created after this round's order date
    // Actually, shipments aren't tied to rounds directly. We need a different approach:
    // Total ordered per round = sum of round items
    // Total shipped overall = from inventory. But we want per-round shipped...
    // Since shipments aren't linked to rounds, we'll show: round ordered vs cumulative shipped ratio

    // Simpler approach: each round's total ordered, and we calculate how much has been shipped overall
    // relative to total ordered up to that round

    const inventory = await prisma.inventory.findMany({
      where: productId ? { productId } : undefined,
    });

    const totalShippedOverall = inventory.reduce((sum, inv) => sum + inv.totalShipped, 0);

    let cumulativeOrdered = 0;
    const result = rounds.map(round => {
      const roundOrdered = round.items.reduce((sum, item) => sum + item.quantity, 0);
      cumulativeOrdered += roundOrdered;
      const shippedForRound = Math.min(totalShippedOverall, cumulativeOrdered);
      const previousCumulative = cumulativeOrdered - roundOrdered;
      const roundShipped = Math.max(0, Math.min(roundOrdered, totalShippedOverall - previousCumulative));
      const rate = roundOrdered > 0 ? Math.round((roundShipped / roundOrdered) * 100) : 0;

      return {
        roundId: round.id,
        roundNo: round.roundNo,
        orderDate: round.orderDate,
        ordered: roundOrdered,
        shipped: roundShipped,
        rate,
      };
    });

    res.json(result);
  } catch { res.status(500).json({ error: '서버 오류' }); }
});

// Round progress by product
dashboardRouter.get('/round-progress-by-product', authenticate, async (_req: Request, res: Response) => {
  try {
    const rounds = await prisma.orderRound.findMany({
      orderBy: { roundNo: 'asc' },
      include: { items: { include: { product: true } } },
    });

    const inventory = await prisma.inventory.findMany();

    // Group by product
    const productMap: Record<number, { name: string; rounds: { roundNo: number; ordered: number; shipped: number; rate: number }[] }> = {};

    const products = await prisma.product.findMany({ where: { isActive: true } });
    products.forEach(p => {
      productMap[p.id] = { name: p.name, rounds: [] };
      const productInv = inventory.filter(inv => inv.productId === p.id);
      const totalShipped = productInv.reduce((sum, inv) => sum + inv.totalShipped, 0);

      let cumOrdered = 0;
      rounds.forEach(round => {
        const roundOrdered = round.items.filter(i => i.productId === p.id).reduce((sum, i) => sum + i.quantity, 0);
        cumOrdered += roundOrdered;
        const prevCum = cumOrdered - roundOrdered;
        const roundShipped = Math.max(0, Math.min(roundOrdered, totalShipped - prevCum));
        const rate = roundOrdered > 0 ? Math.round((roundShipped / roundOrdered) * 100) : 0;

        if (roundOrdered > 0) {
          productMap[p.id].rounds.push({ roundNo: round.roundNo, ordered: roundOrdered, shipped: roundShipped, rate });
        }
      });
    });

    // Filter out products with no orders
    const result = Object.entries(productMap)
      .filter(([, v]) => v.rounds.length > 0)
      .map(([id, v]) => ({ productId: Number(id), ...v }));

    res.json(result);
  } catch { res.status(500).json({ error: '서버 오류' }); }
});

// Branch shipment stats (monthly/quarterly)
dashboardRouter.get('/branch-shipment-stats', authenticate, async (req: Request, res: Response) => {
  try {
    const period = (req.query.period as string) || 'monthly'; // monthly or quarterly
    const year = Number(req.query.year) || new Date().getFullYear();

    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year + 1, 0, 1);

    const shipments = await prisma.shipment.findMany({
      where: { createdAt: { gte: startDate, lt: endDate } },
      include: { branch: true, items: true },
    });

    const branches = await prisma.branch.findMany({ where: { isActive: true }, orderBy: { id: 'asc' } });

    if (period === 'quarterly') {
      const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
      const result = quarters.map((q, qi) => {
        const entry: Record<string, any> = { period: q };
        branches.forEach(b => {
          const qty = shipments
            .filter(s => s.branchId === b.id && Math.floor(s.createdAt.getMonth() / 3) === qi)
            .reduce((sum, s) => sum + s.items.reduce((is, i) => is + i.quantity, 0), 0);
          entry[b.name] = qty;
        });
        return entry;
      });
      res.json({ data: result, branches: branches.map(b => b.name) });
    } else {
      const months = Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`);
      const result = months.map((m, mi) => {
        const entry: Record<string, any> = { period: m };
        branches.forEach(b => {
          const qty = shipments
            .filter(s => s.branchId === b.id && s.createdAt.getMonth() === mi)
            .reduce((sum, s) => sum + s.items.reduce((is, i) => is + i.quantity, 0), 0);
          entry[b.name] = qty;
        });
        return entry;
      });
      res.json({ data: result, branches: branches.map(b => b.name) });
    }
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
