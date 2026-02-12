import { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import api from '../../api/client';
import type { Notification } from '../../types';

const navItems = [
  // BRANCH
  { path: '/', label: '내 현황', icon: '📊', roles: ['BRANCH'] },
  { path: '/extra-order', label: '출고 요청', icon: '📝', roles: ['BRANCH'] },
  { path: '/my-history', label: '내 히스토리', icon: '📜', roles: ['BRANCH'] },
  // ADMIN
  { path: '/', label: '대시보드', icon: '📊', roles: ['ADMIN', 'HQ'] },
  { path: '/shipment', label: '출고 처리', icon: '📦', roles: ['ADMIN'] },
  { path: '/rounds', label: '차수 관리', icon: '📋', roles: ['ADMIN', 'HQ'] },
  { path: '/extra-orders', label: '출고 요청 관리', icon: '📑', roles: ['ADMIN', 'HQ'] },
  { path: '/history', label: '히스토리', icon: '📜', roles: ['ADMIN', 'HQ'] },
  { path: '/admin', label: '어드민', icon: '⚙️', roles: ['ADMIN'] },
];

export default function Layout() {
  const { user, logout } = useAuthStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotif, setShowNotif] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const roleLabel = { ADMIN: '관리자', HQ: '본사', BRANCH: '사업소' };

  const loadNotifications = async () => {
    try {
      const { data } = await api.get('/notifications');
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotif(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const markRead = async (id: number) => {
    await api.put(`/notifications/${id}/read`);
    loadNotifications();
  };

  const markAllRead = async () => {
    await api.put('/notifications/read-all');
    loadNotifications();
  };

  const filteredNav = navItems.filter(item => user && item.roles.includes(user.role));

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-[220px] bg-gradient-to-b from-sidebar-from to-sidebar-to text-white fixed h-screen overflow-y-auto shadow-lg">
        <div className="p-6 border-b border-white/10 text-center">
          <h2 className="text-xl font-semibold tracking-widest">ZEMSTONE</h2>
        </div>
        <nav className="py-4">
          {filteredNav.map(item => (
            <NavLink
              key={item.path + item.label}
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
      <main className="flex-1 ml-[220px] min-h-screen">
        {/* Top bar with notification bell */}
        <div className="flex justify-end items-center p-4 border-b bg-white sticky top-0 z-40">
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setShowNotif(!showNotif)}
              className="relative p-2 text-gray-600 hover:text-gray-800 transition"
            >
              <span className="text-xl">🔔</span>
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {showNotif && (
              <div className="absolute right-0 top-12 w-80 bg-white rounded-xl shadow-2xl border z-50 max-h-96 overflow-y-auto">
                <div className="flex justify-between items-center px-4 py-3 border-b">
                  <span className="font-semibold text-sm">알림</span>
                  {unreadCount > 0 && (
                    <button onClick={markAllRead} className="text-xs text-blue-600 hover:underline">모두 읽음</button>
                  )}
                </div>
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-gray-400 text-sm">알림이 없습니다.</div>
                ) : (
                  notifications.slice(0, 20).map(n => (
                    <div
                      key={n.id}
                      onClick={() => !n.isRead && markRead(n.id)}
                      className={`px-4 py-3 border-b cursor-pointer hover:bg-gray-50 transition ${!n.isRead ? 'bg-blue-50' : ''}`}
                    >
                      <div className="flex justify-between items-start">
                        <span className="text-sm font-medium">{n.title}</span>
                        {!n.isRead && <span className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 flex-shrink-0" />}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{n.message}</p>
                      <p className="text-[10px] text-gray-400 mt-1">
                        {new Date(n.createdAt).toLocaleString('ko-KR')}
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
