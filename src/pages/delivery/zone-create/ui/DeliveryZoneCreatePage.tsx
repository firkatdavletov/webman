import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createDeliveryZone } from '@/entities/delivery';
import {
  buildEmptyDeliveryZoneEditorValues,
  clearStoredDeliveryZoneDraft,
  DeliveryZoneForm,
  getDeliveryZoneDraftKey,
  getDeliveryZoneSourceFingerprint,
  mapDeliveryZoneEditorValuesToPayload,
  type DeliveryZoneEditorValues,
  useDeliveryZoneDraft,
  validateDeliveryZoneEditorValues,
} from '@/features/delivery-zone-editor';
import { cn } from '@/shared/lib/cn';
import { AdminPage, AdminPageHeader, AdminPageStatus, buttonVariants } from '@/shared/ui';

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
    <AdminPage>
      <AdminPageHeader
        kicker="Доставка"
        title="Новая зона доставки"
        description="Создайте зону на отдельном экране. Если нужен polygon, откройте карту, сохраните геометрию в черновик и затем вернитесь сюда."
        actions={
          <>
            <AdminPageStatus>{isDirty ? 'Черновик изменен' : 'Новый черновик'}</AdminPageStatus>
            <Link className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'rounded-xl bg-card/80 shadow-sm')} to="/delivery/zones">
              К списку зон
            </Link>
          </>
        }
      />

      <DeliveryZoneForm
        idPrefix="delivery-zone-create"
        eyebrow="Создание"
        title="Новая зона"
        description="Заполните код, тип и приоритет зоны. Базовые поля редактируются здесь, а геометрия polygon-зоны управляется через карту."
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
    </AdminPage>
  );
}
