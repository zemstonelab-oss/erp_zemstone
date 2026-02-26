import { useEffect, useState } from 'react';
import api from '../api/client';
import { useAuthStore } from '../store/authStore';
import type { Notice } from '../types';

export default function NoticesPage() {
  const user = useAuthStore(s => s.user);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selected, setSelected] = useState<Notice | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ title: '', content: '', pinned: false });

  const load = async () => {
    const { data } = await api.get('/notices', { params: { page, limit: 20 } });
    setNotices(data.data);
    setTotal(data.total);
    setTotalPages(data.totalPages);
  };

  useEffect(() => { load(); }, [page]);

  const isAdmin = user?.role === 'ADMIN';

  const openCreate = () => {
    setForm({ title: '', content: '', pinned: false });
    setEditId(null);
    setShowForm(true);
  };

  const openEdit = (n: Notice) => {
    setForm({ title: n.title, content: n.content, pinned: n.pinned });
    setEditId(n.id);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.content.trim()) { alert('제목과 내용을 입력하세요.'); return; }
    if (editId) {
      await api.put(`/notices/${editId}`, form);
    } else {
      await api.post('/notices', form);
    }
    setShowForm(false);
    setSelected(null);
    load();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('삭제하시겠습니까?')) return;
    await api.delete(`/notices/${id}`);
    setSelected(null);
    load();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6 pb-4 border-b-2 border-gray-200">
        <h1 className="text-2xl font-bold">📢 공지사항</h1>
        {isAdmin && (
          <button onClick={openCreate} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition">
            + 새 공지
          </button>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">{editId ? '공지 수정' : '새 공지 작성'}</h2>
            <input
              className="w-full border rounded-lg px-3 py-2 mb-3 text-sm"
              placeholder="제목"
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
            />
            <textarea
              className="w-full border rounded-lg px-3 py-2 mb-3 text-sm h-40 resize-none"
              placeholder="내용"
              value={form.content}
              onChange={e => setForm({ ...form, content: e.target.value })}
            />
            <label className="flex items-center gap-2 mb-4 text-sm">
              <input
                type="checkbox"
                checked={form.pinned}
                onChange={e => setForm({ ...form, pinned: e.target.checked })}
              />
              📌 상단 고정
            </label>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">취소</button>
              <button onClick={handleSubmit} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">저장</button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selected && !showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <div>
                {selected.pinned && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded mr-2">📌 고정</span>}
                <h2 className="text-lg font-bold">{selected.title}</h2>
                <div className="text-xs text-gray-400 mt-1">
                  {selected.author.name} · {new Date(selected.createdAt).toLocaleDateString('ko-KR')}
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{selected.content}</div>
            {isAdmin && (
              <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
                <button onClick={() => openEdit(selected)} className="px-3 py-1.5 text-xs bg-yellow-500 text-white rounded-lg hover:bg-yellow-600">수정</button>
                <button onClick={() => handleDelete(selected.id)} className="px-3 py-1.5 text-xs bg-red-500 text-white rounded-lg hover:bg-red-600">삭제</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* List */}
      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead>
            <tr className="bg-gray-700 text-white">
              <th className="p-3 text-center w-16">#</th>
              <th className="p-3 text-left">제목</th>
              <th className="p-3 text-center w-24">작성자</th>
              <th className="p-3 text-center w-32">작성일</th>
            </tr>
          </thead>
          <tbody>
            {notices.map(n => (
              <tr key={n.id} className="border-b hover:bg-blue-50 cursor-pointer" onClick={() => setSelected(n)}>
                <td className="p-3 text-center text-gray-400">{n.id}</td>
                <td className="p-3">
                  {n.pinned && <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded mr-2">📌</span>}
                  <span className="font-medium">{n.title}</span>
                </td>
                <td className="p-3 text-center text-gray-500">{n.author.name}</td>
                <td className="p-3 text-center text-gray-400">{new Date(n.createdAt).toLocaleDateString('ko-KR')}</td>
              </tr>
            ))}
            {notices.length === 0 && (
              <tr><td colSpan={4} className="p-8 text-center text-gray-400">공지사항이 없습니다.</td></tr>
            )}
          </tbody>
        </table>
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 p-4">
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                onClick={() => setPage(i + 1)}
                className={`px-3 py-1 rounded text-sm ${page === i + 1 ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
