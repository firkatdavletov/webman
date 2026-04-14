import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { isAuthenticated } from '@/entities/session';
import { ProtectedRoute } from '@/shared/routing/ProtectedRoute';

const CategoriesPage = lazy(() =>
  import('@/pages/catalog/categories/ui/CategoriesPage').then((module) => ({ default: module.CategoriesPage })),
);
const DashboardPage = lazy(() =>
  import('@/pages/dashboard/ui/DashboardPage').then((module) => ({ default: module.DashboardPage })),
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
const ProductOptionGroupDetailsPage = lazy(() =>
  import('@/pages/catalog/product-option-group-details/ui/ProductOptionGroupDetailsPage').then((module) => ({
    default: module.ProductOptionGroupDetailsPage,
  })),
);
const ProductVariantDetailsPage = lazy(() =>
  import('@/pages/catalog/product-variant-details/ui/ProductVariantDetailsPage').then((module) => ({
    default: module.ProductVariantDetailsPage,
  })),
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
const DeliveryMethodsPage = lazy(() =>
  import('@/pages/delivery/methods/ui/DeliveryMethodsPage').then((module) => ({ default: module.DeliveryMethodsPage })),
);
const DeliveryMethodDetailsPage = lazy(() =>
  import('@/pages/delivery/method-details/ui/DeliveryMethodDetailsPage').then((module) => ({
    default: module.DeliveryMethodDetailsPage,
  })),
);
const DeliveryPickupPointMapPage = lazy(() =>
  import('@/pages/delivery/pickup-point-map/ui/DeliveryPickupPointMapPage').then((module) => ({
    default: module.DeliveryPickupPointMapPage,
  })),
);
const DeliveryPickupPointsPage = lazy(() =>
  import('@/pages/delivery/pickup-points/ui/DeliveryPickupPointsPage').then((module) => ({
    default: module.DeliveryPickupPointsPage,
  })),
);
const DeliveryPickupPointDetailsPage = lazy(() =>
  import('@/pages/delivery/pickup-point-details/ui/DeliveryPickupPointDetailsPage').then((module) => ({
    default: module.DeliveryPickupPointDetailsPage,
  })),
);
const DeliveryTariffsPage = lazy(() =>
  import('@/pages/delivery/tariffs/ui/DeliveryTariffsPage').then((module) => ({ default: module.DeliveryTariffsPage })),
);
const DeliveryTariffDetailsPage = lazy(() =>
  import('@/pages/delivery/tariff-details/ui/DeliveryTariffDetailsPage').then((module) => ({
    default: module.DeliveryTariffDetailsPage,
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
const DeliveryZonesPage = lazy(() =>
  import('@/pages/delivery/zones/ui/DeliveryZonesPage').then((module) => ({ default: module.DeliveryZonesPage })),
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
const OrderStatusEditorPage = lazy(() =>
  import('@/pages/order-statuses/ui/OrderStatusEditorPage').then((module) => ({ default: module.OrderStatusEditorPage })),
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
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <Suspense fallback={<FullscreenRouteFallback />}>
      <LoginPage />
    </Suspense>
  );
}

export function AppRouter() {
  const fallbackPath = isAuthenticated() ? '/dashboard' : '/login';

  return (
    <Routes>
      <Route path="/login" element={<LoginRoute />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/admin/dashboard" element={<DashboardPage />} />
        <Route path="/catalog" element={<Navigate to="/categories" replace />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/categories/new" element={<CategoryCreatePage />} />
        <Route path="/categories/:categoryId" element={<CategoryDetailsPage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/products/new" element={<ProductCreatePage />} />
        <Route path="/products/:productId" element={<ProductDetailsPage />} />
        <Route path="/products/:productId/option-groups/:optionGroupId" element={<ProductOptionGroupDetailsPage />} />
        <Route path="/products/:productId/variants/:variantId" element={<ProductVariantDetailsPage />} />
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
        <Route path="/orders/:orderId" element={<OrdersPage />} />
        <Route path="/order-statuses" element={<OrderStatusesPage />} />
        <Route path="/order-statuses/new" element={<OrderStatusEditorPage />} />
        <Route path="/order-statuses/:statusId" element={<OrderStatusEditorPage />} />
        <Route path="/delivery" element={<DeliveryConditionsPage />} />
        <Route path="/delivery/methods" element={<DeliveryMethodsPage />} />
        <Route path="/delivery/methods/:method" element={<DeliveryMethodDetailsPage />} />
        <Route path="/delivery/zones" element={<DeliveryZonesPage />} />
        <Route path="/delivery/pickup-points/map" element={<DeliveryPickupPointMapPage />} />
        <Route path="/delivery/pickup-points" element={<DeliveryPickupPointsPage />} />
        <Route path="/delivery/pickup-points/new" element={<DeliveryPickupPointDetailsPage />} />
        <Route path="/delivery/pickup-points/new/map" element={<DeliveryPickupPointMapPage />} />
        <Route path="/delivery/pickup-points/:pickupPointId" element={<DeliveryPickupPointDetailsPage />} />
        <Route path="/delivery/pickup-points/:pickupPointId/map" element={<DeliveryPickupPointMapPage />} />
        <Route path="/delivery/tariffs" element={<DeliveryTariffsPage />} />
        <Route path="/delivery/tariffs/new" element={<DeliveryTariffDetailsPage />} />
        <Route path="/delivery/tariffs/:tariffId" element={<DeliveryTariffDetailsPage />} />
        <Route path="/delivery/zones/new" element={<DeliveryZoneCreatePage />} />
        <Route path="/delivery/zones/new/map" element={<DeliveryZoneMapPage />} />
        <Route path="/delivery/zones/:zoneId" element={<DeliveryZoneDetailsPage />} />
        <Route path="/delivery/zones/:zoneId/map" element={<DeliveryZoneMapPage />} />
        <Route path="/admin/orders" element={<OrdersPage />} />
        <Route path="/admin/orders/:orderId" element={<OrdersPage />} />
        <Route path="/admin/order-statuses" element={<OrderStatusesPage />} />
        <Route path="/admin/order-statuses/new" element={<OrderStatusEditorPage />} />
        <Route path="/admin/order-statuses/:statusId" element={<OrderStatusEditorPage />} />
      </Route>
      <Route path="*" element={<Navigate to={fallbackPath} replace />} />
    </Routes>
  );
}
