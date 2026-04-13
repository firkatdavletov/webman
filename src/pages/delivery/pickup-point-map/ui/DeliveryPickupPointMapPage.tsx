import { Suspense, lazy, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  applyPickupPointCoordinateValues,
  getPickupPointAddressSummary,
  parsePickupPointCoordinateValues,
  readPickupPointMapDraft,
  writePickupPointMapDraft,
} from '@/features/pickup-point-map-editor';
import type { YandexMapCoordinate } from '@/shared/lib/yandex-maps/api';
import { cn } from '@/shared/lib/cn';
import { AdminNotice, AdminPage, AdminPageHeader, Button, buttonVariants } from '@/shared/ui';

const PickupPointMapEditor = lazy(() =>
  import('@/features/pickup-point-map-editor/ui/PickupPointMapEditor').then((module) => ({
    default: module.PickupPointMapEditor,
  })),
);

export function DeliveryPickupPointMapPage() {
  const navigate = useNavigate();
  const { pickupPointId } = useParams();
  const initialDraft = useMemo(() => readPickupPointMapDraft(), []);
  const normalizedPickupPointId = (pickupPointId ?? '').trim();
  const backPath = normalizedPickupPointId
    ? `/delivery/pickup-points/${normalizedPickupPointId}`
    : initialDraft?.id
      ? `/delivery/pickup-points/${initialDraft.id}`
      : '/delivery/pickup-points/new';
  const [draftValues] = useState(initialDraft);
  const [coordinates, setCoordinates] = useState<YandexMapCoordinate | null>(() =>
    initialDraft ? parsePickupPointCoordinateValues(initialDraft) : null,
  );

  const handleApply = () => {
    if (!draftValues) {
      navigate('/delivery/pickup-points', { replace: true });
      return;
    }

    writePickupPointMapDraft(applyPickupPointCoordinateValues(draftValues, coordinates));
    navigate(backPath, { replace: true });
  };

  return (
    <AdminPage>
      <AdminPageHeader
        kicker="Доставка"
        title="Выбор координат пункта самовывоза"
        description="Точка на карте сохраняется в черновик формы пункта. После возврата на карточку не забудьте сохранить сам пункт."
        actions={
          <Link className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'rounded-xl bg-card/80 shadow-sm')} to={backPath}>
            Вернуться к карточке
          </Link>
        }
      />

      {!draftValues ? (
        <AdminNotice tone="destructive" role="alert">
          Черновик пункта самовывоза не найден. Откройте карту из формы пункта, чтобы передать текущие данные.
        </AdminNotice>
      ) : (
        <section className="space-y-5 rounded-[1.75rem] border border-border/70 bg-card/90 p-6 shadow-[0_24px_70px_rgba(12,35,39,0.08)]">
          <div className="space-y-1">
            <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">Map editor</p>
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              {draftValues.name.trim() || draftValues.code.trim() || 'Пункт самовывоза'}
            </h2>
            <p className="text-sm leading-6 text-muted-foreground">{getPickupPointAddressSummary(draftValues)}</p>
          </div>

          <Suspense fallback={<p className="text-sm text-muted-foreground">Загрузка редактора карты...</p>}>
            <PickupPointMapEditor
              coordinates={coordinates}
              title={draftValues.name.trim() || draftValues.code.trim() || 'Пункт самовывоза'}
              addressSummary={getPickupPointAddressSummary(draftValues)}
              onCoordinatesChange={setCoordinates}
            />
          </Suspense>

          <div className="flex flex-wrap gap-3">
            <Button type="button" size="lg" className="rounded-xl shadow-sm" onClick={handleApply}>
              Применить координаты
            </Button>
            <Button type="button" variant="outline" size="lg" className="rounded-xl bg-background/80 shadow-sm" onClick={() => navigate(backPath, { replace: true })}>
              Отменить
            </Button>
          </div>
        </section>
      )}
    </AdminPage>
  );
}
