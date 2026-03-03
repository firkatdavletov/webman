import { useEffect, useMemo, useState } from 'react';
import { NavBar } from '../components/NavBar';
import { CatalogImportPanel } from '../components/CatalogImportPanel';
import { CatalogCategory, getCategories } from '../catalog/catalogService';
import { countCategoryNodes, countNestedProducts } from '../catalog/catalogViewUtils';

type CategoryViewItem = {
  category: CatalogCategory;
  depth: number;
  parentTitle: string | null;
  nestedProducts: number;
};

const categoryPageSizeOptions = [8, 16, 32] as const;

function flattenCategories(
  items: CatalogCategory[],
  depth = 0,
  parentTitle: string | null = null,
): CategoryViewItem[] {
  return items.flatMap((category) => {
    const viewItem: CategoryViewItem = {
      category,
      depth,
      parentTitle,
      nestedProducts: countNestedProducts(category),
    };

    return [viewItem, ...flattenCategories(category.children, depth + 1, category.title)];
  });
}

export function CategoriesPage() {
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [structureFilter, setStructureFilter] = useState<'all' | 'root' | 'branch' | 'leaf'>('all');
  const [imageFilter, setImageFilter] = useState<'all' | 'with-image' | 'without-image'>('all');
  const [pageSize, setPageSize] = useState<number>(categoryPageSizeOptions[0]);
  const [page, setPage] = useState(1);

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
  const flattenedCategories = useMemo(() => flattenCategories(categories), [categories]);

  const filteredCategories = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return flattenedCategories.filter((item) => {
      const matchesQuery =
        !normalizedQuery ||
        item.category.title.toLowerCase().includes(normalizedQuery) ||
        item.category.id.toString().includes(normalizedQuery) ||
        item.parentTitle?.toLowerCase().includes(normalizedQuery) ||
        item.category.sku?.toLowerCase().includes(normalizedQuery);

      const matchesStructure =
        structureFilter === 'all' ||
        (structureFilter === 'root' && item.depth === 0) ||
        (structureFilter === 'branch' && item.category.children.length > 0) ||
        (structureFilter === 'leaf' && item.category.children.length === 0);

      const hasImage = Boolean(item.category.imageUrl);
      const matchesImage =
        imageFilter === 'all' ||
        (imageFilter === 'with-image' && hasImage) ||
        (imageFilter === 'without-image' && !hasImage);

      return Boolean(matchesQuery && matchesStructure && matchesImage);
    });
  }, [flattenedCategories, imageFilter, searchQuery, structureFilter]);

  useEffect(() => {
    setPage(1);
  }, [categories, imageFilter, pageSize, searchQuery, structureFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredCategories.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * pageSize;
  const paginatedCategories = filteredCategories.slice(pageStart, pageStart + pageSize);
  const visibleStart = filteredCategories.length ? pageStart + 1 : 0;
  const visibleEnd = filteredCategories.length ? Math.min(pageStart + pageSize, filteredCategories.length) : 0;

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

        <section className="catalog-layout">
          <CatalogImportPanel
            mode="categories"
            title="Загрузка CSV категорий"
            description="Импортируйте или обновляйте категории через CSV-импортер бэкенда."
            onImportSuccess={loadCategoriesData}
            disabled={isRefreshing}
          />

          <section className="catalog-card catalog-details" aria-label="Сведения о странице категорий">
            <div className="catalog-card-copy">
              <p className="placeholder-eyebrow">Обзор</p>
              <h3 className="catalog-card-title">Дерево категорий</h3>
            </div>

            <div className="detail-block">
              <h4 className="detail-title">Источник</h4>
              <p className="detail-copy">GET /catalog/categories</p>
            </div>

            <div className="detail-block">
              <h4 className="detail-title">Что отображается</h4>
              <p className="detail-copy">Вложенная структура категорий с ID, родительскими связями, SKU и ссылкой на изображение.</p>
            </div>

            <div className="detail-block">
              <h4 className="detail-title">Цель импорта</h4>
              <p className="detail-copy">POST /admin/catalog/import с mode=categories</p>
            </div>
          </section>
        </section>

        <section className="catalog-card catalog-data-card" aria-label="Категории в базе данных">
          <div className="catalog-section-header">
            <div className="catalog-card-copy">
              <p className="placeholder-eyebrow">База данных</p>
              <h3 className="catalog-card-title">Текущие категории</h3>
              <p className="catalog-card-text">Дерево ниже строится напрямую из ответа бэкенда.</p>
            </div>
          </div>

          <div className="catalog-controls">
            <div className="catalog-control-grid">
              <div className="field">
                <label className="field-label" htmlFor="category-search">
                  Поиск
                </label>
                <input
                  id="category-search"
                  type="search"
                  className="field-input"
                  placeholder="Название, SKU, родитель или ID"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
              </div>

              <div className="field">
                <label className="field-label" htmlFor="category-structure-filter">
                  Структура
                </label>
                <select
                  id="category-structure-filter"
                  className="field-input"
                  value={structureFilter}
                  onChange={(event) => setStructureFilter(event.target.value as typeof structureFilter)}
                >
                  <option value="all">Все категории</option>
                  <option value="root">Только корневые</option>
                  <option value="branch">С дочерними</option>
                  <option value="leaf">Только конечные</option>
                </select>
              </div>

              <div className="field">
                <label className="field-label" htmlFor="category-image-filter">
                  Изображение
                </label>
                <select
                  id="category-image-filter"
                  className="field-input"
                  value={imageFilter}
                  onChange={(event) => setImageFilter(event.target.value as typeof imageFilter)}
                >
                  <option value="all">Все</option>
                  <option value="with-image">С изображением</option>
                  <option value="without-image">Без изображения</option>
                </select>
              </div>

              <div className="field">
                <label className="field-label" htmlFor="category-page-size">
                  Размер страницы
                </label>
                <select
                  id="category-page-size"
                  className="field-input"
                  value={pageSize}
                  onChange={(event) => setPageSize(Number(event.target.value))}
                >
                  {categoryPageSizeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <p className="catalog-results-meta">
              {filteredCategories.length
                ? `Показано ${visibleStart}-${visibleEnd} из ${filteredCategories.length} подходящих категорий`
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
          ) : paginatedCategories.length ? (
            <ul className="category-tree">
              {paginatedCategories.map((item) => (
                <li key={item.category.id} className="category-branch-item">
                  <article className="category-node" style={{ marginLeft: `${Math.min(item.depth, 4) * 18}px` }}>
                    <div className="category-node-header">
                      <div className="category-node-copy">
                        <h4 className="category-node-title">{item.category.title}</h4>
                        <p className="category-node-meta">
                          ID {item.category.id}
                          {item.category.sku ? ` • SKU ${item.category.sku}` : ''}
                          {item.parentTitle ? ` • Родитель: ${item.parentTitle}` : ' • Корневая'}
                        </p>
                      </div>
                      <span className="status-chip category-node-chip">{item.nestedProducts} шт.</span>
                    </div>

                    <p className="category-node-meta">
                      Уровень {item.depth + 1}
                      {item.category.children.length ? ` • Дочерних категорий: ${item.category.children.length}` : ' • Конечная'}
                    </p>

                    {item.category.imageUrl ? (
                      <p className="category-node-meta category-node-link" title={item.category.imageUrl}>
                        {item.category.imageUrl}
                      </p>
                    ) : null}
                  </article>
                </li>
              ))}
            </ul>
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
