import { useEffect, useMemo, useRef, useState } from 'react';
import { SearchIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getPickupPoints, type PickupPoint } from '@/entities/delivery';
import { formatPickupPointAddress, sortPickupPoints } from '@/pages/delivery/model/deliveryAdmin';
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

export function DeliveryPickupPointsPage() {
  const [pickupPoints, setPickupPoints] = useState<PickupPoint[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const requestIdRef = useRef(0);

  const loadPickupPoints = async ({ showInitialLoader = false }: { showInitialLoader?: boolean } = {}) => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    if (showInitialLoader) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    setErrorMessage('');

    const result = await getPickupPoints();

    if (requestId !== requestIdRef.current) {
      return;
    }

    setPickupPoints(sortPickupPoints(result.pickupPoints));
    setErrorMessage(result.error ?? '');
    setIsLoading(false);
    setIsRefreshing(false);
  };

  useEffect(() => {
    void loadPickupPoints({
      showInitialLoader: true,
    });
  }, []);

  const activeCount = useMemo(() => pickupPoints.filter((pickupPoint) => pickupPoint.isActive).length, [pickupPoints]);
  const visiblePickupPoints = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return pickupPoints.filter((pickupPoint) => {
      if (!includeInactive && !pickupPoint.isActive) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return [
        pickupPoint.code,
        pickupPoint.name,
        pickupPoint.address.city ?? '',
        pickupPoint.address.street ?? '',
        pickupPoint.address.postalCode ?? '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [includeInactive, pickupPoints, searchQuery]);

  const statusText = isLoading
    ? 'Загрузка пунктов самовывоза...'
    : `${visiblePickupPoints.length} из ${pickupPoints.length} пунктов • активных ${activeCount}`;

  return (
    <AdminPage>
      <AdminPageHeader
        kicker="Доставка"
        title="Пункты самовывоза"
        description="Список пунктов выдачи теперь отделён от общей delivery-страницы. Открывайте карточку пункта, чтобы менять адрес, координаты и доступность."
        actions={
          <>
            <AdminPageStatus>{statusText}</AdminPageStatus>
            <Link className={cn(buttonVariants({ size: 'lg' }), 'rounded-xl shadow-sm')} to="/delivery/pickup-points/new">
              Новый пункт
            </Link>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="rounded-xl bg-card/80 shadow-sm"
              onClick={() => void loadPickupPoints()}
              disabled={isLoading || isRefreshing}
            >
              {isRefreshing ? 'Обновление...' : 'Обновить'}
            </Button>
          </>
        }
      />

      <AdminSectionCard
        eyebrow="Операционный список"
        title="Справочник пунктов"
        description="Краткий список оставляет только навигацию и поиск. Все изменения адреса и координат происходят в detail-screen."
      >
        <div className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[auto_minmax(18rem,22rem)] xl:items-end xl:justify-between">
            <SegmentedControl
              ariaLabel="Фильтр активности пунктов самовывоза"
              onValueChange={setIncludeInactive}
              options={[
                { label: 'Активные', value: false, hint: activeCount },
                { label: 'Все', value: true, hint: pickupPoints.length },
              ]}
              value={includeInactive}
            />

            <FormField htmlFor="pickup-points-search" label="Поиск по пунктам">
              <div className="relative">
                <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="pickup-points-search"
                  type="search"
                  className="h-11 rounded-xl bg-background/80 pl-10 shadow-sm"
                  placeholder="Код, название, город или адрес"
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
            <AdminEmptyState title="Загрузка пунктов" description="Получаем список pickup points и готовим навигацию по карточкам." />
          ) : visiblePickupPoints.length ? (
            <div className="space-y-4">
              {visiblePickupPoints.map((pickupPoint) => (
                <DeliveryListItemLink
                  key={pickupPoint.id}
                  to={`/delivery/pickup-points/${pickupPoint.id}`}
                  eyebrow={pickupPoint.code}
                  title={pickupPoint.name}
                  description={formatPickupPointAddress(pickupPoint)}
                  status={<DeliveryStatusBadge active={pickupPoint.isActive} activeLabel="Активен" inactiveLabel="Отключен" />}
                  meta={[
                    { label: 'Город', value: pickupPoint.address.city ?? '—' },
                    { label: 'Индекс', value: pickupPoint.address.postalCode ?? '—' },
                    {
                      label: 'Координаты',
                      value:
                        pickupPoint.address.latitude !== null &&
                        pickupPoint.address.latitude !== undefined &&
                        pickupPoint.address.longitude !== null &&
                        pickupPoint.address.longitude !== undefined
                          ? `${pickupPoint.address.latitude.toFixed(5)}, ${pickupPoint.address.longitude.toFixed(5)}`
                          : 'Не заданы',
                    },
                  ]}
                />
              ))}
            </div>
          ) : (
            <AdminEmptyState
              title={pickupPoints.length ? 'Пункты не найдены' : 'Пунктов самовывоза пока нет'}
              description={
                pickupPoints.length
                  ? 'Сбросьте поисковый запрос или переключите фильтр активности.'
                  : 'Создайте первый пункт, чтобы затем использовать его в методах и checkout.'
              }
            />
          )}
        </div>
      </AdminSectionCard>
    </AdminPage>
  );
}
