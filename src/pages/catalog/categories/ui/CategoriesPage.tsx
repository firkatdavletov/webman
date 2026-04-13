import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  countCategoryNodes,
  countNestedProducts,
  flattenCategoryTree,
  getCategories,
  type Category,
} from '@/entities/category';
import { filterCategoryTree } from '@/pages/catalog/categories/model/categoryPageView';
import { CategoryFilters } from '@/pages/catalog/categories/ui/CategoryFilters';
import { CategoryList } from '@/pages/catalog/categories/ui/CategoryList';
import { isUuid } from '@/shared/lib/uuid/isUuid';
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

const CATEGORIES_ACTIVITY_FILTER_STORAGE_KEY = 'webman.categories-page.is-active-filter';
const CATEGORIES_PAGE_CACHE_STORAGE_KEY = 'webman.categories-page.cache.v1';

type CategoriesPageCache = {
  active: Category[] | null;
  inactive: Category[] | null;
};

type LoadCategoriesDataOptions = {
  showInitialLoader?: boolean;
  isActive?: boolean;
};

function getCategoriesCacheBucketName(isActive: boolean): 'active' | 'inactive' {
  return isActive ? 'active' : 'inactive';
}

function readCategoriesPageCache(): CategoriesPageCache {
  if (typeof window === 'undefined') {
    return {
      active: null,
      inactive: null,
    };
  }

  const rawValue = window.localStorage.getItem(CATEGORIES_PAGE_CACHE_STORAGE_KEY);

  if (!rawValue) {
    return {
      active: null,
      inactive: null,
    };
  }

  try {
    const parsedValue = JSON.parse(rawValue) as CategoriesPageCache;
    return {
      active: parsedValue && Array.isArray(parsedValue.active) ? parsedValue.active : null,
      inactive: parsedValue && Array.isArray(parsedValue.inactive) ? parsedValue.inactive : null,
    };
  } catch {
    return {
      active: null,
      inactive: null,
    };
  }
}

function readCategoriesPageSnapshot(isActive: boolean): Category[] | null {
  const cache = readCategoriesPageCache();

  return cache[getCategoriesCacheBucketName(isActive)];
}

function persistCategoriesPageSnapshot(isActive: boolean, categories: Category[]): void {
  if (typeof window === 'undefined') {
    return;
  }

  const cache = readCategoriesPageCache();

  cache[getCategoriesCacheBucketName(isActive)] = categories;
  window.localStorage.setItem(CATEGORIES_PAGE_CACHE_STORAGE_KEY, JSON.stringify(cache));
}

function readCategoriesPageActivityFilter(): boolean {
  if (typeof window === 'undefined') {
    return true;
  }

  return window.localStorage.getItem(CATEGORIES_ACTIVITY_FILTER_STORAGE_KEY) !== 'false';
}

function persistCategoriesPageActivityFilter(isActive: boolean): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(CATEGORIES_ACTIVITY_FILTER_STORAGE_KEY, String(isActive));
}

export function CategoriesPage() {
  const [searchParams] = useSearchParams();
  const [categories, setCategories] = useState<Category[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [isActiveFilter, setIsActiveFilter] = useState<boolean>(() => readCategoriesPageActivityFilter());
  const [isLoading, setIsLoading] = useState(() => !Boolean(readCategoriesPageSnapshot(readCategoriesPageActivityFilter())));
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const requestIdRef = useRef(0);

  const focusedCategoryId = useMemo(() => {
    const rawValue = searchParams.get('focusCategory')?.trim() ?? '';

    if (!rawValue || !isUuid(rawValue)) {
      return null;
    }

    return rawValue;
  }, [searchParams]);

  const loadCategoriesData = async ({ showInitialLoader = false, isActive = isActiveFilter }: LoadCategoriesDataOptions = {}) => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    if (showInitialLoader) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    setErrorMessage('');

    const result = await getCategories({
      isActive,
    });

    if (requestId !== requestIdRef.current) {
      return;
    }

    setCategories(result.categories);
    setErrorMessage(result.error ?? '');

    if (!result.error) {
      persistCategoriesPageSnapshot(isActive, result.categories);
    }

    setIsLoading(false);
    setIsRefreshing(false);
  };

  useEffect(() => {
    const cachedCategories = readCategoriesPageSnapshot(isActiveFilter);

    if (cachedCategories) {
      setCategories(cachedCategories);
      setIsLoading(false);
    }

    void loadCategoriesData({
      showInitialLoader: !cachedCategories,
      isActive: isActiveFilter,
    });
  }, []);

  const handleIsActiveFilterChange = (nextValue: boolean) => {
    if (nextValue === isActiveFilter) {
      return;
    }

    setIsActiveFilter(nextValue);
    persistCategoriesPageActivityFilter(nextValue);
    setSearchQuery('');

    const cachedCategories = readCategoriesPageSnapshot(nextValue);

    if (cachedCategories) {
      setCategories(cachedCategories);
      setIsLoading(false);
    }

    void loadCategoriesData({
      showInitialLoader: !cachedCategories,
      isActive: nextValue,
    });
  };

  const totalCategories = countCategoryNodes(categories);
  const totalProducts = categories.reduce((total, category) => total + countNestedProducts(category), 0);
  const flattenedCategories = useMemo(() => flattenCategoryTree(categories), [categories]);
  const filteredCategories = useMemo(
    () =>
      filterCategoryTree(flattenedCategories, {
        searchQuery,
      }),
    [flattenedCategories, searchQuery],
  );
  const statusText = isLoading
    ? 'Загрузка категорий...'
    : `${isActiveFilter ? 'Активные' : 'Неактивные'}: ${totalCategories} категорий • ${totalProducts} связанных товаров`;
  const resultsMeta = filteredCategories.length
    ? `Найдено ${filteredCategories.length} категорий`
    : 'Категории с таким названием не найдены';

  return (
    <AdminPage>
      <AdminPageHeader
        kicker="Каталог"
        title="Категории"
        description="Фильтруйте дерево категорий, быстро переходите в карточки и отслеживайте состояние каталога из одного раздела."
        actions={
          <>
            <AdminPageStatus>{statusText}</AdminPageStatus>
            <Link className={cn(buttonVariants({ size: 'lg' }), 'rounded-xl shadow-sm')} to="/categories/new">
              Добавить категорию
            </Link>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="rounded-xl bg-card/80 shadow-sm"
              onClick={() =>
                void loadCategoriesData({
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
        aria-label="Категории в базе данных"
        eyebrow="Список"
        title="Категории в базе данных"
        description="Данные ниже строятся из ответа бэкенда и обновляются без перезагрузки маршрута."
      >
        <div className="space-y-4">
          <CategoryFilters
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
          <AdminEmptyState title="Загрузка категорий" description="Получаем категории с бэкенда и обновляем локальный кеш страницы." />
        ) : filteredCategories.length ? (
          <CategoryList items={filteredCategories} focusedCategoryId={focusedCategoryId} />
        ) : (
          <AdminEmptyState
            title={categories.length ? 'Категории не найдены' : 'Каталог пока пуст'}
            description={
              categories.length ? 'Попробуйте изменить поисковый запрос или переключить фильтр активности.' : 'Бэкенд не вернул категории.'
            }
          />
        )}
      </AdminSectionCard>
    </AdminPage>
  );
}
