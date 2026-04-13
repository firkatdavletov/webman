import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getDeliveryZoneById } from '@/entities/delivery';
import {
  buildDeliveryZoneEditorValues,
  buildEmptyDeliveryZoneEditorValues,
  clearDeliveryZoneGeometry,
  cloneDeliveryZoneGeometry,
  getDeliveryZoneDraftKey,
  getDeliveryZoneGeometryValidationError,
  getDeliveryZoneSourceFingerprint,
  useDeliveryZoneDraft,
  type DeliveryZoneEditorGeometry,
} from '@/features/delivery-zone-editor';
import { isUuid } from '@/shared/lib/uuid/isUuid';
import { cn } from '@/shared/lib/cn';
import { AdminNotice, AdminPage, AdminPageHeader, AdminPageStatus, Button, buttonVariants } from '@/shared/ui';

const DeliveryZoneMapEditor = lazy(() =>
  import('@/features/delivery-zone-editor/ui/DeliveryZoneMapEditor').then((module) => ({
    default: module.DeliveryZoneMapEditor,
  })),
);

export function DeliveryZoneMapPage() {
  const navigate = useNavigate();
  const { zoneId } = useParams();
  const normalizedZoneId = useMemo(() => (zoneId ?? '').trim(), [zoneId]);
  const isCreateFlow = !normalizedZoneId;
  const backPath = isCreateFlow ? '/delivery/zones/new' : `/delivery/zones/${normalizedZoneId}`;
  const [isLoading, setIsLoading] = useState(!isCreateFlow);
  const [errorMessage, setErrorMessage] = useState('');
  const [localGeometry, setLocalGeometry] = useState<DeliveryZoneEditorGeometry | null>(() => clearDeliveryZoneGeometry());
  const [activePolygonIndex, setActivePolygonIndex] = useState(0);
  const [sourceValues, setSourceValues] = useState(() => buildEmptyDeliveryZoneEditorValues());
  const [sourceFingerprint, setSourceFingerprint] = useState(() => getDeliveryZoneSourceFingerprint(buildEmptyDeliveryZoneEditorValues()));
  const [isSourceReady, setIsSourceReady] = useState(isCreateFlow);
  const draftKey = getDeliveryZoneDraftKey(normalizedZoneId || null);
  const { currentValues, updateCurrentValues } = useDeliveryZoneDraft({
    draftKey,
    sourceValues,
    sourceFingerprint,
    ready: isSourceReady,
  });
  const geometryValidationError = getDeliveryZoneGeometryValidationError(localGeometry);
  const hasLocalChanges = useMemo(
    () => JSON.stringify(localGeometry) !== JSON.stringify(currentValues.geometry),
    [currentValues.geometry, localGeometry],
  );

  useEffect(() => {
    if (isCreateFlow) {
      const nextSourceValues = buildEmptyDeliveryZoneEditorValues();
      const nextSourceFingerprint = getDeliveryZoneSourceFingerprint(nextSourceValues);

      setSourceValues(nextSourceValues);
      setSourceFingerprint(nextSourceFingerprint);
      setIsSourceReady(true);
      setIsLoading(false);
      return;
    }

    if (!isUuid(normalizedZoneId)) {
      setErrorMessage('Некорректный идентификатор зоны доставки.');
      setIsLoading(false);
      setIsSourceReady(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    void getDeliveryZoneById(normalizedZoneId).then((result) => {
      if (!result.zone || result.error) {
        setErrorMessage(result.error ?? 'Не удалось загрузить зону доставки.');
        setIsLoading(false);
        setIsSourceReady(false);
        return;
      }

      const nextSourceValues = buildDeliveryZoneEditorValues(result.zone);
      const nextSourceFingerprint = getDeliveryZoneSourceFingerprint(nextSourceValues);

      setSourceValues(nextSourceValues);
      setSourceFingerprint(nextSourceFingerprint);
      setIsSourceReady(true);
      setIsLoading(false);
    });
  }, [isCreateFlow, normalizedZoneId]);

  const serializedDraftGeometry = useMemo(() => JSON.stringify(currentValues.geometry), [currentValues.geometry]);

  useEffect(() => {
    setLocalGeometry(cloneDeliveryZoneGeometry(currentValues.geometry));
    setActivePolygonIndex(0);
  }, [draftKey, serializedDraftGeometry]);

  const handleApply = () => {
    if (currentValues.type !== 'POLYGON') {
      navigate(backPath);
      return;
    }

    if (geometryValidationError) {
      setErrorMessage(geometryValidationError);
      return;
    }

    setErrorMessage('');
    updateCurrentValues((draftValues) => ({
      ...draftValues,
      geometry: cloneDeliveryZoneGeometry(localGeometry),
    }));
    navigate(backPath);
  };

  const handleReset = () => {
    setLocalGeometry(clearDeliveryZoneGeometry());
    setActivePolygonIndex(0);
    setErrorMessage('');
  };

  return (
    <AdminPage>
      <AdminPageHeader
        kicker="Доставка"
        title="Редактор зоны на карте"
        description="Геометрия сохраняется в черновик карточки зоны. После возврата на форму не забудьте сохранить саму зону в backend."
        actions={
          <>
            <AdminPageStatus>{hasLocalChanges ? 'Есть несохраненные правки карты' : 'Карта синхронизирована'}</AdminPageStatus>
            <Link className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'rounded-xl bg-card/80 shadow-sm')} to={backPath}>
              Вернуться к форме
            </Link>
          </>
        }
      />

      {errorMessage ? (
        <AdminNotice tone="destructive" role="alert">
          {errorMessage}
        </AdminNotice>
      ) : null}

      {isLoading ? (
        <section className="rounded-[1.75rem] border border-border/70 bg-card/90 px-6 py-8 text-sm text-muted-foreground shadow-[0_24px_70px_rgba(12,35,39,0.08)]">
          Загрузка геометрии зоны...
        </section>
      ) : currentValues.type !== 'POLYGON' ? (
        <AdminNotice tone="destructive" role="alert">
          Редактор карты доступен только для зон типа `POLYGON`. Измените тип зоны на форме и откройте карту повторно.
        </AdminNotice>
      ) : (
        <section className="space-y-5 rounded-[1.75rem] border border-border/70 bg-card/90 p-6 shadow-[0_24px_70px_rgba(12,35,39,0.08)]">
          <div className="space-y-1">
            <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">Map editor</p>
            <h2 className="text-xl font-semibold tracking-tight text-foreground">{currentValues.name || 'Polygon zone'}</h2>
            <p className="text-sm leading-6 text-muted-foreground">
              Работайте с контурами локально, затем примените геометрию и вернитесь в карточку зоны.
            </p>
          </div>

          <Suspense fallback={<p className="text-sm text-muted-foreground">Загрузка редактора карты...</p>}>
            <DeliveryZoneMapEditor
              geometry={localGeometry}
              activePolygonIndex={activePolygonIndex}
              onActivePolygonIndexChange={setActivePolygonIndex}
              onGeometryChange={setLocalGeometry}
            />
          </Suspense>

          <div className="flex flex-wrap gap-3">
            <Button type="button" size="lg" className="rounded-xl shadow-sm" onClick={handleApply}>
              Применить геометрию
            </Button>
            <Button type="button" variant="outline" size="lg" className="rounded-xl bg-background/80 shadow-sm" onClick={() => navigate(backPath)}>
              Отменить
            </Button>
            <Button type="button" variant="destructive" size="lg" className="rounded-xl" onClick={handleReset}>
              Сбросить
            </Button>
          </div>
        </section>
      )}
    </AdminPage>
  );
}
