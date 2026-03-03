import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { NavBar } from '../components/NavBar';
import { CatalogImportPanel } from '../components/CatalogImportPanel';
import {
  CatalogCategory,
  CatalogProduct,
  getAllProducts,
  getCategories,
} from '../catalog/catalogService';
import { buildCategoryLookup, formatPrice, formatUnitLabel } from '../catalog/catalogViewUtils';

const productPageSizeOptions = [12, 24, 48] as const;

export function ProductsPage() {
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [unitFilter, setUnitFilter] = useState('all');
  const [pageSize, setPageSize] = useState<number>(productPageSizeOptions[0]);
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
  const categoryOptions = useMemo(
    () => Array.from(categoryLookup.entries()).sort((left, right) => left[1].localeCompare(right[1], 'ru')),
    [categoryLookup],
  );
  const unitOptions = useMemo(
    () => Array.from(new Set(products.map((product) => product.unit))).sort((left, right) => left.localeCompare(right, 'ru')),
    [products],
  );
  const filteredProducts = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return products.filter((product) => {
      const categoryName = categoryLookup.get(product.categoryId)?.toLowerCase() ?? '';
      const matchesQuery =
        !normalizedQuery ||
        product.title.toLowerCase().includes(normalizedQuery) ||
        product.id.toString().includes(normalizedQuery) ||
        product.description?.toLowerCase().includes(normalizedQuery) ||
        product.sku?.toLowerCase().includes(normalizedQuery) ||
        categoryName.includes(normalizedQuery);

      const matchesCategory = categoryFilter === 'all' || product.categoryId.toString() === categoryFilter;
      const matchesUnit = unitFilter === 'all' || product.unit === unitFilter;

      return Boolean(matchesQuery && matchesCategory && matchesUnit);
    });
  }, [categoryFilter, categoryLookup, products, searchQuery, unitFilter]);

  useEffect(() => {
    setPage(1);
  }, [categoryFilter, pageSize, products, searchQuery, unitFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * pageSize;
  const paginatedProducts = filteredProducts.slice(pageStart, pageStart + pageSize);
  const visibleStart = filteredProducts.length ? pageStart + 1 : 0;
  const visibleEnd = filteredProducts.length ? Math.min(pageStart + pageSize, filteredProducts.length) : 0;

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
              <p className="detail-copy">GET /catalog/products/all</p>
            </div>

            <div className="detail-block">
              <h4 className="detail-title">Что отображается</h4>
              <p className="detail-copy">Плоский список товаров с ценой, категорией, SKU, единицей измерения и шагом.</p>
            </div>

            <div className="detail-block">
              <h4 className="detail-title">Цель импорта</h4>
              <p className="detail-copy">POST /admin/catalog/import с mode=products</p>
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
            <div className="catalog-control-grid">
              <div className="field">
                <label className="field-label" htmlFor="product-search">
                  Поиск
                </label>
                <input
                  id="product-search"
                  type="search"
                  className="field-input"
                  placeholder="Название, SKU, категория, описание или ID"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
              </div>

              <div className="field">
                <label className="field-label" htmlFor="product-category-filter">
                  Категория
                </label>
                <select
                  id="product-category-filter"
                  className="field-input"
                  value={categoryFilter}
                  onChange={(event) => setCategoryFilter(event.target.value)}
                >
                  <option value="all">Все категории</option>
                  {categoryOptions.map(([id, title]) => (
                    <option key={id} value={id}>
                      {title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label className="field-label" htmlFor="product-unit-filter">
                  Единица
                </label>
                <select
                  id="product-unit-filter"
                  className="field-input"
                  value={unitFilter}
                  onChange={(event) => setUnitFilter(event.target.value)}
                >
                  <option value="all">Все единицы</option>
                  {unitOptions.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label className="field-label" htmlFor="product-page-size">
                  Размер страницы
                </label>
                <select
                  id="product-page-size"
                  className="field-input"
                  value={pageSize}
                  onChange={(event) => setPageSize(Number(event.target.value))}
                >
                  {productPageSizeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <p className="catalog-results-meta">
              {filteredProducts.length
                ? `Показано ${visibleStart}-${visibleEnd} из ${filteredProducts.length} подходящих товаров`
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
          ) : paginatedProducts.length ? (
            <div className="product-grid">
              {paginatedProducts.map((product) => (
                <article key={product.id} className="product-card">
                  <div className="product-card-header">
                    <div className="product-card-copy">
                      <h4 className="product-card-title">{product.title}</h4>
                      <p className="product-card-meta">
                        ID {product.id}
                        {product.sku ? ` • SKU ${product.sku}` : ''}
                      </p>
                    </div>
                    <span className="product-price">{formatPrice(product.price)}</span>
                  </div>

                  <p className="product-card-meta">
                    Категория: {categoryLookup.get(product.categoryId) ?? `#${product.categoryId}`}
                  </p>

                  <div className="product-badges">
                    <span className="product-badge">{formatUnitLabel(product.unit)}</span>
                    <span className="product-badge">Шаг {product.countStep}</span>
                    {product.displayWeight ? <span className="product-badge">{product.displayWeight}</span> : null}
                  </div>

                  {product.description ? (
                    <p className="product-card-description">{product.description}</p>
                  ) : (
                    <p className="product-card-description product-card-description-muted">Без описания</p>
                  )}

                  <div className="product-card-actions">
                    <Link className="secondary-link" to={`/products/${product.id}`}>
                      Открыть карточку
                    </Link>
                  </div>
                </article>
              ))}
            </div>
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
                disabled={currentPage === 1}
              >
                Назад
              </button>
              <p className="pagination-text">
                Страница {currentPage} из {totalPages}
              </p>
              <button
                type="button"
                className="secondary-button pagination-button"
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={currentPage === totalPages}
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
