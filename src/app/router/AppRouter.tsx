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
import { LoginPage } from '@/pages/login/ui/LoginPage';
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
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/admin/orders" element={<OrdersPage />} />
      </Route>
      <Route path="*" element={<Navigate to={fallbackPath} replace />} />
    </Routes>
  );
}
