import { useEffect, useState } from 'react';
import api from '../api/client';
import { useAuthStore } from '../store/authStore';
import type { DashboardSummary, BranchProgress, InventoryItem, OrderRound, Branch, Product, Notice } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

export default function DashboardPage() {
  const user = useAuthStore(s => s.user);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [progress, setProgress] = useState<BranchProgress[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [rounds, setRounds] = useState<OrderRound[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedRoundIdx, setSelectedRoundIdx] = useState<number>(0); // 0 = 최신 차수 (desc 정렬)
  const [monthlyTrend, setMonthlyTrend] = useState<{month: string; quantity: number}[]>([]);
  const [branchComparison, setBranchComparison] = useState<{branchName: string; shipped: number}[]>([]);
  const [latestNotices, setLatestNotices] = useState<Notice[]>([]);

  const load = async () => {
    const [s, p, inv, r, b, pr] = await Promise.all([
      api.get('/dashboard/summary'),
      api.get('/dashboard/progress'),
      api.get('/inventory'),
      api.get('/rounds'),
      api.get('/branches'),
      api.get('/products'),
    ]);
    const [mt, bc, ln] = await Promise.all([
      api.get('/dashboard/monthly-trend'),
      api.get('/dashboard/branch-comparison'),
      api.get('/notices/latest'),
    ]);
    setSummary(s.data);
    setProgress(p.data);
    setInventory(inv.data);
    setRounds(r.data);
    setBranches(b.data.filter((br: Branch) => br.isActive));
    setProducts(pr.data.filter((p: Product) => p.isActive));
    setMonthlyTrend(mt.data);
    setBranchComparison(bc.data);
    setLatestNotices(ln.data);
  };

  useEffect(() => { load(); }, []);

  const today = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
  });

  // Build matrix helpers
  const getInv = (branchId: number, productId: number) =>
    inventory.find(i => i.branchId === branchId && i.productId === productId);

  const getRoundQty = (round: OrderRound, branchId: number, productId: number) =>
    round.items.find(i => i.branchId === branchId && i.productId === productId)?.quantity || 0;

  const summaryCards = summary ? [
    { label: '총 발주량', value: summary.totalOrdered.toLocaleString(), unit: '박스', color: 'blue', icon: '📦' },
    { label: '출고 완료', value: summary.totalShipped.toLocaleString(), unit: '박스', color: 'green', icon: '🚚' },
    { label: '잔량', value: summary.remaining.toLocaleString(), unit: '박스', color: 'orange', icon: '📋' },
    { label: '출고율', value: summary.shipmentRate, unit: '%', color: 'purple', icon: '📈' },
  ] : [];

  const colorMap: Record<string, string> = {
    blue: 'border-l-blue-500 bg-blue-50',
    green: 'border-l-green-500 bg-green-50',
    orange: 'border-l-orange-500 bg-orange-50',
    purple: 'border-l-purple-500 bg-purple-50',
  };

  const valueColorMap: Record<string, string> = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    orange: 'text-orange-600',
    purple: 'text-purple-600',
  };

  // Branch user: show only their data
  if (user?.role === 'BRANCH') {
    const myInv = inventory.filter(i => i.branchId === user.branchId);
    return (
      <div>
        <div className="flex justify-between items-center mb-6 pb-4 border-b-2 border-gray-200">
          <h1 className="text-2xl font-bold">내 현황</h1>
          <span className="text-sm text-gray-500 bg-white px-4 py-2 rounded-lg shadow-sm">{today}</span>
        </div>
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold mb-4">{user.branchName} 재고 현황</h2>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-700 text-white">
                <th className="p-3 text-left">품목</th>
                <th className="p-3 text-center">총 발주량</th>
                <th className="p-3 text-center">출고량</th>
                <th className="p-3 text-center">잔량</th>
                <th className="p-3 text-center">소진율</th>
              </tr>
            </thead>
            <tbody>
              {myInv.map(inv => (
                <tr key={inv.id} className="border-b hover:bg-blue-50">
                  <td className="p-3 font-medium text-blue-600">{inv.product.name}</td>
                  <td className="p-3 text-center">{inv.totalOrdered}</td>
                  <td className="p-3 text-center">{inv.totalShipped}</td>
                  <td className={`p-3 text-center font-bold ${inv.remaining < 0 ? 'text-red-500' : ''}`}>
                    {inv.remaining}
                  </td>
                  <td className="p-3 text-center">
                    {inv.totalOrdered > 0 ? Math.round((inv.totalShipped / inv.totalOrdered) * 100) : 0}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6 pb-4 border-b-2 border-gray-200">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex items-center gap-3">
          <button onClick={async () => {
            try {
              const res = await api.get('/export/inventory', { responseType: 'blob' });
              const url = window.URL.createObjectURL(new Blob([res.data]));
              const a = document.createElement('a');
              a.href = url;
              a.download = `재고현황_${new Date().toISOString().slice(0,10)}.xlsx`;
              a.click();
              window.URL.revokeObjectURL(url);
            } catch { alert('다운로드 실패'); }
          }}
            className="px-3 py-2 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-700 transition">
            📥 엑셀
          </button>
          <span className="text-sm text-gray-500 bg-white px-4 py-2 rounded-lg shadow-sm">{today}</span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-5 mb-6">
        {summaryCards.map(card => (
          <div key={card.label} className={`bg-white rounded-2xl p-5 shadow border-l-4 ${colorMap[card.color]} flex items-center gap-4 hover:-translate-y-1 transition`}>
            <div className="text-3xl">{card.icon}</div>
            <div>
              <div className="text-xs text-gray-500 font-medium">{card.label}</div>
              <div className={`text-2xl font-bold ${valueColorMap[card.color]}`}>{card.value}</div>
              <div className="text-xs text-gray-400">{card.unit}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Latest Notices */}
      {latestNotices.length > 0 && (
        <div className="bg-white rounded-xl shadow p-4 mb-6">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-sm font-semibold">📢 최신 공지사항</h2>
            <a href="/notices" className="text-xs text-blue-600 hover:underline">전체보기 →</a>
          </div>
          <div className="space-y-2">
            {latestNotices.map(n => (
              <div key={n.id} className="flex items-center gap-3 text-sm">
                {n.pinned && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded">📌</span>}
                <span className="font-medium truncate flex-1">{n.title}</span>
                <span className="text-xs text-gray-400 flex-shrink-0">{new Date(n.createdAt).toLocaleDateString('ko-KR')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2x2 Grid Tables */}
      <div className="grid grid-cols-2 gap-5 mb-6">
        {/* 총 발주량 */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white">
            <h2 className="text-sm font-semibold">총 발주량</h2>
          </div>
          <div className="p-3 overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-green-600 text-white">
                  <th className="p-2 text-left">품목</th>
                  {branches.map(b => <th key={b.id} className="p-2 text-center">{b.name}</th>)}
                  <th className="p-2 text-center">합계</th>
                </tr>
              </thead>
              <tbody>
                {products.map(p => {
                  let total = 0;
                  return (
                    <tr key={p.id} className="border-b hover:bg-blue-50">
                      <td className="p-2 font-medium text-blue-600 bg-gray-50">{p.name}</td>
                      {branches.map(b => {
                        const inv = getInv(b.id, p.id);
                        const qty = inv?.totalOrdered || 0;
                        total += qty;
                        return <td key={b.id} className="p-2 text-center">{qty || '-'}</td>;
                      })}
                      <td className="p-2 text-center font-bold text-red-600 bg-red-50">{total}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* 발주 잔량 */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="px-4 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white">
            <h2 className="text-sm font-semibold">발주 잔량</h2>
          </div>
          <div className="p-3 overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-yellow-600 text-white">
                  <th className="p-2 text-left">품목</th>
                  {branches.map(b => <th key={b.id} className="p-2 text-center">{b.name}</th>)}
                  <th className="p-2 text-center">합계</th>
                </tr>
              </thead>
              <tbody>
                {products.map(p => {
                  let total = 0;
                  return (
                    <tr key={p.id} className="border-b hover:bg-blue-50">
                      <td className="p-2 font-medium text-blue-600 bg-gray-50">{p.name}</td>
                      {branches.map(b => {
                        const inv = getInv(b.id, p.id);
                        const rem = inv ? inv.remaining : 0;
                        total += rem;
                        return (
                          <td key={b.id} className={`p-2 text-center ${rem < 0 ? 'text-red-500 font-semibold' : ''}`}>
                            {rem || '-'}
                          </td>
                        );
                      })}
                      <td className={`p-2 text-center font-bold bg-red-50 ${total < 0 ? 'text-red-500' : 'text-red-600'}`}>{total}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* 본사 발주 수량 (차수별 네비게이션) */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white flex items-center justify-between">
            <h2 className="text-sm font-semibold">본사 발주 수량</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedRoundIdx(prev => prev < rounds.length - 1 ? prev + 1 : prev)}
                disabled={selectedRoundIdx === rounds.length - 1}
                className="px-2 py-0.5 rounded bg-blue-400/50 hover:bg-blue-400 disabled:opacity-30 disabled:cursor-not-allowed text-white text-xs font-bold transition"
              >◀</button>
              <span className="text-xs font-medium min-w-[80px] text-center">
                {rounds[selectedRoundIdx]
                  ? `${rounds[selectedRoundIdx].roundNo}차 (${new Date(rounds[selectedRoundIdx].orderDate).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' })})`
                  : '-'}
              </span>
              <button
                onClick={() => setSelectedRoundIdx(prev => prev > 0 ? prev - 1 : prev)}
                disabled={selectedRoundIdx === 0}
                className="px-2 py-0.5 rounded bg-blue-400/50 hover:bg-blue-400 disabled:opacity-30 disabled:cursor-not-allowed text-white text-xs font-bold transition"
              >▶</button>
            </div>
          </div>
          <div className="p-3 overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-blue-600 text-white">
                  <th className="p-2 text-left">품목</th>
                  {branches.map(b => <th key={b.id} className="p-2 text-center">{b.name}</th>)}
                  <th className="p-2 text-center">합계</th>
                </tr>
              </thead>
              <tbody>
                {products.map(p => {
                  let total = 0;
                  return (
                    <tr key={p.id} className="border-b hover:bg-blue-50">
                      <td className="p-2 font-medium text-blue-600 bg-gray-50">{p.name}</td>
                      {branches.map(b => {
                        const qty = rounds[selectedRoundIdx] ? getRoundQty(rounds[selectedRoundIdx], b.id, p.id) : 0;
                        total += qty;
                        return <td key={b.id} className="p-2 text-center">{qty || '-'}</td>;
                      })}
                      <td className="p-2 text-center font-bold text-red-600 bg-red-50">{total}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* 출고 총계 */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white">
            <h2 className="text-sm font-semibold">출고 총계</h2>
          </div>
          <div className="p-3 overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-red-600 text-white">
                  <th className="p-2 text-left">품목</th>
                  {branches.map(b => <th key={b.id} className="p-2 text-center">{b.name}</th>)}
                  <th className="p-2 text-center">합계</th>
                </tr>
              </thead>
              <tbody>
                {products.map(p => {
                  let total = 0;
                  return (
                    <tr key={p.id} className="border-b hover:bg-blue-50">
                      <td className="p-2 font-medium text-blue-600 bg-gray-50">{p.name}</td>
                      {branches.map(b => {
                        const inv = getInv(b.id, p.id);
                        const qty = inv?.totalShipped || 0;
                        total += qty;
                        return <td key={b.id} className="p-2 text-center">{qty || '-'}</td>;
                      })}
                      <td className="p-2 text-center font-bold text-red-600 bg-red-50">{total}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-5 mb-6">
        <div className="bg-white rounded-xl shadow p-5">
          <h2 className="text-sm font-semibold mb-4">📊 월별 출고 추이 (최근 6개월)</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="quantity" name="출고 수량" fill="#667eea" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-xl shadow p-5">
          <h2 className="text-sm font-semibold mb-4">🏢 사업소별 출고 비교</h2>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={branchComparison} dataKey="shipped" nameKey="branchName"
                cx="50%" cy="50%" outerRadius={100} label={({ name, percent }: any) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}>
                {branchComparison.map((_, i) => (
                  <Cell key={i} fill={['#667eea', '#764ba2', '#f59e0b', '#10b981', '#ef4444', '#6366f1', '#ec4899', '#14b8a6'][i % 8]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Branch Progress */}
      <div className="bg-white rounded-2xl p-6 shadow">
        <h2 className="text-base font-semibold mb-5">사업소별 출고 진행률</h2>
        <div className="space-y-4">
          {progress.map(bp => {
            const gradient =
              bp.rate >= 100 ? 'from-green-500 to-green-400' :
              bp.rate >= 70 ? 'from-blue-500 to-blue-400' :
              bp.rate >= 40 ? 'from-orange-500 to-yellow-400' :
              'from-red-500 to-pink-500';
            return (
              <div key={bp.branchId}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="font-medium">{bp.branchName}</span>
                  <span className="text-gray-500 font-semibold">{bp.rate}%</span>
                </div>
                <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${gradient} transition-all duration-1000`}
                    style={{ width: `${Math.min(bp.rate, 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
