import { useEffect, useMemo, useRef, useState } from 'react';
import { RefreshCcwIcon, SearchIcon } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { getOrderStatuses, type OrderStatusDefinition } from '@/entities/order-status';
import { cn } from '@/shared/lib/cn';
import {
  AdminEmptyState,
  AdminNotice,
  AdminPage,
  AdminPageHeader,
  AdminPageStatus,
  AdminSectionCard,
  Button,
  FormField,
  Input,
  SegmentedControl,
  buttonVariants,
} from '@/shared/ui';
import { filterOrderStatuses, sortStatuses } from '@/pages/order-statuses/model/orderStatusPage';
import { OrderStatusesTable } from '@/pages/order-statuses/ui/OrderStatusesTable';

export function OrderStatusesPage() {
  const navigate = useNavigate();
  const [statuses, setStatuses] = useState<OrderStatusDefinition[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const requestIdRef = useRef(0);

  const loadStatuses = async ({ showInitialLoader = false }: { showInitialLoader?: boolean } = {}) => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    if (showInitialLoader) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    setErrorMessage('');

    const result = await getOrderStatuses({
      includeInactive: true,
    });

    if (requestId !== requestIdRef.current) {
      return;
    }

    setStatuses(sortStatuses(result.statuses));
    setErrorMessage(result.error ?? '');
    setIsLoading(false);
    setIsRefreshing(false);
  };

  useEffect(() => {
    void loadStatuses({
      showInitialLoader: true,
    });
  }, []);

  const activeCount = useMemo(() => statuses.filter((status) => status.isActive).length, [statuses]);
  const inactiveCount = statuses.length - activeCount;
  const visibleStatuses = useMemo(
    () =>
      filterOrderStatuses(statuses, {
        includeInactive,
        searchQuery,
      }),
    [includeInactive, searchQuery, statuses],
  );

  const statusText = isLoading
    ? 'Загрузка статусов...'
    : `${visibleStatuses.length} из ${statuses.length} статусов • активных ${activeCount}${inactiveCount ? ` • неактивных ${inactiveCount}` : ''}`;
  const resultsMeta = visibleStatuses.length
    ? `Показано ${visibleStatuses.length} записей. Поиск работает по коду, названию, описанию и типу состояния.`
    : searchQuery.trim()
      ? 'По текущему запросу статусы не найдены.'
      : includeInactive
        ? 'Справочник статусов пуст.'
        : 'Активные статусы не найдены. Переключитесь на режим «Все», чтобы проверить архивные записи.';

  return (
    <AdminPage>
      <AdminPageHeader
        kicker="Справочники"
        title="Статусы заказов"
        description="Рабочий список статусов с быстрым поиском и переходом на отдельный экран редактирования."
        actions={
          <>
            <AdminPageStatus>{statusText}</AdminPageStatus>
            <Link className={cn(buttonVariants({ size: 'lg' }), 'rounded-xl shadow-sm')} to="/order-statuses/new">
              Новый статус
            </Link>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="rounded-xl bg-card/80 shadow-sm"
              onClick={() => void loadStatuses()}
              disabled={isLoading || isRefreshing}
            >
              <RefreshCcwIcon className={cn('size-4', isRefreshing && 'animate-spin')} />
              {isRefreshing ? 'Обновление...' : 'Обновить'}
            </Button>
          </>
        }
      />

      <AdminSectionCard
        aria-label="Список статусов заказов"
        eyebrow="Directory"
        title="Справочник статусов"
        description="Создание, редактирование и настройка переходов вынесены в отдельный экран, чтобы таблица оставалась быстрым операционным списком."
      >
        <div className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[auto_minmax(18rem,22rem)] xl:items-end xl:justify-between">
            <SegmentedControl
              ariaLabel="Фильтр активности статусов"
              onValueChange={setIncludeInactive}
              options={[
                { label: 'Активные', value: false, hint: activeCount },
                { label: 'Все', value: true, hint: statuses.length },
              ]}
              value={includeInactive}
            />

            <FormField className="min-w-0" htmlFor="order-statuses-search" label="Поиск по статусам">
              <div className="relative">
                <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="order-statuses-search"
                  type="search"
                  className="h-11 rounded-xl bg-background/80 pl-10 shadow-sm"
                  placeholder="Код, название, описание, тип состояния"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
              </div>
            </FormField>
          </div>

          <p className="text-sm text-muted-foreground">{resultsMeta}</p>
        </div>

        {errorMessage ? (
          <AdminNotice tone="destructive" role="alert">
            {errorMessage}
          </AdminNotice>
        ) : null}

        {isLoading ? (
          <AdminEmptyState title="Загрузка статусов" description="Получаем справочник статусов заказов с backend API." />
        ) : visibleStatuses.length ? (
          <OrderStatusesTable
            statuses={visibleStatuses}
            onOpenStatus={(status) =>
              navigate(`/order-statuses/${status.id}`, {
                state: {
                  initialStatus: status,
                  initialStatuses: statuses,
                },
              })
            }
          />
        ) : (
          <AdminEmptyState
            title={statuses.length ? 'Статусы не найдены' : 'Справочник пуст'}
            description={
              statuses.length
                ? 'Измените поисковый запрос или переключите фильтр активности.'
                : 'Создайте первый статус, чтобы затем на его основе настраивать переходы.'
            }
          />
        )}
      </AdminSectionCard>
    </AdminPage>
  );
}
