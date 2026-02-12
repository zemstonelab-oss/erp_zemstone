import { useEffect, useState } from 'react';
import api from '../api/client';
import type { Branch, Product, UserInfo, AlertThreshold, Role, AuditLog } from '../types';

export default function AdminPage() {
  const [tab, setTab] = useState<'branches' | 'products' | 'users' | 'thresholds' | 'auditLogs'>('branches');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [thresholds, setThresholds] = useState<AlertThreshold[]>([]);
  const [loading, setLoading] = useState(true);

  // Branch form
  const [branchForm, setBranchForm] = useState({ code: '', name: '', address: '', manager: '', phone: '' });
  const [editingBranch, setEditingBranch] = useState<number | null>(null);

  // Product form
  const [productForm, setProductForm] = useState({ code: '', name: '', category: '', unit: '박스', price: 0 });
  const [editingProduct, setEditingProduct] = useState<number | null>(null);

  // User form
  const [userForm, setUserForm] = useState({ username: '', password: '', name: '', role: 'BRANCH' as Role, branchId: null as number | null });
  const [editingUser, setEditingUser] = useState<number | null>(null);

  // Threshold form
  const [thresholdData, setThresholdData] = useState<Record<string, number>>({});

  // Audit logs
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditPage, setAuditPage] = useState(1);
  const [auditEntity, setAuditEntity] = useState('');
  const [auditStartDate, setAuditStartDate] = useState('');
  const [auditEndDate, setAuditEndDate] = useState('');

  useEffect(() => { loadData(); }, []);
  useEffect(() => { if (tab === 'auditLogs') loadAuditLogs(); }, [tab, auditPage, auditEntity, auditStartDate, auditEndDate]);

  async function loadAuditLogs() {
    try {
      const params: any = { page: auditPage, limit: 20 };
      if (auditEntity) params.entity = auditEntity;
      if (auditStartDate) params.startDate = auditStartDate;
      if (auditEndDate) params.endDate = auditEndDate;
      const { data } = await api.get('/audit-logs', { params });
      setAuditLogs(data.data);
      setAuditTotal(data.totalPages);
    } catch (e) { console.error(e); }
  }

  async function loadData() {
    setLoading(true);
    try {
      const [b, p, u, t] = await Promise.all([
        api.get('/branches'),
        api.get('/products'),
        api.get('/users'),
        api.get('/alert-thresholds'),
      ]);
      setBranches(b.data);
      setProducts(p.data);
      setUsers(u.data);
      setThresholds(t.data);
      const td: Record<string, number> = {};
      t.data.forEach((t: AlertThreshold) => { td[`${t.branchId}-${t.productId}`] = t.threshold; });
      setThresholdData(td);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  // Branch CRUD
  async function saveBranch() {
    try {
      if (editingBranch) await api.put(`/branches/${editingBranch}`, branchForm);
      else await api.post('/branches', branchForm);
      setBranchForm({ code: '', name: '', address: '', manager: '', phone: '' });
      setEditingBranch(null);
      loadData();
    } catch (e: any) { alert(e.response?.data?.error || '저장 실패'); }
  }

  function editBranch(b: Branch) {
    setEditingBranch(b.id);
    setBranchForm({ code: b.code, name: b.name, address: b.address || '', manager: b.manager || '', phone: b.phone || '' });
  }

  async function deleteBranch(id: number) {
    if (!confirm('삭제하시겠습니까?')) return;
    try { await api.delete(`/branches/${id}`); loadData(); }
    catch (e: any) { alert(e.response?.data?.error || '삭제 실패'); }
  }

  // Product CRUD
  async function saveProduct() {
    try {
      if (editingProduct) await api.put(`/products/${editingProduct}`, productForm);
      else await api.post('/products', productForm);
      setProductForm({ code: '', name: '', category: '', unit: '박스', price: 0 });
      setEditingProduct(null);
      loadData();
    } catch (e: any) { alert(e.response?.data?.error || '저장 실패'); }
  }

  function editProduct(p: Product) {
    setEditingProduct(p.id);
    setProductForm({ code: p.code, name: p.name, category: p.category || '', unit: p.unit, price: p.price });
  }

  async function deleteProduct(id: number) {
    if (!confirm('삭제하시겠습니까?')) return;
    try { await api.delete(`/products/${id}`); loadData(); }
    catch (e: any) { alert(e.response?.data?.error || '삭제 실패'); }
  }

  // User CRUD
  async function saveUser() {
    try {
      const data: any = { ...userForm };
      if (!data.password && editingUser) delete data.password;
      if (data.role !== 'BRANCH') data.branchId = null;
      if (editingUser) await api.put(`/users/${editingUser}`, data);
      else await api.post('/users', data);
      setUserForm({ username: '', password: '', name: '', role: 'BRANCH', branchId: null });
      setEditingUser(null);
      loadData();
    } catch (e: any) { alert(e.response?.data?.error || '저장 실패'); }
  }

  function editUser(u: UserInfo) {
    setEditingUser(u.id);
    setUserForm({ username: u.username, password: '', name: u.name, role: u.role, branchId: u.branchId });
  }

  async function deleteUser(id: number) {
    if (!confirm('비활성화하시겠습니까?')) return;
    try { await api.delete(`/users/${id}`); loadData(); }
    catch (e: any) { alert(e.response?.data?.error || '삭제 실패'); }
  }

  // Threshold save
  async function saveThresholds() {
    const activeBranches = branches.filter(b => b.isActive);
    const activeProducts = products.filter(p => p.isActive);
    const items = activeBranches.flatMap(b =>
      activeProducts.map(p => ({
        branchId: b.id,
        productId: p.id,
        threshold: thresholdData[`${b.id}-${p.id}`] || 0,
      }))
    );
    await api.put('/alert-thresholds', { items });
    alert('저장되었습니다.');
    loadData();
  }

  if (loading) return <div className="p-6 text-gray-500">로딩 중...</div>;

  const activeBranches = branches.filter(b => b.isActive);
  const activeProducts = products.filter(p => p.isActive);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">어드민</h1>

      <div className="flex gap-2 mb-6 border-b">
        {(['branches', 'products', 'users', 'thresholds', 'auditLogs'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {t === 'branches' ? '사업소 관리' : t === 'products' ? '품목 관리' : t === 'users' ? '사용자 관리' : t === 'thresholds' ? '잔량 기준치' : '활동 로그'}
          </button>
        ))}
      </div>

      {/* Branches */}
      {tab === 'branches' && (
        <div>
          <div className="bg-white rounded-lg shadow p-4 mb-4">
            <h3 className="font-semibold mb-3">{editingBranch ? '사업소 수정' : '사업소 추가'}</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <input placeholder="코드" value={branchForm.code} onChange={e => setBranchForm({...branchForm, code: e.target.value})} className="border rounded px-3 py-2 text-sm" />
              <input placeholder="이름" value={branchForm.name} onChange={e => setBranchForm({...branchForm, name: e.target.value})} className="border rounded px-3 py-2 text-sm" />
              <input placeholder="주소" value={branchForm.address} onChange={e => setBranchForm({...branchForm, address: e.target.value})} className="border rounded px-3 py-2 text-sm" />
              <input placeholder="담당자" value={branchForm.manager} onChange={e => setBranchForm({...branchForm, manager: e.target.value})} className="border rounded px-3 py-2 text-sm" />
              <input placeholder="연락처" value={branchForm.phone} onChange={e => setBranchForm({...branchForm, phone: e.target.value})} className="border rounded px-3 py-2 text-sm" />
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
              <thead className="bg-gray-50"><tr>
                <th className="px-4 py-3 text-left">코드</th><th className="px-4 py-3 text-left">이름</th>
                <th className="px-4 py-3 text-left">주소</th><th className="px-4 py-3 text-left">담당자</th>
                <th className="px-4 py-3 text-left">연락처</th><th className="px-4 py-3 text-center">관리</th>
              </tr></thead>
              <tbody>
                {branches.map(b => (
                  <tr key={b.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3">{b.code}</td><td className="px-4 py-3 font-medium">{b.name}</td>
                    <td className="px-4 py-3 text-gray-600">{b.address}</td><td className="px-4 py-3">{b.manager}</td>
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
              <input placeholder="코드" value={productForm.code} onChange={e => setProductForm({...productForm, code: e.target.value})} className="border rounded px-3 py-2 text-sm" />
              <input placeholder="품목명" value={productForm.name} onChange={e => setProductForm({...productForm, name: e.target.value})} className="border rounded px-3 py-2 text-sm" />
              <input placeholder="카테고리" value={productForm.category} onChange={e => setProductForm({...productForm, category: e.target.value})} className="border rounded px-3 py-2 text-sm" />
              <input placeholder="단위" value={productForm.unit} onChange={e => setProductForm({...productForm, unit: e.target.value})} className="border rounded px-3 py-2 text-sm" />
              <input placeholder="단가" type="number" value={productForm.price} onChange={e => setProductForm({...productForm, price: Number(e.target.value)})} className="border rounded px-3 py-2 text-sm" />
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
              <thead className="bg-gray-50"><tr>
                <th className="px-4 py-3 text-left">코드</th><th className="px-4 py-3 text-left">품목명</th>
                <th className="px-4 py-3 text-left">카테고리</th><th className="px-4 py-3 text-left">단위</th>
                <th className="px-4 py-3 text-right">단가</th><th className="px-4 py-3 text-center">관리</th>
              </tr></thead>
              <tbody>
                {products.map(p => (
                  <tr key={p.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3">{p.code}</td><td className="px-4 py-3 font-medium">{p.name}</td>
                    <td className="px-4 py-3 text-gray-600">{p.category}</td><td className="px-4 py-3">{p.unit}</td>
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

      {/* Users */}
      {tab === 'users' && (
        <div>
          <div className="bg-white rounded-lg shadow p-4 mb-4">
            <h3 className="font-semibold mb-3">{editingUser ? '사용자 수정' : '사용자 추가'}</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <input placeholder="아이디" value={userForm.username} onChange={e => setUserForm({...userForm, username: e.target.value})}
                disabled={!!editingUser} className="border rounded px-3 py-2 text-sm disabled:bg-gray-100" />
              <input placeholder={editingUser ? '변경 시 입력' : '비밀번호'} type="password" value={userForm.password}
                onChange={e => setUserForm({...userForm, password: e.target.value})} className="border rounded px-3 py-2 text-sm" />
              <input placeholder="이름" value={userForm.name} onChange={e => setUserForm({...userForm, name: e.target.value})} className="border rounded px-3 py-2 text-sm" />
              <select value={userForm.role} onChange={e => setUserForm({...userForm, role: e.target.value as Role})}
                className="border rounded px-3 py-2 text-sm">
                <option value="ADMIN">관리자</option>
                <option value="HQ">본사</option>
                <option value="BRANCH">사업소</option>
              </select>
              {userForm.role === 'BRANCH' && (
                <select value={userForm.branchId || ''} onChange={e => setUserForm({...userForm, branchId: e.target.value ? Number(e.target.value) : null})}
                  className="border rounded px-3 py-2 text-sm">
                  <option value="">사업소 선택</option>
                  {activeBranches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              )}
            </div>
            <div className="mt-3 flex gap-2">
              <button onClick={saveUser} className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">
                {editingUser ? '수정' : '추가'}
              </button>
              {editingUser && (
                <button onClick={() => { setEditingUser(null); setUserForm({ username: '', password: '', name: '', role: 'BRANCH', branchId: null }); }}
                  className="bg-gray-300 px-4 py-2 rounded text-sm hover:bg-gray-400">취소</button>
              )}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50"><tr>
                <th className="px-4 py-3 text-left">아이디</th><th className="px-4 py-3 text-left">이름</th>
                <th className="px-4 py-3 text-center">역할</th><th className="px-4 py-3 text-left">사업소</th>
                <th className="px-4 py-3 text-center">상태</th><th className="px-4 py-3 text-center">관리</th>
              </tr></thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3">{u.username}</td>
                    <td className="px-4 py-3 font-medium">{u.name}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        u.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' :
                        u.role === 'HQ' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                      }`}>{u.role === 'ADMIN' ? '관리자' : u.role === 'HQ' ? '본사' : '사업소'}</span>
                    </td>
                    <td className="px-4 py-3">{u.branch?.name || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs ${u.isActive ? 'text-green-600' : 'text-red-500'}`}>
                        {u.isActive ? '활성' : '비활성'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => editUser(u)} className="text-blue-600 hover:underline mr-2">수정</button>
                      <button onClick={() => deleteUser(u.id)} className="text-red-600 hover:underline">삭제</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Audit Logs */}
      {tab === 'auditLogs' && (
        <div>
          <div className="bg-white rounded-lg shadow p-4 mb-4">
            <div className="flex gap-3 items-end flex-wrap">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">종류</label>
                <select value={auditEntity} onChange={e => { setAuditEntity(e.target.value); setAuditPage(1); }}
                  className="border rounded px-3 py-2 text-sm">
                  <option value="">전체</option>
                  <option value="shipment">출고</option>
                  <option value="order_round">발주</option>
                  <option value="extra_order">출고 요청</option>
                  <option value="product">품목</option>
                  <option value="branch">사업소</option>
                  <option value="user">사용자</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">시작일</label>
                <input type="date" value={auditStartDate} onChange={e => { setAuditStartDate(e.target.value); setAuditPage(1); }}
                  className="border rounded px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">종료일</label>
                <input type="date" value={auditEndDate} onChange={e => { setAuditEndDate(e.target.value); setAuditPage(1); }}
                  className="border rounded px-3 py-2 text-sm" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50"><tr>
                <th className="px-4 py-3 text-left">일시</th>
                <th className="px-4 py-3 text-left">사용자</th>
                <th className="px-4 py-3 text-center">액션</th>
                <th className="px-4 py-3 text-left">대상</th>
                <th className="px-4 py-3 text-left">상세 내용</th>
              </tr></thead>
              <tbody>
                {auditLogs.map(log => (
                  <tr key={log.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500 text-xs">{new Date(log.createdAt).toLocaleString('ko-KR')}</td>
                    <td className="px-4 py-3 font-medium">{log.user.name}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        log.action === 'CREATE' ? 'bg-green-100 text-green-700' :
                        log.action === 'UPDATE' ? 'bg-blue-100 text-blue-700' :
                        'bg-red-100 text-red-700'
                      }`}>{log.action}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">{log.entity}</span>
                      {log.entityId && <span className="text-gray-400 text-xs ml-1">#{log.entityId}</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{log.detail || '-'}</td>
                  </tr>
                ))}
                {auditLogs.length === 0 && (
                  <tr><td colSpan={5} className="p-10 text-center text-gray-400">로그가 없습니다.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {auditTotal > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              <button onClick={() => setAuditPage(p => Math.max(1, p - 1))} disabled={auditPage <= 1}
                className="px-3 py-1.5 border rounded text-sm disabled:opacity-30">이전</button>
              <span className="px-3 py-1.5 text-sm">{auditPage} / {auditTotal}</span>
              <button onClick={() => setAuditPage(p => Math.min(auditTotal, p + 1))} disabled={auditPage >= auditTotal}
                className="px-3 py-1.5 border rounded text-sm disabled:opacity-30">다음</button>
            </div>
          )}
        </div>
      )}

      {/* Thresholds */}
      {tab === 'thresholds' && (
        <div>
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="px-4 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white flex justify-between items-center">
              <h3 className="text-sm font-semibold">잔량 기준치 설정 (이 수량 이하 시 알림)</h3>
              <button onClick={saveThresholds} className="px-4 py-1.5 bg-white/20 rounded text-xs font-medium hover:bg-white/30">저장</button>
            </div>
            <div className="p-4 overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-600 text-white">
                    <th className="p-2.5 text-left">품목</th>
                    {activeBranches.map(b => <th key={b.id} className="p-2.5 text-center">{b.name}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {activeProducts.map(p => (
                    <tr key={p.id} className="border-b">
                      <td className="p-2.5 font-medium bg-gray-50">{p.name}</td>
                      {activeBranches.map(b => (
                        <td key={b.id} className="p-2.5 text-center">
                          <input
                            type="number" min={0}
                            value={thresholdData[`${b.id}-${p.id}`] || ''}
                            onChange={e => setThresholdData({ ...thresholdData, [`${b.id}-${p.id}`]: Number(e.target.value) })}
                            placeholder="0"
                            className="w-16 px-2 py-1.5 border-2 border-gray-200 rounded text-center text-sm focus:outline-none focus:border-orange-500"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
