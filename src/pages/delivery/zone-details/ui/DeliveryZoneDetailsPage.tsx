import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { deleteDeliveryZone, getDeliveryZoneById, updateDeliveryZone } from '@/entities/delivery';
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
import { cn } from '@/shared/lib/cn';
import { AdminEmptyState, AdminNotice, AdminPage, AdminPageHeader, AdminPageStatus, Button, buttonVariants } from '@/shared/ui';

export function DeliveryZoneDetailsPage() {
  const navigate = useNavigate();
  const { zoneId } = useParams();
  const normalizedZoneId = useMemo(() => (zoneId ?? '').trim(), [zoneId]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');
  const [sourceValues, setSourceValues] = useState(() => buildEmptyDeliveryZoneEditorValues());
  const [sourceFingerprint, setSourceFingerprint] = useState(() =>
    getDeliveryZoneSourceFingerprint(buildEmptyDeliveryZoneEditorValues()),
  );
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

  const handleDelete = async () => {
    if (!isUuid(normalizedZoneId)) {
      return;
    }

    if (!window.confirm(`Удалить зону «${currentValues.name || currentValues.code || 'без названия'}»?`)) {
      return;
    }

    setIsDeleting(true);
    setSaveError('');
    setSaveSuccess('');

    const result = await deleteDeliveryZone(normalizedZoneId);

    setIsDeleting(false);

    if (result.error) {
      setSaveError(result.error);
      return;
    }

    navigate('/delivery/zones', { replace: true });
  };

  return (
    <AdminPage>
      <AdminPageHeader
        kicker="Доставка"
        title={isLoading ? 'Загрузка зоны...' : currentValues.name || 'Зона доставки'}
        description="Карточка зоны отделена от списка. Полигон редактируется на карте, а все базовые поля и активация находятся здесь."
        actions={
          <>
            <AdminPageStatus>{isDirty ? 'Есть несохраненные изменения' : 'Синхронизировано'}</AdminPageStatus>
            {currentValues.type === 'POLYGON' ? (
              <Link
                className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'rounded-xl bg-card/80 shadow-sm')}
                to={`/delivery/zones/${normalizedZoneId}/map`}
              >
                Редактор карты
              </Link>
            ) : null}
            <Link className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'rounded-xl bg-card/80 shadow-sm')} to="/delivery/zones">
              К списку зон
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
        <AdminEmptyState title="Загрузка зоны" description="Получаем текущую конфигурацию зоны доставки и её черновик." />
      ) : !errorMessage ? (
        <div className="space-y-6">
          <DeliveryZoneForm
            idPrefix="delivery-zone-details"
            eyebrow="Редактирование"
            title={currentValues.name || 'Зона доставки'}
            description="Базовые поля зоны редактируются здесь. Геометрию polygon-зон меняйте на отдельном экране карты."
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

          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="destructive" size="lg" className="rounded-xl" onClick={() => void handleDelete()} disabled={isDeleting || isSaving}>
              {isDeleting ? 'Удаление...' : 'Удалить зону'}
            </Button>
          </div>
        </div>
      ) : null}
    </AdminPage>
  );
}
