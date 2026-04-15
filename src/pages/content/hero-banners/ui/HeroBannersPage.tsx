import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { BannerStatus, HeroBanner } from '@/entities/hero-banner';
import { getHeroBanners } from '@/entities/hero-banner';
import { HeroBannerFilters } from '@/pages/content/hero-banners/ui/HeroBannerFilters';
import { HeroBannerList } from '@/pages/content/hero-banners/ui/HeroBannerList';
import {
  AdminEmptyState,
  AdminNotice,
  AdminPage,
  AdminPageHeader,
  AdminPageStatus,
  AdminSectionCard,
  Button,
} from '@/shared/ui';

const BANNERS_STATUS_FILTER_STORAGE_KEY = 'webman.hero-banners-page.status-filter';

function readStatusFilter(): BannerStatus | '' {
  if (typeof window === 'undefined') return '';
  const stored = window.localStorage.getItem(BANNERS_STATUS_FILTER_STORAGE_KEY);
  if (stored === 'DRAFT' || stored === 'PUBLISHED' || stored === 'ARCHIVED') return stored;
  return '';
}

function persistStatusFilter(value: BannerStatus | ''): void {
  if (typeof window === 'undefined') return;
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

    if (requestId !== requestIdRef.current) return;

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
    <AdminPage>
      <AdminPageHeader
        kicker="Контент"
        title="Hero-баннеры"
        actions={
          <>
            <AdminPageStatus>
              {isLoading ? 'Загрузка...' : `Всего: ${totalElements}`}
            </AdminPageStatus>
            <Link
              className="inline-flex h-8 items-center justify-center rounded-lg border border-border px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              to="/hero-banners/new"
            >
              Добавить баннер
            </Link>
            <Button
              variant="outline"
              onClick={() => void loadBanners()}
              disabled={isLoading || isRefreshing}
            >
              {isRefreshing ? 'Обновление...' : 'Обновить'}
            </Button>
          </>
        }
      />

      <AdminSectionCard eyebrow="Список" title="Все баннеры">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <HeroBannerFilters
            searchQuery={searchQuery}
            statusFilter={statusFilter}
            onSearchQueryChange={handleSearchQueryChange}
            onStatusFilterChange={handleStatusFilterChange}
          />
          <div className="flex items-center gap-3">
            {searchQuery ? (
              <Button variant="outline" size="sm" onClick={handleSearchSubmit} disabled={isLoading}>
                Найти
              </Button>
            ) : null}
            <p className="text-xs text-muted-foreground">
              {banners.length ? `Показано ${banners.length} из ${totalElements}` : 'Баннеры не найдены'}
            </p>
          </div>
        </div>

        {errorMessage ? (
          <AdminNotice tone="destructive" role="alert">{errorMessage}</AdminNotice>
        ) : null}

        {isLoading ? (
          <AdminEmptyState description="Загрузка баннеров..." />
        ) : banners.length ? (
          <>
            <HeroBannerList items={banners} />

            {totalPages > 1 ? (
              <div className="flex items-center justify-center gap-3 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 0 || isRefreshing}
                  onClick={() => handlePageChange(currentPage - 1)}
                >
                  Назад
                </Button>
                <span className="text-sm text-muted-foreground">
                  Страница {currentPage + 1} из {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages - 1 || isRefreshing}
                  onClick={() => handlePageChange(currentPage + 1)}
                >
                  Вперёд
                </Button>
              </div>
            ) : null}
          </>
        ) : (
          <AdminEmptyState description="Баннеры не найдены." />
        )}
      </AdminSectionCard>
    </AdminPage>
  );
}
