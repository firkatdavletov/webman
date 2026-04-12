import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { isAuthenticated } from '@/entities/session';
import { AppShell } from '@/shared/ui/app-shell';

export function ProtectedRoute() {
  const location = useLocation();

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
