import { NavLink, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

const navItems = [
  { path: '/', label: '대시보드', icon: '📊', roles: ['ADMIN', 'HQ', 'BRANCH'] },
  { path: '/shipment', label: '출고 처리', icon: '📦', roles: ['ADMIN'] },
  { path: '/rounds', label: '차수 관리', icon: '📋', roles: ['ADMIN', 'HQ'] },
  { path: '/admin', label: '어드민', icon: '⚙️', roles: ['ADMIN'] },
];

export default function Layout() {
  const { user, logout } = useAuthStore();

  const roleLabel = { ADMIN: '관리자', HQ: '본사', BRANCH: '사업소' };

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-[220px] bg-gradient-to-b from-sidebar-from to-sidebar-to text-white fixed h-screen overflow-y-auto shadow-lg">
        <div className="p-6 border-b border-white/10 text-center">
          <h2 className="text-xl font-semibold tracking-widest">ZEMSTONE</h2>
        </div>
        <nav className="py-4">
          {navItems
            .filter(item => user && item.roles.includes(user.role))
            .map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `flex items-center px-6 py-3.5 text-sm border-l-4 transition-all ${
                    isActive
                      ? 'bg-white/10 text-white border-primary'
                      : 'text-white/70 border-transparent hover:bg-white/5 hover:text-white'
                  }`
                }
              >
                <span className="mr-3 text-base">{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
        </nav>

        {/* User info */}
        <div className="absolute bottom-0 w-full p-4 border-t border-white/10">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">{user?.role === 'ADMIN' ? '👑' : '👤'}</span>
            <div>
              <div className="text-sm font-medium">{user?.name}</div>
              <div className="text-xs text-white/60">{roleLabel[user?.role || 'BRANCH']}</div>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full text-xs py-1.5 rounded bg-white/10 hover:bg-white/20 transition"
          >
            로그아웃
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 ml-[220px] p-6 min-h-screen">
        <Outlet />
      </main>
    </div>
  );
}
