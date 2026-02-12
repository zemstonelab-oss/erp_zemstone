import { useEffect, useState } from 'react';
import api from '../api/client';
import type { Branch, Shipment } from '../types';
import { DELIVERY_STATUS_LABELS, DELIVERY_STATUS_COLORS } from '../types';
import type { DeliveryStatus } from '../types';

const STATUS_OPTIONS: DeliveryStatus[] = ['PENDING', 'PREPARING', 'IN_TRANSIT', 'DELIVERED'];

export default function HistoryPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterBranch, setFilterBranch] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    deliveryStatus: '' as DeliveryStatus,
    scheduledDate: '',
    scheduledTime: '',
    driverName: '',
    driverPhone: '',
  });

  const load = async (p = 1) => {
    const params: any = { page: p, limit: 20 };
    if (filterBranch) params.branchId = filterBranch;
    if (filterFrom) params.from = filterFrom;
    if (filterTo) params.to = filterTo;
    const { data } = await api.get('/shipments', { params });
    setShipments(data.data);
    setTotal(data.total);
    setPage(data.page);
    setTotalPages(data.totalPages);
  };

  useEffect(() => {
    api.get('/branches').then(r => setBranches(r.data.filter((b: Branch) => b.isActive)));
  }, []);

  useEffect(() => { load(1); }, [filterBranch, filterFrom, filterTo]);

  const downloadExcel = () => {
    const params = new URLSearchParams();
    if (filterBranch) params.set('branchId', filterBranch);
    window.open(`/api/export/shipments?${params.toString()}`, '_blank');
  };

  const startEdit = (sh: Shipment) => {
    setEditingId(sh.id);
    setEditForm({
      deliveryStatus: (sh.deliveryStatus || 'PENDING') as DeliveryStatus,
      scheduledDate: sh.scheduledDate ? sh.scheduledDate.slice(0, 10) : '',
      scheduledTime: sh.scheduledTime || '',
      driverName: sh.driverName || '',
      driverPhone: sh.driverPhone || '',
    });
  };

  const saveStatus = async (id: number) => {
    const payload: any = { ...editForm };
    if (editForm.deliveryStatus === 'DELIVERED') {
      payload.deliveredAt = new Date().toISOString();
    }
    if (!payload.scheduledDate) payload.scheduledDate = null;
    if (!payload.scheduledTime) payload.scheduledTime = null;
    if (!payload.driverName) payload.driverName = null;
    if (!payload.driverPhone) payload.driverPhone = null;
    await api.put(`/shipments/${id}/status`, payload);
    setEditingId(null);
    load(page);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6 pb-4 border-b-2 border-gray-200">
        <h1 className="text-2xl font-bold">히스토리</h1>
        <button onClick={downloadExcel}
          className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition">
          📥 엑셀 다운로드
        </button>
      </div>

      <div className="bg-white rounded-xl shadow p-4 mb-4 flex gap-4 items-end">
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">사업소</label>
          <select value={filterBranch} onChange={e => setFilterBranch(e.target.value)}
            className="px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500">
            <option value="">전체</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">시작일</label>
          <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)}
            className="px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">종료일</label>
          <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)}
            className="px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500" />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-700 text-white">
            <tr>
              <th className="p-3 text-center">날짜</th>
              <th className="p-3 text-left">사업소</th>
              <th className="p-3 text-left">품목</th>
              <th className="p-3 text-center">수량</th>
              <th className="p-3 text-center">배송 상태</th>
              <th className="p-3 text-center">배송 정보</th>
              <th className="p-3 text-center">처리자</th>
              <th className="p-3 text-left">비고</th>
              <th className="p-3 text-center">관리</th>
            </tr>
          </thead>
          <tbody>
            {shipments.map(sh =>
              sh.items.map((item, idx) => (
                <tr key={`${sh.id}-${item.id}`} className="border-b hover:bg-blue-50">
                  {idx === 0 && (
                    <>
                      <td className="p-3 text-center" rowSpan={sh.items.length}>
                        {new Date(sh.createdAt).toLocaleDateString('ko-KR')}
                      </td>
                      <td className="p-3 font-medium" rowSpan={sh.items.length}>{sh.branch.name}</td>
                    </>
                  )}
                  <td className="p-3">{item.product.name}</td>
                  <td className="p-3 text-center">{item.quantity}</td>
                  {idx === 0 && (
                    <>
                      <td className="p-3 text-center" rowSpan={sh.items.length}>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${DELIVERY_STATUS_COLORS[sh.deliveryStatus as DeliveryStatus] || 'bg-gray-200'}`}>
                          {DELIVERY_STATUS_LABELS[sh.deliveryStatus as DeliveryStatus] || sh.deliveryStatus}
                        </span>
                      </td>
                      <td className="p-3 text-center text-xs" rowSpan={sh.items.length}>
                        {sh.scheduledDate && <div>예정: {new Date(sh.scheduledDate).toLocaleDateString('ko-KR')}</div>}
                        {sh.scheduledTime && <div>{sh.scheduledTime}</div>}
                        {sh.driverName && <div>담당: {sh.driverName}</div>}
                        {sh.driverPhone && <div>{sh.driverPhone}</div>}
                        {sh.deliveredAt && <div className="text-green-600">완료: {new Date(sh.deliveredAt).toLocaleString('ko-KR')}</div>}
                        {!sh.scheduledDate && !sh.driverName && !sh.deliveredAt && '-'}
                      </td>
                      <td className="p-3 text-center" rowSpan={sh.items.length}>{sh.creator?.name || '-'}</td>
                      <td className="p-3 text-gray-500" rowSpan={sh.items.length}>{sh.notes || '-'}</td>
                      <td className="p-3 text-center" rowSpan={sh.items.length}>
                        <button onClick={() => startEdit(sh)}
                          className="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600">
                          배송관리
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))
            )}
            {shipments.length === 0 && (
              <tr><td colSpan={9} className="p-10 text-center text-gray-400">출고 이력이 없습니다.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-4">
          <button disabled={page <= 1} onClick={() => load(page - 1)}
            className="px-3 py-1.5 bg-gray-200 rounded text-sm disabled:opacity-50 hover:bg-gray-300">이전</button>
          <span className="text-sm text-gray-600">{page} / {totalPages} (총 {total}건)</span>
          <button disabled={page >= totalPages} onClick={() => load(page + 1)}
            className="px-3 py-1.5 bg-gray-200 rounded text-sm disabled:opacity-50 hover:bg-gray-300">다음</button>
        </div>
      )}

      {/* Edit Modal */}
      {editingId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setEditingId(null)}>
          <div className="bg-white rounded-xl shadow-xl p-6 w-[420px]" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">배송 정보 관리</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">배송 상태</label>
                <select value={editForm.deliveryStatus} onChange={e => setEditForm({ ...editForm, deliveryStatus: e.target.value as DeliveryStatus })}
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500">
                  {STATUS_OPTIONS.map(s => (
                    <option key={s} value={s}>{DELIVERY_STATUS_LABELS[s]}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">배송 예정일</label>
                  <input type="date" value={editForm.scheduledDate} onChange={e => setEditForm({ ...editForm, scheduledDate: e.target.value })}
                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">배송 예정 시간</label>
                  <input type="text" placeholder="14:00~16:00" value={editForm.scheduledTime} onChange={e => setEditForm({ ...editForm, scheduledTime: e.target.value })}
                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">담당자 이름</label>
                  <input type="text" value={editForm.driverName} onChange={e => setEditForm({ ...editForm, driverName: e.target.value })}
                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">담당자 연락처</label>
                  <input type="text" value={editForm.driverPhone} onChange={e => setEditForm({ ...editForm, driverPhone: e.target.value })}
                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500" />
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setEditingId(null)}
                className="flex-1 py-2 bg-gray-200 rounded-lg text-sm font-semibold hover:bg-gray-300">취소</button>
              <button onClick={() => saveStatus(editingId)}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700">저장</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
