import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { type Category, buildCategoryLookup, getCategories } from '@/entities/category';
import { type Product, getAllProducts } from '@/entities/product';
import { CatalogImportPanel } from '@/features/catalog-import';
import {
  PRODUCT_PAGE_SIZE_OPTIONS,
  buildCategoryOptions,
  buildUnitOptions,
  filterProducts,
  paginateItems,
} from '@/pages/catalog/products/model/productPageView';
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
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [unitFilter, setUnitFilter] = useState('all');
  const [pageSize, setPageSize] = useState<number>(PRODUCT_PAGE_SIZE_OPTIONS[0]);
  const [page, setPage] = useState(1);

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
  const categoryOptions = useMemo(() => buildCategoryOptions(categoryLookup), [categoryLookup]);
  const unitOptions = useMemo(() => buildUnitOptions(products), [products]);
  const filteredProducts = useMemo(
    () => filterProducts(products, categoryLookup, { searchQuery, categoryFilter, unitFilter }),
    [categoryFilter, categoryLookup, products, searchQuery, unitFilter],
  );
  const pagination = useMemo(() => paginateItems(filteredProducts, page, pageSize), [filteredProducts, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [categoryFilter, pageSize, products, searchQuery, unitFilter]);

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

        <section className="catalog-layout">
          <CatalogImportPanel
            mode="products"
            title="Загрузка CSV товаров"
            description="Импортируйте или обновляйте товары через CSV-импортер бэкенда."
            onImportSuccess={loadProductsData}
            disabled={isRefreshing}
          />

          <section className="catalog-card catalog-details" aria-label="Сведения о странице товаров">
            <div className="catalog-card-copy">
              <p className="placeholder-eyebrow">Обзор</p>
              <h3 className="catalog-card-title">Список товаров</h3>
            </div>

            <div className="detail-block">
              <h4 className="detail-title">Источник</h4>
              <p className="detail-copy">GET /api/v1/catalog/products</p>
            </div>

            <div className="detail-block">
              <h4 className="detail-title">Что отображается</h4>
              <p className="detail-copy">Плоский список товаров с ценой, категорией, SKU, единицей измерения и шагом.</p>
            </div>

            <div className="detail-block">
              <h4 className="detail-title">Цель импорта</h4>
              <p className="detail-copy">CSV-импорт не описан в текущем OpenAPI-контракте.</p>
            </div>
          </section>
        </section>

        <section className="catalog-card catalog-data-card" aria-label="Товары в базе данных">
          <div className="catalog-section-header">
            <div className="catalog-card-copy">
              <p className="placeholder-eyebrow">База данных</p>
              <h3 className="catalog-card-title">Текущие товары</h3>
              <p className="catalog-card-text">Список ниже строится напрямую из ответа бэкенда.</p>
            </div>
          </div>

          <div className="catalog-controls">
            <ProductFilters
              searchQuery={searchQuery}
              categoryFilter={categoryFilter}
              unitFilter={unitFilter}
              pageSize={pageSize}
              categoryOptions={categoryOptions}
              unitOptions={unitOptions}
              pageSizeOptions={PRODUCT_PAGE_SIZE_OPTIONS}
              onSearchQueryChange={setSearchQuery}
              onCategoryFilterChange={setCategoryFilter}
              onUnitFilterChange={setUnitFilter}
              onPageSizeChange={setPageSize}
            />

            <p className="catalog-results-meta">
              {filteredProducts.length
                ? `Показано ${pagination.visibleStart}-${pagination.visibleEnd} из ${filteredProducts.length} подходящих товаров`
                : 'Нет товаров, подходящих под текущие фильтры'}
            </p>
          </div>

          {errorMessage ? (
            <p className="form-error" role="alert">
              {errorMessage}
            </p>
          ) : null}

          {isLoading ? (
            <p className="catalog-empty-state">Загрузка товаров с бэкенда...</p>
          ) : pagination.paginatedItems.length ? (
            <ProductGrid products={pagination.paginatedItems} categoryLookup={categoryLookup} />
          ) : (
            <p className="catalog-empty-state">
              {products.length ? 'Нет товаров, подходящих под текущие фильтры.' : 'Бэкенд не вернул товары.'}
            </p>
          )}

          {!isLoading && filteredProducts.length ? (
            <div className="pagination-bar">
              <button
                type="button"
                className="secondary-button pagination-button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={pagination.currentPage === 1}
              >
                Назад
              </button>
              <p className="pagination-text">
                Страница {pagination.currentPage} из {pagination.totalPages}
              </p>
              <button
                type="button"
                className="secondary-button pagination-button"
                onClick={() => setPage((current) => Math.min(pagination.totalPages, current + 1))}
                disabled={pagination.currentPage === pagination.totalPages}
              >
                Далее
              </button>
            </div>
          ) : null}
        </section>
      </main>
    </div>
  );
}
