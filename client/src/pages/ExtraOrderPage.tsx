import { useEffect, useState } from 'react';
import api from '../api/client';
import type { Product, ExtraOrderRequest, InventoryItem } from '../types';

interface CartItem {
  productId: number;
  productName: string;
  quantity: number;
  remaining: number;
}

export default function ExtraOrderPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [requests, setRequests] = useState<ExtraOrderRequest[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [reason, setReason] = useState('');
  const [memo, setMemo] = useState('');
  const [desiredDate, setDesiredDate] = useState('');
  const [desiredTime, setDesiredTime] = useState('');

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

  // 재고 테이블에서 수량 직접 입력
  const updateCartFromInventory = (item: InventoryItem, qty: number) => {
    const remaining = item.totalOrdered - item.totalShipped;
    if (qty <= 0) {
      setCart(prev => prev.filter(c => c.productId !== item.productId));
      return;
    }
    if (qty > remaining) qty = remaining;
    setCart(prev => {
      const exists = prev.find(c => c.productId === item.productId);
      if (exists) {
        return prev.map(c => c.productId === item.productId ? { ...c, quantity: qty } : c);
      }
      return [...prev, { productId: item.productId, productName: item.product.name, quantity: qty, remaining }];
    });
  };

  const getCartQty = (productId: number) => {
    return cart.find(c => c.productId === productId)?.quantity || 0;
  };

  const removeFromCart = (productId: number) => {
    setCart(prev => prev.filter(c => c.productId !== productId));
  };

  const handleSubmit = async () => {
    if (cart.length === 0) { alert('품목을 선택하고 수량을 입력하세요.'); return; }
    
    const itemList = cart.map(c => `${c.productName} ${c.quantity}개`).join(', ');
    if (!confirm(`다음 품목을 출고 요청하시겠습니까?\n\n${itemList}`)) return;

    try {
      // 각 품목별로 출고 요청 생성
      await Promise.all(cart.map(c =>
        api.post('/extra-orders', {
          productId: c.productId,
          quantity: c.quantity,
          reason: reason || undefined,
          memo: memo || undefined,
          desiredDate: desiredDate || undefined,
          desiredTime: desiredTime || undefined,
        })
      ));
      setCart([]);
      setReason('');
      setMemo('');
      setDesiredDate('');
      setDesiredTime('');
      alert(`${cart.length}건의 출고 요청이 등록되었습니다.`);
      load();
    } catch (e: any) {
      alert(e.response?.data?.error || '요청 실패');
    }
  };

  const totalCartItems = cart.reduce((s, c) => s + c.quantity, 0);

  const statusLabel: Record<string, { text: string; color: string }> = {
    PENDING: { text: '대기중', color: 'bg-yellow-100 text-yellow-700' },
    APPROVED: { text: '승인', color: 'bg-green-100 text-green-700' },
    REJECTED: { text: '거절', color: 'bg-red-100 text-red-700' },
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6 pb-4 border-b-2 border-gray-200">
        <h1 className="text-2xl font-bold">출고 요청</h1>
        {cart.length > 0 && (
          <span className="px-3 py-1.5 bg-blue-500 text-white rounded-full text-xs font-semibold">
            {cart.length}개 품목 · {totalCartItems}개 선택
          </span>
        )}
      </div>

      {/* 재고 현황 + 수량 입력 통합 테이블 */}
      <div className="bg-white rounded-xl shadow overflow-hidden mb-6">
        <div className="px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white flex justify-between items-center">
          <h3 className="text-sm font-semibold">내 재고 현황 — 수량 입력 후 아래에서 요청하기</h3>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left">품목명</th>
              <th className="px-4 py-3 text-center">총 발주량</th>
              <th className="px-4 py-3 text-center">출고량</th>
              <th className="px-4 py-3 text-center">잔량</th>
              <th className="px-4 py-3 text-center w-40">요청 수량</th>
            </tr>
          </thead>
          <tbody>
            {inventory.map(item => {
              const remaining = item.totalOrdered - item.totalShipped;
              const isLow = item.totalOrdered > 0 && remaining <= item.totalOrdered * 0.2;
              const cartQty = getCartQty(item.productId);
              return (
                <tr key={item.id} className={`border-t hover:bg-gray-50 ${cartQty > 0 ? 'bg-blue-50' : ''}`}>
                  <td className="px-4 py-3 font-medium">{item.product.name}</td>
                  <td className="px-4 py-3 text-center">{item.totalOrdered}</td>
                  <td className="px-4 py-3 text-center">{item.totalShipped}</td>
                  <td className={`px-4 py-3 text-center font-semibold ${isLow ? 'text-red-600' : ''}`}>
                    {remaining}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {remaining > 0 ? (
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => updateCartFromInventory(item, cartQty - 1)}
                          disabled={cartQty <= 0}
                          className="w-7 h-7 rounded bg-red-100 text-red-600 font-bold hover:bg-red-200 disabled:opacity-30 disabled:cursor-not-allowed"
                        >−</button>
                        <input
                          type="number"
                          min={0}
                          max={remaining}
                          value={cartQty || ''}
                          placeholder="0"
                          onChange={e => updateCartFromInventory(item, Number(e.target.value) || 0)}
                          className="w-16 text-center border-2 border-gray-200 rounded py-1 text-sm focus:outline-none focus:border-blue-500"
                        />
                        <button
                          onClick={() => updateCartFromInventory(item, cartQty + 1)}
                          disabled={cartQty >= remaining}
                          className="w-7 h-7 rounded bg-blue-500 text-white font-bold hover:bg-blue-600 disabled:opacity-30 disabled:cursor-not-allowed"
                        >+</button>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs">재고 없음</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 요청 정보 + 제출 */}
      <div className="bg-white rounded-xl shadow p-5 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold">요청 정보</h3>
          {cart.length > 0 && (
            <span className="text-sm text-gray-500">{cart.length}개 품목 · 총 {totalCartItems}개</span>
          )}
        </div>

        {cart.length > 0 && (
          <div className="mb-4 border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">품목명</th>
                  <th className="px-4 py-2 text-center text-xs font-semibold text-gray-500 w-44">수량</th>
                  <th className="px-4 py-2 text-center text-xs font-semibold text-gray-500 w-16">삭제</th>
                </tr>
              </thead>
              <tbody>
                {cart.map(c => (
                  <tr key={c.productId} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-medium">{c.productName}</td>
                    <td className="px-4 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => updateCartFromInventory(
                            inventory.find(i => i.productId === c.productId)!,
                            c.quantity - 1
                          )}
                          className="w-7 h-7 rounded bg-red-100 text-red-600 font-bold hover:bg-red-200"
                        >−</button>
                        <input
                          type="number"
                          min={1}
                          max={c.remaining}
                          value={c.quantity}
                          onChange={e => {
                            const v = Math.max(1, Math.min(c.remaining, Number(e.target.value) || 1));
                            setCart(prev => prev.map(x => x.productId === c.productId ? { ...x, quantity: v } : x));
                          }}
                          className="w-16 text-center border-2 border-gray-200 rounded py-1 text-sm focus:outline-none focus:border-blue-500"
                        />
                        <button
                          onClick={() => updateCartFromInventory(
                            inventory.find(i => i.productId === c.productId)!,
                            c.quantity + 1
                          )}
                          disabled={c.quantity >= c.remaining}
                          className="w-7 h-7 rounded bg-blue-500 text-white font-bold hover:bg-blue-600 disabled:opacity-30 disabled:cursor-not-allowed"
                        >+</button>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <button onClick={() => removeFromCart(c.productId)} className="text-gray-400 hover:text-red-500 text-lg">🗑</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">희망 배송일</label>
            <input type="date" value={desiredDate} onChange={e => setDesiredDate(e.target.value)}
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">희망 배송시간</label>
            <select value={desiredTime} onChange={e => setDesiredTime(e.target.value)}
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500">
              <option value="">시간 선택</option>
              {Array.from({ length: 11 }, (_, i) => i + 8).map(h => (
                <option key={h} value={`${String(h).padStart(2,'0')}:00`}>{String(h).padStart(2,'0')}:00</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">사유</label>
            <input value={reason} onChange={e => setReason(e.target.value)}
              placeholder="사유 입력 (선택)" className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">특이사항</label>
            <input value={memo} onChange={e => setMemo(e.target.value)}
              placeholder="예: 포장 따로" className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500" />
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={cart.length === 0}
          className={`mt-4 w-full py-3 rounded-lg font-semibold text-white transition ${
            cart.length > 0
              ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:shadow-lg'
              : 'bg-gray-300 cursor-not-allowed'
          }`}
        >
          {cart.length > 0 ? `${cart.length}개 품목 출고 요청하기` : '위 테이블에서 수량을 입력하세요'}
        </button>
      </div>

      {/* 요청 내역 */}
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
              <th className="px-4 py-3 text-center">희망일시</th>
              <th className="px-4 py-3 text-center">상태</th>
              <th className="px-4 py-3 text-center">요청일</th>
            </tr>
          </thead>
          <tbody>
            {requests.map(r => (
              <tr key={r.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{r.product.name}</td>
                <td className="px-4 py-3 text-center">{r.quantity}</td>
                <td className="px-4 py-3 text-gray-600 text-xs">{r.reason || '-'}</td>
                <td className="px-4 py-3 text-gray-600 text-xs">{r.memo || '-'}</td>
                <td className="px-4 py-3 text-center text-xs text-gray-500">
                  {r.desiredDate ? new Date(r.desiredDate).toLocaleDateString('ko-KR') : '-'}
                  {r.desiredTime && <div className="text-gray-400">{r.desiredTime}</div>}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusLabel[r.status].color}`}>
                    {statusLabel[r.status].text}
                  </span>
                </td>
                <td className="px-4 py-3 text-center text-xs text-gray-500">
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
