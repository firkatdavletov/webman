import { useEffect, useMemo, useRef, useState } from 'react';
import {
  getDeliveryMethodSettings,
  getDeliveryTariffs,
  getDeliveryZones,
  getPickupPoints,
  type DeliveryMethodSetting,
  type DeliveryTariff,
  type DeliveryZone,
  type PickupPoint,
} from '@/entities/delivery';
import {
  sortDeliveryMethodSettings,
  sortDeliveryTariffs,
  sortDeliveryZones,
  sortPickupPoints,
} from '@/pages/delivery/model/deliveryAdmin';
import { DeliverySectionLinkCard } from '@/pages/delivery/ui/deliveryShared';
import { AdminEmptyState, AdminNotice, AdminPage, AdminPageHeader, AdminPageStatus, Button } from '@/shared/ui';

type DeliveryDashboardSnapshot = {
  methods: DeliveryMethodSetting[];
  zones: DeliveryZone[];
  tariffs: DeliveryTariff[];
  pickupPoints: PickupPoint[];
};

export function DeliveryConditionsPage() {
  const [snapshot, setSnapshot] = useState<DeliveryDashboardSnapshot>({
    methods: [],
    zones: [],
    tariffs: [],
    pickupPoints: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const requestIdRef = useRef(0);

  const loadDeliveryOverview = async ({ showInitialLoader = false }: { showInitialLoader?: boolean } = {}) => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    if (showInitialLoader) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    setErrorMessage('');

    const [methodsResult, zonesResult, tariffsResult, pickupPointsResult] = await Promise.all([
      getDeliveryMethodSettings(),
      getDeliveryZones(),
      getDeliveryTariffs(),
      getPickupPoints(),
    ]);

    if (requestId !== requestIdRef.current) {
      return;
    }

    setSnapshot({
      methods: sortDeliveryMethodSettings(methodsResult.settings),
      zones: sortDeliveryZones(zonesResult.zones),
      tariffs: sortDeliveryTariffs(tariffsResult.tariffs),
      pickupPoints: sortPickupPoints(pickupPointsResult.pickupPoints),
    });
    setErrorMessage([methodsResult.error, zonesResult.error, tariffsResult.error, pickupPointsResult.error].filter(Boolean).join(' '));
    setIsLoading(false);
    setIsRefreshing(false);
  };

  useEffect(() => {
    void loadDeliveryOverview({
      showInitialLoader: true,
    });
  }, []);

  const activeMethods = useMemo(() => snapshot.methods.filter((method) => method.isActive).length, [snapshot.methods]);
  const activeZones = useMemo(() => snapshot.zones.filter((zone) => zone.isActive).length, [snapshot.zones]);
  const availableTariffs = useMemo(() => snapshot.tariffs.filter((tariff) => tariff.isAvailable).length, [snapshot.tariffs]);
  const activePickupPoints = useMemo(
    () => snapshot.pickupPoints.filter((pickupPoint) => pickupPoint.isActive).length,
    [snapshot.pickupPoints],
  );

  const statusText = isLoading
    ? 'Загрузка delivery-раздела...'
    : `${snapshot.methods.length} способов • ${snapshot.zones.length} зон • ${snapshot.tariffs.length} тарифов • ${snapshot.pickupPoints.length} пунктов`;

  return (
    <AdminPage>
      <AdminPageHeader
        kicker="Доставка"
        title="Условия доставки"
        description="Раздел разбит на отдельные рабочие экраны: способы доставки, зоны, тарифы и пункты самовывоза. Отсюда удобно перейти в нужный операционный список и затем в карточку конкретной сущности."
        actions={
          <>
            <AdminPageStatus>{statusText}</AdminPageStatus>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="rounded-xl bg-card/80 shadow-sm"
              onClick={() => void loadDeliveryOverview()}
              disabled={isLoading || isRefreshing}
            >
              {isRefreshing ? 'Обновление...' : 'Обновить'}
            </Button>
          </>
        }
      />

      {errorMessage ? (
        <AdminNotice tone="destructive" role="alert">
          {errorMessage}
        </AdminNotice>
      ) : null}

      {isLoading ? (
        <AdminEmptyState title="Загрузка разделов доставки" description="Получаем справочники способов, зон, тарифов и пунктов самовывоза." />
      ) : (
        <section className="grid gap-5 lg:grid-cols-2" aria-label="Разделы доставки">
          <DeliverySectionLinkCard
            to="/delivery/methods"
            title="Способы доставки"
            description="Список доступных способов с переходом в детальную карточку для базовых настроек и правил оплаты."
            meta={
              <>
                Активных способов: <span className="font-medium text-foreground">{activeMethods}</span> из{' '}
                <span className="font-medium text-foreground">{snapshot.methods.length}</span>
              </>
            }
          />
          <DeliverySectionLinkCard
            to="/delivery/zones"
            title="Зоны доставки"
            description="Справочник зон с переходом в карточку зоны и отдельный редактор карты для polygon-геометрии."
            meta={
              <>
                Активных зон: <span className="font-medium text-foreground">{activeZones}</span> из{' '}
                <span className="font-medium text-foreground">{snapshot.zones.length}</span>
              </>
            }
          />
          <DeliverySectionLinkCard
            to="/delivery/tariffs"
            title="Тарифы доставки"
            description="Операционный список тарифов с раздельным экраном редактирования для цены, порога бесплатной доставки и SLA."
            meta={
              <>
                Доступных тарифов: <span className="font-medium text-foreground">{availableTariffs}</span> из{' '}
                <span className="font-medium text-foreground">{snapshot.tariffs.length}</span>
              </>
            }
          />
          <DeliverySectionLinkCard
            to="/delivery/pickup-points"
            title="Пункты самовывоза"
            description="Утилитарный список точек выдачи с отдельной карточкой редактирования адреса, координат и доступности."
            meta={
              <>
                Активных пунктов: <span className="font-medium text-foreground">{activePickupPoints}</span> из{' '}
                <span className="font-medium text-foreground">{snapshot.pickupPoints.length}</span>
              </>
            }
          />
        </section>
      )}
    </AdminPage>
  );
}
