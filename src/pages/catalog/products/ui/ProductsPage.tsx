import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { type Category, buildCategoryLookup, getCategories } from '@/entities/category';
import { type Product, getAllProducts } from '@/entities/product';
import { filterProducts } from '@/pages/catalog/products/model/productPageView';
import { ProductFilters } from '@/pages/catalog/products/ui/ProductFilters';
import { ProductTable } from '@/pages/catalog/products/ui/ProductTable';
import {
  AdminEmptyState,
  AdminNotice,
  AdminPage,
  AdminPageHeader,
  AdminPageStatus,
  AdminSectionCard,
  Button,
  buttonVariants,
} from '@/shared/ui';
import { cn } from '@/shared/lib/cn';

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
  const statusText = isLoading
    ? 'Загрузка продуктов...'
    : `${isActiveFilter ? 'Активные' : 'Неактивные'}: ${products.length} товаров • ${categories.length} категорий`;
  const resultsMeta = filteredProducts.length ? `Найдено ${filteredProducts.length} товаров` : 'Товары с таким названием не найдены';

  return (
    <AdminPage>
      <AdminPageHeader
        kicker="Каталог"
        title="Продукты"
        description="Рабочий список товаров с быстрым поиском, фильтрацией по активности и переходом в детальные карточки."
        actions={
          <>
            <AdminPageStatus>{statusText}</AdminPageStatus>
            <Link className={cn(buttonVariants({ size: 'lg' }), 'rounded-xl shadow-sm')} to="/products/new">
              Добавить товар
            </Link>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="rounded-xl bg-card/80 shadow-sm"
              onClick={() =>
                void loadProductsData({
                  isActive: isActiveFilter,
                })
              }
              disabled={isLoading || isRefreshing}
            >
              {isRefreshing ? 'Обновление...' : 'Обновить данные'}
            </Button>
          </>
        }
      />

      <AdminSectionCard
        aria-label="Товары в базе данных"
        eyebrow="База данных"
        title="Текущие товары"
        description="Таблица собирается напрямую из ответа API и отображает SKU, категорию и цену каждого товара."
      >
        <div className="space-y-4">
          <ProductFilters
            searchQuery={searchQuery}
            isActive={isActiveFilter}
            onSearchQueryChange={setSearchQuery}
            onIsActiveChange={handleIsActiveFilterChange}
          />
          <p className="text-sm text-muted-foreground">{resultsMeta}</p>
        </div>

        {errorMessage ? (
          <AdminNotice tone="destructive" role="alert">
            {errorMessage}
          </AdminNotice>
        ) : null}

        {isLoading ? (
          <AdminEmptyState title="Загрузка товаров" description="Получаем товары и справочник категорий с бэкенда." />
        ) : filteredProducts.length ? (
          <ProductTable products={filteredProducts} categoryLookup={categoryLookup} />
        ) : (
          <AdminEmptyState
            title={products.length ? 'Товары не найдены' : 'Товары отсутствуют'}
            description={products.length ? 'Попробуйте изменить поисковый запрос или переключить фильтр активности.' : 'Бэкенд не вернул товары.'}
          />
        )}
      </AdminSectionCard>
    </AdminPage>
  );
}
