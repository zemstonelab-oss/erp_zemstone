import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/role';
import { validate } from '../middleware/validate';

const prisma = new PrismaClient();
export const alertThresholdsRouter = Router();

// Get all thresholds
alertThresholdsRouter.get('/', authenticate, requireRole('ADMIN'), async (_req: Request, res: Response) => {
  try {
    const thresholds = await prisma.alertThreshold.findMany({
      include: { branch: true, product: true },
      orderBy: [{ branchId: 'asc' }, { productId: 'asc' }],
    });
    res.json(thresholds);
  } catch { res.status(500).json({ error: '서버 오류' }); }
});

const upsertSchema = z.object({
  items: z.array(z.object({
    branchId: z.number().int(),
    productId: z.number().int(),
    threshold: z.number().int().min(0),
  })),
});

// Bulk upsert thresholds
alertThresholdsRouter.put('/', authenticate, requireRole('ADMIN'), validate(upsertSchema), async (req: Request, res: Response) => {
  try {
    const { items } = req.body;
    for (const item of items) {
      if (item.threshold === 0) {
        await prisma.alertThreshold.deleteMany({
          where: { branchId: item.branchId, productId: item.productId },
        });
      } else {
        await prisma.alertThreshold.upsert({
          where: { branchId_productId: { branchId: item.branchId, productId: item.productId } },
          update: { threshold: item.threshold },
          create: { branchId: item.branchId, productId: item.productId, threshold: item.threshold },
        });
      }
    }
    res.json({ success: true });
  } catch { res.status(500).json({ error: '서버 오류' }); }
});
