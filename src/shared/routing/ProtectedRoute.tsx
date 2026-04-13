import { Suspense } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { isAuthenticated } from '@/entities/session';
import { AppShell } from '@/shared/ui/app-shell';
import { AdminEmptyState, AdminPage, AdminSectionCard } from '@/shared/ui';

function ProtectedRouteFallback() {
  return (
    <AdminPage aria-busy="true" aria-live="polite">
      <AdminSectionCard eyebrow="Загрузка" title="Подготовка раздела" description="Загружаем код страницы и подключаем её зависимости.">
        <AdminEmptyState description="Компоненты маршрута будут показаны сразу после загрузки чанка." />
      </AdminSectionCard>
    </AdminPage>
  );
}

export function ProtectedRoute() {
  const location = useLocation();

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return (
    <AppShell>
      <Suspense fallback={<ProtectedRouteFallback />}>
        <Outlet />
      </Suspense>
    </AppShell>
  );
}
