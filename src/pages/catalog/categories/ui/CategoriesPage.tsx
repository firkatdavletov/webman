import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  countCategoryNodes,
  countNestedProducts,
  flattenCategoryTree,
  getCategories,
  type Category,
} from '@/entities/category';
import {
  CATEGORY_PAGE_SIZE_OPTIONS,
  type CategoryImageFilter,
  type CategoryStructureFilter,
  filterCategoryTree,
  paginateItems,
} from '@/pages/catalog/categories/model/categoryPageView';
import { CategoryFilters } from '@/pages/catalog/categories/ui/CategoryFilters';
import { CategoryList } from '@/pages/catalog/categories/ui/CategoryList';
import { isUuid } from '@/shared/lib/uuid/isUuid';
import { NavBar } from '@/shared/ui/NavBar';

export function CategoriesPage() {
  const [searchParams] = useSearchParams();
  const [categories, setCategories] = useState<Category[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [structureFilter, setStructureFilter] = useState<CategoryStructureFilter>('all');
  const [imageFilter, setImageFilter] = useState<CategoryImageFilter>('all');
  const [pageSize, setPageSize] = useState<number>(CATEGORY_PAGE_SIZE_OPTIONS[0]);
  const [page, setPage] = useState(1);

  const focusedCategoryId = useMemo(() => {
    const rawValue = searchParams.get('focusCategory')?.trim() ?? '';

    if (!rawValue || !isUuid(rawValue)) {
      return null;
    }

    return rawValue;
  }, [searchParams]);

  const loadCategoriesData = async (showInitialLoader = false) => {
    if (showInitialLoader) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    setErrorMessage('');

    const result = await getCategories();

    setCategories(result.categories);
    setErrorMessage(result.error ?? '');
    setIsLoading(false);
    setIsRefreshing(false);
  };

  useEffect(() => {
    void loadCategoriesData(true);
  }, []);

  const totalCategories = countCategoryNodes(categories);
  const totalProducts = categories.reduce((total, category) => total + countNestedProducts(category), 0);
  const flattenedCategories = useMemo(() => flattenCategoryTree(categories), [categories]);
  const filteredCategories = useMemo(
    () =>
      filterCategoryTree(flattenedCategories, {
        searchQuery,
        structureFilter,
        imageFilter,
      }),
    [flattenedCategories, imageFilter, searchQuery, structureFilter],
  );

  useEffect(() => {
    setPage(1);
  }, [categories, imageFilter, pageSize, searchQuery, structureFilter]);

  useEffect(() => {
    if (!focusedCategoryId || !filteredCategories.length) {
      return;
    }

    const focusedIndex = filteredCategories.findIndex((item) => item.category.id === focusedCategoryId);

    if (focusedIndex === -1) {
      return;
    }

    setPage(Math.floor(focusedIndex / pageSize) + 1);
  }, [filteredCategories, focusedCategoryId, pageSize]);

  const pagination = useMemo(() => paginateItems(filteredCategories, page, pageSize), [filteredCategories, page, pageSize]);

  return (
    <div className="app-shell">
      <NavBar />

      <main className="dashboard">
        <header className="dashboard-header">
          <div>
            <p className="page-kicker">Каталог</p>
            <h2 className="page-title">Категории</h2>
          </div>
          <div className="dashboard-actions">
            <span className="status-chip">
              {isLoading ? 'Загрузка категорий...' : `${totalCategories} категорий • ${totalProducts} связанных товаров`}
            </span>
            <Link className="secondary-link" to="/categories/new">
              Добавить категорию
            </Link>
            <button
              type="button"
              className="secondary-button"
              onClick={() => void loadCategoriesData()}
              disabled={isLoading || isRefreshing}
            >
              {isRefreshing ? 'Обновление...' : 'Обновить данные'}
            </button>
          </div>
        </header>

        <section className="catalog-card catalog-data-card" aria-label="Категории в базе данных">
          <div className="catalog-section-header">
            <div className="catalog-card-copy">
              <p className="placeholder-eyebrow">База данных</p>
              <h3 className="catalog-card-title">Текущие категории</h3>
              <p className="catalog-card-text">Дерево ниже строится напрямую из ответа бэкенда.</p>
            </div>
          </div>

          <div className="catalog-controls">
            <CategoryFilters
              searchQuery={searchQuery}
              structureFilter={structureFilter}
              imageFilter={imageFilter}
              pageSize={pageSize}
              pageSizeOptions={CATEGORY_PAGE_SIZE_OPTIONS}
              onSearchQueryChange={setSearchQuery}
              onStructureFilterChange={setStructureFilter}
              onImageFilterChange={setImageFilter}
              onPageSizeChange={setPageSize}
            />

            <p className="catalog-results-meta">
              {filteredCategories.length
                ? `Показано ${pagination.visibleStart}-${pagination.visibleEnd} из ${filteredCategories.length} подходящих категорий`
                : 'Нет категорий, подходящих под текущие фильтры'}
            </p>
          </div>

          {errorMessage ? (
            <p className="form-error" role="alert">
              {errorMessage}
            </p>
          ) : null}

          {isLoading ? (
            <p className="catalog-empty-state">Загрузка категорий с бэкенда...</p>
          ) : pagination.paginatedItems.length ? (
            <CategoryList items={pagination.paginatedItems} focusedCategoryId={focusedCategoryId} />
          ) : (
            <p className="catalog-empty-state">
              {categories.length ? 'Нет категорий, подходящих под текущие фильтры.' : 'Бэкенд не вернул категории.'}
            </p>
          )}

          {!isLoading && filteredCategories.length ? (
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
