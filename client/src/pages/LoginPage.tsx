import { useState } from 'react';
import { useAuthStore } from '../store/authStore';

const testAccounts = [
  { username: 'admin', label: '관리자', icon: '👑', desc: '모든 기능 접근' },
  { username: 'hq', label: '본사 담당자', icon: '🏛️', desc: '조회 전용' },
  { username: 'seocho', label: '서초', icon: '🏢', desc: '사업소' },
  { username: 'yongsan', label: '용산', icon: '🏢', desc: '사업소' },
  { username: 'gangnam', label: '강남', icon: '🏢', desc: '사업소' },
];

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAuthStore(s => s.login);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
    } catch {
      setError('아이디 또는 비밀번호가 올바르지 않습니다.');
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (u: string) => {
    setUsername(u);
    setPassword('1234');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#667eea] to-[#764ba2]">
      <div className="bg-white rounded-2xl shadow-2xl p-12 w-full max-w-md animate-[slideUp_0.5s_ease]">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">📦</div>
          <h1 className="text-2xl font-bold text-gray-800">ZEMSTONE SCM</h1>
          <p className="text-gray-500 text-sm mt-1">판촉물 관리 시스템</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-2">아이디</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="아이디를 입력하세요"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#667eea] transition"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-2">비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="비밀번호를 입력하세요"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#667eea] transition"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white rounded-lg font-semibold hover:shadow-lg hover:-translate-y-0.5 transition disabled:opacity-50"
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <div className="mt-7 pt-5 border-t border-gray-200">
          <h3 className="text-xs font-semibold text-gray-400 text-center mb-3">테스트 계정 (비밀번호: 1234)</h3>
          <div className="space-y-2">
            {testAccounts.map(acc => (
              <button
                key={acc.username}
                onClick={() => fillCredentials(acc.username)}
                className="w-full flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition text-left"
              >
                <span className="text-xl">{acc.icon}</span>
                <div>
                  <div className="text-sm font-medium text-gray-800">{acc.label}</div>
                  <div className="text-xs text-gray-500">{acc.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
