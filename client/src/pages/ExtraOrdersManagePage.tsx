import { useEffect, useState } from 'react';
import api from '../api/client';
import { useAuthStore } from '../store/authStore';
import type { ExtraOrderRequest } from '../types';

export default function ExtraOrdersManagePage() {
  const { user } = useAuthStore();
  const [requests, setRequests] = useState<ExtraOrderRequest[]>([]);
  const [filter, setFilter] = useState<string>('');
  const isAdmin = user?.role === 'ADMIN';

  const load = async () => {
    const params: any = {};
    if (filter) params.status = filter;
    const { data } = await api.get('/extra-orders', { params });
    setRequests(data);
  };

  useEffect(() => { load(); }, [filter]);

  const approve = async (id: number) => {
    if (!confirm('승인하시겠습니까?')) return;
    await api.put(`/extra-orders/${id}/approve`);
    load();
  };

  const reject = async (id: number) => {
    if (!confirm('거절하시겠습니까?')) return;
    await api.put(`/extra-orders/${id}/reject`);
    load();
  };

  const statusLabel: Record<string, { text: string; color: string }> = {
    PENDING: { text: '대기중', color: 'bg-yellow-100 text-yellow-700' },
    APPROVED: { text: '승인', color: 'bg-green-100 text-green-700' },
    REJECTED: { text: '거절', color: 'bg-red-100 text-red-700' },
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6 pb-4 border-b-2 border-gray-200">
        <h1 className="text-2xl font-bold">출고 요청 관리</h1>
        <div className="flex gap-2">
          {['', 'PENDING', 'APPROVED', 'REJECTED'].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                filter === s ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'
              }`}>
              {s === '' ? '전체' : statusLabel[s].text}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-700 text-white">
            <tr>
              <th className="p-3 text-left">사업소</th>
              <th className="p-3 text-left">품목</th>
              <th className="p-3 text-center">수량</th>
              <th className="p-3 text-left">사유</th>
              <th className="p-3 text-center">요청자</th>
              <th className="p-3 text-center">요청일</th>
              <th className="p-3 text-center">상태</th>
              <th className="p-3 text-center">처리</th>
            </tr>
          </thead>
          <tbody>
            {requests.map(r => (
              <tr key={r.id} className="border-b hover:bg-blue-50">
                <td className="p-3 font-medium">{r.branch.name}</td>
                <td className="p-3">{r.product.name}</td>
                <td className="p-3 text-center font-semibold">{r.quantity}</td>
                <td className="p-3 text-gray-600">{r.reason || '-'}</td>
                <td className="p-3 text-center">{r.requester?.name || '-'}</td>
                <td className="p-3 text-center text-gray-500">{new Date(r.createdAt).toLocaleDateString('ko-KR')}</td>
                <td className="p-3 text-center">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusLabel[r.status].color}`}>
                    {statusLabel[r.status].text}
                  </span>
                </td>
                <td className="p-3 text-center">
                  {r.status === 'PENDING' && isAdmin ? (
                    <div className="flex gap-1 justify-center">
                      <button onClick={() => approve(r.id)}
                        className="px-2.5 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600">승인</button>
                      <button onClick={() => reject(r.id)}
                        className="px-2.5 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600">거절</button>
                    </div>
                  ) : r.status === 'PENDING' ? (
                    <span className="text-xs text-gray-400">대기중</span>
                  ) : (
                    <span className="text-xs text-gray-400">{r.reviewer?.name || '-'}</span>
                  )}
                </td>
              </tr>
            ))}
            {requests.length === 0 && (
              <tr><td colSpan={8} className="p-10 text-center text-gray-400">요청이 없습니다.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
