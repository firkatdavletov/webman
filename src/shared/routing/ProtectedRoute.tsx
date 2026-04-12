import { Suspense } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { isAuthenticated } from '@/entities/session';
import { AppShell } from '@/shared/ui/app-shell';

function ProtectedRouteFallback() {
  return (
    <main className="dashboard" aria-busy="true" aria-live="polite">
      <section className="catalog-card catalog-data-card">
        <div className="catalog-card-copy">
          <p className="placeholder-eyebrow">Загрузка</p>
          <h2 className="catalog-card-title">Подготовка раздела</h2>
          <p className="catalog-card-text">Загружаем код страницы и подключаем её зависимости.</p>
        </div>
      </section>
    </main>
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
