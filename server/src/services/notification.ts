import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function createNotification(userId: number, type: string, title: string, message: string) {
  return prisma.notification.create({
    data: { userId, type, title, message },
  });
}

export async function notifyAdminsAndHQ(type: string, title: string, message: string) {
  const users = await prisma.user.findMany({
    where: { role: { in: ['ADMIN', 'HQ'] }, isActive: true },
  });
  for (const u of users) {
    await createNotification(u.id, type, title, message);
  }
}

export async function notifyBranchUsers(branchId: number, type: string, title: string, message: string) {
  const users = await prisma.user.findMany({
    where: { branchId, isActive: true },
  });
  for (const u of users) {
    await createNotification(u.id, type, title, message);
  }
}

export async function checkLowStockAndNotify(branchId: number, productId: number) {
  const threshold = await prisma.alertThreshold.findUnique({
    where: { branchId_productId: { branchId, productId } },
  });
  if (!threshold) return;

  const inv = await prisma.inventory.findUnique({
    where: { branchId_productId: { branchId, productId } },
    include: { branch: true, product: true },
  });
  if (!inv) return;

  const remaining = inv.totalOrdered - inv.totalShipped;
  if (remaining <= threshold.threshold) {
    const title = '잔량 부족 알림';
    const message = `${inv.branch.name} - ${inv.product.name} 잔량: ${remaining} (기준: ${threshold.threshold})`;
    await notifyAdminsAndHQ('LOW_STOCK', title, message);
    await notifyBranchUsers(branchId, 'LOW_STOCK', title, message);
  }
}
