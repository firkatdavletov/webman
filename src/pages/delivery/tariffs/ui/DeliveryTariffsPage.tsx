import { useEffect, useMemo, useRef, useState } from 'react';
import { SearchIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getDeliveryTariffs, type DeliveryTariff } from '@/entities/delivery';
import {
  formatDeliveryEstimate,
  formatMoneyMinor,
  getDeliveryMethodLabel,
  sortDeliveryTariffs,
} from '@/pages/delivery/model/deliveryAdmin';
import { DeliveryListItemLink, DeliveryStatusBadge } from '@/pages/delivery/ui/deliveryShared';
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

export function DeliveryTariffsPage() {
  const [tariffs, setTariffs] = useState<DeliveryTariff[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [includeUnavailable, setIncludeUnavailable] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const requestIdRef = useRef(0);

  const loadTariffs = async ({ showInitialLoader = false }: { showInitialLoader?: boolean } = {}) => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    if (showInitialLoader) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    setErrorMessage('');

    const result = await getDeliveryTariffs();

    if (requestId !== requestIdRef.current) {
      return;
    }

    setTariffs(sortDeliveryTariffs(result.tariffs));
    setErrorMessage(result.error ?? '');
    setIsLoading(false);
    setIsRefreshing(false);
  };

  useEffect(() => {
    void loadTariffs({
      showInitialLoader: true,
    });
  }, []);

  const availableCount = useMemo(() => tariffs.filter((tariff) => tariff.isAvailable).length, [tariffs]);
  const visibleTariffs = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return tariffs.filter((tariff) => {
      if (!includeUnavailable && !tariff.isAvailable) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return [
        tariff.zoneCode ?? '',
        tariff.zoneName ?? '',
        tariff.method,
        getDeliveryMethodLabel(tariff.method),
        tariff.currency,
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [includeUnavailable, searchQuery, tariffs]);

  const statusText = isLoading
    ? 'Загрузка тарифов...'
    : `${visibleTariffs.length} из ${tariffs.length} тарифов • доступных ${availableCount}`;

  return (
    <AdminPage>
      <AdminPageHeader
        kicker="Доставка"
        title="Тарифы доставки"
        description="Отдельный список тарифов упрощает навигацию: выбор тарифа, просмотр зоны и переход в детальную форму теперь происходят без смешивания с другими delivery-сущностями."
        actions={
          <>
            <AdminPageStatus>{statusText}</AdminPageStatus>
            <Link className={cn(buttonVariants({ size: 'lg' }), 'rounded-xl shadow-sm')} to="/delivery/tariffs/new">
              Новый тариф
            </Link>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="rounded-xl bg-card/80 shadow-sm"
              onClick={() => void loadTariffs()}
              disabled={isLoading || isRefreshing}
            >
              {isRefreshing ? 'Обновление...' : 'Обновить'}
            </Button>
          </>
        }
      />

      <AdminSectionCard
        eyebrow="Операционный список"
        title="Справочник тарифов"
        description="Каждый тариф теперь открывается на собственной detail-странице, где удобно редактировать цену, порог бесплатной доставки и доступность."
      >
        <div className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[auto_minmax(18rem,22rem)] xl:items-end xl:justify-between">
            <SegmentedControl
              ariaLabel="Фильтр доступности тарифов"
              onValueChange={setIncludeUnavailable}
              options={[
                { label: 'Доступные', value: false, hint: availableCount },
                { label: 'Все', value: true, hint: tariffs.length },
              ]}
              value={includeUnavailable}
            />

            <FormField htmlFor="delivery-tariffs-search" label="Поиск по тарифам">
              <div className="relative">
                <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="delivery-tariffs-search"
                  type="search"
                  className="h-11 rounded-xl bg-background/80 pl-10 shadow-sm"
                  placeholder="Способ доставки, зона или валюта"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
              </div>
            </FormField>
          </div>

          {errorMessage ? (
            <AdminNotice tone="destructive" role="alert">
              {errorMessage}
            </AdminNotice>
          ) : null}

          {isLoading ? (
            <AdminEmptyState title="Загрузка тарифов" description="Получаем список тарифов доставки и связываем их с зонами и методами." />
          ) : visibleTariffs.length ? (
            <div className="space-y-4">
              {visibleTariffs.map((tariff) => (
                <DeliveryListItemLink
                  key={tariff.id}
                  to={`/delivery/tariffs/${tariff.id}`}
                  eyebrow={getDeliveryMethodLabel(tariff.method)}
                  title={tariff.zoneName ?? tariff.zoneCode ?? 'Тариф без зоны'}
                  description={`Цена ${formatMoneyMinor(tariff.fixedPriceMinor, tariff.currency)}${tariff.freeFromAmountMinor ? ` • бесплатно от ${formatMoneyMinor(tariff.freeFromAmountMinor, tariff.currency)}` : ''}`}
                  status={<DeliveryStatusBadge active={tariff.isAvailable} activeLabel="Доступен" inactiveLabel="Отключен" />}
                  meta={[
                    { label: 'Способ', value: getDeliveryMethodLabel(tariff.method) },
                    { label: 'Зона', value: tariff.zoneName ?? tariff.zoneCode ?? 'Без зоны' },
                    { label: 'Срок', value: formatDeliveryEstimate(tariff.estimatedDays, tariff.deliveryMinutes) },
                    { label: 'Цена', value: formatMoneyMinor(tariff.fixedPriceMinor, tariff.currency) },
                  ]}
                />
              ))}
            </div>
          ) : (
            <AdminEmptyState
              title={tariffs.length ? 'Тарифы не найдены' : 'Тарифов пока нет'}
              description={
                tariffs.length
                  ? 'Сбросьте поисковый запрос или переключите фильтр доступности.'
                  : 'Создайте первый тариф, чтобы привязать стоимость доставки к методу и зоне.'
              }
            />
          )}
        </div>
      </AdminSectionCard>
    </AdminPage>
  );
}
