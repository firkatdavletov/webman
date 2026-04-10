import { Navigate, Route, Routes } from 'react-router-dom';
import { isAuthenticated } from '@/entities/session';
import { CategoryCreatePage } from '@/pages/catalog/category-create/ui/CategoryCreatePage';
import { CategoryDetailsPage } from '@/pages/catalog/category-details/ui/CategoryDetailsPage';
import { CategoriesPage } from '@/pages/catalog/categories/ui/CategoriesPage';
import { ProductCreatePage } from '@/pages/catalog/product-create/ui/ProductCreatePage';
import { ProductDetailsPage } from '@/pages/catalog/product-details/ui/ProductDetailsPage';
import { ProductsPage } from '@/pages/catalog/products/ui/ProductsPage';
import { CatalogImportPage } from '@/pages/catalog/import/ui/CatalogImportPage';
import { ModifierGroupCreatePage } from '@/pages/catalog/modifier-group-create/ui/ModifierGroupCreatePage';
import { ModifierGroupDetailsPage } from '@/pages/catalog/modifier-group-details/ui/ModifierGroupDetailsPage';
import { ModifierImportPage } from '@/pages/catalog/modifier-import/ui/ModifierImportPage';
import { ModifierGroupsPage } from '@/pages/catalog/modifier-groups/ui/ModifierGroupsPage';
import { DeliveryConditionsPage } from '@/pages/delivery/ui/DeliveryConditionsPage';
import { DeliveryPickupPointMapPage } from '@/pages/delivery/pickup-point-map/ui/DeliveryPickupPointMapPage';
import { DeliveryZoneCreatePage } from '@/pages/delivery/zone-create/ui/DeliveryZoneCreatePage';
import { DeliveryZoneDetailsPage } from '@/pages/delivery/zone-details/ui/DeliveryZoneDetailsPage';
import { DeliveryZoneMapPage } from '@/pages/delivery/zone-map/ui/DeliveryZoneMapPage';
import { HeroBannerCreatePage } from '@/pages/content/hero-banner-create/ui/HeroBannerCreatePage';
import { HeroBannerDetailsPage } from '@/pages/content/hero-banner-details/ui/HeroBannerDetailsPage';
import { HeroBannersPage } from '@/pages/content/hero-banners/ui/HeroBannersPage';
import { LegalDocumentsPage } from '@/pages/content/legal-documents/ui/LegalDocumentsPage';
import { LoginPage } from '@/pages/login/ui/LoginPage';
import { OrderStatusesPage } from '@/pages/order-statuses/ui/OrderStatusesPage';
import { OrdersPage } from '@/pages/orders/ui/OrdersPage';
import { ProtectedRoute } from '@/shared/routing/ProtectedRoute';

function LoginRoute() {
  if (isAuthenticated()) {
    return <Navigate to="/categories" replace />;
  }

  return <LoginPage />;
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
