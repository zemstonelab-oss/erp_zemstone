import { useEffect, useState } from 'react';
import api from '../api/client';
import type { Branch, Product, InventoryItem, Shipment, DeliveryStatus } from '../types';
import { DELIVERY_STATUS_LABELS, DELIVERY_STATUS_COLORS } from '../types';

export default function ShipmentPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);

  const [selectedBranch, setSelectedBranch] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [notes, setNotes] = useState('');

  const load = async () => {
    const [b, p, inv, sh] = await Promise.all([
      api.get('/branches'),
      api.get('/products'),
      api.get('/inventory'),
      api.get('/shipments'),
    ]);
    setBranches(b.data.filter((x: Branch) => x.isActive));
    setProducts(p.data.filter((x: Product) => x.isActive));
    setInventory(inv.data);
    setShipments(sh.data.data || sh.data);
  };

  useEffect(() => { load(); }, []);

  const getRemaining = (branchId: number, productId: number) => {
    const inv = inventory.find(i => i.branchId === branchId && i.productId === productId);
    return inv ? inv.remaining : 0;
  };

  const handleSubmit = async () => {
    if (!selectedBranch) { alert('사업소를 선택하세요.'); return; }
    const items = Object.entries(quantities)
      .filter(([, qty]) => qty > 0)
      .map(([productId, quantity]) => ({ productId: Number(productId), quantity }));
    if (items.length === 0) { alert('출고할 품목의 수량을 입력하세요.'); return; }

    if (!confirm(`${items.length}개 품목 출고를 확정하시겠습니까?`)) return;

    await api.post('/shipments', {
      branchId: Number(selectedBranch),
      deliveryDate: deliveryDate || undefined,
      notes: notes || undefined,
      items,
    });

    setQuantities({});
    setNotes('');
    alert('출고가 완료되었습니다.');
    load();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('출고를 취소하시겠습니까?')) return;
    await api.delete(`/shipments/${id}`);
    load();
  };

  const branchId = Number(selectedBranch);

  return (
    <div>
      <div className="flex justify-between items-center mb-6 pb-4 border-b-2 border-gray-200">
        <h1 className="text-2xl font-bold">출고 처리</h1>
      </div>

      <div className="grid grid-cols-2 gap-5">
        {/* Left: Input */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow p-4">
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-gray-500 mb-1">사업소</label>
                <select
                  value={selectedBranch}
                  onChange={e => { setSelectedBranch(e.target.value); setQuantities({}); }}
                  className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="">선택하세요</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-xs font-semibold text-gray-500 mb-1">배송일</label>
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={e => setDeliveryDate(e.target.value)}
                  className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {selectedBranch && (
            <div className="bg-white rounded-xl shadow overflow-hidden">
              <div className="px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white">
                <h3 className="text-sm font-semibold">
                  {branches.find(b => b.id === branchId)?.name} 출고 입력
                </h3>
              </div>
              <div className="p-3">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-600 text-white">
                      <th className="p-2.5 text-center">품목</th>
                      <th className="p-2.5 text-center">현재 잔량</th>
                      <th className="p-2.5 text-center">출고 수량</th>
                      <th className="p-2.5 text-center">출고 후 잔량</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map(p => {
                      const remaining = getRemaining(branchId, p.id);
                      const qty = quantities[p.id] || 0;
                      const after = remaining - qty;
                      return (
                        <tr key={p.id} className="border-b hover:bg-blue-50">
                          <td className="p-2.5 text-center font-medium">{p.name}</td>
                          <td className={`p-2.5 text-center ${remaining <= 0 ? 'text-red-500 font-semibold' : ''}`}>
                            {remaining <= 0 ? '재고 없음' : remaining}
                          </td>
                          <td className="p-2.5 text-center">
                            <input
                              type="number"
                              min={0}
                              value={qty || ''}
                              onChange={e => setQuantities({ ...quantities, [p.id]: Number(e.target.value) })}
                              placeholder="0"
                              className="w-20 px-2 py-1.5 border-2 border-gray-200 rounded text-center text-sm focus:outline-none focus:border-blue-500"
                            />
                          </td>
                          <td className={`p-2.5 text-center ${after < 0 ? 'text-red-500 font-semibold' : ''}`}>
                            {after}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="p-3 bg-gray-50 border-t">
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="특이사항..."
                  rows={2}
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm mb-3 focus:outline-none focus:border-blue-500"
                />
                <button
                  onClick={handleSubmit}
                  className="w-full py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg font-semibold hover:shadow-lg transition"
                >
                  출고 확정
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right: History */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="px-4 py-3 bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white">
            <h3 className="text-sm font-semibold">최근 출고 내역</h3>
          </div>
          <div className="p-3 max-h-[600px] overflow-y-auto">
            {shipments.length === 0 ? (
              <div className="text-center text-gray-400 py-10">출고 내역이 없습니다.</div>
            ) : (
              <div className="space-y-3">
                {shipments.slice(0, 20).map(sh => (
                  <div key={sh.id} className="bg-gray-50 rounded-lg p-3 relative">
                    <button
                      onClick={() => handleDelete(sh.id)}
                      className="absolute top-2 right-2 text-xs text-red-400 hover:text-red-600"
                    >
                      취소
                    </button>
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{sh.branch.name}</span>
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${DELIVERY_STATUS_COLORS[sh.deliveryStatus as DeliveryStatus] || 'bg-gray-200'}`}>
                          {DELIVERY_STATUS_LABELS[sh.deliveryStatus as DeliveryStatus] || '접수'}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400">
                        {new Date(sh.createdAt).toLocaleDateString('ko-KR')}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {sh.items.map(item => (
                        <span key={item.id} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                          {item.product.name}: {item.quantity}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
