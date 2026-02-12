import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ShipmentPage from './pages/ShipmentPage';
import RoundsPage from './pages/RoundsPage';
import AdminPage from './pages/AdminPage';
import Layout from './components/common/Layout';
import RoleGuard from './guards/RoleGuard';

export default function App() {
  const { user, isLoading, loadUser } = useAuthStore();

  useEffect(() => { loadUser(); }, [loadUser]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-500">로딩 중...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route element={<Layout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/shipment" element={
          <RoleGuard roles={['ADMIN']}><ShipmentPage /></RoleGuard>
        } />
        <Route path="/rounds" element={
          <RoleGuard roles={['ADMIN', 'HQ']}><RoundsPage /></RoleGuard>
        } />
        <Route path="/admin" element={
          <RoleGuard roles={['ADMIN']}><AdminPage /></RoleGuard>
        } />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
