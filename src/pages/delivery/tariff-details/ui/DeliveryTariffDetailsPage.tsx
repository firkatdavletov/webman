import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { deleteDeliveryTariff, getDeliveryTariffs, getDeliveryZones, saveDeliveryTariff, type DeliveryZone } from '@/entities/delivery';
import { isUuid } from '@/shared/lib/uuid/isUuid';
import { cn } from '@/shared/lib/cn';
import { parseOptionalPriceInputToMinor, parsePriceInputToMinor } from '@/shared/lib/money/price';
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
  createEmptyTariffForm,
  createTariffFormFromTariff,
  DEFAULT_DELIVERY_METHOD,
  DELIVERY_METHOD_ORDER,
  getDeliveryMethodLabel,
  parseOptionalInteger,
  sortDeliveryTariffs,
  sortDeliveryZones,
  type DeliveryTariffFormValues,
} from '@/pages/delivery/model/deliveryAdmin';
import { DeliveryTariffFormPanel, type TariffFormField } from '@/pages/delivery/ui/DeliveryTariffFormPanel';

export function DeliveryTariffDetailsPage() {
  const navigate = useNavigate();
  const { tariffId } = useParams();
  const normalizedTariffId = (tariffId ?? '').trim();
  const isCreateFlow = !normalizedTariffId;
  const requestIdRef = useRef(0);

  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [sourceTariff, setSourceTariff] = useState<DeliveryTariffFormValues>(() => createEmptyTariffForm());
  const [tariffForm, setTariffForm] = useState<DeliveryTariffFormValues>(() => createEmptyTariffForm());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');

  useEffect(() => {
    if (!isCreateFlow && !isUuid(normalizedTariffId)) {
      setErrorMessage('Некорректный идентификатор тарифа.');
      setIsLoading(false);
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setIsLoading(true);
    setErrorMessage('');
    setSaveError('');
    setSaveSuccess('');

    void Promise.all([getDeliveryTariffs(), getDeliveryZones()]).then(([tariffsResult, zonesResult]) => {
      if (requestId !== requestIdRef.current) {
        return;
      }

      const nextZones = sortDeliveryZones(zonesResult.zones);
      const nextTariffs = sortDeliveryTariffs(tariffsResult.tariffs);

      setZones(nextZones);

      if (isCreateFlow) {
        const nextForm = createEmptyTariffForm(nextTariffs[0]?.method ?? DEFAULT_DELIVERY_METHOD);
        setSourceTariff(nextForm);
        setTariffForm(nextForm);
        setErrorMessage([tariffsResult.error, zonesResult.error].filter(Boolean).join(' '));
        setIsLoading(false);
        return;
      }

      const matchedTariff = nextTariffs.find((tariff) => tariff.id === normalizedTariffId);

      if (!matchedTariff) {
        setErrorMessage('Тариф доставки не найден.');
        setIsLoading(false);
        return;
      }

      const nextForm = createTariffFormFromTariff(matchedTariff);
      setSourceTariff(nextForm);
      setTariffForm(nextForm);
      setErrorMessage([tariffsResult.error, zonesResult.error].filter(Boolean).join(' '));
      setIsLoading(false);
    });
  }, [isCreateFlow, normalizedTariffId]);

  const isDirty = useMemo(() => JSON.stringify(tariffForm) !== JSON.stringify(sourceTariff), [sourceTariff, tariffForm]);
  const methodOptions = useMemo(
    () =>
      DELIVERY_METHOD_ORDER.map((method) => ({
        value: method,
        label: getDeliveryMethodLabel(method),
      })),
    [],
  );
  const zoneOptions = useMemo(
    () =>
      zones.map((zone) => ({
        id: zone.id,
        label: `${zone.name} (${zone.code})`,
      })),
    [zones],
  );

  const handleFieldChange = (field: TariffFormField, value: string) => {
    setTariffForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
    setSaveError('');
    setSaveSuccess('');
  };

  const handleSubmit = async () => {
    const parsedFixedPriceMinor = parsePriceInputToMinor(tariffForm.fixedPriceMinor);

    if (parsedFixedPriceMinor === null) {
      setSaveError('Укажите корректную фиксированную цену в рублях.');
      setSaveSuccess('');
      return;
    }

    const parsedFreeFromAmountMinor = parseOptionalPriceInputToMinor(tariffForm.freeFromAmountMinor);

    if (parsedFreeFromAmountMinor === undefined) {
      setSaveError('Укажите корректный порог бесплатной доставки в рублях или оставьте поле пустым.');
      setSaveSuccess('');
      return;
    }

    const parsedEstimatedDays = parseOptionalInteger(tariffForm.estimatedDays, 'Срок доставки');

    if (parsedEstimatedDays.error) {
      setSaveError(parsedEstimatedDays.error);
      setSaveSuccess('');
      return;
    }

    const parsedDeliveryMinutes = parseOptionalInteger(tariffForm.deliveryMinutes, 'Срок доставки в минутах');

    if (parsedDeliveryMinutes.error) {
      setSaveError(parsedDeliveryMinutes.error);
      setSaveSuccess('');
      return;
    }

    const currency = tariffForm.currency.trim().toUpperCase();

    if (!currency) {
      setSaveError('Укажите валюту тарифа.');
      setSaveSuccess('');
      return;
    }

    setIsSaving(true);
    setSaveError('');
    setSaveSuccess('');

    const result = await saveDeliveryTariff({
      id: isCreateFlow ? null : tariffForm.id,
      method: tariffForm.method,
      zoneId: tariffForm.zoneId.trim() || null,
      isAvailable: tariffForm.isAvailable,
      fixedPriceMinor: parsedFixedPriceMinor,
      freeFromAmountMinor: parsedFreeFromAmountMinor,
      currency,
      estimatedDays: parsedEstimatedDays.value,
      deliveryMinutes: parsedDeliveryMinutes.value,
    });

    setIsSaving(false);

    if (!result.tariff || result.error) {
      setSaveError(result.error ?? 'Не удалось сохранить тариф.');
      return;
    }

    const nextForm = createTariffFormFromTariff(result.tariff);
    setSourceTariff(nextForm);
    setTariffForm(nextForm);
    setSaveSuccess(`Тариф для «${getDeliveryMethodLabel(result.tariff.method)}» сохранен.`);

    if (isCreateFlow) {
      navigate(`/delivery/tariffs/${result.tariff.id}`, { replace: true });
    }
  };

  const handleDelete = async () => {
    if (isCreateFlow || !tariffForm.id) {
      return;
    }

    if (!window.confirm(`Удалить тариф для «${getDeliveryMethodLabel(tariffForm.method)}»?`)) {
      return;
    }

    setIsDeleting(true);
    setSaveError('');
    setSaveSuccess('');

    const result = await deleteDeliveryTariff(tariffForm.id);

    setIsDeleting(false);

    if (result.error) {
      setSaveError(result.error);
      return;
    }

    navigate('/delivery/tariffs', { replace: true });
  };

  return (
    <AdminPage>
      <AdminPageHeader
        kicker="Доставка"
        title={isLoading ? 'Загрузка тарифа...' : isCreateFlow ? 'Новый тариф доставки' : getDeliveryMethodLabel(tariffForm.method)}
        description="Форма тарифа вынесена в отдельный экран, чтобы цена, SLA и доступность редактировались без конкуренции со списком и соседними сущностями."
        actions={
          <>
            <AdminPageStatus>
              {isLoading ? 'Загрузка...' : isCreateFlow ? (isDirty ? 'Новый тариф изменен' : 'Новый тариф') : isDirty ? 'Есть несохраненные изменения' : 'Синхронизировано'}
            </AdminPageStatus>
            <Link className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'rounded-xl bg-card/80 shadow-sm')} to="/delivery/tariffs">
              К списку тарифов
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
        <AdminEmptyState title="Загрузка тарифа" description="Получаем тариф и справочник зон для связанной формы." />
      ) : !errorMessage ? (
        <div className="space-y-6">
          <DeliveryTariffFormPanel
            form={tariffForm}
            methodOptions={methodOptions}
            zoneOptions={zoneOptions}
            isSaving={isSaving}
            hasPendingDelete={isDeleting}
            saveError={saveError}
            saveSuccess={saveSuccess}
            onMethodChange={(method) => {
              setTariffForm((currentForm) => ({
                ...currentForm,
                method,
              }));
              setSaveError('');
              setSaveSuccess('');
            }}
            onFieldChange={handleFieldChange}
            onIsAvailableChange={(value) => {
              setTariffForm((currentForm) => ({
                ...currentForm,
                isAvailable: value,
              }));
              setSaveError('');
              setSaveSuccess('');
            }}
            onSubmit={() => void handleSubmit()}
            onReset={() => {
              setTariffForm(sourceTariff);
              setSaveError('');
              setSaveSuccess('');
            }}
          />

          {!isCreateFlow ? (
            <div className="flex flex-wrap gap-3">
              <Button type="button" variant="destructive" size="lg" className="rounded-xl" onClick={() => void handleDelete()} disabled={isDeleting || isSaving}>
                {isDeleting ? 'Удаление...' : 'Удалить тариф'}
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </AdminPage>
  );
}
