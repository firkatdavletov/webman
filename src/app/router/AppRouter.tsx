import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { isAuthenticated } from '@/entities/session';
import { ProtectedRoute } from '@/shared/routing/ProtectedRoute';

const CategoriesPage = lazy(() =>
  import('@/pages/catalog/categories/ui/CategoriesPage').then((module) => ({ default: module.CategoriesPage })),
);
const CategoryCreatePage = lazy(() =>
  import('@/pages/catalog/category-create/ui/CategoryCreatePage').then((module) => ({ default: module.CategoryCreatePage })),
);
const CategoryDetailsPage = lazy(() =>
  import('@/pages/catalog/category-details/ui/CategoryDetailsPage').then((module) => ({ default: module.CategoryDetailsPage })),
);
const ProductsPage = lazy(() =>
  import('@/pages/catalog/products/ui/ProductsPage').then((module) => ({ default: module.ProductsPage })),
);
const ProductCreatePage = lazy(() =>
  import('@/pages/catalog/product-create/ui/ProductCreatePage').then((module) => ({ default: module.ProductCreatePage })),
);
const ProductDetailsPage = lazy(() =>
  import('@/pages/catalog/product-details/ui/ProductDetailsPage').then((module) => ({ default: module.ProductDetailsPage })),
);
const ModifierGroupsPage = lazy(() =>
  import('@/pages/catalog/modifier-groups/ui/ModifierGroupsPage').then((module) => ({ default: module.ModifierGroupsPage })),
);
const ModifierGroupCreatePage = lazy(() =>
  import('@/pages/catalog/modifier-group-create/ui/ModifierGroupCreatePage').then((module) => ({
    default: module.ModifierGroupCreatePage,
  })),
);
const ModifierGroupDetailsPage = lazy(() =>
  import('@/pages/catalog/modifier-group-details/ui/ModifierGroupDetailsPage').then((module) => ({
    default: module.ModifierGroupDetailsPage,
  })),
);
const CatalogImportPage = lazy(() =>
  import('@/pages/catalog/import/ui/CatalogImportPage').then((module) => ({ default: module.CatalogImportPage })),
);
const ModifierImportPage = lazy(() =>
  import('@/pages/catalog/modifier-import/ui/ModifierImportPage').then((module) => ({ default: module.ModifierImportPage })),
);
const HeroBannersPage = lazy(() =>
  import('@/pages/content/hero-banners/ui/HeroBannersPage').then((module) => ({ default: module.HeroBannersPage })),
);
const HeroBannerCreatePage = lazy(() =>
  import('@/pages/content/hero-banner-create/ui/HeroBannerCreatePage').then((module) => ({
    default: module.HeroBannerCreatePage,
  })),
);
const HeroBannerDetailsPage = lazy(() =>
  import('@/pages/content/hero-banner-details/ui/HeroBannerDetailsPage').then((module) => ({
    default: module.HeroBannerDetailsPage,
  })),
);
const LegalDocumentsPage = lazy(() =>
  import('@/pages/content/legal-documents/ui/LegalDocumentsPage').then((module) => ({
    default: module.LegalDocumentsPage,
  })),
);
const DeliveryConditionsPage = lazy(() =>
  import('@/pages/delivery/ui/DeliveryConditionsPage').then((module) => ({ default: module.DeliveryConditionsPage })),
);
const DeliveryPickupPointMapPage = lazy(() =>
  import('@/pages/delivery/pickup-point-map/ui/DeliveryPickupPointMapPage').then((module) => ({
    default: module.DeliveryPickupPointMapPage,
  })),
);
const DeliveryZoneCreatePage = lazy(() =>
  import('@/pages/delivery/zone-create/ui/DeliveryZoneCreatePage').then((module) => ({
    default: module.DeliveryZoneCreatePage,
  })),
);
const DeliveryZoneDetailsPage = lazy(() =>
  import('@/pages/delivery/zone-details/ui/DeliveryZoneDetailsPage').then((module) => ({
    default: module.DeliveryZoneDetailsPage,
  })),
);
const DeliveryZoneMapPage = lazy(() =>
  import('@/pages/delivery/zone-map/ui/DeliveryZoneMapPage').then((module) => ({ default: module.DeliveryZoneMapPage })),
);
const OrdersPage = lazy(() =>
  import('@/pages/orders/ui/OrdersPage').then((module) => ({ default: module.OrdersPage })),
);
const OrderStatusesPage = lazy(() =>
  import('@/pages/order-statuses/ui/OrderStatusesPage').then((module) => ({ default: module.OrderStatusesPage })),
);
const LoginPage = lazy(() =>
  import('@/pages/login/ui/LoginPage').then((module) => ({ default: module.LoginPage })),
);

function FullscreenRouteFallback() {
  return (
    <main className="auth-page" aria-busy="true" aria-live="polite">
      <section className="auth-card">
        <div className="auth-copy">
          <span className="auth-kicker">Webman CMS</span>
          <h1 className="auth-title">Загрузка страницы</h1>
          <p className="auth-description">Подготавливаем код маршрута и интерфейс.</p>
        </div>
      </section>
    </main>
  );
}

function LoginRoute() {
  if (isAuthenticated()) {
    return <Navigate to="/categories" replace />;
  }

  return (
    <Suspense fallback={<FullscreenRouteFallback />}>
      <LoginPage />
    </Suspense>
  );
}

export function AppRouter() {
  const fallbackPath = isAuthenticated() ? '/categories' : '/login';

  return (
    <Routes>
      <Route path="/login" element={<LoginRoute />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Navigate to="/categories" replace />} />
        <Route path="/catalog" element={<Navigate to="/categories" replace />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/categories/new" element={<CategoryCreatePage />} />
        <Route path="/categories/:categoryId" element={<CategoryDetailsPage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/products/new" element={<ProductCreatePage />} />
        <Route path="/products/:productId" element={<ProductDetailsPage />} />
        <Route path="/modifier-groups" element={<ModifierGroupsPage />} />
        <Route path="/modifier-groups/new" element={<ModifierGroupCreatePage />} />
        <Route path="/modifier-groups/:modifierGroupId" element={<ModifierGroupDetailsPage />} />
        <Route path="/catalog-import" element={<CatalogImportPage />} />
        <Route path="/modifier-import" element={<ModifierImportPage />} />
        <Route path="/hero-banners" element={<HeroBannersPage />} />
        <Route path="/hero-banners/new" element={<HeroBannerCreatePage />} />
        <Route path="/hero-banners/:bannerId" element={<HeroBannerDetailsPage />} />
        <Route path="/legal-documents" element={<LegalDocumentsPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/order-statuses" element={<OrderStatusesPage />} />
        <Route path="/delivery" element={<DeliveryConditionsPage />} />
        <Route path="/delivery/pickup-points/map" element={<DeliveryPickupPointMapPage />} />
        <Route path="/delivery/zones/new" element={<DeliveryZoneCreatePage />} />
        <Route path="/delivery/zones/new/map" element={<DeliveryZoneMapPage />} />
        <Route path="/delivery/zones/:zoneId" element={<DeliveryZoneDetailsPage />} />
        <Route path="/delivery/zones/:zoneId/map" element={<DeliveryZoneMapPage />} />
        <Route path="/admin/orders" element={<OrdersPage />} />
        <Route path="/admin/order-statuses" element={<OrderStatusesPage />} />
      </Route>
      <Route path="*" element={<Navigate to={fallbackPath} replace />} />
    </Routes>
  );
}
