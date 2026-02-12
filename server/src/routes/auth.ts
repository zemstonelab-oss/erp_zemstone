import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';

const prisma = new PrismaClient();
export const authRouter = Router();

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

authRouter.post('/login', validate(loginSchema), async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    const user = await prisma.user.findUnique({ where: { username }, include: { branch: true } });

    if (!user || !user.isActive) {
      res.status(401).json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' });
      return;
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      res.status(401).json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' });
      return;
    }

    const payload = {
      userId: user.id,
      username: user.username,
      role: user.role,
      branchId: user.branchId,
    };

    const accessToken = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '15m' });
    const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, { expiresIn: '7d' });

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        branchId: user.branchId,
        branchName: user.branch?.name || null,
      },
    });
  } catch (err) {
    res.status(500).json({ error: '서버 오류' });
  }
});

authRouter.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      res.status(401).json({ error: '리프레시 토큰이 필요합니다.' });
      return;
    }

    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as any;
    const newPayload = {
      userId: payload.userId,
      username: payload.username,
      role: payload.role,
      branchId: payload.branchId,
    };

    const accessToken = jwt.sign(newPayload, process.env.JWT_SECRET!, { expiresIn: '15m' });
    res.json({ accessToken });
  } catch {
    res.status(401).json({ error: '유효하지 않은 리프레시 토큰입니다.' });
  }
});

authRouter.get('/me', authenticate, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      include: { branch: true },
    });

    if (!user) {
      res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
      return;
    }

    res.json({
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      branchId: user.branchId,
      branchName: user.branch?.name || null,
    });
  } catch {
    res.status(500).json({ error: '서버 오류' });
  }
});
