import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { BannerStatus, HeroBanner } from '@/entities/hero-banner';
import { getHeroBanners } from '@/entities/hero-banner';
import { HeroBannerFilters } from '@/pages/content/hero-banners/ui/HeroBannerFilters';
import { HeroBannerList } from '@/pages/content/hero-banners/ui/HeroBannerList';
import { NavBar } from '@/shared/ui/NavBar';

const BANNERS_STATUS_FILTER_STORAGE_KEY = 'webman.hero-banners-page.status-filter';

function readStatusFilter(): BannerStatus | '' {
  if (typeof window === 'undefined') {
    return '';
  }

  const stored = window.localStorage.getItem(BANNERS_STATUS_FILTER_STORAGE_KEY);

  if (stored === 'DRAFT' || stored === 'PUBLISHED' || stored === 'ARCHIVED') {
    return stored;
  }

  return '';
}

function persistStatusFilter(value: BannerStatus | ''): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(BANNERS_STATUS_FILTER_STORAGE_KEY, value);
}

export function HeroBannersPage() {
  const [banners, setBanners] = useState<HeroBanner[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [statusFilter, setStatusFilter] = useState<BannerStatus | ''>(() => readStatusFilter());
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [totalElements, setTotalElements] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const requestIdRef = useRef(0);

  const loadBanners = async ({
    showInitialLoader = false,
    status = statusFilter,
    search = searchQuery,
    page = 0,
  }: {
    showInitialLoader?: boolean;
    status?: BannerStatus | '';
    search?: string;
    page?: number;
  } = {}) => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    if (showInitialLoader) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    setErrorMessage('');

    const result = await getHeroBanners({
      status: status || undefined,
      search: search || undefined,
      page,
      size: 20,
    });

    if (requestId !== requestIdRef.current) {
      return;
    }

    if (result.page) {
      setBanners(result.page.items);
      setTotalElements(result.page.totalElements);
      setCurrentPage(result.page.page);
      setTotalPages(result.page.totalPages);
    } else {
      setBanners([]);
      setTotalElements(0);
      setCurrentPage(0);
      setTotalPages(0);
    }

    setErrorMessage(result.error ?? '');
    setIsLoading(false);
    setIsRefreshing(false);
  };

  useEffect(() => {
    void loadBanners({ showInitialLoader: true });
  }, []);

  const handleStatusFilterChange = (nextValue: BannerStatus | '') => {
    setStatusFilter(nextValue);
    persistStatusFilter(nextValue);
    setCurrentPage(0);
    void loadBanners({ showInitialLoader: true, status: nextValue, page: 0 });
  };

  const handleSearchQueryChange = (nextValue: string) => {
    setSearchQuery(nextValue);
  };

  const handleSearchSubmit = () => {
    setCurrentPage(0);
    void loadBanners({ showInitialLoader: true, page: 0 });
  };

  const handlePageChange = (page: number) => {
    void loadBanners({ page });
  };

  return (
    <div className="app-shell">
      <NavBar />

      <main className="dashboard">
        <header className="dashboard-header">
          <div>
            <p className="page-kicker">Контент</p>
            <h2 className="page-title">Hero-баннеры</h2>
          </div>
          <div className="dashboard-actions">
            <span className="status-chip">
              {isLoading ? 'Загрузка баннеров...' : `Всего: ${totalElements} баннеров`}
            </span>
            <Link className="secondary-link" to="/hero-banners/new">
              Добавить баннер
            </Link>
            <button
              type="button"
              className="secondary-button"
              onClick={() => void loadBanners()}
              disabled={isLoading || isRefreshing}
            >
              {isRefreshing ? 'Обновление...' : 'Обновить данные'}
            </button>
          </div>
        </header>

        <section className="catalog-card catalog-data-card" aria-label="Hero-баннеры">
          <div className="catalog-controls">
            <HeroBannerFilters
              searchQuery={searchQuery}
              statusFilter={statusFilter}
              onSearchQueryChange={handleSearchQueryChange}
              onStatusFilterChange={handleStatusFilterChange}
            />

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              {searchQuery ? (
                <button type="button" className="secondary-button" onClick={handleSearchSubmit} disabled={isLoading}>
                  Найти
                </button>
              ) : null}

              <p className="catalog-results-meta">
                {banners.length ? `Показано ${banners.length} из ${totalElements}` : 'Баннеры не найдены'}
              </p>
            </div>
          </div>

          {errorMessage ? (
            <p className="form-error" role="alert">
              {errorMessage}
            </p>
          ) : null}

          {isLoading ? (
            <p className="catalog-empty-state">Загрузка баннеров...</p>
          ) : banners.length ? (
            <>
              <HeroBannerList items={banners} />

              {totalPages > 1 ? (
                <div className="catalog-pagination" style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', padding: '1rem' }}>
                  <button
                    type="button"
                    className="secondary-button"
                    disabled={currentPage <= 0 || isRefreshing}
                    onClick={() => handlePageChange(currentPage - 1)}
                  >
                    Назад
                  </button>
                  <span className="catalog-meta" style={{ display: 'flex', alignItems: 'center' }}>
                    Страница {currentPage + 1} из {totalPages}
                  </span>
                  <button
                    type="button"
                    className="secondary-button"
                    disabled={currentPage >= totalPages - 1 || isRefreshing}
                    onClick={() => handlePageChange(currentPage + 1)}
                  >
                    Вперёд
                  </button>
                </div>
              ) : null}
            </>
          ) : (
            <p className="catalog-empty-state">Баннеры не найдены.</p>
          )}
        </section>
      </main>
    </div>
  );
}
