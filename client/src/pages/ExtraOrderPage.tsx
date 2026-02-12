import { useEffect, useState } from 'react';
import api from '../api/client';
import type { Product, ExtraOrderRequest, InventoryItem } from '../types';

export default function ExtraOrderPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [requests, setRequests] = useState<ExtraOrderRequest[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [memo, setMemo] = useState('');
  const [desiredDate, setDesiredDate] = useState('');

  const load = async () => {
    const [p, r, inv] = await Promise.all([
      api.get('/products'),
      api.get('/extra-orders'),
      api.get('/inventory'),
    ]);
    setProducts(p.data.filter((x: Product) => x.isActive));
    setRequests(r.data);
    setInventory(inv.data);
  };

  useEffect(() => { load(); }, []);

  const handleInventoryRequest = (item: InventoryItem) => {
    setProductId(String(item.productId));
    // scroll to form
    document.getElementById('extra-order-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = async () => {
    if (!productId || !quantity) { alert('품목과 수량을 입력하세요.'); return; }
    if (!confirm('출고를 요청하시겠습니까?')) return;
    await api.post('/extra-orders', {
      productId: Number(productId),
      quantity: Number(quantity),
      reason: reason || undefined,
      memo: memo || undefined,
      desiredDate: desiredDate || undefined,
    });
    setProductId(''); setQuantity(''); setReason(''); setMemo(''); setDesiredDate('');
    alert('요청이 등록되었습니다.');
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
        <h1 className="text-2xl font-bold">출고 요청</h1>
      </div>

      {/* My Inventory */}
      {inventory.length > 0 && (
        <div className="bg-white rounded-xl shadow overflow-hidden mb-6">
          <div className="px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white">
            <h3 className="text-sm font-semibold">내 재고 현황</h3>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">품목명</th>
                <th className="px-4 py-3 text-center">총 발주량</th>
                <th className="px-4 py-3 text-center">출고량</th>
                <th className="px-4 py-3 text-center">잔량</th>
                <th className="px-4 py-3 text-center">출고 요청</th>
              </tr>
            </thead>
            <tbody>
              {inventory.map(item => {
                const remaining = item.totalOrdered - item.totalShipped;
                const isLow = item.totalOrdered > 0 && remaining <= item.totalOrdered * 0.2;
                return (
                  <tr key={item.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{item.product.name}</td>
                    <td className="px-4 py-3 text-center">{item.totalOrdered}</td>
                    <td className="px-4 py-3 text-center">{item.totalShipped}</td>
                    <td className={`px-4 py-3 text-center font-semibold ${isLow ? 'text-red-600' : ''}`}>
                      {remaining}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        disabled={remaining <= 0}
                        onClick={() => handleInventoryRequest(item)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                          remaining <= 0
                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            : 'bg-blue-500 text-white hover:bg-blue-600'
                        }`}
                      >
                        출고 요청
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Request Form */}
      <div id="extra-order-form" className="bg-white rounded-xl shadow p-5 mb-6">
        <h3 className="font-semibold mb-4">새 요청</h3>
        <div className="grid grid-cols-3 gap-4 mb-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">품목</label>
            <select value={productId} onChange={e => setProductId(e.target.value)}
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500">
              <option value="">선택하세요</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">수량</label>
            <input type="number" min={1} value={quantity} onChange={e => setQuantity(e.target.value)}
              placeholder="수량 입력" className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">사유</label>
            <input value={reason} onChange={e => setReason(e.target.value)}
              placeholder="사유 입력 (선택)" className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">희망 배송일</label>
            <input type="date" value={desiredDate} onChange={e => setDesiredDate(e.target.value)}
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500" />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-gray-500 mb-1">특이사항</label>
            <input value={memo} onChange={e => setMemo(e.target.value)}
              placeholder="배송 관련 특이사항 (선택, 예: 포장 따로, 오전 배송 필수)" className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500" />
          </div>
        </div>
        <button onClick={handleSubmit}
          className="mt-4 px-6 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-semibold hover:shadow-lg transition">
          요청하기
        </button>
      </div>

      {/* My Requests */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="px-4 py-3 bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white">
          <h3 className="text-sm font-semibold">내 요청 내역</h3>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left">품목</th>
              <th className="px-4 py-3 text-center">수량</th>
              <th className="px-4 py-3 text-left">사유</th>
              <th className="px-4 py-3 text-left">특이사항</th>
              <th className="px-4 py-3 text-center">희망 배송일</th>
              <th className="px-4 py-3 text-center">상태</th>
              <th className="px-4 py-3 text-center">요청일</th>
            </tr>
          </thead>
          <tbody>
            {requests.map(r => (
              <tr key={r.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{r.product.name}</td>
                <td className="px-4 py-3 text-center">{r.quantity}</td>
                <td className="px-4 py-3 text-gray-600">{r.reason || '-'}</td>
                <td className="px-4 py-3 text-gray-600">{r.memo || '-'}</td>
                <td className="px-4 py-3 text-center text-gray-500">{r.desiredDate ? new Date(r.desiredDate).toLocaleDateString('ko-KR') : '-'}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusLabel[r.status].color}`}>
                    {statusLabel[r.status].text}
                  </span>
                </td>
                <td className="px-4 py-3 text-center text-gray-500">
                  {new Date(r.createdAt).toLocaleDateString('ko-KR')}
                </td>
              </tr>
            ))}
            {requests.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">요청 내역이 없습니다.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
