import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getDeliveryZoneById } from '@/entities/delivery';
import {
  buildDeliveryZoneEditorValues,
  buildEmptyDeliveryZoneEditorValues,
  clearDeliveryZoneGeometry,
  cloneDeliveryZoneGeometry,
  DeliveryZoneMapEditor,
  getDeliveryZoneDraftKey,
  getDeliveryZoneGeometryValidationError,
  getDeliveryZoneSourceFingerprint,
  useDeliveryZoneDraft,
  type DeliveryZoneEditorGeometry,
} from '@/features/delivery-zone-editor';
import { isUuid } from '@/shared/lib/uuid/isUuid';

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
    <main className="dashboard">
        <nav className="breadcrumbs" aria-label="Хлебные крошки">
          <Link className="breadcrumb-link" to="/delivery">
            Доставка
          </Link>
          <span className="breadcrumb-separator">/</span>
          <Link className="breadcrumb-link" to={backPath}>
            {isCreateFlow ? 'Новая зона' : currentValues.name || 'Зона доставки'}
          </Link>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current">Редактор карты</span>
        </nav>

        <header className="dashboard-header">
          <div>
            <p className="page-kicker">Доставка</p>
            <h2 className="page-title">Редактор зоны на карте</h2>
          </div>

          <div className="dashboard-actions">
            <span className={`status-chip${hasLocalChanges ? ' delivery-status-pill-live' : ''}`}>
              {hasLocalChanges ? 'Есть несохраненные правки карты' : 'Карта синхронизирована'}
            </span>

            <Link className="secondary-link" to={backPath}>
              Вернуться к форме
            </Link>
          </div>
        </header>

        {errorMessage ? (
          <p className="form-error delivery-page-error" role="alert">
            {errorMessage}
          </p>
        ) : null}

        {isLoading ? (
          <section className="catalog-card product-detail-card">
            <p className="catalog-empty-state">Загрузка геометрии зоны...</p>
          </section>
        ) : currentValues.type !== 'POLYGON' ? (
          <section className="catalog-card product-detail-card">
            <p className="form-error" role="alert">
              Редактор карты доступен только для зон типа `POLYGON`. Измените тип зоны на форме и откройте карту повторно.
            </p>
          </section>
        ) : (
          <section className="catalog-card product-detail-card delivery-zone-map-card">
            <div className="catalog-card-copy">
              <p className="placeholder-eyebrow">Map editor</p>
              <h3 className="product-detail-title">{currentValues.name || 'Polygon zone'}</h3>
              <p className="catalog-card-text">
                Геометрия сохраняется сначала в локальный draft зоны. После возврата на форму не забудьте сохранить саму зону на backend.
              </p>
            </div>

            <DeliveryZoneMapEditor
              geometry={localGeometry}
              activePolygonIndex={activePolygonIndex}
              onActivePolygonIndexChange={setActivePolygonIndex}
              onGeometryChange={setLocalGeometry}
            />

            <div className="delivery-form-actions">
              <button type="button" className="submit-button" onClick={handleApply}>
                Применить геометрию
              </button>

              <button type="button" className="secondary-button" onClick={() => navigate(backPath)}>
                Отменить
              </button>

              <button type="button" className="secondary-button secondary-button-danger" onClick={handleReset}>
                Сбросить
              </button>
            </div>
          </section>
        )}
    </main>
  );
}
