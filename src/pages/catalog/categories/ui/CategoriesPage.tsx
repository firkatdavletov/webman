import { useEffect, useMemo, useState } from 'react';
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
import { NavBar } from '@/shared/ui/NavBar';

export function CategoriesPage() {
  const [searchParams] = useSearchParams();
  const [categories, setCategories] = useState<Category[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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
      }),
    [flattenedCategories, searchQuery],
  );

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
          <div className="catalog-controls">
            <CategoryFilters searchQuery={searchQuery} onSearchQueryChange={setSearchQuery} />

            <p className="catalog-results-meta">
              {filteredCategories.length ? `Найдено ${filteredCategories.length} категорий` : 'Категории с таким названием не найдены'}
            </p>
          </div>

          {errorMessage ? (
            <p className="form-error" role="alert">
              {errorMessage}
            </p>
          ) : null}

          {isLoading ? (
            <p className="catalog-empty-state">Загрузка категорий с бэкенда...</p>
          ) : filteredCategories.length ? (
            <CategoryList items={filteredCategories} focusedCategoryId={focusedCategoryId} />
          ) : (
            <p className="catalog-empty-state">
              {categories.length ? 'Категории с таким названием не найдены.' : 'Бэкенд не вернул категории.'}
            </p>
          )}
        </section>
      </main>
    </div>
  );
}
