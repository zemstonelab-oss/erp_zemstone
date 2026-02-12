import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function recalculateInventory(branchId: number, productId: number) {
  const totalOrdered = await prisma.orderRoundItem.aggregate({
    where: { branchId, productId },
    _sum: { quantity: true },
  });

  const totalShipped = await prisma.shipmentItem.aggregate({
    where: { shipment: { branchId }, productId },
    _sum: { quantity: true },
  });

  await prisma.inventory.upsert({
    where: { branchId_productId: { branchId, productId } },
    update: {
      totalOrdered: totalOrdered._sum.quantity || 0,
      totalShipped: totalShipped._sum.quantity || 0,
    },
    create: {
      branchId,
      productId,
      totalOrdered: totalOrdered._sum.quantity || 0,
      totalShipped: totalShipped._sum.quantity || 0,
    },
  });
}

export async function recalculateAllInventory() {
  const branches = await prisma.branch.findMany({ where: { isActive: true } });
  const products = await prisma.product.findMany({ where: { isActive: true } });

  for (const branch of branches) {
    for (const product of products) {
      await recalculateInventory(branch.id, product.id);
    }
  }
}
