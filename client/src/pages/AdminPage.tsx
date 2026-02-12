import { useEffect, useState } from 'react';
import api from '../api/client';
import type { Branch, Product } from '../types';

export default function AdminPage() {
  const [tab, setTab] = useState<'branches' | 'products' | 'users'>('branches');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Branch form
  const [branchForm, setBranchForm] = useState({ code: '', name: '', address: '', manager: '', phone: '' });
  const [editingBranch, setEditingBranch] = useState<number | null>(null);

  // Product form
  const [productForm, setProductForm] = useState({ code: '', name: '', category: '', unit: '박스', price: 0 });
  const [editingProduct, setEditingProduct] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [b, p] = await Promise.all([
        api.get('/branches'),
        api.get('/products'),
      ]);
      setBranches(b.data);
      setProducts(p.data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  // Branch CRUD
  async function saveBranch() {
    try {
      if (editingBranch) {
        await api.put(`/branches/${editingBranch}`, branchForm);
      } else {
        await api.post('/branches', branchForm);
      }
      setBranchForm({ code: '', name: '', address: '', manager: '', phone: '' });
      setEditingBranch(null);
      loadData();
    } catch (e: any) {
      alert(e.response?.data?.error || '저장 실패');
    }
  }

  function editBranch(b: Branch) {
    setEditingBranch(b.id);
    setBranchForm({ code: b.code, name: b.name, address: b.address || '', manager: b.manager || '', phone: b.phone || '' });
  }

  async function deleteBranch(id: number) {
    if (!confirm('삭제하시겠습니까?')) return;
    try {
      await api.delete(`/branches/${id}`);
      loadData();
    } catch (e: any) {
      alert(e.response?.data?.error || '삭제 실패');
    }
  }

  // Product CRUD
  async function saveProduct() {
    try {
      if (editingProduct) {
        await api.put(`/products/${editingProduct}`, productForm);
      } else {
        await api.post('/products', productForm);
      }
      setProductForm({ code: '', name: '', category: '', unit: '박스', price: 0 });
      setEditingProduct(null);
      loadData();
    } catch (e: any) {
      alert(e.response?.data?.error || '저장 실패');
    }
  }

  function editProduct(p: Product) {
    setEditingProduct(p.id);
    setProductForm({ code: p.code, name: p.name, category: p.category || '', unit: p.unit, price: p.price });
  }

  async function deleteProduct(id: number) {
    if (!confirm('삭제하시겠습니까?')) return;
    try {
      await api.delete(`/products/${id}`);
      loadData();
    } catch (e: any) {
      alert(e.response?.data?.error || '삭제 실패');
    }
  }

  if (loading) return <div className="p-6 text-gray-500">로딩 중...</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">어드민</h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b">
        {(['branches', 'products', 'users'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'branches' ? '사업소 관리' : t === 'products' ? '품목 관리' : '사용자 관리'}
          </button>
        ))}
      </div>

      {/* Branches */}
      {tab === 'branches' && (
        <div>
          <div className="bg-white rounded-lg shadow p-4 mb-4">
            <h3 className="font-semibold mb-3">{editingBranch ? '사업소 수정' : '사업소 추가'}</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <input placeholder="코드" value={branchForm.code} onChange={e => setBranchForm({...branchForm, code: e.target.value})}
                className="border rounded px-3 py-2 text-sm" />
              <input placeholder="이름" value={branchForm.name} onChange={e => setBranchForm({...branchForm, name: e.target.value})}
                className="border rounded px-3 py-2 text-sm" />
              <input placeholder="주소" value={branchForm.address} onChange={e => setBranchForm({...branchForm, address: e.target.value})}
                className="border rounded px-3 py-2 text-sm" />
              <input placeholder="담당자" value={branchForm.manager} onChange={e => setBranchForm({...branchForm, manager: e.target.value})}
                className="border rounded px-3 py-2 text-sm" />
              <input placeholder="연락처" value={branchForm.phone} onChange={e => setBranchForm({...branchForm, phone: e.target.value})}
                className="border rounded px-3 py-2 text-sm" />
            </div>
            <div className="mt-3 flex gap-2">
              <button onClick={saveBranch} className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">
                {editingBranch ? '수정' : '추가'}
              </button>
              {editingBranch && (
                <button onClick={() => { setEditingBranch(null); setBranchForm({ code: '', name: '', address: '', manager: '', phone: '' }); }}
                  className="bg-gray-300 px-4 py-2 rounded text-sm hover:bg-gray-400">취소</button>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left">코드</th>
                  <th className="px-4 py-3 text-left">이름</th>
                  <th className="px-4 py-3 text-left">주소</th>
                  <th className="px-4 py-3 text-left">담당자</th>
                  <th className="px-4 py-3 text-left">연락처</th>
                  <th className="px-4 py-3 text-center">관리</th>
                </tr>
              </thead>
              <tbody>
                {branches.map(b => (
                  <tr key={b.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3">{b.code}</td>
                    <td className="px-4 py-3 font-medium">{b.name}</td>
                    <td className="px-4 py-3 text-gray-600">{b.address}</td>
                    <td className="px-4 py-3">{b.manager}</td>
                    <td className="px-4 py-3">{b.phone}</td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => editBranch(b)} className="text-blue-600 hover:underline mr-2">수정</button>
                      <button onClick={() => deleteBranch(b.id)} className="text-red-600 hover:underline">삭제</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Products */}
      {tab === 'products' && (
        <div>
          <div className="bg-white rounded-lg shadow p-4 mb-4">
            <h3 className="font-semibold mb-3">{editingProduct ? '품목 수정' : '품목 추가'}</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <input placeholder="코드" value={productForm.code} onChange={e => setProductForm({...productForm, code: e.target.value})}
                className="border rounded px-3 py-2 text-sm" />
              <input placeholder="품목명" value={productForm.name} onChange={e => setProductForm({...productForm, name: e.target.value})}
                className="border rounded px-3 py-2 text-sm" />
              <input placeholder="카테고리" value={productForm.category} onChange={e => setProductForm({...productForm, category: e.target.value})}
                className="border rounded px-3 py-2 text-sm" />
              <input placeholder="단위" value={productForm.unit} onChange={e => setProductForm({...productForm, unit: e.target.value})}
                className="border rounded px-3 py-2 text-sm" />
              <input placeholder="단가" type="number" value={productForm.price} onChange={e => setProductForm({...productForm, price: Number(e.target.value)})}
                className="border rounded px-3 py-2 text-sm" />
            </div>
            <div className="mt-3 flex gap-2">
              <button onClick={saveProduct} className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">
                {editingProduct ? '수정' : '추가'}
              </button>
              {editingProduct && (
                <button onClick={() => { setEditingProduct(null); setProductForm({ code: '', name: '', category: '', unit: '박스', price: 0 }); }}
                  className="bg-gray-300 px-4 py-2 rounded text-sm hover:bg-gray-400">취소</button>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left">코드</th>
                  <th className="px-4 py-3 text-left">품목명</th>
                  <th className="px-4 py-3 text-left">카테고리</th>
                  <th className="px-4 py-3 text-left">단위</th>
                  <th className="px-4 py-3 text-right">단가</th>
                  <th className="px-4 py-3 text-center">관리</th>
                </tr>
              </thead>
              <tbody>
                {products.map(p => (
                  <tr key={p.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3">{p.code}</td>
                    <td className="px-4 py-3 font-medium">{p.name}</td>
                    <td className="px-4 py-3 text-gray-600">{p.category}</td>
                    <td className="px-4 py-3">{p.unit}</td>
                    <td className="px-4 py-3 text-right">{p.price.toLocaleString()}원</td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => editProduct(p)} className="text-blue-600 hover:underline mr-2">수정</button>
                      <button onClick={() => deleteProduct(p.id)} className="text-red-600 hover:underline">삭제</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Users - placeholder */}
      {tab === 'users' && (
        <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
          사용자 관리 기능은 Phase 2에서 추가됩니다.
        </div>
      )}
    </div>
  );
}
