import { useState, useEffect } from 'react';
import api from '../api/client';
import type { Branch } from '../types';

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

interface BillingSummary {
  branches: BranchBilling[];
  grandTotal: number;
}

function formatWon(n: number) {
  return n.toLocaleString('ko-KR') + '원';
}

export default function BillingPage() {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const [startDate, setStartDate] = useState(firstDay.toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(today.toISOString().slice(0, 10));
  const [branchId, setBranchId] = useState<string>('');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [data, setData] = useState<BillingSummary | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/branches').then(r => setBranches(r.data));
  }, []);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const params: any = { startDate, endDate };
      if (branchId) params.branchId = branchId;
      const { data } = await api.get('/billing/summary', { params });
      setData(data);
    } catch {
      alert('정산 조회 실패');
    }
    setLoading(false);
  };

  useEffect(() => { fetchSummary(); }, [startDate, endDate, branchId]);

  const handleExport = async () => {
    try {
      const params: any = { startDate, endDate };
      if (branchId) params.branchId = branchId;
      const res = await api.get('/billing/export', { params, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `정산서_${startDate}_${endDate}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('엑셀 다운로드 실패');
    }
  };

  const setQuickRange = (type: 'month' | 'quarter' | 'prevMonth' | 'prevQuarter') => {
    const now = new Date();
    let s: Date, e: Date;
    if (type === 'month') {
      s = new Date(now.getFullYear(), now.getMonth(), 1);
      e = now;
    } else if (type === 'prevMonth') {
      s = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      e = new Date(now.getFullYear(), now.getMonth(), 0);
    } else if (type === 'quarter') {
      const q = Math.floor(now.getMonth() / 3);
      s = new Date(now.getFullYear(), q * 3, 1);
      e = now;
    } else {
      const q = Math.floor(now.getMonth() / 3) - 1;
      const year = q < 0 ? now.getFullYear() - 1 : now.getFullYear();
      const qAdj = q < 0 ? 3 : q;
      s = new Date(year, qAdj * 3, 1);
      e = new Date(year, qAdj * 3 + 3, 0);
    }
    setStartDate(s.toISOString().slice(0, 10));
    setEndDate(e.toISOString().slice(0, 10));
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">💰 정산 관리</h1>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow p-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setQuickRange('month')} className="px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200">이번 달</button>
          <button onClick={() => setQuickRange('prevMonth')} className="px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200">지난 달</button>
          <button onClick={() => setQuickRange('quarter')} className="px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200">이번 분기</button>
          <button onClick={() => setQuickRange('prevQuarter')} className="px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200">지난 분기</button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
            className="border rounded px-3 py-2 text-sm" />
          <span className="text-gray-400">~</span>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
            className="border rounded px-3 py-2 text-sm" />
          <select value={branchId} onChange={e => setBranchId(e.target.value)}
            className="border rounded px-3 py-2 text-sm">
            <option value="">전체 사업소</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <button onClick={handleExport}
            className="ml-auto px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition">
            📥 엑셀 다운로드
          </button>
        </div>
      </div>

      {loading && <div className="text-center text-gray-500 py-8">조회 중...</div>}

      {data && !loading && (
        <>
          {/* Grand total */}
          <div className="bg-white rounded-xl shadow p-4 flex items-center justify-between">
            <span className="text-lg font-semibold">전체 합계</span>
            <span className="text-2xl font-bold text-blue-700">{formatWon(data.grandTotal)}</span>
          </div>

          {/* Branch tables */}
          {data.branches.length === 0 && (
            <div className="text-center text-gray-400 py-12">해당 기간 출고 내역이 없습니다.</div>
          )}

          {data.branches.map(branch => (
            <div key={branch.branchId} className="bg-white rounded-xl shadow overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b">
                <span className="font-semibold">{branch.branchName} ({branch.branchCode})</span>
                <span className="text-blue-700 font-bold">{formatWon(branch.total)}</span>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-600">
                    <th className="text-left px-4 py-2">품목</th>
                    <th className="text-right px-4 py-2">단위</th>
                    <th className="text-right px-4 py-2">수량</th>
                    <th className="text-right px-4 py-2">단가</th>
                    <th className="text-right px-4 py-2">금액</th>
                  </tr>
                </thead>
                <tbody>
                  {branch.items.map((item, i) => (
                    <tr key={i} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-2">{item.productName}</td>
                      <td className="text-right px-4 py-2">{item.unit}</td>
                      <td className="text-right px-4 py-2">{item.quantity.toLocaleString()}</td>
                      <td className="text-right px-4 py-2">{formatWon(item.unitPrice)}</td>
                      <td className="text-right px-4 py-2 font-medium">{formatWon(item.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
