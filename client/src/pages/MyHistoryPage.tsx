import { useEffect, useState } from 'react';
import api from '../api/client';
import type { Shipment } from '../types';
import { DELIVERY_STATUS_LABELS, DELIVERY_STATUS_COLORS } from '../types';
import type { DeliveryStatus } from '../types';

export default function MyHistoryPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const load = async (p = 1) => {
    const { data } = await api.get('/shipments', { params: { page: p, limit: 20 } });
    setShipments(data.data);
    setTotal(data.total);
    setPage(data.page);
    setTotalPages(data.totalPages);
  };

  useEffect(() => { load(); }, []);

  const downloadExcel = () => {
    window.open('/api/export/shipments', '_blank');
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6 pb-4 border-b-2 border-gray-200">
        <h1 className="text-2xl font-bold">내 히스토리</h1>
        <button onClick={downloadExcel}
          className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition">
          📥 엑셀 다운로드
        </button>
      </div>

      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead className="bg-gray-700 text-white">
            <tr>
              <th className="p-3 text-center">날짜</th>
              <th className="p-3 text-left">품목</th>
              <th className="p-3 text-center">수량</th>
              <th className="p-3 text-center">배송 상태</th>
              <th className="p-3 text-center">배송 예정</th>
              <th className="p-3 text-center">담당자</th>
              <th className="p-3 text-left">비고</th>
            </tr>
          </thead>
          <tbody>
            {shipments.map(sh =>
              sh.items.map((item, idx) => (
                <tr key={`${sh.id}-${item.id}`} className="border-b hover:bg-blue-50">
                  {idx === 0 && (
                    <td className="p-3 text-center" rowSpan={sh.items.length}>
                      {new Date(sh.createdAt).toLocaleDateString('ko-KR')}
                    </td>
                  )}
                  <td className="p-3 font-medium">{item.product.name}</td>
                  <td className="p-3 text-center">{item.quantity}</td>
                  {idx === 0 && (
                    <>
                      <td className="p-3 text-center" rowSpan={sh.items.length}>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${DELIVERY_STATUS_COLORS[sh.deliveryStatus as DeliveryStatus] || 'bg-gray-200'}`}>
                          {DELIVERY_STATUS_LABELS[sh.deliveryStatus as DeliveryStatus] || sh.deliveryStatus}
                        </span>
                      </td>
                      <td className="p-3 text-center text-xs" rowSpan={sh.items.length}>
                        {sh.scheduledDate ? new Date(sh.scheduledDate).toLocaleDateString('ko-KR') : '-'}
                        {sh.scheduledTime && <div className="text-gray-500">{sh.scheduledTime}</div>}
                        {sh.deliveredAt && (
                          <div className="text-green-600 mt-1">
                            완료: {new Date(sh.deliveredAt).toLocaleString('ko-KR')}
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-center text-xs" rowSpan={sh.items.length}>
                        {sh.driverName || '-'}
                        {sh.driverPhone && <div className="text-gray-500">{sh.driverPhone}</div>}
                      </td>
                      <td className="p-3 text-gray-500" rowSpan={sh.items.length}>{sh.notes || '-'}</td>
                    </>
                  )}
                </tr>
              ))
            )}
            {shipments.length === 0 && (
              <tr><td colSpan={7} className="p-10 text-center text-gray-400">출고 이력이 없습니다.</td></tr>
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
    </div>
  );
}
