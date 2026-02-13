import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/role';
import { validate } from '../middleware/validate';
import { logAction } from '../services/audit';

const prisma = new PrismaClient();
export const noticesRouter = Router();

const noticeSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  pinned: z.boolean().optional(),
});

// List notices
noticesRouter.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const [notices, total] = await Promise.all([
      prisma.notice.findMany({
        orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
        skip: offset,
        take: limit,
        include: { author: { select: { name: true } } },
      }),
      prisma.notice.count(),
    ]);

    res.json({ data: notices, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch { res.status(500).json({ error: '서버 오류' }); }
});

// Get latest notices (for dashboard)
noticesRouter.get('/latest', authenticate, async (_req: Request, res: Response) => {
  try {
    const notices = await prisma.notice.findMany({
      orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
      take: 5,
      include: { author: { select: { name: true } } },
    });
    res.json(notices);
  } catch { res.status(500).json({ error: '서버 오류' }); }
});

// Get single notice
noticesRouter.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const notice = await prisma.notice.findUnique({
      where: { id: Number(req.params.id) },
      include: { author: { select: { name: true } } },
    });
    if (!notice) { res.status(404).json({ error: '공지사항을 찾을 수 없습니다.' }); return; }
    res.json(notice);
  } catch { res.status(500).json({ error: '서버 오류' }); }
});

// Create notice (ADMIN only)
noticesRouter.post('/', authenticate, requireRole('ADMIN'), validate(noticeSchema), async (req: Request, res: Response) => {
  try {
    const { title, content, pinned } = req.body;
    const notice = await prisma.notice.create({
      data: {
        title,
        content,
        pinned: pinned || false,
        authorId: req.user!.userId,
      },
      include: { author: { select: { name: true } } },
    });
    await logAction(req.user!.userId, 'CREATE', 'notice', notice.id, `공지사항 작성: ${title}`);
    res.status(201).json(notice);
  } catch { res.status(500).json({ error: '서버 오류' }); }
});

// Update notice (ADMIN only)
noticesRouter.put('/:id', authenticate, requireRole('ADMIN'), validate(noticeSchema), async (req: Request, res: Response) => {
  try {
    const { title, content, pinned } = req.body;
    const notice = await prisma.notice.update({
      where: { id: Number(req.params.id) },
      data: { title, content, pinned: pinned || false },
      include: { author: { select: { name: true } } },
    });
    await logAction(req.user!.userId, 'UPDATE', 'notice', notice.id, `공지사항 수정: ${title}`);
    res.json(notice);
  } catch { res.status(500).json({ error: '서버 오류' }); }
});

// Delete notice (ADMIN only)
noticesRouter.delete('/:id', authenticate, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    await prisma.notice.delete({ where: { id } });
    await logAction(req.user!.userId, 'DELETE', 'notice', id, '공지사항 삭제');
    res.json({ success: true });
  } catch { res.status(500).json({ error: '서버 오류' }); }
});
