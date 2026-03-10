import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { type Category, buildCategoryLookup, getCategories } from '@/entities/category';
import { type Product, getAllProducts } from '@/entities/product';
import { filterProducts } from '@/pages/catalog/products/model/productPageView';
import { ProductFilters } from '@/pages/catalog/products/ui/ProductFilters';
import { ProductGrid } from '@/pages/catalog/products/ui/ProductGrid';
import { NavBar } from '@/shared/ui/NavBar';

export function ProductsPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const loadProductsData = async (showInitialLoader = false) => {
    if (showInitialLoader) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    setErrorMessage('');

    const [categoriesResult, productsResult] = await Promise.all([getCategories(), getAllProducts()]);
    const nextError = [categoriesResult.error, productsResult.error].filter(Boolean).join(' ');

    setCategories(categoriesResult.categories);
    setProducts(productsResult.products);
    setErrorMessage(nextError);
    setIsLoading(false);
    setIsRefreshing(false);
  };

  useEffect(() => {
    void loadProductsData(true);
  }, []);

  const categoryLookup = useMemo(() => buildCategoryLookup(categories), [categories]);
  const filteredProducts = useMemo(() => filterProducts(products, { searchQuery }), [products, searchQuery]);

  return (
    <div className="app-shell">
      <NavBar />

      <main className="dashboard">
        <header className="dashboard-header">
          <div>
            <p className="page-kicker">Каталог</p>
            <h2 className="page-title">Продукты</h2>
          </div>
          <div className="dashboard-actions">
            <span className="status-chip">
              {isLoading ? 'Загрузка продуктов...' : `${products.length} товаров • ${categories.length} корневых категорий`}
            </span>
            <Link className="secondary-link" to="/products/new">
              Добавить товар
            </Link>
            <button
              type="button"
              className="secondary-button"
              onClick={() => void loadProductsData()}
              disabled={isLoading || isRefreshing}
            >
              {isRefreshing ? 'Обновление...' : 'Обновить данные'}
            </button>
          </div>
        </header>

        <section className="catalog-card catalog-data-card" aria-label="Товары в базе данных">
          <div className="catalog-section-header">
            <div className="catalog-card-copy">
              <p className="placeholder-eyebrow">База данных</p>
              <h3 className="catalog-card-title">Текущие товары</h3>
              <p className="catalog-card-text">Список ниже строится напрямую из ответа бэкенда.</p>
            </div>
          </div>

          <div className="catalog-controls">
            <ProductFilters searchQuery={searchQuery} onSearchQueryChange={setSearchQuery} />

            <p className="catalog-results-meta">
              {filteredProducts.length ? `Найдено ${filteredProducts.length} товаров` : 'Товары с таким названием не найдены'}
            </p>
          </div>

          {errorMessage ? (
            <p className="form-error" role="alert">
              {errorMessage}
            </p>
          ) : null}

          {isLoading ? (
            <p className="catalog-empty-state">Загрузка товаров с бэкенда...</p>
          ) : filteredProducts.length ? (
            <ProductGrid products={filteredProducts} categoryLookup={categoryLookup} />
          ) : (
            <p className="catalog-empty-state">
              {products.length ? 'Товары с таким названием не найдены.' : 'Бэкенд не вернул товары.'}
            </p>
          )}
        </section>
      </main>
    </div>
  );
}
