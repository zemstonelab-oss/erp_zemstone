import { useEffect, useState } from 'react';
import api from '../api/client';
import type { BranchShipmentStats } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = ['#667eea', '#764ba2', '#f59e0b', '#10b981', '#ef4444', '#6366f1', '#ec4899', '#14b8a6'];

export default function BranchShipmentStatsPage() {
  const [stats, setStats] = useState<BranchShipmentStats | null>(null);
  const [period, setPeriod] = useState<'monthly' | 'quarterly'>('monthly');
  const [year, setYear] = useState(new Date().getFullYear());

  const load = async () => {
    const { data } = await api.get('/dashboard/branch-shipment-stats', { params: { period, year } });
    setStats(data);
  };

  useEffect(() => { load(); }, [period, year]);

  const years = Array.from({ length: 3 }, (_, i) => new Date().getFullYear() - i);

  return (
    <div>
      <div className="flex justify-between items-center mb-6 pb-4 border-b-2 border-gray-200">
        <h1 className="text-2xl font-bold">🏢 지점별 출고 이력</h1>
        <div className="flex items-center gap-3">
          <select
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            className="border rounded-lg px-3 py-2 text-sm"
          >
            {years.map(y => <option key={y} value={y}>{y}년</option>)}
          </select>
          <div className="flex bg-gray-100 rounded-lg overflow-hidden">
            <button
              onClick={() => setPeriod('monthly')}
              className={`px-4 py-2 text-sm font-medium transition ${period === 'monthly' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-200'}`}
            >월별</button>
            <button
              onClick={() => setPeriod('quarterly')}
              className={`px-4 py-2 text-sm font-medium transition ${period === 'quarterly' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-200'}`}
            >분기별</button>
          </div>
        </div>
      </div>

      {stats && (
        <>
          <div className="bg-white rounded-xl shadow p-6 mb-6">
            <h2 className="text-sm font-semibold mb-4">📊 지점별 출고 비교 차트</h2>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={stats.data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                {stats.branches.map((branch, i) => (
                  <Bar key={branch} dataKey={branch} fill={COLORS[i % COLORS.length]} radius={[2, 2, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <h2 className="text-sm font-semibold">상세 데이터</h2>
            </div>
            <div className="p-3 overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-blue-600 text-white">
                    <th className="p-2 text-left">기간</th>
                    {stats.branches.map(b => <th key={b} className="p-2 text-center">{b}</th>)}
                    <th className="p-2 text-center">합계</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.data.map((row, i) => {
                    const total = stats.branches.reduce((sum, b) => sum + (row[b] || 0), 0);
                    return (
                      <tr key={i} className="border-b hover:bg-blue-50">
                        <td className="p-2 font-medium">{row.period}</td>
                        {stats.branches.map(b => (
                          <td key={b} className="p-2 text-center">{row[b] || '-'}</td>
                        ))}
                        <td className="p-2 text-center font-bold text-red-600 bg-red-50">{total || '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
