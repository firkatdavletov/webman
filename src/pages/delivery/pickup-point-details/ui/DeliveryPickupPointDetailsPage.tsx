import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { detectPickupPointAddress, deletePickupPoint, getPickupPoints, savePickupPoint } from '@/entities/delivery';
import {
  buildEmptyPickupPointEditorValues,
  buildPickupPointEditorValues,
  clearPickupPointMapDraft,
  consumePickupPointMapDraft,
  type PickupPointEditorValues,
  writePickupPointMapDraft,
} from '@/features/pickup-point-map-editor';
import { isUuid } from '@/shared/lib/uuid/isUuid';
import { cn } from '@/shared/lib/cn';
import {
  AdminEmptyState,
  AdminNotice,
  AdminPage,
  AdminPageHeader,
  AdminPageStatus,
  Button,
  buttonVariants,
} from '@/shared/ui';
import {
  mergeDetectedAddressField,
  parseOptionalFloat,
  sortPickupPoints,
} from '@/pages/delivery/model/deliveryAdmin';
import { PickupPointFormPanel, type PickupPointFormField } from '@/pages/delivery/ui/PickupPointFormPanel';

export function DeliveryPickupPointDetailsPage() {
  const navigate = useNavigate();
  const { pickupPointId } = useParams();
  const normalizedPickupPointId = (pickupPointId ?? '').trim();
  const isCreateFlow = !normalizedPickupPointId;
  const requestIdRef = useRef(0);

  const [sourceForm, setSourceForm] = useState<PickupPointEditorValues>(() => buildEmptyPickupPointEditorValues());
  const [pickupPointForm, setPickupPointForm] = useState<PickupPointEditorValues>(() => buildEmptyPickupPointEditorValues());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDetectingAddress, setIsDetectingAddress] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [detectError, setDetectError] = useState('');
  const [detectSuccess, setDetectSuccess] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');

  useEffect(() => {
    if (!isCreateFlow && !isUuid(normalizedPickupPointId)) {
      setErrorMessage('Некорректный идентификатор пункта самовывоза.');
      setIsLoading(false);
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setIsLoading(true);
    setErrorMessage('');
    setDetectError('');
    setDetectSuccess('');
    setSaveError('');
    setSaveSuccess('');

    void getPickupPoints().then((result) => {
      if (requestId !== requestIdRef.current) {
        return;
      }

      const pickupPointDraft = consumePickupPointMapDraft();
      const nextPickupPoints = sortPickupPoints(result.pickupPoints);

      if (isCreateFlow) {
        const emptyForm = buildEmptyPickupPointEditorValues();
        setSourceForm(emptyForm);
        setPickupPointForm(pickupPointDraft ?? emptyForm);
        setErrorMessage(result.error ?? '');
        setIsLoading(false);
        return;
      }

      const matchedPickupPoint = nextPickupPoints.find((pickupPoint) => pickupPoint.id === normalizedPickupPointId);

      if (!matchedPickupPoint) {
        setErrorMessage('Пункт самовывоза не найден.');
        setIsLoading(false);
        return;
      }

      const nextForm = buildPickupPointEditorValues(matchedPickupPoint);
      setSourceForm(nextForm);
      setPickupPointForm(pickupPointDraft && pickupPointDraft.id === normalizedPickupPointId ? pickupPointDraft : nextForm);
      setErrorMessage(result.error ?? '');
      setIsLoading(false);
    });
  }, [isCreateFlow, normalizedPickupPointId]);

  const isDirty = useMemo(() => JSON.stringify(pickupPointForm) !== JSON.stringify(sourceForm), [pickupPointForm, sourceForm]);

  const handleFieldChange = (field: PickupPointFormField, value: string) => {
    setPickupPointForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
    setDetectError('');
    setDetectSuccess('');
    setSaveError('');
    setSaveSuccess('');
  };

  const handleOpenMap = () => {
    writePickupPointMapDraft(pickupPointForm);
    navigate(isCreateFlow ? '/delivery/pickup-points/new/map' : `/delivery/pickup-points/${normalizedPickupPointId}/map`);
  };

  const handleDetectAddress = async () => {
    const parsedLatitude = parseOptionalFloat(pickupPointForm.latitude, 'Широта');

    if (parsedLatitude.error || parsedLatitude.value === null) {
      setDetectError(parsedLatitude.error ?? 'Укажите широту для определения адреса.');
      setDetectSuccess('');
      return;
    }

    const parsedLongitude = parseOptionalFloat(pickupPointForm.longitude, 'Долгота');

    if (parsedLongitude.error || parsedLongitude.value === null) {
      setDetectError(parsedLongitude.error ?? 'Укажите долготу для определения адреса.');
      setDetectSuccess('');
      return;
    }

    setIsDetectingAddress(true);
    setDetectError('');
    setDetectSuccess('');

    const result = await detectPickupPointAddress({
      latitude: parsedLatitude.value,
      longitude: parsedLongitude.value,
    });

    setIsDetectingAddress(false);

    if (result.error) {
      setDetectError(result.error);
      return;
    }

    if (!result.address) {
      setDetectError('По указанным координатам адрес не найден.');
      return;
    }

    const detectedAddress = result.address;

    setPickupPointForm((currentForm) => ({
      ...currentForm,
      country: mergeDetectedAddressField(detectedAddress.country, currentForm.country),
      region: mergeDetectedAddressField(detectedAddress.region, currentForm.region),
      city: mergeDetectedAddressField(detectedAddress.city, currentForm.city),
      street: mergeDetectedAddressField(detectedAddress.street, currentForm.street),
      house: mergeDetectedAddressField(detectedAddress.house, currentForm.house),
      apartment: mergeDetectedAddressField(detectedAddress.apartment, currentForm.apartment),
      postalCode: mergeDetectedAddressField(detectedAddress.postalCode, currentForm.postalCode),
      entrance: mergeDetectedAddressField(detectedAddress.entrance, currentForm.entrance),
      floor: mergeDetectedAddressField(detectedAddress.floor, currentForm.floor),
      intercom: mergeDetectedAddressField(detectedAddress.intercom, currentForm.intercom),
      comment: mergeDetectedAddressField(detectedAddress.comment, currentForm.comment),
    }));
    setDetectSuccess('Адрес обновлен по координатам.');
  };

  const handleSubmit = async () => {
    const code = pickupPointForm.code.trim();
    const name = pickupPointForm.name.trim();

    if (!code) {
      setSaveError('Укажите код пункта самовывоза.');
      setSaveSuccess('');
      return;
    }

    if (!name) {
      setSaveError('Укажите название пункта самовывоза.');
      setSaveSuccess('');
      return;
    }

    const parsedLatitude = parseOptionalFloat(pickupPointForm.latitude, 'Широта');

    if (parsedLatitude.error) {
      setSaveError(parsedLatitude.error);
      setSaveSuccess('');
      return;
    }

    const parsedLongitude = parseOptionalFloat(pickupPointForm.longitude, 'Долгота');

    if (parsedLongitude.error) {
      setSaveError(parsedLongitude.error);
      setSaveSuccess('');
      return;
    }

    setIsSaving(true);
    setDetectError('');
    setDetectSuccess('');
    setSaveError('');
    setSaveSuccess('');

    const result = await savePickupPoint({
      id: isCreateFlow ? null : pickupPointForm.id,
      code,
      name,
      isActive: pickupPointForm.isActive,
      address: {
        country: pickupPointForm.country.trim() || null,
        region: pickupPointForm.region.trim() || null,
        city: pickupPointForm.city.trim() || null,
        street: pickupPointForm.street.trim() || null,
        house: pickupPointForm.house.trim() || null,
        apartment: pickupPointForm.apartment.trim() || null,
        postalCode: pickupPointForm.postalCode.trim() || null,
        entrance: pickupPointForm.entrance.trim() || null,
        floor: pickupPointForm.floor.trim() || null,
        intercom: pickupPointForm.intercom.trim() || null,
        comment: pickupPointForm.comment.trim() || null,
        latitude: parsedLatitude.value,
        longitude: parsedLongitude.value,
      },
    });

    setIsSaving(false);

    if (!result.pickupPoint || result.error) {
      setSaveError(result.error ?? 'Не удалось сохранить пункт самовывоза.');
      return;
    }

    const nextForm = buildPickupPointEditorValues(result.pickupPoint);
    setSourceForm(nextForm);
    setPickupPointForm(nextForm);
    clearPickupPointMapDraft();
    setSaveSuccess(`Пункт «${result.pickupPoint.name}» сохранен.`);

    if (isCreateFlow) {
      navigate(`/delivery/pickup-points/${result.pickupPoint.id}`, { replace: true });
    }
  };

  const handleDelete = async () => {
    if (isCreateFlow || !pickupPointForm.id) {
      return;
    }

    if (!window.confirm(`Удалить пункт самовывоза «${pickupPointForm.name || pickupPointForm.code}»?`)) {
      return;
    }

    setIsDeleting(true);
    setDetectError('');
    setDetectSuccess('');
    setSaveError('');
    setSaveSuccess('');

    const result = await deletePickupPoint(pickupPointForm.id);

    setIsDeleting(false);

    if (result.error) {
      setSaveError(result.error);
      return;
    }

    clearPickupPointMapDraft();
    navigate('/delivery/pickup-points', { replace: true });
  };

  return (
    <AdminPage>
      <AdminPageHeader
        kicker="Доставка"
        title={isLoading ? 'Загрузка пункта...' : isCreateFlow ? 'Новый пункт самовывоза' : pickupPointForm.name || pickupPointForm.code}
        description="Адрес, координаты и признак активности вынесены в отдельную карточку пункта. Карта остаётся вспомогательным экраном для выбора координат."
        actions={
          <>
            <AdminPageStatus>
              {isLoading ? 'Загрузка...' : isCreateFlow ? (isDirty ? 'Новый пункт изменен' : 'Новый пункт') : isDirty ? 'Есть несохраненные изменения' : 'Синхронизировано'}
            </AdminPageStatus>
            <Link className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'rounded-xl bg-card/80 shadow-sm')} to="/delivery/pickup-points">
              К списку пунктов
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
        <AdminEmptyState title="Загрузка пункта" description="Получаем данные точки выдачи и возможный черновик координат после карты." />
      ) : !errorMessage ? (
        <div className="space-y-6">
          <PickupPointFormPanel
            form={pickupPointForm}
            isSaving={isSaving}
            hasPendingDelete={isDeleting}
            isDetectingAddress={isDetectingAddress}
            detectError={detectError}
            detectSuccess={detectSuccess}
            saveError={saveError}
            saveSuccess={saveSuccess}
            onFieldChange={handleFieldChange}
            onIsActiveChange={(value) => {
              setPickupPointForm((currentForm) => ({
                ...currentForm,
                isActive: value,
              }));
              setDetectError('');
              setDetectSuccess('');
              setSaveError('');
              setSaveSuccess('');
            }}
            onOpenMap={handleOpenMap}
            onDetectAddress={() => void handleDetectAddress()}
            onSubmit={() => void handleSubmit()}
            onReset={() => {
              clearPickupPointMapDraft();
              setPickupPointForm(sourceForm);
              setDetectError('');
              setDetectSuccess('');
              setSaveError('');
              setSaveSuccess('');
            }}
          />

          {!isCreateFlow ? (
            <div className="flex flex-wrap gap-3">
              <Button type="button" variant="destructive" size="lg" className="rounded-xl" onClick={() => void handleDelete()} disabled={isDeleting || isSaving}>
                {isDeleting ? 'Удаление...' : 'Удалить пункт'}
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </AdminPage>
  );
}
