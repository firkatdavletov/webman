import { Navigate, Route, Routes } from 'react-router-dom';
import { isAuthenticated } from './auth/authService';
import { CatalogPage } from './pages/CatalogPage';
import { CategoryDetailsPage } from './pages/CategoryDetailsPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { LoginPage } from './pages/LoginPage';
import { ProductDetailsPage } from './pages/ProductDetailsPage';
import { ProductsPage } from './pages/ProductsPage';
import { ProtectedRoute } from './routes/ProtectedRoute';

function LoginRoute() {
  if (isAuthenticated()) {
    return <Navigate to="/categories" replace />;
  }

  return <LoginPage />;
}

function App() {
  const fallbackPath = isAuthenticated() ? '/categories' : '/login';

  return (
    <Routes>
      <Route path="/login" element={<LoginRoute />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Navigate to="/categories" replace />} />
        <Route path="/catalog" element={<CatalogPage />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/categories/:categoryId" element={<CategoryDetailsPage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/products/:productId" element={<ProductDetailsPage />} />
      </Route>
      <Route path="*" element={<Navigate to={fallbackPath} replace />} />
    </Routes>
  );
}

export default App;
