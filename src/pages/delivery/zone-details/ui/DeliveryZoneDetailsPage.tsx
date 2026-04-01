import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getDeliveryZoneById, updateDeliveryZone } from '@/entities/delivery';
import {
  buildDeliveryZoneEditorValues,
  buildEmptyDeliveryZoneEditorValues,
  DeliveryZoneForm,
  getDeliveryZoneDraftKey,
  getDeliveryZoneSourceFingerprint,
  mapDeliveryZoneEditorValuesToPayload,
  useDeliveryZoneDraft,
  validateDeliveryZoneEditorValues,
  type DeliveryZoneEditorValues,
} from '@/features/delivery-zone-editor';
import { isUuid } from '@/shared/lib/uuid/isUuid';
import { NavBar } from '@/shared/ui/NavBar';

export function DeliveryZoneDetailsPage() {
  const { zoneId } = useParams();
  const normalizedZoneId = useMemo(() => (zoneId ?? '').trim(), [zoneId]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');
  const [sourceValues, setSourceValues] = useState(() => buildEmptyDeliveryZoneEditorValues());
  const [sourceFingerprint, setSourceFingerprint] = useState(() => getDeliveryZoneSourceFingerprint(buildEmptyDeliveryZoneEditorValues()));
  const [isSourceReady, setIsSourceReady] = useState(false);
  const draftKey = getDeliveryZoneDraftKey(normalizedZoneId);
  const { currentValues, isDirty, replaceDraft, resetDraft, updateCurrentValues } = useDeliveryZoneDraft({
    draftKey,
    sourceValues,
    sourceFingerprint,
    ready: isSourceReady,
  });

  useEffect(() => {
    if (!isUuid(normalizedZoneId)) {
      setErrorMessage('Некорректный идентификатор зоны доставки.');
      setIsLoading(false);
      setIsSourceReady(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    setSaveError('');
    setSaveSuccess('');

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
  }, [normalizedZoneId]);

  const handleValuesChange = (updater: (currentValues: DeliveryZoneEditorValues) => DeliveryZoneEditorValues) => {
    setSaveError('');
    setSaveSuccess('');
    updateCurrentValues(updater);
  };

  const handleReset = () => {
    setSaveError('');
    setSaveSuccess('');
    resetDraft();
  };

  const handleSubmit = async () => {
    if (!isUuid(normalizedZoneId)) {
      setSaveError('Некорректный идентификатор зоны доставки.');
      return;
    }

    const validationError = validateDeliveryZoneEditorValues(currentValues);

    if (validationError) {
      setSaveError(validationError);
      setSaveSuccess('');
      return;
    }

    setIsSaving(true);
    setSaveError('');
    setSaveSuccess('');

    const result = await updateDeliveryZone(normalizedZoneId, mapDeliveryZoneEditorValuesToPayload(currentValues));

    setIsSaving(false);

    if (!result.zone || result.error) {
      setSaveError(result.error ?? 'Не удалось сохранить зону доставки.');
      return;
    }

    const nextSourceValues = buildDeliveryZoneEditorValues(result.zone);
    const nextSourceFingerprint = getDeliveryZoneSourceFingerprint(nextSourceValues);

    setSourceValues(nextSourceValues);
    setSourceFingerprint(nextSourceFingerprint);
    setIsSourceReady(true);
    replaceDraft(nextSourceValues, nextSourceFingerprint);
    setSaveSuccess(`Зона «${result.zone.name}» сохранена.`);
  };

  return (
    <div className="app-shell">
      <NavBar />

      <main className="dashboard">
        <nav className="breadcrumbs" aria-label="Хлебные крошки">
          <Link className="breadcrumb-link" to="/delivery">
            Доставка
          </Link>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current">{isLoading ? 'Загрузка зоны...' : currentValues.name || 'Зона доставки'}</span>
        </nav>

        <header className="dashboard-header">
          <div>
            <p className="page-kicker">Доставка</p>
            <h2 className="page-title">{isLoading ? 'Загрузка зоны...' : currentValues.name || 'Зона доставки'}</h2>
          </div>

          <div className="dashboard-actions">
            <span className={`status-chip${isDirty ? ' delivery-status-pill-live' : ''}`}>
              {isDirty ? 'Есть несохраненные изменения' : 'Синхронизировано'}
            </span>

            {currentValues.type === 'POLYGON' ? (
              <Link className="secondary-link" to={`/delivery/zones/${normalizedZoneId}/map`}>
                Редактор карты
              </Link>
            ) : null}

            <Link className="secondary-link" to="/delivery">
              К условиям доставки
            </Link>
          </div>
        </header>

        {errorMessage ? (
          <section className="catalog-card product-detail-card">
            <p className="form-error" role="alert">
              {errorMessage}
            </p>
          </section>
        ) : null}

        {isLoading ? (
          <section className="catalog-card product-detail-card">
            <p className="catalog-empty-state">Загрузка данных зоны...</p>
          </section>
        ) : !errorMessage ? (
          <DeliveryZoneForm
            idPrefix="delivery-zone-details"
            eyebrow="Редактирование"
            title={currentValues.name || 'Зона доставки'}
            description="Базовые поля зоны редактируются здесь. Геометрию `POLYGON`-зон меняйте на отдельном экране карты."
            values={currentValues}
            isSaving={isSaving}
            isDirty={isDirty}
            saveError={saveError}
            saveSuccess={saveSuccess}
            submitLabel="Сохранить зону"
            savingLabel="Сохранение..."
            mapEditorPath={currentValues.type === 'POLYGON' ? `/delivery/zones/${normalizedZoneId}/map` : undefined}
            onValuesChange={handleValuesChange}
            onSubmit={() => void handleSubmit()}
            onReset={handleReset}
          />
        ) : null}
      </main>
    </div>
  );
}
