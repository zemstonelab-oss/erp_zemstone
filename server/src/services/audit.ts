import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function logAction(
  userId: number,
  action: string,
  entity: string,
  entityId: number | null | undefined,
  detail?: string
) {
  try {
    await prisma.auditLog.create({
      data: { userId, action, entity, entityId: entityId ?? null, detail },
    });
  } catch (e) {
    console.error('Audit log error:', e);
  }
}
