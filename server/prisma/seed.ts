import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // 사업소
  const branches = [
    { code: 'SC001', name: '서초', address: '서울시 서초구 서초대로 123', manager: '김서초', phone: '02-1234-5678' },
    { code: 'SC002', name: '서초(여의도)', address: '서울시 영등포구 여의대로 456', manager: '이여의', phone: '02-2345-6789' },
    { code: 'YS001', name: '용산', address: '서울시 용산구 한강대로 789', manager: '박용산', phone: '02-3456-7890' },
    { code: 'GN001', name: '강남', address: '서울시 강남구 테헤란로 101', manager: '최강남', phone: '02-4567-8901' },
    { code: 'RM001', name: '리모델링', address: '서울시 마포구 월드컵로 202', manager: '정리모', phone: '02-5678-9012' },
    { code: 'BS001', name: '부산', address: '부산시 해운대구 해운대로 303', manager: '한부산', phone: '051-6789-0123' },
  ];

  for (const b of branches) {
    await prisma.branch.upsert({ where: { code: b.code }, update: b, create: b });
  }

  // 품목
  const products = [
    { code: 'TS001', name: '미용티슈', category: '위생용품', unit: '박스', price: 15000 },
    { code: 'TS002', name: '물티슈', category: '위생용품', unit: '박스', price: 25000 },
    { code: 'CP001', name: '종이컵 6.5온스', category: '일회용품', unit: '박스', price: 8000 },
    { code: 'CP002', name: '종이컵 8온스', category: '일회용품', unit: '박스', price: 10000 },
    { code: 'BG001', name: '쇼핑백', category: '포장용품', unit: '박스', price: 20000 },
  ];

  for (const p of products) {
    await prisma.product.upsert({ where: { code: p.code }, update: p, create: p });
  }

  // 유저
  const hashedPassword = await bcrypt.hash('1234', 10);

  const branchMap = await prisma.branch.findMany();
  const bm: Record<string, number> = {};
  branchMap.forEach(b => { bm[b.code] = b.id; });

  const users = [
    { username: 'admin', name: '관리자', role: 'ADMIN' as const, branchId: null },
    { username: 'hq', name: '본사 담당자', role: 'HQ' as const, branchId: null },
    { username: 'seocho', name: '서초', role: 'BRANCH' as const, branchId: bm['SC001'] },
    { username: 'yeouido', name: '서초(여의도)', role: 'BRANCH' as const, branchId: bm['SC002'] },
    { username: 'yongsan', name: '용산', role: 'BRANCH' as const, branchId: bm['YS001'] },
    { username: 'gangnam', name: '강남', role: 'BRANCH' as const, branchId: bm['GN001'] },
    { username: 'remodel', name: '리모델링', role: 'BRANCH' as const, branchId: bm['RM001'] },
    { username: 'busan', name: '부산', role: 'BRANCH' as const, branchId: bm['BS001'] },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { username: u.username },
      update: { name: u.name, role: u.role, branchId: u.branchId },
      create: { ...u, password: hashedPassword },
    });
  }

  // 4차 발주 데이터
  const productMap = await prisma.product.findMany();
  const pm: Record<string, number> = {};
  productMap.forEach(p => { pm[p.code] = p.id; });

  const adminUser = await prisma.user.findUnique({ where: { username: 'admin' } });

  const round4 = await prisma.orderRound.upsert({
    where: { id: 1 },
    update: {},
    create: {
      roundNo: 4,
      orderDate: new Date('2026-01-01'),
      memo: '4차 발주',
      createdBy: adminUser!.id,
    },
  });

  const round4Orders: Record<string, Record<string, number>> = {
    'TS001': { 'SC001': 200, 'YS001': 200, 'GN001': 150, 'BS001': 80, 'RM001': 50 },
    'TS002': { 'SC001': 190, 'YS001': 190, 'GN001': 140, 'BS001': 70, 'RM001': 50 },
    'CP001': { 'SC001': 60, 'YS001': 70, 'GN001': 50, 'BS001': 20, 'RM001': 10 },
    'CP002': { 'SC001': 50, 'YS001': 60, 'GN001': 50, 'BS001': 15, 'RM001': 10 },
    'BG001': { 'SC001': 6, 'YS001': 0, 'GN001': 4, 'BS001': 2, 'RM001': 1 },
  };

  for (const [productCode, branchOrders] of Object.entries(round4Orders)) {
    for (const [branchCode, quantity] of Object.entries(branchOrders)) {
      if (quantity > 0 && pm[productCode] && bm[branchCode]) {
        await prisma.orderRoundItem.upsert({
          where: {
            roundId_branchId_productId: {
              roundId: round4.id,
              branchId: bm[branchCode],
              productId: pm[productCode],
            },
          },
          update: { quantity },
          create: {
            roundId: round4.id,
            branchId: bm[branchCode],
            productId: pm[productCode],
            quantity,
          },
        });
      }
    }
  }

  // Inventory 초기화
  for (const [productCode, branchOrders] of Object.entries(round4Orders)) {
    for (const [branchCode, quantity] of Object.entries(branchOrders)) {
      if (pm[productCode] && bm[branchCode]) {
        await prisma.inventory.upsert({
          where: {
            branchId_productId: {
              branchId: bm[branchCode],
              productId: pm[productCode],
            },
          },
          update: { totalOrdered: quantity, totalShipped: 0 },
          create: {
            branchId: bm[branchCode],
            productId: pm[productCode],
            totalOrdered: quantity,
            totalShipped: 0,
          },
        });
      }
    }
  }

  console.log('Seed completed!');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
