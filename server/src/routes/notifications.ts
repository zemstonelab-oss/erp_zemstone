import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';

const prisma = new PrismaClient();
export const notificationsRouter = Router();

// Get my notifications
notificationsRouter.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user!.userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    const unreadCount = await prisma.notification.count({
      where: { userId: req.user!.userId, isRead: false },
    });
    res.json({ notifications, unreadCount });
  } catch { res.status(500).json({ error: '서버 오류' }); }
});

// Mark as read
notificationsRouter.put('/:id/read', authenticate, async (req: Request, res: Response) => {
  try {
    await prisma.notification.update({
      where: { id: Number(req.params.id) },
      data: { isRead: true },
    });
    res.json({ success: true });
  } catch { res.status(500).json({ error: '서버 오류' }); }
});

// Mark all as read
notificationsRouter.put('/read-all', authenticate, async (req: Request, res: Response) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user!.userId, isRead: false },
      data: { isRead: true },
    });
    res.json({ success: true });
  } catch { res.status(500).json({ error: '서버 오류' }); }
});
