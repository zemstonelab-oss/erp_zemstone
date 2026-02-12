import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/role';
import { validate } from '../middleware/validate';
import { logAction } from '../services/audit';

const prisma = new PrismaClient();
export const usersRouter = Router();

const createSchema = z.object({
  username: z.string().min(1).max(50),
  password: z.string().min(4),
  name: z.string().min(1).max(100),
  role: z.enum(['ADMIN', 'HQ', 'BRANCH']),
  branchId: z.number().int().nullable().optional(),
});

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  password: z.string().min(4).optional(),
  role: z.enum(['ADMIN', 'HQ', 'BRANCH']).optional(),
  branchId: z.number().int().nullable().optional(),
  isActive: z.boolean().optional(),
});

usersRouter.get('/', authenticate, requireRole('ADMIN'), async (_req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { id: 'asc' },
      select: { id: true, username: true, name: true, role: true, branchId: true, isActive: true, createdAt: true, branch: { select: { name: true } } },
    });
    res.json(users);
  } catch { res.status(500).json({ error: '서버 오류' }); }
});

usersRouter.post('/', authenticate, requireRole('ADMIN'), validate(createSchema), async (req: Request, res: Response) => {
  try {
    const { username, password, name, role, branchId } = req.body;
    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { username, password: hashed, name, role, branchId: branchId || null },
      select: { id: true, username: true, name: true, role: true, branchId: true, isActive: true },
    });
    await logAction(req.user!.userId, 'CREATE', 'user', user.id, `사용자 추가: ${user.name} (${user.role})`);
    res.status(201).json(user);
  } catch (e: any) {
    if (e.code === 'P2002') { res.status(409).json({ error: '이미 존재하는 아이디입니다.' }); return; }
    res.status(500).json({ error: '서버 오류' });
  }
});

usersRouter.put('/:id', authenticate, requireRole('ADMIN'), validate(updateSchema), async (req: Request, res: Response) => {
  try {
    const data: any = { ...req.body };
    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10);
    }
    const user = await prisma.user.update({
      where: { id: Number(req.params.id) },
      data,
      select: { id: true, username: true, name: true, role: true, branchId: true, isActive: true },
    });
    await logAction(req.user!.userId, 'UPDATE', 'user', user.id, `사용자 수정: ${user.name}`);
    res.json(user);
  } catch { res.status(500).json({ error: '서버 오류' }); }
});

usersRouter.delete('/:id', authenticate, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    await prisma.user.update({ where: { id }, data: { isActive: false } });
    await logAction(req.user!.userId, 'DELETE', 'user', id, `사용자 비활성화`);
    res.json({ success: true });
  } catch { res.status(500).json({ error: '서버 오류' }); }
});
