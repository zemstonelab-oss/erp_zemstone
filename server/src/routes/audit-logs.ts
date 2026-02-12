import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/role';

const prisma = new PrismaClient();
export const auditLogsRouter = Router();

auditLogsRouter.get('/', authenticate, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const where: any = {};
    if (req.query.entity) where.entity = req.query.entity;
    if (req.query.startDate || req.query.endDate) {
      where.createdAt = {};
      if (req.query.startDate) where.createdAt.gte = new Date(req.query.startDate as string);
      if (req.query.endDate) where.createdAt.lte = new Date(req.query.endDate as string + 'T23:59:59');
    }

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 30;
    const offset = (page - 1) * limit;

    const [data, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
        include: { user: { select: { name: true, username: true } } },
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({ data, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch { res.status(500).json({ error: '서버 오류' }); }
});
