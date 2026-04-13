import { useEffect, useMemo, useRef, useState } from 'react';
import { SearchIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getDeliveryZones, type DeliveryZone } from '@/entities/delivery';
import { getDeliveryZoneTypeLabel } from '@/features/delivery-zone-editor';
import { getDeliveryZoneTargetSummary, sortDeliveryZones } from '@/pages/delivery/model/deliveryAdmin';
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

export function DeliveryZonesPage() {
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const requestIdRef = useRef(0);

  const loadZones = async ({ showInitialLoader = false }: { showInitialLoader?: boolean } = {}) => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    if (showInitialLoader) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    setErrorMessage('');

    const result = await getDeliveryZones();

    if (requestId !== requestIdRef.current) {
      return;
    }

    setZones(sortDeliveryZones(result.zones));
    setErrorMessage(result.error ?? '');
    setIsLoading(false);
    setIsRefreshing(false);
  };

  useEffect(() => {
    void loadZones({
      showInitialLoader: true,
    });
  }, []);

  const activeCount = useMemo(() => zones.filter((zone) => zone.isActive).length, [zones]);
  const visibleZones = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return zones.filter((zone) => {
      if (!includeInactive && !zone.isActive) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return [zone.code, zone.name, zone.type, zone.city ?? '', zone.postalCode ?? '', getDeliveryZoneTargetSummary(zone)]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [includeInactive, searchQuery, zones]);

  const statusText = isLoading ? 'Загрузка зон доставки...' : `${visibleZones.length} из ${zones.length} зон • активных ${activeCount}`;

  return (
    <AdminPage>
      <AdminPageHeader
        kicker="Доставка"
        title="Зоны доставки"
        description="Список зон с переходом в карточку редактирования. Для polygon-зон карта остаётся отдельным специализированным экраном."
        actions={
          <>
            <AdminPageStatus>{statusText}</AdminPageStatus>
            <Link className={cn(buttonVariants({ size: 'lg' }), 'rounded-xl shadow-sm')} to="/delivery/zones/new">
              Новая зона
            </Link>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="rounded-xl bg-card/80 shadow-sm"
              onClick={() => void loadZones()}
              disabled={isLoading || isRefreshing}
            >
              {isRefreshing ? 'Обновление...' : 'Обновить'}
            </Button>
          </>
        }
      />

      <AdminSectionCard
        eyebrow="Операционный список"
        title="Справочник зон"
        description="Выбирайте нужную зону из списка, а не редактируйте несколько сущностей одновременно на одной странице."
      >
        <div className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[auto_minmax(18rem,22rem)] xl:items-end xl:justify-between">
            <SegmentedControl
              ariaLabel="Фильтр активности зон доставки"
              onValueChange={setIncludeInactive}
              options={[
                { label: 'Активные', value: false, hint: activeCount },
                { label: 'Все', value: true, hint: zones.length },
              ]}
              value={includeInactive}
            />

            <FormField htmlFor="delivery-zones-search" label="Поиск по зонам">
              <div className="relative">
                <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="delivery-zones-search"
                  type="search"
                  className="h-11 rounded-xl bg-background/80 pl-10 shadow-sm"
                  placeholder="Код, название, тип, город, индекс"
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
            <AdminEmptyState title="Загрузка зон" description="Получаем список delivery zones и подготавливаем навигацию по карточкам." />
          ) : visibleZones.length ? (
            <div className="space-y-4">
              {visibleZones.map((zone) => (
                <DeliveryListItemLink
                  key={zone.id}
                  to={`/delivery/zones/${zone.id}`}
                  eyebrow={zone.code}
                  title={zone.name}
                  description={getDeliveryZoneTargetSummary(zone)}
                  status={<DeliveryStatusBadge active={zone.isActive} activeLabel="Активна" inactiveLabel="Отключена" />}
                  badges={
                    zone.type === 'POLYGON' ? <DeliveryStatusBadge active activeLabel="Есть карта" inactiveLabel="Есть карта" /> : undefined
                  }
                  meta={[
                    { label: 'Тип', value: getDeliveryZoneTypeLabel(zone.type) },
                    { label: 'Матчинг', value: getDeliveryZoneTargetSummary(zone) },
                    { label: 'Приоритет', value: zone.priority },
                  ]}
                />
              ))}
            </div>
          ) : (
            <AdminEmptyState
              title={zones.length ? 'Зоны не найдены' : 'Зоны ещё не созданы'}
              description={
                zones.length
                  ? 'Сбросьте поисковый запрос или переключите фильтр активности.'
                  : 'Создайте первую зону доставки, чтобы затем связать её с тарифами.'
              }
            />
          )}
        </div>
      </AdminSectionCard>
    </AdminPage>
  );
}
