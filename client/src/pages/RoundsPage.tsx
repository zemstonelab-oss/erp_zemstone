import { useEffect, useState } from 'react';
import api from '../api/client';
import { useAuthStore } from '../store/authStore';
import type { OrderRound, Branch, Product } from '../types';

export default function RoundsPage() {
  const user = useAuthStore(s => s.user);
  const isAdmin = user?.role === 'ADMIN';
  const [rounds, setRounds] = useState<OrderRound[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedRound, setSelectedRound] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editRound, setEditRound] = useState<OrderRound | null>(null);
  const [formData, setFormData] = useState<Record<string, number>>({});
  const [newRoundNo, setNewRoundNo] = useState(0);

  const load = async () => {
    const [r, b, p] = await Promise.all([
      api.get('/rounds'), api.get('/branches'), api.get('/products'),
    ]);
    setRounds(r.data);
    setBranches(b.data.filter((x: Branch) => x.isActive));
    setProducts(p.data.filter((x: Product) => x.isActive));
    if (r.data.length > 0 && !selectedRound) setSelectedRound(r.data[0].id);
  };

  useEffect(() => { load(); }, []);

  const current = rounds.find(r => r.id === selectedRound);

  const getQty = (round: OrderRound, bId: number, pId: number) =>
    round.items.find(i => i.branchId === bId && i.productId === pId)?.quantity || 0;

  const openNewModal = () => {
    const maxNo = rounds.length > 0 ? Math.max(...rounds.map(r => r.roundNo)) : 0;
    setNewRoundNo(maxNo + 1);
    setEditRound(null);
    setFormData({});
    setShowModal(true);
  };

  const openEditModal = (round: OrderRound) => {
    setEditRound(round);
    setNewRoundNo(round.roundNo);
    const data: Record<string, number> = {};
    round.items.forEach(i => { data[`${i.branchId}-${i.productId}`] = i.quantity; });
    setFormData(data);
    setShowModal(true);
  };

  const handleSave = async () => {
    const items = branches.flatMap(b =>
      products.map(p => ({
        branchId: b.id,
        productId: p.id,
        quantity: formData[`${b.id}-${p.id}`] || 0,
      }))
    );

    if (editRound) {
      await api.put(`/rounds/${editRound.id}`, {
        roundNo: newRoundNo,
        orderDate: new Date().toISOString().split('T')[0],
        items,
      });
    } else {
      await api.post('/rounds', {
        roundNo: newRoundNo,
        orderDate: new Date().toISOString().split('T')[0],
        items,
      });
    }

    setShowModal(false);
    load();
  };

  const handleDelete = async (id: number) => {
    if (rounds.length <= 1) { alert('최소 1개 차수는 유지해야 합니다.'); return; }
    if (!confirm('이 차수를 삭제하시겠습니까?')) return;
    await api.delete(`/rounds/${id}`);
    setSelectedRound(null);
    load();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6 pb-4 border-b-2 border-gray-200">
        <h1 className="text-2xl font-bold">차수 관리</h1>
        {isAdmin && (
          <button onClick={openNewModal} className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-semibold hover:bg-blue-600 transition">
            + 새 차수
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {rounds.map(r => (
          <button
            key={r.id}
            onClick={() => setSelectedRound(r.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium border transition ${
              selectedRound === r.id
                ? 'bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white border-transparent'
                : 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200'
            }`}
          >
            {r.roundNo}차
          </button>
        ))}
      </div>

      {/* Round detail */}
      {current && (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="px-4 py-3 bg-gradient-to-r from-gray-700 to-gray-800 text-white flex justify-between items-center">
            <div>
              <span className="font-semibold">{current.roundNo}차 발주</span>
              <span className="ml-3 text-xs opacity-75">
                {new Date(current.orderDate).toLocaleDateString('ko-KR')}
              </span>
            </div>
            {isAdmin && (
              <div className="flex gap-2">
                <button onClick={() => openEditModal(current)} className="px-3 py-1 bg-white/20 rounded text-xs hover:bg-white/30">수정</button>
                <button onClick={() => handleDelete(current.id)} className="px-3 py-1 bg-red-500/80 rounded text-xs hover:bg-red-600">삭제</button>
              </div>
            )}
          </div>
          <div className="p-4 overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-600 text-white">
                  <th className="p-2.5 text-left">품목</th>
                  {branches.map(b => <th key={b.id} className="p-2.5 text-center">{b.name}</th>)}
                  <th className="p-2.5 text-center">합계</th>
                </tr>
              </thead>
              <tbody>
                {products.map(p => {
                  let total = 0;
                  return (
                    <tr key={p.id} className="border-b hover:bg-blue-50">
                      <td className="p-2.5 font-medium text-blue-600 bg-gray-50">{p.name}</td>
                      {branches.map(b => {
                        const qty = getQty(current, b.id, p.id);
                        total += qty;
                        return <td key={b.id} className="p-2.5 text-center">{qty || '-'}</td>;
                      })}
                      <td className="p-2.5 text-center font-bold text-red-600 bg-red-50">{total}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-5 border-b">
              <h3 className="text-lg font-semibold">{editRound ? `${newRoundNo}차 수정` : `${newRoundNo}차 발주 추가`}</h3>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200">×</button>
            </div>
            <div className="p-5">
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-700 text-white">
                      <th className="p-2.5 text-left">품목</th>
                      {branches.map(b => <th key={b.id} className="p-2.5 text-center">{b.name}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {products.map(p => (
                      <tr key={p.id} className="border-b">
                        <td className="p-2.5 font-semibold bg-gray-50">{p.name}</td>
                        {branches.map(b => (
                          <td key={b.id} className="p-2.5 text-center">
                            <input
                              type="number"
                              min={0}
                              value={formData[`${b.id}-${p.id}`] || ''}
                              onChange={e => setFormData({ ...formData, [`${b.id}-${p.id}`]: Number(e.target.value) })}
                              placeholder="0"
                              className="w-16 px-2 py-1.5 border-2 border-gray-200 rounded text-center text-sm focus:outline-none focus:border-blue-500"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t bg-gray-50">
              <button onClick={() => setShowModal(false)} className="px-5 py-2.5 bg-gray-200 rounded-lg text-sm font-medium hover:bg-gray-300">취소</button>
              <button onClick={handleSave} className="px-5 py-2.5 bg-blue-500 text-white rounded-lg text-sm font-semibold hover:bg-blue-600">저장</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
