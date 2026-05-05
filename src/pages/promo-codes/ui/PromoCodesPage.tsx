import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getPromoCodes, type PromoCode, type PromoCodeDiscountType } from '@/entities/promo-code';
import { cn } from '@/shared/lib/cn';
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
import {
  resolvePromoCodeActivityFilter,
  sortPromoCodes,
  type PromoCodeActivityFilter,
} from '@/pages/promo-codes/model/promoCodePage';
import { PromoCodeFilters } from '@/pages/promo-codes/ui/PromoCodeFilters';
import { PromoCodesTable } from '@/pages/promo-codes/ui/PromoCodesTable';

export function PromoCodesPage() {
  const navigate = useNavigate();
  const requestIdRef = useRef(0);
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activityFilter, setActivityFilter] = useState<PromoCodeActivityFilter>('all');
  const [discountTypeFilter, setDiscountTypeFilter] = useState<PromoCodeDiscountType | ''>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadPromoCodes = async ({
    showInitialLoader = false,
    nextSearchQuery = searchQuery,
    nextActivityFilter = activityFilter,
    nextDiscountTypeFilter = discountTypeFilter,
  }: {
    showInitialLoader?: boolean;
    nextSearchQuery?: string;
    nextActivityFilter?: PromoCodeActivityFilter;
    nextDiscountTypeFilter?: PromoCodeDiscountType | '';
  } = {}) => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    if (showInitialLoader) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    setErrorMessage('');

    const result = await getPromoCodes({
      active: resolvePromoCodeActivityFilter(nextActivityFilter),
      discountType: nextDiscountTypeFilter || undefined,
      code: nextSearchQuery.trim() || undefined,
    });

    if (requestId !== requestIdRef.current) {
      return;
    }

    setPromoCodes(sortPromoCodes(result.promoCodes));
    setErrorMessage(result.error ?? '');
    setIsLoading(false);
    setIsRefreshing(false);
  };

  useEffect(() => {
    void loadPromoCodes({
      showInitialLoader: true,
    });
  }, []);

  const handleSearchSubmit = () => {
    void loadPromoCodes({
      showInitialLoader: true,
      nextSearchQuery: searchQuery,
      nextActivityFilter: activityFilter,
      nextDiscountTypeFilter: discountTypeFilter,
    });
  };

  const handleActivityFilterChange = (nextValue: PromoCodeActivityFilter) => {
    setActivityFilter(nextValue);

    void loadPromoCodes({
      showInitialLoader: true,
      nextSearchQuery: searchQuery,
      nextActivityFilter: nextValue,
      nextDiscountTypeFilter: discountTypeFilter,
    });
  };

  const handleDiscountTypeFilterChange = (nextValue: PromoCodeDiscountType | '') => {
    setDiscountTypeFilter(nextValue);

    void loadPromoCodes({
      showInitialLoader: true,
      nextSearchQuery: searchQuery,
      nextActivityFilter: activityFilter,
      nextDiscountTypeFilter: nextValue,
    });
  };

  const metaText = useMemo(() => {
    if (!promoCodes.length) {
      return 'Промокоды по текущим фильтрам не найдены.';
    }

    return `Показано ${promoCodes.length} промокодов.`;
  }, [promoCodes.length]);

  return (
    <AdminPage>
      <AdminPageHeader
        kicker="Операции"
        title="Промокоды"
        description="Управляйте скидками, лимитами использования и периодами действия промокодов."
        actions={
          <>
            <AdminPageStatus>{isLoading ? 'Загрузка...' : `Найдено: ${promoCodes.length}`}</AdminPageStatus>
            <Link className={cn(buttonVariants({ size: 'lg' }), 'rounded-xl shadow-sm')} to="/promo-codes/new">
              Новый промокод
            </Link>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="rounded-xl bg-card/80 shadow-sm"
              onClick={() => void loadPromoCodes()}
              disabled={isLoading || isRefreshing}
            >
              {isRefreshing ? 'Обновление...' : 'Обновить'}
            </Button>
          </>
        }
      />

      <AdminSectionCard
        aria-label="Список промокодов"
        eyebrow="Список"
        title="Все промокоды"
        description="Используйте фильтры по активности, типу скидки и коду, затем откройте карточку для детальной настройки."
      >
        <div className="space-y-4">
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
            <PromoCodeFilters
              searchQuery={searchQuery}
              activityFilter={activityFilter}
              discountTypeFilter={discountTypeFilter}
              onSearchQueryChange={setSearchQuery}
              onActivityFilterChange={handleActivityFilterChange}
              onDiscountTypeFilterChange={handleDiscountTypeFilterChange}
              onSubmit={handleSearchSubmit}
            />
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-xl"
              onClick={handleSearchSubmit}
              disabled={isLoading}
            >
              Найти
            </Button>
          </div>

          <p className="text-sm text-muted-foreground">{metaText}</p>
        </div>

        {errorMessage ? (
          <AdminNotice tone="destructive" role="alert">
            {errorMessage}
          </AdminNotice>
        ) : null}

        {isLoading ? (
          <AdminEmptyState title="Загрузка промокодов" description="Получаем список промокодов из backend API." />
        ) : promoCodes.length ? (
          <PromoCodesTable promoCodes={promoCodes} onOpenPromoCode={(promoCode) => navigate(`/promo-codes/${promoCode.id}`)} />
        ) : (
          <AdminEmptyState
            title="Промокоды не найдены"
            description="Измените фильтры или создайте новый промокод для запуска промо-механик."
          />
        )}
      </AdminSectionCard>
    </AdminPage>
  );
}
