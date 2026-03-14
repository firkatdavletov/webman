import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { type Category, buildCategoryLookup, getCategories } from '@/entities/category';
import { type Product, getAllProducts } from '@/entities/product';
import { filterProducts } from '@/pages/catalog/products/model/productPageView';
import { ProductFilters } from '@/pages/catalog/products/ui/ProductFilters';
import { ProductTable } from '@/pages/catalog/products/ui/ProductTable';
import { NavBar } from '@/shared/ui/NavBar';

const PRODUCTS_ACTIVITY_FILTER_STORAGE_KEY = 'webman.products-page.is-active-filter';
const PRODUCTS_PAGE_CACHE_STORAGE_KEY = 'webman.products-page.cache.v1';

type ProductsPageSnapshot = {
  categories: Category[];
  products: Product[];
};

type ProductsPageCache = {
  active: ProductsPageSnapshot | null;
  inactive: ProductsPageSnapshot | null;
};

type LoadProductsDataOptions = {
  showInitialLoader?: boolean;
  isActive?: boolean;
};

function getProductsCacheBucketName(isActive: boolean): 'active' | 'inactive' {
  return isActive ? 'active' : 'inactive';
}

function readProductsPageCache(): ProductsPageCache {
  if (typeof window === 'undefined') {
    return {
      active: null,
      inactive: null,
    };
  }

  const rawValue = window.localStorage.getItem(PRODUCTS_PAGE_CACHE_STORAGE_KEY);

  if (!rawValue) {
    return {
      active: null,
      inactive: null,
    };
  }

  try {
    const parsedValue = JSON.parse(rawValue) as ProductsPageCache;
    return {
      active:
        parsedValue && parsedValue.active && Array.isArray(parsedValue.active.categories) && Array.isArray(parsedValue.active.products)
          ? parsedValue.active
          : null,
      inactive:
        parsedValue &&
        parsedValue.inactive &&
        Array.isArray(parsedValue.inactive.categories) &&
        Array.isArray(parsedValue.inactive.products)
          ? parsedValue.inactive
          : null,
    };
  } catch {
    return {
      active: null,
      inactive: null,
    };
  }
}

function readProductsPageSnapshot(isActive: boolean): ProductsPageSnapshot | null {
  const cache = readProductsPageCache();

  return cache[getProductsCacheBucketName(isActive)];
}

function persistProductsPageSnapshot(isActive: boolean, snapshot: ProductsPageSnapshot): void {
  if (typeof window === 'undefined') {
    return;
  }

  const cache = readProductsPageCache();

  cache[getProductsCacheBucketName(isActive)] = snapshot;
  window.localStorage.setItem(PRODUCTS_PAGE_CACHE_STORAGE_KEY, JSON.stringify(cache));
}

function readProductsPageActivityFilter(): boolean {
  if (typeof window === 'undefined') {
    return true;
  }

  return window.localStorage.getItem(PRODUCTS_ACTIVITY_FILTER_STORAGE_KEY) !== 'false';
}

function persistProductsPageActivityFilter(isActive: boolean): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(PRODUCTS_ACTIVITY_FILTER_STORAGE_KEY, String(isActive));
}

export function ProductsPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [isActiveFilter, setIsActiveFilter] = useState<boolean>(() => readProductsPageActivityFilter());
  const [isLoading, setIsLoading] = useState(() => !Boolean(readProductsPageSnapshot(readProductsPageActivityFilter())));
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const requestIdRef = useRef(0);

  const loadProductsData = async ({ showInitialLoader = false, isActive = isActiveFilter }: LoadProductsDataOptions = {}) => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    if (showInitialLoader) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    setErrorMessage('');

    const [categoriesResult, productsResult] = await Promise.all([
      getCategories({
        isActive,
      }),
      getAllProducts({
        isActive,
      }),
    ]);

    if (requestId !== requestIdRef.current) {
      return;
    }

    const nextError = [categoriesResult.error, productsResult.error].filter(Boolean).join(' ');

    setCategories(categoriesResult.categories);
    setProducts(productsResult.products);
    setErrorMessage(nextError);

    if (!categoriesResult.error && !productsResult.error) {
      persistProductsPageSnapshot(isActive, {
        categories: categoriesResult.categories,
        products: productsResult.products,
      });
    }

    setIsLoading(false);
    setIsRefreshing(false);
  };

  useEffect(() => {
    const cachedSnapshot = readProductsPageSnapshot(isActiveFilter);

    if (cachedSnapshot) {
      setCategories(cachedSnapshot.categories);
      setProducts(cachedSnapshot.products);
      setIsLoading(false);
    }

    void loadProductsData({
      showInitialLoader: !cachedSnapshot,
      isActive: isActiveFilter,
    });
  }, []);

  const handleIsActiveFilterChange = (nextValue: boolean) => {
    if (nextValue === isActiveFilter) {
      return;
    }

    setIsActiveFilter(nextValue);
    persistProductsPageActivityFilter(nextValue);
    setSearchQuery('');

    const cachedSnapshot = readProductsPageSnapshot(nextValue);

    if (cachedSnapshot) {
      setCategories(cachedSnapshot.categories);
      setProducts(cachedSnapshot.products);
      setIsLoading(false);
    }

    void loadProductsData({
      showInitialLoader: !cachedSnapshot,
      isActive: nextValue,
    });
  };

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
              {isLoading
                ? 'Загрузка продуктов...'
                : `${isActiveFilter ? 'Активные' : 'Неактивные'}: ${products.length} товаров • ${categories.length} категорий`}
            </span>
            <Link className="secondary-link" to="/products/new">
              Добавить товар
            </Link>
            <button
              type="button"
              className="secondary-button"
              onClick={() =>
                void loadProductsData({
                  isActive: isActiveFilter,
                })
              }
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
            <ProductFilters
              searchQuery={searchQuery}
              isActive={isActiveFilter}
              onSearchQueryChange={setSearchQuery}
              onIsActiveChange={handleIsActiveFilterChange}
            />

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
            <ProductTable products={filteredProducts} categoryLookup={categoryLookup} />
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
