import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/role';
import { validate } from '../middleware/validate';
import { logAction } from '../services/audit';

const prisma = new PrismaClient();
export const branchesRouter = Router();

const branchSchema = z.object({
  code: z.string().min(1).max(10),
  name: z.string().min(1).max(100),
  address: z.string().max(255).optional(),
  manager: z.string().max(50).optional(),
  phone: z.string().max(20).optional(),
  isActive: z.boolean().optional(),
});

branchesRouter.get('/', authenticate, async (_req: Request, res: Response) => {
  try {
    const branches = await prisma.branch.findMany({ orderBy: { id: 'asc' } });
    res.json(branches);
  } catch { res.status(500).json({ error: '서버 오류' }); }
});

branchesRouter.post('/', authenticate, requireRole('ADMIN'), validate(branchSchema), async (req: Request, res: Response) => {
  try {
    const branch = await prisma.branch.create({ data: req.body });
    await logAction(req.user!.userId, 'CREATE', 'branch', branch.id, `사업소 추가: ${branch.name}`);
    res.status(201).json(branch);
  } catch (e: any) {
    if (e.code === 'P2002') { res.status(409).json({ error: '이미 존재하는 사업소 코드입니다.' }); return; }
    res.status(500).json({ error: '서버 오류' });
  }
});

branchesRouter.put('/:id', authenticate, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const branch = await prisma.branch.update({
      where: { id: Number(req.params.id) },
      data: req.body,
    });
    await logAction(req.user!.userId, 'UPDATE', 'branch', branch.id, `사업소 수정: ${branch.name}`);
    res.json(branch);
  } catch { res.status(500).json({ error: '서버 오류' }); }
});

branchesRouter.delete('/:id', authenticate, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    await prisma.branch.update({ where: { id }, data: { isActive: false } });
    await logAction(req.user!.userId, 'DELETE', 'branch', id, `사업소 비활성화`);
    res.json({ success: true });
  } catch { res.status(500).json({ error: '서버 오류' }); }
});
