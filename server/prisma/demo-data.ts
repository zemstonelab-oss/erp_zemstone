import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 기존 매핑 가져오기
  const branches = await prisma.branch.findMany();
  const products = await prisma.product.findMany();
  const adminUser = await prisma.user.findUnique({ where: { username: 'admin' } });
  const hqUser = await prisma.user.findUnique({ where: { username: 'hq' } });

  const bm: Record<string, number> = {};
  branches.forEach(b => { bm[b.code] = b.id; });
  const pm: Record<string, number> = {};
  products.forEach(p => { pm[p.code] = p.id; });

  // 사업소 유저 매핑
  const branchUsers = await prisma.user.findMany({ where: { role: 'BRANCH' } });
  const buMap: Record<number, number> = {};
  branchUsers.forEach(u => { if (u.branchId) buMap[u.branchId] = u.id; });

  // ── 1차 발주 (2025-07-01) ──
  const round1 = await prisma.orderRound.create({
    data: {
      roundNo: 1,
      orderDate: new Date('2025-07-01'),
      memo: '1차 발주 - 래미안 판촉물 초기 배정',
      createdBy: adminUser!.id,
    },
  });

  const r1Orders: Record<string, Record<string, number>> = {
    'TS001': { 'SC001': 100, 'SC002': 50, 'YS001': 120, 'GN001': 80, 'BS001': 40, 'RM001': 30 },
    'TS002': { 'SC001': 90, 'SC002': 40, 'YS001': 100, 'GN001': 70, 'BS001': 35, 'RM001': 25 },
    'CP001': { 'SC001': 30, 'SC002': 15, 'YS001': 40, 'GN001': 25, 'BS001': 10, 'RM001': 5 },
    'CP002': { 'SC001': 25, 'SC002': 10, 'YS001': 30, 'GN001': 20, 'BS001': 8, 'RM001': 5 },
    'BG001': { 'SC001': 3, 'SC002': 1, 'YS001': 4, 'GN001': 2, 'BS001': 1, 'RM001': 0 },
  };

  for (const [pc, bo] of Object.entries(r1Orders)) {
    for (const [bc, qty] of Object.entries(bo)) {
      if (qty > 0 && pm[pc] && bm[bc]) {
        await prisma.orderRoundItem.create({ data: { roundId: round1.id, branchId: bm[bc], productId: pm[pc], quantity: qty } });
      }
    }
  }

  // ── 2차 발주 (2025-09-15) ──
  const round2 = await prisma.orderRound.create({
    data: {
      roundNo: 2,
      orderDate: new Date('2025-09-15'),
      memo: '2차 발주 - 가을 시즌 추가 배정',
      createdBy: adminUser!.id,
    },
  });

  const r2Orders: Record<string, Record<string, number>> = {
    'TS001': { 'SC001': 120, 'SC002': 60, 'YS001': 130, 'GN001': 90, 'BS001': 50, 'RM001': 35 },
    'TS002': { 'SC001': 110, 'SC002': 50, 'YS001': 120, 'GN001': 85, 'BS001': 45, 'RM001': 30 },
    'CP001': { 'SC001': 40, 'SC002': 20, 'YS001': 45, 'GN001': 30, 'BS001': 15, 'RM001': 8 },
    'CP002': { 'SC001': 35, 'SC002': 15, 'YS001': 40, 'GN001': 30, 'BS001': 10, 'RM001': 7 },
    'BG001': { 'SC001': 4, 'SC002': 2, 'YS001': 5, 'GN001': 3, 'BS001': 1, 'RM001': 1 },
  };

  for (const [pc, bo] of Object.entries(r2Orders)) {
    for (const [bc, qty] of Object.entries(bo)) {
      if (qty > 0 && pm[pc] && bm[bc]) {
        await prisma.orderRoundItem.create({ data: { roundId: round2.id, branchId: bm[bc], productId: pm[pc], quantity: qty } });
      }
    }
  }

  // ── 3차 발주 (2025-11-20) ──
  const round3 = await prisma.orderRound.create({
    data: {
      roundNo: 3,
      orderDate: new Date('2025-11-20'),
      memo: '3차 발주 - 연말 재고 보충',
      createdBy: adminUser!.id,
    },
  });

  const r3Orders: Record<string, Record<string, number>> = {
    'TS001': { 'SC001': 150, 'SC002': 70, 'YS001': 160, 'GN001': 110, 'BS001': 60, 'RM001': 40 },
    'TS002': { 'SC001': 140, 'SC002': 65, 'YS001': 150, 'GN001': 100, 'BS001': 55, 'RM001': 35 },
    'CP001': { 'SC001': 50, 'SC002': 25, 'YS001': 55, 'GN001': 40, 'BS001': 18, 'RM001': 8 },
    'CP002': { 'SC001': 40, 'SC002': 20, 'YS001': 50, 'GN001': 35, 'BS001': 12, 'RM001': 8 },
    'BG001': { 'SC001': 5, 'SC002': 2, 'YS001': 6, 'GN001': 3, 'BS001': 2, 'RM001': 1 },
  };

  for (const [pc, bo] of Object.entries(r3Orders)) {
    for (const [bc, qty] of Object.entries(bo)) {
      if (qty > 0 && pm[pc] && bm[bc]) {
        await prisma.orderRoundItem.create({ data: { roundId: round3.id, branchId: bm[bc], productId: pm[pc], quantity: qty } });
      }
    }
  }

  // ── 출고 데이터 (다양한 날짜, 다양한 상태) ──
  const shipmentData = [
    // 서초 - 여러 건
    { branchCode: 'SC001', date: '2025-07-10', status: 'DELIVERED', driver: '김배송', driverPhone: '010-1111-2222', notes: '1차분 초기 출고', items: { 'TS001': 50, 'TS002': 45, 'CP001': 15 } },
    { branchCode: 'SC001', date: '2025-08-05', status: 'DELIVERED', driver: '김배송', driverPhone: '010-1111-2222', notes: '추가 출고', items: { 'TS001': 30, 'TS002': 25, 'CP002': 10, 'BG001': 2 } },
    { branchCode: 'SC001', date: '2025-10-01', status: 'DELIVERED', driver: '박택배', driverPhone: '010-3333-4444', notes: '2차분 출고', items: { 'TS001': 60, 'TS002': 55, 'CP001': 20, 'CP002': 15 } },
    { branchCode: 'SC001', date: '2025-12-10', status: 'DELIVERED', driver: '김배송', driverPhone: '010-1111-2222', notes: '3차분 출고', items: { 'TS001': 80, 'TS002': 70, 'CP001': 25, 'BG001': 3 } },
    { branchCode: 'SC001', date: '2026-01-15', status: 'DELIVERED', driver: '박택배', driverPhone: '010-3333-4444', notes: '4차분 1차 출고', items: { 'TS001': 100, 'TS002': 90, 'CP001': 30, 'CP002': 25 } },
    { branchCode: 'SC001', date: '2026-02-15', status: 'PENDING', driver: '김배송', driverPhone: '010-1111-2222', scheduledDate: '2026-02-15', scheduledTime: '오전 10시', notes: '4차분 2차 출고 예정', items: { 'TS001': 50, 'TS002': 40 } },

    // 여의도
    { branchCode: 'SC002', date: '2025-07-15', status: 'DELIVERED', driver: '이운송', driverPhone: '010-5555-6666', notes: '1차분 출고', items: { 'TS001': 30, 'TS002': 25, 'CP001': 10 } },
    { branchCode: 'SC002', date: '2025-10-10', status: 'DELIVERED', driver: '이운송', driverPhone: '010-5555-6666', notes: '2차분 출고', items: { 'TS001': 35, 'TS002': 30, 'CP002': 8 } },
    { branchCode: 'SC002', date: '2025-12-20', status: 'DELIVERED', driver: '이운송', driverPhone: '010-5555-6666', notes: '3차분 출고', items: { 'TS001': 40, 'TS002': 35, 'CP001': 12 } },

    // 용산 - 가장 활발
    { branchCode: 'YS001', date: '2025-07-08', status: 'DELIVERED', driver: '최기사', driverPhone: '010-7777-8888', notes: '1차분 긴급 출고', items: { 'TS001': 60, 'TS002': 50, 'CP001': 20, 'CP002': 15, 'BG001': 2 } },
    { branchCode: 'YS001', date: '2025-08-20', status: 'DELIVERED', driver: '최기사', driverPhone: '010-7777-8888', notes: '추가 출고', items: { 'TS001': 40, 'TS002': 30, 'CP001': 15 } },
    { branchCode: 'YS001', date: '2025-09-25', status: 'DELIVERED', driver: '최기사', driverPhone: '010-7777-8888', notes: '2차분 출고', items: { 'TS001': 70, 'TS002': 60, 'CP001': 25, 'CP002': 20 } },
    { branchCode: 'YS001', date: '2025-11-28', status: 'DELIVERED', driver: '박택배', driverPhone: '010-3333-4444', notes: '3차분 출고', items: { 'TS001': 80, 'TS002': 75, 'CP001': 30, 'BG001': 3 } },
    { branchCode: 'YS001', date: '2026-01-20', status: 'DELIVERED', driver: '최기사', driverPhone: '010-7777-8888', notes: '4차분 출고', items: { 'TS001': 100, 'TS002': 95, 'CP001': 35, 'CP002': 30 } },
    { branchCode: 'YS001', date: '2026-02-14', status: 'IN_TRANSIT', driver: '최기사', driverPhone: '010-7777-8888', scheduledDate: '2026-02-14', scheduledTime: '오후 2시', notes: '4차 추가분 배송 중', items: { 'TS001': 50, 'TS002': 40, 'BG001': 3 } },

    // 강남
    { branchCode: 'GN001', date: '2025-07-20', status: 'DELIVERED', driver: '김배송', driverPhone: '010-1111-2222', notes: '1차분 출고', items: { 'TS001': 40, 'TS002': 35, 'CP001': 12, 'CP002': 10 } },
    { branchCode: 'GN001', date: '2025-10-05', status: 'DELIVERED', driver: '김배송', driverPhone: '010-1111-2222', notes: '2차분 출고', items: { 'TS001': 50, 'TS002': 45, 'CP001': 18, 'BG001': 2 } },
    { branchCode: 'GN001', date: '2025-12-15', status: 'DELIVERED', driver: '박택배', driverPhone: '010-3333-4444', notes: '3차분 출고', items: { 'TS001': 60, 'TS002': 50, 'CP001': 20, 'CP002': 18 } },
    { branchCode: 'GN001', date: '2026-01-25', status: 'DELIVERED', driver: '김배송', driverPhone: '010-1111-2222', notes: '4차분 출고', items: { 'TS001': 75, 'TS002': 70, 'CP001': 25 } },

    // 부산
    { branchCode: 'BS001', date: '2025-07-25', status: 'DELIVERED', driver: '정부산', driverPhone: '010-9999-0000', notes: '1차분 부산 출고', items: { 'TS001': 20, 'TS002': 18, 'CP001': 5 } },
    { branchCode: 'BS001', date: '2025-10-15', status: 'DELIVERED', driver: '정부산', driverPhone: '010-9999-0000', notes: '2차분 출고', items: { 'TS001': 25, 'TS002': 22, 'CP001': 8, 'CP002': 5 } },
    { branchCode: 'BS001', date: '2026-01-10', status: 'DELIVERED', driver: '정부산', driverPhone: '010-9999-0000', notes: '3+4차 합산 출고', items: { 'TS001': 50, 'TS002': 40, 'CP001': 12, 'BS001': 1 } },

    // 리모델링
    { branchCode: 'RM001', date: '2025-08-01', status: 'DELIVERED', driver: '이운송', driverPhone: '010-5555-6666', notes: '1차분 출고', items: { 'TS001': 15, 'TS002': 12, 'CP001': 3 } },
    { branchCode: 'RM001', date: '2025-11-01', status: 'DELIVERED', driver: '이운송', driverPhone: '010-5555-6666', notes: '2+3차분 합산 출고', items: { 'TS001': 35, 'TS002': 30, 'CP001': 8, 'CP002': 6 } },
  ];

  for (const s of shipmentData) {
    const branchId = bm[s.branchCode];
    if (!branchId) continue;

    const shipment = await prisma.shipment.create({
      data: {
        branchId,
        deliveryDate: new Date(s.date),
        notes: s.notes,
        createdBy: adminUser!.id,
        deliveryStatus: s.status,
        scheduledDate: s.scheduledDate ? new Date(s.scheduledDate) : null,
        scheduledTime: s.scheduledTime || null,
        deliveredAt: s.status === 'DELIVERED' ? new Date(s.date) : null,
        driverName: s.driver,
        driverPhone: s.driverPhone,
      },
    });

    for (const [productCode, qty] of Object.entries(s.items)) {
      if (pm[productCode] && qty > 0) {
        await prisma.shipmentItem.create({
          data: { shipmentId: shipment.id, productId: pm[productCode], quantity: qty },
        });
      }
    }
  }

  // ── Inventory 재계산 (모든 차수 합산 - 전체 출고 합산) ──
  // 전체 발주량 합산
  const allOrderItems = await prisma.orderRoundItem.findMany();
  const orderTotals: Record<string, number> = {};
  for (const item of allOrderItems) {
    const key = `${item.branchId}-${item.productId}`;
    orderTotals[key] = (orderTotals[key] || 0) + item.quantity;
  }

  // 전체 출고량 합산 (DELIVERED만)
  const deliveredShipments = await prisma.shipment.findMany({
    where: { deliveryStatus: 'DELIVERED' },
    include: { items: true },
  });
  const shipTotals: Record<string, number> = {};
  for (const ship of deliveredShipments) {
    for (const item of ship.items) {
      const key = `${ship.branchId}-${item.productId}`;
      shipTotals[key] = (shipTotals[key] || 0) + item.quantity;
    }
  }

  // Inventory upsert
  const allKeys = new Set([...Object.keys(orderTotals), ...Object.keys(shipTotals)]);
  for (const key of allKeys) {
    const [branchIdStr, productIdStr] = key.split('-');
    const branchId = parseInt(branchIdStr);
    const productId = parseInt(productIdStr);
    await prisma.inventory.upsert({
      where: { branchId_productId: { branchId, productId } },
      update: {
        totalOrdered: orderTotals[key] || 0,
        totalShipped: shipTotals[key] || 0,
      },
      create: {
        branchId,
        productId,
        totalOrdered: orderTotals[key] || 0,
        totalShipped: shipTotals[key] || 0,
      },
    });
  }

  // ── 추가발주 요청 ──
  const extraOrders = [
    { branchCode: 'SC001', productCode: 'TS001', qty: 30, reason: '입주 세대 증가로 미용티슈 소진이 빠릅니다', status: 'APPROVED', desiredDate: '2026-02-20', desiredTime: '오전', memo: '긴급 요청' },
    { branchCode: 'SC001', productCode: 'CP001', qty: 15, reason: '방문객 증가로 종이컵 부족', status: 'APPROVED', desiredDate: '2026-02-18', desiredTime: '오후' },
    { branchCode: 'YS001', productCode: 'TS002', qty: 25, reason: '물티슈 잔량 부족 예상', status: 'PENDING', desiredDate: '2026-02-25', desiredTime: '오전 10시', memo: '잔량 10박스 미만입니다' },
    { branchCode: 'YS001', productCode: 'BG001', qty: 5, reason: '쇼핑백 재고 소진', status: 'PENDING', desiredDate: '2026-03-01', desiredTime: '오후 2시' },
    { branchCode: 'GN001', productCode: 'TS001', qty: 20, reason: '모델하우스 행사로 소진량 급증', status: 'APPROVED', desiredDate: '2026-02-15', desiredTime: '오전', memo: '주말 행사 대비' },
    { branchCode: 'GN001', productCode: 'CP002', qty: 10, reason: '8온스 종이컵 부족', status: 'REJECTED', desiredDate: '2026-02-10' },
    { branchCode: 'BS001', productCode: 'TS001', qty: 15, reason: '부산 현장 추가 요청', status: 'PENDING', desiredDate: '2026-03-05', desiredTime: '오전' },
    { branchCode: 'RM001', productCode: 'TS002', qty: 10, reason: '리모델링 현장 물티슈 소진', status: 'APPROVED', desiredDate: '2026-02-22', desiredTime: '오후 3시' },
    { branchCode: 'SC002', productCode: 'TS001', qty: 20, reason: '여의도 현장 미용티슈 추가 필요', status: 'PENDING', desiredDate: '2026-02-28' },
  ];

  for (const eo of extraOrders) {
    const branchId = bm[eo.branchCode];
    const productId = pm[eo.productCode];
    if (!branchId || !productId) continue;

    await prisma.extraOrderRequest.create({
      data: {
        branchId,
        productId,
        quantity: eo.qty,
        reason: eo.reason,
        memo: eo.memo || null,
        desiredDate: eo.desiredDate ? new Date(eo.desiredDate) : null,
        desiredTime: eo.desiredTime || null,
        status: eo.status,
        requestedBy: buMap[branchId] || null,
        reviewedBy: eo.status !== 'PENDING' ? (eo.status === 'APPROVED' ? adminUser!.id : hqUser!.id) : null,
        reviewedAt: eo.status !== 'PENDING' ? new Date() : null,
      },
    });
  }

  // ── 알림 ──
  const notifications = [
    { userId: adminUser!.id, type: 'EXTRA_ORDER', title: '추가발주 요청', message: '서초 사업소에서 미용티슈 30박스 추가발주를 요청했습니다.' },
    { userId: adminUser!.id, type: 'EXTRA_ORDER', title: '추가발주 요청', message: '용산 사업소에서 물티슈 25박스 추가발주를 요청했습니다.' },
    { userId: adminUser!.id, type: 'EXTRA_ORDER', title: '추가발주 요청', message: '부산 사업소에서 미용티슈 15박스 추가발주를 요청했습니다.' },
    { userId: adminUser!.id, type: 'LOW_STOCK', title: '재고 부족 알림', message: '리모델링 사업소 물티슈 잔량이 10박스 미만입니다.' },
    { userId: adminUser!.id, type: 'SHIPMENT', title: '배송 완료', message: '강남 사업소 4차분 출고가 완료되었습니다.' },
    { userId: hqUser!.id, type: 'EXTRA_ORDER', title: '추가발주 요청', message: '여의도 사업소에서 미용티슈 20박스 추가발주를 요청했습니다.' },
    { userId: hqUser!.id, type: 'SHIPMENT', title: '배송 현황', message: '용산 사업소 4차 추가분이 배송 중입니다.' },
  ];

  // 사업소 유저에게도 알림
  for (const bu of branchUsers) {
    notifications.push(
      { userId: bu.id, type: 'SHIPMENT', title: '출고 알림', message: `${bu.name} 사업소 출고가 처리되었습니다.` },
    );
  }

  for (const n of notifications) {
    await prisma.notification.create({ data: n });
  }

  // ── 감사 로그 ──
  const auditLogs = [
    { userId: adminUser!.id, action: 'CREATE', entity: 'OrderRound', detail: '1차 발주 생성' },
    { userId: adminUser!.id, action: 'CREATE', entity: 'OrderRound', detail: '2차 발주 생성' },
    { userId: adminUser!.id, action: 'CREATE', entity: 'OrderRound', detail: '3차 발주 생성' },
    { userId: adminUser!.id, action: 'CREATE', entity: 'Shipment', detail: '서초 사업소 1차분 출고 처리' },
    { userId: adminUser!.id, action: 'CREATE', entity: 'Shipment', detail: '용산 사업소 1차분 긴급 출고 처리' },
    { userId: adminUser!.id, action: 'UPDATE', entity: 'Shipment', detail: '용산 배송 상태 → DELIVERED' },
    { userId: adminUser!.id, action: 'APPROVE', entity: 'ExtraOrder', detail: '서초 미용티슈 30박스 추가발주 승인' },
    { userId: adminUser!.id, action: 'APPROVE', entity: 'ExtraOrder', detail: '강남 미용티슈 20박스 추가발주 승인' },
    { userId: hqUser!.id, action: 'REJECT', entity: 'ExtraOrder', detail: '강남 8온스 종이컵 추가발주 반려 - 잔량 충분' },
    { userId: adminUser!.id, action: 'CREATE', entity: 'Product', detail: '품목 추가: 미용티슈' },
    { userId: adminUser!.id, action: 'CREATE', entity: 'Branch', detail: '사업소 추가: 부산' },
    { userId: adminUser!.id, action: 'UPDATE', entity: 'User', detail: '부산 사업소 계정 생성' },
  ];

  for (const log of auditLogs) {
    await prisma.auditLog.create({ data: log });
  }

  // ── 알림 임계값 설정 ──
  const thresholds = [
    { branchCode: 'SC001', productCode: 'TS001', threshold: 20 },
    { branchCode: 'SC001', productCode: 'TS002', threshold: 15 },
    { branchCode: 'YS001', productCode: 'TS001', threshold: 25 },
    { branchCode: 'YS001', productCode: 'TS002', threshold: 20 },
    { branchCode: 'GN001', productCode: 'TS001', threshold: 15 },
    { branchCode: 'BS001', productCode: 'TS001', threshold: 10 },
    { branchCode: 'RM001', productCode: 'TS002', threshold: 10 },
  ];

  for (const t of thresholds) {
    const branchId = bm[t.branchCode];
    const productId = pm[t.productCode];
    if (branchId && productId) {
      await prisma.alertThreshold.upsert({
        where: { branchId_productId: { branchId, productId } },
        update: { threshold: t.threshold },
        create: { branchId, productId, threshold: t.threshold },
      });
    }
  }

  console.log('Demo data inserted successfully!');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
