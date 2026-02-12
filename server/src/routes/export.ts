import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';
import { authenticate } from '../middleware/auth';

const prisma = new PrismaClient();
export const exportRouter = Router();

function sendWorkbook(res: Response, wb: XLSX.WorkBook, filename: string) {
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
  res.send(Buffer.from(buf));
}

// Export inventory
exportRouter.get('/inventory', authenticate, async (req: Request, res: Response) => {
  try {
    const where: any = {};
    if (req.user!.role === 'BRANCH' && req.user!.branchId) {
      where.branchId = req.user!.branchId;
    }

    const inventory = await prisma.inventory.findMany({
      where,
      include: { branch: true, product: true },
      orderBy: [{ branchId: 'asc' }, { productId: 'asc' }],
    });

    const rows = inventory.map(inv => ({
      '사업소': inv.branch.name,
      '품목': inv.product.name,
      '총 발주량': inv.totalOrdered,
      '출고량': inv.totalShipped,
      '잔량': inv.totalOrdered - inv.totalShipped,
      '소진율(%)': inv.totalOrdered > 0 ? Math.round((inv.totalShipped / inv.totalOrdered) * 100) : 0,
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, '재고현황');
    sendWorkbook(res, wb, '재고현황.xlsx');
  } catch { res.status(500).json({ error: '서버 오류' }); }
});

// Export shipments
exportRouter.get('/shipments', authenticate, async (req: Request, res: Response) => {
  try {
    const where: any = {};
    if (req.user!.role === 'BRANCH' && req.user!.branchId) {
      where.branchId = req.user!.branchId;
    }
    if (req.query.branchId) where.branchId = Number(req.query.branchId);

    const shipments = await prisma.shipment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { branch: true, items: { include: { product: true } }, creator: { select: { name: true } } },
    });

    const rows = shipments.flatMap(sh =>
      sh.items.map(item => ({
        '출고일': sh.deliveryDate ? new Date(sh.deliveryDate).toLocaleDateString('ko-KR') : '',
        '등록일': new Date(sh.createdAt).toLocaleDateString('ko-KR'),
        '사업소': sh.branch.name,
        '품목': item.product.name,
        '수량': item.quantity,
        '처리자': sh.creator?.name || '',
        '비고': sh.notes || '',
      }))
    );

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, '출고내역');
    sendWorkbook(res, wb, '출고내역.xlsx');
  } catch { res.status(500).json({ error: '서버 오류' }); }
});

// Export round
exportRouter.get('/rounds/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const round = await prisma.orderRound.findUnique({
      where: { id: Number(req.params.id) },
      include: { items: { include: { branch: true, product: true } } },
    });
    if (!round) { res.status(404).json({ error: '차수를 찾을 수 없습니다.' }); return; }

    const rows = round.items.map(item => ({
      '차수': `${round.roundNo}차`,
      '사업소': item.branch.name,
      '품목': item.product.name,
      '수량': item.quantity,
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, `${round.roundNo}차 발주`);
    sendWorkbook(res, wb, `${round.roundNo}차_발주.xlsx`);
  } catch { res.status(500).json({ error: '서버 오류' }); }
});
