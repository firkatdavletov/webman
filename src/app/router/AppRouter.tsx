import { Navigate, Route, Routes } from 'react-router-dom';
import { isAuthenticated } from '@/entities/session';
import { CategoryCreatePage } from '@/pages/catalog/category-create/ui/CategoryCreatePage';
import { CategoryDetailsPage } from '@/pages/catalog/category-details/ui/CategoryDetailsPage';
import { CategoriesPage } from '@/pages/catalog/categories/ui/CategoriesPage';
import { ProductCreatePage } from '@/pages/catalog/product-create/ui/ProductCreatePage';
import { ProductDetailsPage } from '@/pages/catalog/product-details/ui/ProductDetailsPage';
import { ProductsPage } from '@/pages/catalog/products/ui/ProductsPage';
import { LoginPage } from '@/pages/login/ui/LoginPage';
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
      </Route>
      <Route path="*" element={<Navigate to={fallbackPath} replace />} />
    </Routes>
  );
}
