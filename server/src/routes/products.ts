import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/role';
import { validate } from '../middleware/validate';
import { logAction } from '../services/audit';

const prisma = new PrismaClient();
export const productsRouter = Router();

const productSchema = z.object({
  code: z.string().min(1).max(10),
  name: z.string().min(1).max(100),
  category: z.string().max(50).optional(),
  unit: z.string().max(10).optional(),
  price: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

productsRouter.get('/', authenticate, async (_req: Request, res: Response) => {
  try {
    const products = await prisma.product.findMany({ orderBy: { id: 'asc' } });
    res.json(products);
  } catch { res.status(500).json({ error: '서버 오류' }); }
});

productsRouter.post('/', authenticate, requireRole('ADMIN'), validate(productSchema), async (req: Request, res: Response) => {
  try {
    const product = await prisma.product.create({ data: req.body });
    await logAction(req.user!.userId, 'CREATE', 'product', product.id, `품목 추가: ${product.name}`);
    res.status(201).json(product);
  } catch (e: any) {
    if (e.code === 'P2002') { res.status(409).json({ error: '이미 존재하는 품목 코드입니다.' }); return; }
    res.status(500).json({ error: '서버 오류' });
  }
});

productsRouter.put('/:id', authenticate, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const product = await prisma.product.update({
      where: { id: Number(req.params.id) },
      data: req.body,
    });
    await logAction(req.user!.userId, 'UPDATE', 'product', product.id, `품목 수정: ${product.name}`);
    res.json(product);
  } catch { res.status(500).json({ error: '서버 오류' }); }
});

productsRouter.delete('/:id', authenticate, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    await prisma.product.update({ where: { id }, data: { isActive: false } });
    await logAction(req.user!.userId, 'DELETE', 'product', id, `품목 비활성화`);
    res.json({ success: true });
  } catch { res.status(500).json({ error: '서버 오류' }); }
});
