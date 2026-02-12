import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/role';

const prisma = new PrismaClient();
export const billingRouter = Router();

billingRouter.use(authenticate, requireRole('ADMIN'));

interface BillingSummaryItem {
  productName: string;
  productCode: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

interface BranchBilling {
  branchId: number;
  branchName: string;
  branchCode: string;
  items: BillingSummaryItem[];
  total: number;
}

async function getBillingSummary(startDate?: string, endDate?: string, branchId?: number) {
  const where: any = {};
  if (branchId) where.branchId = branchId;
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate + 'T23:59:59');
  }

  const shipments = await prisma.shipment.findMany({
    where,
    include: {
      branch: true,
      items: { include: { product: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const branchMap = new Map<number, BranchBilling>();

  for (const shipment of shipments) {
    if (!branchMap.has(shipment.branchId)) {
      branchMap.set(shipment.branchId, {
        branchId: shipment.branchId,
        branchName: shipment.branch.name,
        branchCode: shipment.branch.code,
        items: [],
        total: 0,
      });
    }
    const branch = branchMap.get(shipment.branchId)!;

    for (const item of shipment.items) {
      const amount = item.product.price * item.quantity;
      const existing = branch.items.find(i => i.productCode === item.product.code);
      if (existing) {
        existing.quantity += item.quantity;
        existing.amount += amount;
      } else {
        branch.items.push({
          productName: item.product.name,
          productCode: item.product.code,
          unit: item.product.unit,
          quantity: item.quantity,
          unitPrice: item.product.price,
          amount,
        });
      }
      branch.total += amount;
    }
  }

  const branches = Array.from(branchMap.values()).sort((a, b) => a.branchCode.localeCompare(b.branchCode));
  const grandTotal = branches.reduce((sum, b) => sum + b.total, 0);

  return { branches, grandTotal };
}

// GET /api/billing/summary
billingRouter.get('/summary', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, branchId } = req.query as any;
    const result = await getBillingSummary(startDate, endDate, branchId ? Number(branchId) : undefined);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '정산 요약 조회 실패' });
  }
});

// GET /api/billing/export
billingRouter.get('/export', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, branchId } = req.query as any;
    const { branches, grandTotal } = await getBillingSummary(startDate, endDate, branchId ? Number(branchId) : undefined);

    const wb = XLSX.utils.book_new();

    // Summary sheet
    const summaryRows: any[] = [];
    summaryRows.push(['정산서']);
    summaryRows.push([`기간: ${startDate || '전체'} ~ ${endDate || '전체'}`]);
    summaryRows.push([]);

    for (const branch of branches) {
      summaryRows.push([`사업소: ${branch.branchName} (${branch.branchCode})`]);
      summaryRows.push(['품목코드', '품목명', '단위', '수량', '단가', '금액']);
      for (const item of branch.items) {
        summaryRows.push([item.productCode, item.productName, item.unit, item.quantity, item.unitPrice, item.amount]);
      }
      summaryRows.push(['', '', '', '', '소계', branch.total]);
      summaryRows.push([]);
    }

    summaryRows.push(['', '', '', '', '총합계', grandTotal]);

    const ws = XLSX.utils.aoa_to_sheet(summaryRows);
    // Set column widths
    ws['!cols'] = [
      { wch: 12 }, { wch: 20 }, { wch: 8 }, { wch: 10 }, { wch: 12 }, { wch: 15 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, '정산서');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const filename = `정산서_${startDate || 'all'}_${endDate || 'all'}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
    res.send(Buffer.from(buf));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '엑셀 다운로드 실패' });
  }
});
