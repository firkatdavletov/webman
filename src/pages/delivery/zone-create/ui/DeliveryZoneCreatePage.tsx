import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createDeliveryZone } from '@/entities/delivery';
import {
  buildEmptyDeliveryZoneEditorValues,
  clearStoredDeliveryZoneDraft,
  DeliveryZoneForm,
  getDeliveryZoneDraftKey,
  getDeliveryZoneSourceFingerprint,
  type DeliveryZoneEditorValues,
  useDeliveryZoneDraft,
  validateDeliveryZoneEditorValues,
  mapDeliveryZoneEditorValuesToPayload,
} from '@/features/delivery-zone-editor';

export function DeliveryZoneCreatePage() {
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const draftKey = getDeliveryZoneDraftKey(null);
  const emptyValues = useMemo(() => buildEmptyDeliveryZoneEditorValues(), []);
  const emptyFingerprint = useMemo(() => getDeliveryZoneSourceFingerprint(emptyValues), [emptyValues]);
  const { currentValues, isDirty, replaceDraft, updateCurrentValues } = useDeliveryZoneDraft({
    draftKey,
    sourceValues: emptyValues,
    sourceFingerprint: emptyFingerprint,
  });

  const handleValuesChange = (updater: (currentValues: DeliveryZoneEditorValues) => DeliveryZoneEditorValues) => {
    setSaveError('');
    updateCurrentValues(updater);
  };

  const handleReset = () => {
    setSaveError('');
    replaceDraft(emptyValues, emptyFingerprint);
  };

  const handleSubmit = async () => {
    const validationError = validateDeliveryZoneEditorValues(currentValues);

    if (validationError) {
      setSaveError(validationError);
      return;
    }

    setIsSaving(true);
    setSaveError('');

    const result = await createDeliveryZone(mapDeliveryZoneEditorValuesToPayload(currentValues));

    if (!result.zone || result.error) {
      setSaveError(result.error ?? 'Не удалось создать зону доставки.');
      setIsSaving(false);
      return;
    }

    clearStoredDeliveryZoneDraft(draftKey);
    navigate(`/delivery/zones/${result.zone.id}`, { replace: true });
  };

  return (
    <main className="dashboard">
        <nav className="breadcrumbs" aria-label="Хлебные крошки">
          <Link className="breadcrumb-link" to="/delivery">
            Доставка
          </Link>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current">Новая зона</span>
        </nav>

        <header className="dashboard-header">
          <div>
            <p className="page-kicker">Доставка</p>
            <h2 className="page-title">Новая зона доставки</h2>
          </div>

          <div className="dashboard-actions">
            <span className={`status-chip${isDirty ? ' delivery-status-pill-live' : ''}`}>
              {isDirty ? 'Черновик изменен' : 'Новый черновик'}
            </span>

            <Link className="secondary-link" to="/delivery">
              К условиям доставки
            </Link>
          </div>
        </header>

        <DeliveryZoneForm
          idPrefix="delivery-zone-create"
          eyebrow="Создание"
          title="Новая зона"
          description="Заполните базовые поля зоны. Если выбран тип `POLYGON`, откройте отдельный экран карты и сохраните геометрию в черновик."
          values={currentValues}
          isSaving={isSaving}
          isDirty={isDirty}
          saveError={saveError}
          submitLabel="Создать зону"
          savingLabel="Создание..."
          mapEditorPath={currentValues.type === 'POLYGON' ? '/delivery/zones/new/map' : undefined}
          onValuesChange={handleValuesChange}
          onSubmit={() => void handleSubmit()}
          onReset={handleReset}
        />
    </main>
  );
}
