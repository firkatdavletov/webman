import { useEffect, useMemo, useRef, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { useNavigate } from 'react-router-dom';
import {
  deleteDeliveryTariff,
  deleteDeliveryZone,
  deletePickupPoint,
  detectPickupPointAddress,
  type CheckoutPaymentRule,
  type DeliveryMethod,
  type DeliveryMethodSetting,
  type DeliveryTariff,
  type DeliveryZone,
  getCheckoutPaymentRules,
  getDeliveryMethodSettings,
  getDeliveryTariffs,
  getDeliveryZones,
  getPickupPoints,
  type PaymentMethodCode,
  type PickupPoint,
  replaceCheckoutPaymentRules,
  saveDeliveryMethodSetting,
  saveDeliveryTariff,
  savePickupPoint,
} from '@/entities/delivery';
import {
  buildEmptyPickupPointEditorValues,
  buildPickupPointEditorValues,
  clearPickupPointMapDraft,
  consumePickupPointMapDraft,
  getPickupPointCoordinateSummary,
  type PickupPointEditorValues,
  writePickupPointMapDraft,
} from '@/features/pickup-point-map-editor';
import { DataTable } from '@/shared/ui/data-table';
import { DeliveryZonesSection } from './DeliveryZonesSection';

const DELIVERY_METHOD_LABELS: Record<DeliveryMethod, string> = {
  PICKUP: 'Самовывоз',
  COURIER: 'Курьер',
  CUSTOM_DELIVERY_ADDRESS: 'Доставка по адресу',
  YANDEX_PICKUP_POINT: 'Пункт выдачи Яндекс',
};

const PAYMENT_METHOD_LABELS: Record<PaymentMethodCode, string> = {
  CASH: 'Наличными',
  CARD_ON_DELIVERY: 'Картой при получении',
  CARD_ONLINE: 'Онлайн картой',
  SBP: 'СБП',
};

const DELIVERY_METHOD_ORDER: DeliveryMethod[] = ['PICKUP', 'COURIER', 'CUSTOM_DELIVERY_ADDRESS', 'YANDEX_PICKUP_POINT'];
const PAYMENT_METHOD_ORDER: PaymentMethodCode[] = ['CASH', 'CARD_ON_DELIVERY', 'CARD_ONLINE', 'SBP'];
const DEFAULT_DELIVERY_METHOD: DeliveryMethod = 'COURIER';
  const DEFAULT_CURRENCY = 'RUB';

type LoadDeliveryDataOptions = {
  showInitialLoader?: boolean;
};

type TariffFormValues = {
  id: string;
  method: DeliveryMethod;
  zoneId: string;
  isAvailable: boolean;
  fixedPriceMinor: string;
  freeFromAmountMinor: string;
  currency: string;
  estimatedDays: string;
  deliveryMinutes: string;
};

function getDeliveryMethodLabel(method: DeliveryMethod): string {
  return DELIVERY_METHOD_LABELS[method] ?? method;
}

function getPaymentMethodLabel(method: PaymentMethodCode): string {
  return PAYMENT_METHOD_LABELS[method] ?? method;
}

function getDeliveryMethodOrder(method: DeliveryMethod): number {
  const methodIndex = DELIVERY_METHOD_ORDER.indexOf(method);

  return methodIndex === -1 ? DELIVERY_METHOD_ORDER.length : methodIndex;
}

function normalizeText(value: string): string | null {
  const normalizedValue = value.trim();

  return normalizedValue || null;
}

function parseRequiredInteger(value: string, label: string): { value: number | null; error: string | null } {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return {
      value: null,
      error: `Поле «${label}» обязательно.`,
    };
  }

  const parsedValue = Number(normalizedValue);

  if (!Number.isInteger(parsedValue)) {
    return {
      value: null,
      error: `Поле «${label}» должно быть целым числом.`,
    };
  }

  return {
    value: parsedValue,
    error: null,
  };
}

function parseOptionalInteger(value: string, label: string): { value: number | null; error: string | null } {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return {
      value: null,
      error: null,
    };
  }

  const parsedValue = Number(normalizedValue);

  if (!Number.isInteger(parsedValue)) {
    return {
      value: null,
      error: `Поле «${label}» должно быть целым числом.`,
    };
  }

  return {
    value: parsedValue,
    error: null,
  };
}

function parseOptionalFloat(value: string, label: string): { value: number | null; error: string | null } {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return {
      value: null,
      error: null,
    };
  }

  const parsedValue = Number(normalizedValue);

  if (!Number.isFinite(parsedValue)) {
    return {
      value: null,
      error: `Поле «${label}» должно быть числом.`,
    };
  }

  return {
    value: parsedValue,
    error: null,
  };
}

function formatNullableText(value: string | null | undefined): string {
  const normalizedValue = value?.trim() ?? '';

  return normalizedValue || '—';
}

function formatDeliveryEstimate(estimatedDays: number | null | undefined, deliveryMinutes: number | null | undefined): string {
  const parts = [];

  if (estimatedDays !== null && estimatedDays !== undefined) {
    parts.push(`${estimatedDays} дн.`);
  }

  if (deliveryMinutes !== null && deliveryMinutes !== undefined) {
    parts.push(`${deliveryMinutes} мин.`);
  }

  return parts.length ? parts.join(' • ') : '—';
}

function mergeDetectedAddressField(nextValue: string | null | undefined, currentValue: string): string {
  const normalizedValue = nextValue?.trim() ?? '';

  return normalizedValue || currentValue;
}

function formatMoneyMinor(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value / 100);
  } catch {
    return `${(value / 100).toFixed(2)} ${currency}`;
  }
}

function formatPickupPointAddress(pickupPoint: PickupPoint): string {
  const address = pickupPoint.address;
  const parts = [
    formatNullableText(address.city) !== '—' ? address.city?.trim() : null,
    formatNullableText(address.street) !== '—' ? [address.street?.trim(), address.house?.trim()].filter(Boolean).join(' ') : null,
    formatNullableText(address.apartment) !== '—' ? `кв. ${address.apartment?.trim()}` : null,
    formatNullableText(address.postalCode) !== '—' ? `индекс ${address.postalCode?.trim()}` : null,
  ].filter(Boolean);

  return parts.length ? parts.join(', ') : 'Адрес не заполнен';
}

function sortDeliveryMethodSettings(settings: DeliveryMethodSetting[]): DeliveryMethodSetting[] {
  return [...settings].sort(
    (left, right) =>
      left.sortOrder - right.sortOrder ||
      getDeliveryMethodOrder(left.method) - getDeliveryMethodOrder(right.method) ||
      left.title.localeCompare(right.title, 'ru'),
  );
}

function sortDeliveryZones(zones: DeliveryZone[]): DeliveryZone[] {
  return [...zones].sort(
    (left, right) =>
      Number(right.isActive) - Number(left.isActive) ||
      left.code.localeCompare(right.code, 'ru') ||
      left.name.localeCompare(right.name, 'ru'),
  );
}

function sortDeliveryTariffs(tariffs: DeliveryTariff[]): DeliveryTariff[] {
  return [...tariffs].sort(
    (left, right) =>
      getDeliveryMethodOrder(left.method) - getDeliveryMethodOrder(right.method) ||
      (left.zoneName ?? '').localeCompare(right.zoneName ?? '', 'ru') ||
      left.fixedPriceMinor - right.fixedPriceMinor,
  );
}

function sortPickupPoints(pickupPoints: PickupPoint[]): PickupPoint[] {
  return [...pickupPoints].sort(
    (left, right) =>
      Number(right.isActive) - Number(left.isActive) ||
      left.name.localeCompare(right.name, 'ru') ||
      left.code.localeCompare(right.code, 'ru'),
  );
}

function sortCheckoutPaymentRules(rules: CheckoutPaymentRule[]): CheckoutPaymentRule[] {
  return [...rules].sort(
    (left, right) =>
      getDeliveryMethodOrder(left.deliveryMethod) - getDeliveryMethodOrder(right.deliveryMethod) ||
      left.deliveryMethodName.localeCompare(right.deliveryMethodName, 'ru'),
  );
}

function upsertItemById<T extends { id: string }>(items: T[], nextItem: T): T[] {
  const existingItemIndex = items.findIndex((item) => item.id === nextItem.id);

  if (existingItemIndex === -1) {
    return [...items, nextItem];
  }

  const nextItems = [...items];
  nextItems[existingItemIndex] = nextItem;

  return nextItems;
}

function upsertMethodSetting(items: DeliveryMethodSetting[], nextItem: DeliveryMethodSetting): DeliveryMethodSetting[] {
  const existingItemIndex = items.findIndex((item) => item.method === nextItem.method);

  if (existingItemIndex === -1) {
    return [...items, nextItem];
  }

  const nextItems = [...items];
  nextItems[existingItemIndex] = nextItem;

  return nextItems;
}

function createEmptyTariffForm(method: DeliveryMethod = DEFAULT_DELIVERY_METHOD): TariffFormValues {
  return {
    id: '',
    method,
    zoneId: '',
    isAvailable: true,
    fixedPriceMinor: '0',
    freeFromAmountMinor: '',
    currency: DEFAULT_CURRENCY,
    estimatedDays: '',
    deliveryMinutes: '',
  };
}

function createTariffFormFromTariff(tariff: DeliveryTariff): TariffFormValues {
  return {
    id: tariff.id,
    method: tariff.method,
    zoneId: tariff.zoneId ?? '',
    isAvailable: tariff.isAvailable,
    fixedPriceMinor: String(tariff.fixedPriceMinor),
    freeFromAmountMinor: tariff.freeFromAmountMinor === null || tariff.freeFromAmountMinor === undefined ? '' : String(tariff.freeFromAmountMinor),
    currency: tariff.currency,
    estimatedDays: tariff.estimatedDays === null || tariff.estimatedDays === undefined ? '' : String(tariff.estimatedDays),
    deliveryMinutes: tariff.deliveryMinutes === null || tariff.deliveryMinutes === undefined ? '' : String(tariff.deliveryMinutes),
  };
}

export function DeliveryConditionsPage() {
  const navigate = useNavigate();
  const [methodSettings, setMethodSettings] = useState<DeliveryMethodSetting[]>([]);
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [tariffs, setTariffs] = useState<DeliveryTariff[]>([]);
  const [pickupPoints, setPickupPoints] = useState<PickupPoint[]>([]);
  const [paymentRules, setPaymentRules] = useState<CheckoutPaymentRule[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [savingMethod, setSavingMethod] = useState<DeliveryMethod | null>(null);
  const [methodSaveError, setMethodSaveError] = useState('');
  const [methodSaveSuccess, setMethodSaveSuccess] = useState('');

  const [deletingZoneId, setDeletingZoneId] = useState<string | null>(null);
  const [zoneActionError, setZoneActionError] = useState('');
  const [zoneActionSuccess, setZoneActionSuccess] = useState('');

  const [tariffForm, setTariffForm] = useState<TariffFormValues>(() => createEmptyTariffForm());
  const [isSavingTariff, setIsSavingTariff] = useState(false);
  const [deletingTariffId, setDeletingTariffId] = useState<string | null>(null);
  const [tariffSaveError, setTariffSaveError] = useState('');
  const [tariffSaveSuccess, setTariffSaveSuccess] = useState('');

  const [pickupPointForm, setPickupPointForm] = useState<PickupPointEditorValues>(() => buildEmptyPickupPointEditorValues());
  const [isSavingPickupPoint, setIsSavingPickupPoint] = useState(false);
  const [deletingPickupPointId, setDeletingPickupPointId] = useState<string | null>(null);
  const [isDetectingPickupPointAddress, setIsDetectingPickupPointAddress] = useState(false);
  const [pickupPointDetectError, setPickupPointDetectError] = useState('');
  const [pickupPointDetectSuccess, setPickupPointDetectSuccess] = useState('');
  const [pickupPointSaveError, setPickupPointSaveError] = useState('');
  const [pickupPointSaveSuccess, setPickupPointSaveSuccess] = useState('');

  const [isSavingPaymentRules, setIsSavingPaymentRules] = useState(false);
  const [paymentRulesSaveError, setPaymentRulesSaveError] = useState('');
  const [paymentRulesSaveSuccess, setPaymentRulesSaveSuccess] = useState('');

  const requestIdRef = useRef(0);

  const activeZonesCount = useMemo(() => zones.filter((zone) => zone.isActive).length, [zones]);
  const activePickupPointsCount = useMemo(() => pickupPoints.filter((pickupPoint) => pickupPoint.isActive).length, [pickupPoints]);
  const activeMethodsCount = useMemo(() => methodSettings.filter((setting) => setting.isActive).length, [methodSettings]);
  const availableTariffsCount = useMemo(() => tariffs.filter((tariff) => tariff.isAvailable).length, [tariffs]);

  const loadDeliveryData = async ({ showInitialLoader = false }: LoadDeliveryDataOptions = {}) => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    if (showInitialLoader) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    setErrorMessage('');

    const [methodSettingsResult, zonesResult, tariffsResult, pickupPointsResult, paymentRulesResult] = await Promise.all([
      getDeliveryMethodSettings(),
      getDeliveryZones(),
      getDeliveryTariffs(),
      getPickupPoints(),
      getCheckoutPaymentRules(),
    ]);

    if (requestId !== requestIdRef.current) {
      return;
    }

    const nextMethodSettings = sortDeliveryMethodSettings(methodSettingsResult.settings);
    const nextZones = sortDeliveryZones(zonesResult.zones);
    const nextTariffs = sortDeliveryTariffs(tariffsResult.tariffs);
    const nextPickupPoints = sortPickupPoints(pickupPointsResult.pickupPoints);
    const nextPaymentRules = sortCheckoutPaymentRules(paymentRulesResult.rules);

    setMethodSettings(nextMethodSettings);
    setZones(nextZones);
    setTariffs(nextTariffs);
    setPickupPoints(nextPickupPoints);
    setPaymentRules(nextPaymentRules);

    setTariffForm((currentForm) => {
      if (!currentForm.id) {
        return currentForm;
      }

      const matchedTariff = nextTariffs.find((tariff) => tariff.id === currentForm.id);

      return matchedTariff ? createTariffFormFromTariff(matchedTariff) : createEmptyTariffForm(nextMethodSettings[0]?.method ?? DEFAULT_DELIVERY_METHOD);
    });

    setPickupPointForm((currentForm) => {
      if (!currentForm.id) {
        return currentForm;
      }

      const matchedPickupPoint = nextPickupPoints.find((pickupPoint) => pickupPoint.id === currentForm.id);

      return matchedPickupPoint ? buildPickupPointEditorValues(matchedPickupPoint) : buildEmptyPickupPointEditorValues();
    });

    const pickupPointMapDraft = consumePickupPointMapDraft();

    if (pickupPointMapDraft) {
      setPickupPointForm(pickupPointMapDraft);
      setPickupPointDetectError('');
      setPickupPointDetectSuccess('');
      setPickupPointSaveError('');
      setPickupPointSaveSuccess('');
    }

    setErrorMessage(
      [
        methodSettingsResult.error,
        zonesResult.error,
        tariffsResult.error,
        pickupPointsResult.error,
        paymentRulesResult.error,
      ]
        .filter(Boolean)
        .join(' '),
    );

    setIsLoading(false);
    setIsRefreshing(false);
  };

  const tariffColumns: ColumnDef<DeliveryTariff>[] = [
    {
      id: 'method',
      header: 'Способ',
      cell: ({ row }) => getDeliveryMethodLabel(row.original.method),
    },
    {
      id: 'zone',
      header: 'Зона',
      cell: ({ row }) => formatNullableText(row.original.zoneName ?? row.original.zoneCode),
    },
    {
      id: 'price',
      header: 'Цена',
      cell: ({ row }) => formatMoneyMinor(row.original.fixedPriceMinor, row.original.currency),
    },
    {
      id: 'freeFromAmount',
      header: 'Бесплатно от',
      cell: ({ row }) =>
        row.original.freeFromAmountMinor === null || row.original.freeFromAmountMinor === undefined
          ? '—'
          : formatMoneyMinor(row.original.freeFromAmountMinor, row.original.currency),
    },
    {
      id: 'estimate',
      header: 'Срок',
      cell: ({ row }) => formatDeliveryEstimate(row.original.estimatedDays, row.original.deliveryMinutes),
    },
    {
      id: 'status',
      header: 'Статус',
      cell: ({ row }) => (row.original.isAvailable ? 'Доступен' : 'Отключен'),
    },
    {
      id: 'actions',
      header: '',
      meta: {
        cellClassName: 'delivery-table-actions',
      },
      cell: ({ row }) => (
        <div className="delivery-table-link-group">
          <button
            type="button"
            className="secondary-button"
            disabled={isSavingTariff || deletingTariffId === row.original.id}
            onClick={() => handleTariffSelect(row.original)}
          >
            Изменить
          </button>

          <button
            type="button"
            className="secondary-button secondary-button-danger"
            disabled={isSavingTariff || deletingTariffId === row.original.id}
            onClick={() => void handleTariffDelete(row.original)}
          >
            {deletingTariffId === row.original.id ? 'Удаление...' : 'Удалить'}
          </button>
        </div>
      ),
    },
  ];

  const pickupPointColumns: ColumnDef<PickupPoint>[] = [
    {
      id: 'code',
      header: 'Код',
      cell: ({ row }) => row.original.code,
    },
    {
      id: 'name',
      header: 'Название',
      cell: ({ row }) => row.original.name,
    },
    {
      id: 'address',
      header: 'Адрес',
      cell: ({ row }) => formatPickupPointAddress(row.original),
    },
    {
      id: 'status',
      header: 'Статус',
      cell: ({ row }) => (row.original.isActive ? 'Активен' : 'Отключен'),
    },
    {
      id: 'actions',
      header: '',
      meta: {
        cellClassName: 'delivery-table-actions',
      },
      cell: ({ row }) => (
        <div className="delivery-table-link-group">
          <button
            type="button"
            className="secondary-button"
            disabled={
              isSavingPickupPoint || isDetectingPickupPointAddress || deletingPickupPointId === row.original.id
            }
            onClick={() => handlePickupPointSelect(row.original)}
          >
            Изменить
          </button>

          <button
            type="button"
            className="secondary-button secondary-button-danger"
            disabled={
              isSavingPickupPoint || isDetectingPickupPointAddress || deletingPickupPointId === row.original.id
            }
            onClick={() => void handlePickupPointDelete(row.original)}
          >
            {deletingPickupPointId === row.original.id ? 'Удаление...' : 'Удалить'}
          </button>
        </div>
      ),
    },
  ];

  useEffect(() => {
    void loadDeliveryData({
      showInitialLoader: true,
    });
  }, []);

  const handleMethodActiveChange = (method: DeliveryMethod, isActive: boolean) => {
    setMethodSettings((currentSettings) =>
      currentSettings.map((setting) => (setting.method === method ? { ...setting, isActive } : setting)),
    );
    setMethodSaveError('');
    setMethodSaveSuccess('');
  };

  const handleMethodTitleChange = (method: DeliveryMethod, title: string) => {
    setMethodSettings((currentSettings) =>
      currentSettings.map((setting) => (setting.method === method ? { ...setting, title } : setting)),
    );
    setMethodSaveError('');
    setMethodSaveSuccess('');
  };

  const handleMethodDescriptionChange = (method: DeliveryMethod, description: string) => {
    setMethodSettings((currentSettings) =>
      currentSettings.map((setting) => (setting.method === method ? { ...setting, description } : setting)),
    );
    setMethodSaveError('');
    setMethodSaveSuccess('');
  };

  const handleMethodSortOrderChange = (method: DeliveryMethod, value: string) => {
    const parsedValue = Number(value);
    const nextSortOrder = Number.isFinite(parsedValue) ? Math.trunc(parsedValue) : 0;

    setMethodSettings((currentSettings) =>
      currentSettings.map((setting) => (setting.method === method ? { ...setting, sortOrder: nextSortOrder } : setting)),
    );
    setMethodSaveError('');
    setMethodSaveSuccess('');
  };

  const handleMethodSave = async (method: DeliveryMethod) => {
    const methodSetting = methodSettings.find((setting) => setting.method === method);

    if (!methodSetting) {
      return;
    }

    const title = methodSetting.title.trim();

    if (!title) {
      setMethodSaveError('Укажите название способа доставки.');
      setMethodSaveSuccess('');
      return;
    }

    setSavingMethod(method);
    setMethodSaveError('');
    setMethodSaveSuccess('');

    const result = await saveDeliveryMethodSetting({
      method: methodSetting.method,
      title,
      description: normalizeText(methodSetting.description ?? ''),
      isActive: methodSetting.isActive,
      sortOrder: methodSetting.sortOrder,
    });

    setSavingMethod(null);

    if (result.error || !result.setting) {
      setMethodSaveError(result.error ?? 'Не удалось сохранить способ доставки.');
      return;
    }

    const nextSetting = result.setting;

    setMethodSettings((currentSettings) => sortDeliveryMethodSettings(upsertMethodSetting(currentSettings, nextSetting)));
    setMethodSaveSuccess(`Настройки «${nextSetting.title}» сохранены.`);
  };

  const handleZoneDelete = async (zone: DeliveryZone) => {
    if (!window.confirm(`Удалить зону «${zone.name}»?`)) {
      return;
    }

    setDeletingZoneId(zone.id);
    setZoneActionError('');
    setZoneActionSuccess('');

    const result = await deleteDeliveryZone(zone.id);

    setDeletingZoneId(null);

    if (result.error) {
      setZoneActionError(result.error);
      return;
    }

    setZones((currentZones) => sortDeliveryZones(currentZones.filter((currentZone) => currentZone.id !== zone.id)));
    setTariffs((currentTariffs) => sortDeliveryTariffs(currentTariffs.filter((tariff) => tariff.zoneId !== zone.id)));
    setTariffForm((currentForm) =>
      currentForm.zoneId === zone.id ? createEmptyTariffForm(currentForm.method || DEFAULT_DELIVERY_METHOD) : currentForm,
    );
    setZoneActionSuccess(`Зона «${zone.name}» удалена.`);
  };

  const handleTariffFieldChange = (field: Exclude<keyof TariffFormValues, 'isAvailable' | 'method'>, value: string) => {
    setTariffForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
    setTariffSaveError('');
    setTariffSaveSuccess('');
  };

  const handleTariffSelect = (tariff: DeliveryTariff) => {
    setTariffForm(createTariffFormFromTariff(tariff));
    setTariffSaveError('');
    setTariffSaveSuccess('');
  };

  const handleTariffReset = () => {
    setTariffForm(createEmptyTariffForm(methodSettings[0]?.method ?? DEFAULT_DELIVERY_METHOD));
    setTariffSaveError('');
    setTariffSaveSuccess('');
  };

  const handleTariffDelete = async (tariff: DeliveryTariff) => {
    if (!window.confirm(`Удалить тариф для «${getDeliveryMethodLabel(tariff.method)}»?`)) {
      return;
    }

    setDeletingTariffId(tariff.id);
    setTariffSaveError('');
    setTariffSaveSuccess('');

    const result = await deleteDeliveryTariff(tariff.id);

    setDeletingTariffId(null);

    if (result.error) {
      setTariffSaveError(result.error);
      return;
    }

    setTariffs((currentTariffs) => sortDeliveryTariffs(currentTariffs.filter((currentTariff) => currentTariff.id !== tariff.id)));
    setTariffForm((currentForm) => (currentForm.id === tariff.id ? createEmptyTariffForm(tariff.method) : currentForm));
    setTariffSaveSuccess(`Тариф для «${getDeliveryMethodLabel(tariff.method)}» удален.`);
  };

  const handleTariffSubmit = async () => {
    const parsedFixedPriceMinor = parseRequiredInteger(tariffForm.fixedPriceMinor, 'Фиксированная цена');

    if (parsedFixedPriceMinor.error || parsedFixedPriceMinor.value === null) {
      setTariffSaveError(parsedFixedPriceMinor.error ?? 'Укажите фиксированную цену.');
      setTariffSaveSuccess('');
      return;
    }

    const parsedFreeFromAmountMinor = parseOptionalInteger(tariffForm.freeFromAmountMinor, 'Порог бесплатной доставки');

    if (parsedFreeFromAmountMinor.error) {
      setTariffSaveError(parsedFreeFromAmountMinor.error);
      setTariffSaveSuccess('');
      return;
    }

    const parsedEstimatedDays = parseOptionalInteger(tariffForm.estimatedDays, 'Срок доставки');

    if (parsedEstimatedDays.error) {
      setTariffSaveError(parsedEstimatedDays.error);
      setTariffSaveSuccess('');
      return;
    }

    const parsedDeliveryMinutes = parseOptionalInteger(tariffForm.deliveryMinutes, 'Срок доставки в минутах');

    if (parsedDeliveryMinutes.error) {
      setTariffSaveError(parsedDeliveryMinutes.error);
      setTariffSaveSuccess('');
      return;
    }

    const currency = tariffForm.currency.trim().toUpperCase();

    if (!currency) {
      setTariffSaveError('Укажите валюту тарифа.');
      setTariffSaveSuccess('');
      return;
    }

    setIsSavingTariff(true);
    setTariffSaveError('');
    setTariffSaveSuccess('');

    const result = await saveDeliveryTariff({
      id: normalizeText(tariffForm.id),
      method: tariffForm.method,
      zoneId: normalizeText(tariffForm.zoneId),
      isAvailable: tariffForm.isAvailable,
      fixedPriceMinor: parsedFixedPriceMinor.value,
      freeFromAmountMinor: parsedFreeFromAmountMinor.value,
      currency,
      estimatedDays: parsedEstimatedDays.value,
      deliveryMinutes: parsedDeliveryMinutes.value,
    });

    setIsSavingTariff(false);

    if (result.error || !result.tariff) {
      setTariffSaveError(result.error ?? 'Не удалось сохранить тариф доставки.');
      return;
    }

    const nextTariff = result.tariff;

    setTariffs((currentTariffs) => sortDeliveryTariffs(upsertItemById<DeliveryTariff>(currentTariffs, nextTariff)));
    setTariffForm(createTariffFormFromTariff(nextTariff));
    setTariffSaveSuccess(`Тариф для «${getDeliveryMethodLabel(nextTariff.method)}» сохранен.`);
  };

  const handlePickupPointFieldChange = (field: Exclude<keyof PickupPointEditorValues, 'isActive'>, value: string) => {
    setPickupPointForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
    setPickupPointDetectError('');
    setPickupPointDetectSuccess('');
    setPickupPointSaveError('');
    setPickupPointSaveSuccess('');
  };

  const handlePickupPointSelect = (pickupPoint: PickupPoint) => {
    setPickupPointForm(buildPickupPointEditorValues(pickupPoint));
    setPickupPointDetectError('');
    setPickupPointDetectSuccess('');
    setPickupPointSaveError('');
    setPickupPointSaveSuccess('');
  };

  const handlePickupPointReset = () => {
    clearPickupPointMapDraft();
    setPickupPointForm(buildEmptyPickupPointEditorValues());
    setPickupPointDetectError('');
    setPickupPointDetectSuccess('');
    setPickupPointSaveError('');
    setPickupPointSaveSuccess('');
  };

  const handlePickupPointOpenMap = () => {
    writePickupPointMapDraft(pickupPointForm);
    navigate('/delivery/pickup-points/map');
  };

  const handlePickupPointDetectAddress = async () => {
    const parsedLatitude = parseOptionalFloat(pickupPointForm.latitude, 'Широта');

    if (parsedLatitude.error || parsedLatitude.value === null) {
      setPickupPointDetectError(parsedLatitude.error ?? 'Укажите широту для определения адреса.');
      setPickupPointDetectSuccess('');
      return;
    }

    const parsedLongitude = parseOptionalFloat(pickupPointForm.longitude, 'Долгота');

    if (parsedLongitude.error || parsedLongitude.value === null) {
      setPickupPointDetectError(parsedLongitude.error ?? 'Укажите долготу для определения адреса.');
      setPickupPointDetectSuccess('');
      return;
    }

    setIsDetectingPickupPointAddress(true);
    setPickupPointDetectError('');
    setPickupPointDetectSuccess('');

    const result = await detectPickupPointAddress({
      latitude: parsedLatitude.value,
      longitude: parsedLongitude.value,
    });

    setIsDetectingPickupPointAddress(false);

    if (result.error) {
      setPickupPointDetectError(result.error);
      return;
    }

    if (!result.address) {
      setPickupPointDetectError('По указанным координатам адрес не найден.');
      return;
    }

    setPickupPointForm((currentForm) => ({
      ...currentForm,
      country: mergeDetectedAddressField(result.address?.country, currentForm.country),
      region: mergeDetectedAddressField(result.address?.region, currentForm.region),
      city: mergeDetectedAddressField(result.address?.city, currentForm.city),
      street: mergeDetectedAddressField(result.address?.street, currentForm.street),
      house: mergeDetectedAddressField(result.address?.house, currentForm.house),
      apartment: mergeDetectedAddressField(result.address?.apartment, currentForm.apartment),
      postalCode: mergeDetectedAddressField(result.address?.postalCode, currentForm.postalCode),
      entrance: mergeDetectedAddressField(result.address?.entrance, currentForm.entrance),
      floor: mergeDetectedAddressField(result.address?.floor, currentForm.floor),
      intercom: mergeDetectedAddressField(result.address?.intercom, currentForm.intercom),
      comment: mergeDetectedAddressField(result.address?.comment, currentForm.comment),
    }));
    setPickupPointDetectSuccess('Адрес обновлен по координатам.');
  };

  const handlePickupPointDelete = async (pickupPoint: PickupPoint) => {
    if (!window.confirm(`Удалить пункт самовывоза «${pickupPoint.name}»?`)) {
      return;
    }

    setDeletingPickupPointId(pickupPoint.id);
    setPickupPointDetectError('');
    setPickupPointDetectSuccess('');
    setPickupPointSaveError('');
    setPickupPointSaveSuccess('');

    const result = await deletePickupPoint(pickupPoint.id);

    setDeletingPickupPointId(null);

    if (result.error) {
      setPickupPointSaveError(result.error);
      return;
    }

    setPickupPoints((currentPickupPoints) =>
      sortPickupPoints(currentPickupPoints.filter((currentPickupPoint) => currentPickupPoint.id !== pickupPoint.id)),
    );

    if (pickupPointForm.id === pickupPoint.id) {
      clearPickupPointMapDraft();
      setPickupPointForm(buildEmptyPickupPointEditorValues());
    }

    setPickupPointSaveSuccess(`Пункт «${pickupPoint.name}» удален.`);
  };

  const handlePickupPointSubmit = async () => {
    const code = pickupPointForm.code.trim();
    const name = pickupPointForm.name.trim();

    if (!code) {
      setPickupPointSaveError('Укажите код пункта самовывоза.');
      setPickupPointSaveSuccess('');
      return;
    }

    if (!name) {
      setPickupPointSaveError('Укажите название пункта самовывоза.');
      setPickupPointSaveSuccess('');
      return;
    }

    const parsedLatitude = parseOptionalFloat(pickupPointForm.latitude, 'Широта');

    if (parsedLatitude.error) {
      setPickupPointSaveError(parsedLatitude.error);
      setPickupPointSaveSuccess('');
      return;
    }

    const parsedLongitude = parseOptionalFloat(pickupPointForm.longitude, 'Долгота');

    if (parsedLongitude.error) {
      setPickupPointSaveError(parsedLongitude.error);
      setPickupPointSaveSuccess('');
      return;
    }

    setIsSavingPickupPoint(true);
    setPickupPointDetectError('');
    setPickupPointDetectSuccess('');
    setPickupPointSaveError('');
    setPickupPointSaveSuccess('');

    const result = await savePickupPoint({
      id: normalizeText(pickupPointForm.id),
      code,
      name,
      isActive: pickupPointForm.isActive,
      address: {
        country: normalizeText(pickupPointForm.country),
        region: normalizeText(pickupPointForm.region),
        city: normalizeText(pickupPointForm.city),
        street: normalizeText(pickupPointForm.street),
        house: normalizeText(pickupPointForm.house),
        apartment: normalizeText(pickupPointForm.apartment),
        postalCode: normalizeText(pickupPointForm.postalCode),
        entrance: normalizeText(pickupPointForm.entrance),
        floor: normalizeText(pickupPointForm.floor),
        intercom: normalizeText(pickupPointForm.intercom),
        comment: normalizeText(pickupPointForm.comment),
        latitude: parsedLatitude.value,
        longitude: parsedLongitude.value,
      },
    });

    setIsSavingPickupPoint(false);

    if (result.error || !result.pickupPoint) {
      setPickupPointSaveError(result.error ?? 'Не удалось сохранить пункт самовывоза.');
      return;
    }

    const nextPickupPoint = result.pickupPoint;

    setPickupPoints((currentPickupPoints) => sortPickupPoints(upsertItemById<PickupPoint>(currentPickupPoints, nextPickupPoint)));
    clearPickupPointMapDraft();
    setPickupPointForm(buildPickupPointEditorValues(nextPickupPoint));
    setPickupPointSaveSuccess(`Пункт «${nextPickupPoint.name}» сохранен.`);
  };

  const handlePaymentRuleToggle = (deliveryMethod: DeliveryMethod, paymentMethod: PaymentMethodCode) => {
    setPaymentRules((currentRules) =>
      currentRules.map((rule) => {
        if (rule.deliveryMethod !== deliveryMethod || rule.isDynamic) {
          return rule;
        }

        const hasPaymentMethod = rule.paymentMethods.includes(paymentMethod);
        const nextPaymentMethods = hasPaymentMethod
          ? rule.paymentMethods.filter((method) => method !== paymentMethod)
          : [...rule.paymentMethods, paymentMethod].sort(
              (leftMethod, rightMethod) => PAYMENT_METHOD_ORDER.indexOf(leftMethod) - PAYMENT_METHOD_ORDER.indexOf(rightMethod),
            );

        return {
          ...rule,
          paymentMethods: nextPaymentMethods,
        };
      }),
    );

    setPaymentRulesSaveError('');
    setPaymentRulesSaveSuccess('');
  };

  const handlePaymentRulesSave = async () => {
    setIsSavingPaymentRules(true);
    setPaymentRulesSaveError('');
    setPaymentRulesSaveSuccess('');

    const result = await replaceCheckoutPaymentRules(
      paymentRules
        .filter((rule) => !rule.isDynamic)
        .map((rule) => ({
          deliveryMethod: rule.deliveryMethod,
          paymentMethods: rule.paymentMethods,
        })),
    );

    setIsSavingPaymentRules(false);

    if (result.error) {
      setPaymentRulesSaveError(result.error);
      return;
    }

    setPaymentRules(sortCheckoutPaymentRules(result.rules));
    setPaymentRulesSaveSuccess('Правила оплаты для статических способов доставки сохранены.');
  };

  return (
    <main className="dashboard">
        <header className="dashboard-header">
          <div>
            <p className="page-kicker">Доставка</p>
            <h2 className="page-title">Условия доставки</h2>
          </div>

          <div className="dashboard-actions">
            <span className="status-chip">
              {isLoading
                ? 'Загрузка условий доставки...'
                : `${activeMethodsCount} методов • ${activeZonesCount} активных зон • ${availableTariffsCount} активных тарифов`}
            </span>

            <button
              type="button"
              className="secondary-button"
              onClick={() => void loadDeliveryData()}
              disabled={isLoading || isRefreshing}
            >
              {isRefreshing ? 'Обновление...' : 'Обновить данные'}
            </button>
          </div>
        </header>

        <div className="delivery-stats-grid">
          <article className="catalog-card delivery-stat-card">
            <p className="placeholder-eyebrow">Методы</p>
            <h3 className="delivery-stat-value">{methodSettings.length}</h3>
            <p className="catalog-meta">Активно: {activeMethodsCount}</p>
          </article>

          <article className="catalog-card delivery-stat-card">
            <p className="placeholder-eyebrow">Зоны</p>
            <h3 className="delivery-stat-value">{zones.length}</h3>
            <p className="catalog-meta">Активно: {activeZonesCount}</p>
          </article>

          <article className="catalog-card delivery-stat-card">
            <p className="placeholder-eyebrow">Тарифы</p>
            <h3 className="delivery-stat-value">{tariffs.length}</h3>
            <p className="catalog-meta">Доступно: {availableTariffsCount}</p>
          </article>

          <article className="catalog-card delivery-stat-card">
            <p className="placeholder-eyebrow">Самовывоз</p>
            <h3 className="delivery-stat-value">{pickupPoints.length}</h3>
            <p className="catalog-meta">Активно: {activePickupPointsCount}</p>
          </article>
        </div>

        {errorMessage ? (
          <p className="form-error delivery-page-error" role="alert">
            {errorMessage}
          </p>
        ) : null}

        <div className="delivery-sections">
          <section className="catalog-card catalog-data-card" aria-label="Настройки способов доставки">
            <div className="catalog-section-header">
              <div className="catalog-card-copy">
                <p className="placeholder-eyebrow">Способы</p>
                <h3 className="catalog-card-title">Настройки способов доставки</h3>
                <p className="catalog-card-text">
                  Управляйте названием, описанием, порядком и доступностью способов доставки на checkout.
                </p>
              </div>
            </div>

            {isLoading ? (
              <p className="catalog-empty-state">Загрузка способов доставки...</p>
            ) : methodSettings.length ? (
              <div className="delivery-method-grid">
                {methodSettings.map((setting) => {
                  const isSavingCurrentMethod = savingMethod === setting.method;

                  return (
                    <article key={setting.method} className="delivery-method-card">
                      <div className="delivery-method-card-header">
                        <div className="catalog-card-copy">
                          <h4 className="delivery-subtitle">{setting.title}</h4>
                          <p className="catalog-meta">{getDeliveryMethodLabel(setting.method)}</p>
                          <p className="catalog-card-text">{setting.description?.trim() || 'Описание не задано.'}</p>
                        </div>

                        <span className={`delivery-status-pill${setting.isActive ? ' delivery-status-pill-live' : ''}`}>
                          {setting.isActive ? 'Активен' : 'Неактивен'}
                        </span>
                      </div>

                      <div className="delivery-method-flags">
                        <span className="delivery-flag">{setting.requiresAddress ? 'Нужен адрес' : 'Без адреса'}</span>
                        <span className="delivery-flag">
                          {setting.requiresPickupPoint ? 'Нужен пункт выдачи' : 'Без пункта выдачи'}
                        </span>
                      </div>

                      <div className="product-edit-grid">
                        <label className="field-checkbox">
                          <input
                            type="checkbox"
                            checked={setting.isActive}
                            disabled={isSavingCurrentMethod}
                            onChange={(event) => handleMethodActiveChange(setting.method, event.target.checked)}
                          />
                          <span className="field-label">Метод активен</span>
                        </label>

                        <div className="field">
                          <label className="field-label" htmlFor={`delivery-method-title-${setting.method}`}>
                            Название
                          </label>
                          <input
                            id={`delivery-method-title-${setting.method}`}
                            type="text"
                            className="field-input"
                            value={setting.title}
                            disabled={isSavingCurrentMethod}
                            onChange={(event) => handleMethodTitleChange(setting.method, event.target.value)}
                          />
                        </div>

                        <div className="field">
                          <label className="field-label" htmlFor={`delivery-method-description-${setting.method}`}>
                            Описание
                          </label>
                          <textarea
                            id={`delivery-method-description-${setting.method}`}
                            className="field-input field-textarea"
                            rows={3}
                            value={setting.description ?? ''}
                            disabled={isSavingCurrentMethod}
                            onChange={(event) => handleMethodDescriptionChange(setting.method, event.target.value)}
                          />
                        </div>

                        <div className="field">
                          <label className="field-label" htmlFor={`delivery-method-sort-order-${setting.method}`}>
                            Порядок сортировки
                          </label>
                          <input
                            id={`delivery-method-sort-order-${setting.method}`}
                            type="number"
                            className="field-input"
                            value={setting.sortOrder}
                            disabled={isSavingCurrentMethod}
                            onChange={(event) => handleMethodSortOrderChange(setting.method, event.target.value)}
                          />
                        </div>
                      </div>

                      <div className="product-edit-actions">
                        <button
                          type="button"
                          className="submit-button"
                          onClick={() => void handleMethodSave(setting.method)}
                          disabled={isSavingCurrentMethod}
                        >
                          {isSavingCurrentMethod ? 'Сохранение...' : 'Сохранить настройки'}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <p className="catalog-empty-state">API не вернул ни одного способа доставки.</p>
            )}

            {methodSaveError ? (
              <p className="form-error" role="alert">
                {methodSaveError}
              </p>
            ) : null}

            {methodSaveSuccess ? (
              <p className="form-success" role="status">
                {methodSaveSuccess}
              </p>
            ) : null}
          </section>

          <section className="catalog-card catalog-data-card" aria-label="Правила оплаты по способам доставки">
            <div className="catalog-section-header">
              <div className="catalog-card-copy">
                <p className="placeholder-eyebrow">Оплата</p>
                <h3 className="catalog-card-title">Правила оплаты по доставке</h3>
                <p className="catalog-card-text">
                  Для статических способов можно явно указать доступные методы оплаты. Динамические правила отображаются только для
                  чтения.
                </p>
              </div>

              <button
                type="button"
                className="secondary-button"
                onClick={() => void handlePaymentRulesSave()}
                disabled={isLoading || isSavingPaymentRules || !paymentRules.length}
              >
                {isSavingPaymentRules ? 'Сохранение...' : 'Сохранить правила'}
              </button>
            </div>

            {isLoading ? (
              <p className="catalog-empty-state">Загрузка правил оплаты...</p>
            ) : paymentRules.length ? (
              <div className="delivery-payment-rules-grid">
                {paymentRules.map((rule) => (
                  <article key={rule.deliveryMethod} className="delivery-payment-card">
                    <div className="delivery-method-card-header">
                      <div className="catalog-card-copy">
                        <h4 className="delivery-subtitle">{rule.deliveryMethodName}</h4>
                        <p className="catalog-meta">{getDeliveryMethodLabel(rule.deliveryMethod)}</p>
                      </div>

                      <span className={`delivery-status-pill${rule.isDynamic ? '' : ' delivery-status-pill-live'}`}>
                        {rule.isDynamic ? 'Динамическое' : 'Статическое'}
                      </span>
                    </div>

                    <div className="delivery-checkbox-grid">
                      {PAYMENT_METHOD_ORDER.map((paymentMethod) => (
                        <label key={paymentMethod} className="field-checkbox delivery-checkbox-card">
                          <input
                            type="checkbox"
                            checked={rule.paymentMethods.includes(paymentMethod)}
                            disabled={rule.isDynamic || isSavingPaymentRules}
                            onChange={() => handlePaymentRuleToggle(rule.deliveryMethod, paymentMethod)}
                          />
                          <span className="field-label">{getPaymentMethodLabel(paymentMethod)}</span>
                        </label>
                      ))}
                    </div>

                    <p className="catalog-meta">
                      {rule.isDynamic
                        ? 'Это правило формируется автоматически и не редактируется через bulk endpoint.'
                        : 'Изменения войдут в bulk update для статических способов доставки.'}
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="catalog-empty-state">Правила оплаты пока не настроены.</p>
            )}

            {paymentRulesSaveError ? (
              <p className="form-error" role="alert">
                {paymentRulesSaveError}
              </p>
            ) : null}

            {paymentRulesSaveSuccess ? (
              <p className="form-success" role="status">
                {paymentRulesSaveSuccess}
              </p>
            ) : null}
          </section>

          <DeliveryZonesSection
            zones={zones}
            isLoading={isLoading}
            deletingZoneId={deletingZoneId}
            actionError={zoneActionError}
            actionSuccess={zoneActionSuccess}
            onDeleteZone={(zone) => void handleZoneDelete(zone)}
          />

          <section className="catalog-card catalog-data-card" aria-label="Тарифы доставки">
            <div className="catalog-section-header">
              <div className="catalog-card-copy">
                <p className="placeholder-eyebrow">Тарифы</p>
                <h3 className="catalog-card-title">Тарифы доставки</h3>
                <p className="catalog-card-text">
                  Настраивайте доступность тарифа, стоимость, бесплатную доставку и ожидаемый срок по способу и зоне.
                </p>
              </div>

              <button
                type="button"
                className="secondary-button"
                onClick={handleTariffReset}
                disabled={isSavingTariff || deletingTariffId !== null}
              >
                Новый тариф
              </button>
            </div>

            <div className="delivery-section-grid">
	              <div className="delivery-table-wrap">
	                {isLoading ? (
	                  <p className="catalog-empty-state">Загрузка тарифов доставки...</p>
	                ) : tariffs.length ? (
	                  <DataTable
	                    columns={tariffColumns}
	                    data={tariffs}
	                    getRowId={(tariff) => tariff.id}
	                    getRowClassName={(row) => (tariffForm.id === row.original.id ? 'delivery-table-row-active' : undefined)}
	                    wrapperClassName="delivery-table-wrap"
	                    tableClassName="delivery-table"
	                  />
	                ) : (
	                  <p className="catalog-empty-state">Список тарифов доставки пуст.</p>
	                )}
              </div>

              <div className="delivery-form-panel">
                <div className="catalog-card-copy">
                  <h4 className="delivery-subtitle">{tariffForm.id ? 'Редактирование тарифа' : 'Новый тариф'}</h4>
                  <p className="catalog-meta">Привяжите тариф к способу доставки и зоне. Цена и порог бесплатной доставки хранятся в minor units.</p>
                </div>

                <div className="product-edit-grid">
                  <div className="field">
                    <label className="field-label" htmlFor="delivery-tariff-method">
                      Способ доставки
                    </label>
                    <select
                      id="delivery-tariff-method"
                      className="field-input"
                      value={tariffForm.method}
                      disabled={isSavingTariff}
                      onChange={(event) => {
                        setTariffForm((currentForm) => ({
                          ...currentForm,
                          method: event.target.value as DeliveryMethod,
                        }));
                        setTariffSaveError('');
                        setTariffSaveSuccess('');
                      }}
                    >
                      {DELIVERY_METHOD_ORDER.map((method) => (
                        <option key={method} value={method}>
                          {getDeliveryMethodLabel(method)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="field">
                    <label className="field-label" htmlFor="delivery-tariff-zone">
                      Зона
                    </label>
                    <select
                      id="delivery-tariff-zone"
                      className="field-input"
                      value={tariffForm.zoneId}
                      disabled={isSavingTariff}
                      onChange={(event) => handleTariffFieldChange('zoneId', event.target.value)}
                    >
                      <option value="">Без зоны</option>
                      {zones.map((zone) => (
                        <option key={zone.id} value={zone.id}>
                          {zone.name} ({zone.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="field">
                    <label className="field-label" htmlFor="delivery-tariff-fixed-price">
                      Цена, minor units
                    </label>
                    <input
                      id="delivery-tariff-fixed-price"
                      type="number"
                      className="field-input"
                      value={tariffForm.fixedPriceMinor}
                      disabled={isSavingTariff}
                      onChange={(event) => handleTariffFieldChange('fixedPriceMinor', event.target.value)}
                    />
                  </div>

                  <div className="field">
                    <label className="field-label" htmlFor="delivery-tariff-free-from">
                      Бесплатно от, minor units
                    </label>
                    <input
                      id="delivery-tariff-free-from"
                      type="number"
                      className="field-input"
                      value={tariffForm.freeFromAmountMinor}
                      disabled={isSavingTariff}
                      onChange={(event) => handleTariffFieldChange('freeFromAmountMinor', event.target.value)}
                    />
                  </div>

                  <div className="field">
                    <label className="field-label" htmlFor="delivery-tariff-currency">
                      Валюта
                    </label>
                    <input
                      id="delivery-tariff-currency"
                      className="field-input"
                      value={tariffForm.currency}
                      disabled={isSavingTariff}
                      onChange={(event) => handleTariffFieldChange('currency', event.target.value)}
                    />
                  </div>

                  <div className="field">
                    <label className="field-label" htmlFor="delivery-tariff-estimated-days">
                      Срок доставки, дней
                    </label>
                    <input
                      id="delivery-tariff-estimated-days"
                      type="number"
                      className="field-input"
                      value={tariffForm.estimatedDays}
                      disabled={isSavingTariff}
                      onChange={(event) => handleTariffFieldChange('estimatedDays', event.target.value)}
                    />
                  </div>

                  <div className="field">
                    <label className="field-label" htmlFor="delivery-tariff-delivery-minutes">
                      Срок доставки, минут
                    </label>
                    <input
                      id="delivery-tariff-delivery-minutes"
                      type="number"
                      className="field-input"
                      value={tariffForm.deliveryMinutes}
                      disabled={isSavingTariff}
                      onChange={(event) => handleTariffFieldChange('deliveryMinutes', event.target.value)}
                    />
                  </div>
                </div>

                <label className="field-checkbox">
                  <input
                    type="checkbox"
                    checked={tariffForm.isAvailable}
                    disabled={isSavingTariff}
                    onChange={(event) => {
                      setTariffForm((currentForm) => ({
                        ...currentForm,
                        isAvailable: event.target.checked,
                      }));
                      setTariffSaveError('');
                      setTariffSaveSuccess('');
                    }}
                  />
                  <span className="field-label">Тариф доступен для расчета</span>
                </label>

                {tariffSaveError ? (
                  <p className="form-error" role="alert">
                    {tariffSaveError}
                  </p>
                ) : null}

                {tariffSaveSuccess ? (
                  <p className="form-success" role="status">
                    {tariffSaveSuccess}
                  </p>
                ) : null}

                <div className="delivery-form-actions">
                  <button
                    type="button"
                    className="submit-button"
                    onClick={() => void handleTariffSubmit()}
                    disabled={isSavingTariff || deletingTariffId !== null}
                  >
                    {isSavingTariff ? 'Сохранение...' : tariffForm.id ? 'Сохранить тариф' : 'Создать тариф'}
                  </button>

                  <button
                    type="button"
                    className="secondary-button"
                    onClick={handleTariffReset}
                    disabled={isSavingTariff || deletingTariffId !== null}
                  >
                    Сбросить
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className="catalog-card catalog-data-card" aria-label="Пункты самовывоза">
            <div className="catalog-section-header">
              <div className="catalog-card-copy">
                <p className="placeholder-eyebrow">Самовывоз</p>
                <h3 className="catalog-card-title">Пункты самовывоза</h3>
                <p className="catalog-card-text">
                  Внутренние пункты самовывоза используются в checkout наряду с внешними интеграциями. Можно хранить адрес и координаты.
                </p>
              </div>

              <button
                type="button"
                className="secondary-button"
                onClick={handlePickupPointReset}
                disabled={isSavingPickupPoint || deletingPickupPointId !== null || isDetectingPickupPointAddress}
              >
                Новый пункт
              </button>
            </div>

            <div className="delivery-section-grid">
	              <div className="delivery-table-wrap">
	                {isLoading ? (
	                  <p className="catalog-empty-state">Загрузка пунктов самовывоза...</p>
	                ) : pickupPoints.length ? (
	                  <DataTable
	                    columns={pickupPointColumns}
	                    data={pickupPoints}
	                    getRowId={(pickupPoint) => pickupPoint.id}
	                    getRowClassName={(row) =>
	                      pickupPointForm.id === row.original.id ? 'delivery-table-row-active' : undefined
	                    }
	                    wrapperClassName="delivery-table-wrap"
	                    tableClassName="delivery-table"
	                  />
	                ) : (
	                  <p className="catalog-empty-state">Список пунктов самовывоза пуст.</p>
	                )}
              </div>

              <div className="delivery-form-panel">
                <div className="catalog-card-copy">
                  <h4 className="delivery-subtitle">{pickupPointForm.id ? 'Редактирование пункта' : 'Новый пункт'}</h4>
                  <p className="catalog-meta">
                    Базовые поля: код, название и адрес. Координаты можно оставить пустыми, если они не участвуют в логике расчета.
                  </p>
                </div>

                <div className="product-edit-grid">
                  <div className="field">
                    <label className="field-label" htmlFor="pickup-point-code">
                      Код
                    </label>
                    <input
                      id="pickup-point-code"
                      className="field-input"
                      value={pickupPointForm.code}
                      disabled={isSavingPickupPoint}
                      onChange={(event) => handlePickupPointFieldChange('code', event.target.value)}
                    />
                  </div>

                  <div className="field">
                    <label className="field-label" htmlFor="pickup-point-name">
                      Название
                    </label>
                    <input
                      id="pickup-point-name"
                      className="field-input"
                      value={pickupPointForm.name}
                      disabled={isSavingPickupPoint}
                      onChange={(event) => handlePickupPointFieldChange('name', event.target.value)}
                    />
                  </div>
                </div>

                <div className="product-edit-grid">
                  <div className="field">
                    <label className="field-label" htmlFor="pickup-point-country">
                      Страна
                    </label>
                    <input
                      id="pickup-point-country"
                      className="field-input"
                      value={pickupPointForm.country}
                      disabled={isSavingPickupPoint}
                      onChange={(event) => handlePickupPointFieldChange('country', event.target.value)}
                    />
                  </div>

                  <div className="field">
                    <label className="field-label" htmlFor="pickup-point-region">
                      Регион
                    </label>
                    <input
                      id="pickup-point-region"
                      className="field-input"
                      value={pickupPointForm.region}
                      disabled={isSavingPickupPoint}
                      onChange={(event) => handlePickupPointFieldChange('region', event.target.value)}
                    />
                  </div>

                  <div className="field">
                    <label className="field-label" htmlFor="pickup-point-city">
                      Город
                    </label>
                    <input
                      id="pickup-point-city"
                      className="field-input"
                      value={pickupPointForm.city}
                      disabled={isSavingPickupPoint}
                      onChange={(event) => handlePickupPointFieldChange('city', event.target.value)}
                    />
                  </div>

                  <div className="field">
                    <label className="field-label" htmlFor="pickup-point-postal-code">
                      Индекс
                    </label>
                    <input
                      id="pickup-point-postal-code"
                      className="field-input"
                      value={pickupPointForm.postalCode}
                      disabled={isSavingPickupPoint}
                      onChange={(event) => handlePickupPointFieldChange('postalCode', event.target.value)}
                    />
                  </div>

                  <div className="field">
                    <label className="field-label" htmlFor="pickup-point-street">
                      Улица
                    </label>
                    <input
                      id="pickup-point-street"
                      className="field-input"
                      value={pickupPointForm.street}
                      disabled={isSavingPickupPoint}
                      onChange={(event) => handlePickupPointFieldChange('street', event.target.value)}
                    />
                  </div>

                  <div className="field">
                    <label className="field-label" htmlFor="pickup-point-house">
                      Дом
                    </label>
                    <input
                      id="pickup-point-house"
                      className="field-input"
                      value={pickupPointForm.house}
                      disabled={isSavingPickupPoint}
                      onChange={(event) => handlePickupPointFieldChange('house', event.target.value)}
                    />
                  </div>

                  <div className="field">
                    <label className="field-label" htmlFor="pickup-point-apartment">
                      Квартира / офис
                    </label>
                    <input
                      id="pickup-point-apartment"
                      className="field-input"
                      value={pickupPointForm.apartment}
                      disabled={isSavingPickupPoint}
                      onChange={(event) => handlePickupPointFieldChange('apartment', event.target.value)}
                    />
                  </div>

                  <div className="field">
                    <label className="field-label" htmlFor="pickup-point-entrance">
                      Подъезд
                    </label>
                    <input
                      id="pickup-point-entrance"
                      className="field-input"
                      value={pickupPointForm.entrance}
                      disabled={isSavingPickupPoint}
                      onChange={(event) => handlePickupPointFieldChange('entrance', event.target.value)}
                    />
                  </div>

                  <div className="field">
                    <label className="field-label" htmlFor="pickup-point-floor">
                      Этаж
                    </label>
                    <input
                      id="pickup-point-floor"
                      className="field-input"
                      value={pickupPointForm.floor}
                      disabled={isSavingPickupPoint}
                      onChange={(event) => handlePickupPointFieldChange('floor', event.target.value)}
                    />
                  </div>

                  <div className="field">
                    <label className="field-label" htmlFor="pickup-point-intercom">
                      Домофон
                    </label>
                    <input
                      id="pickup-point-intercom"
                      className="field-input"
                      value={pickupPointForm.intercom}
                      disabled={isSavingPickupPoint}
                      onChange={(event) => handlePickupPointFieldChange('intercom', event.target.value)}
                    />
                  </div>

                  <div className="field">
                    <label className="field-label" htmlFor="pickup-point-latitude">
                      Широта
                    </label>
                    <input
                      id="pickup-point-latitude"
                      className="field-input"
                      value={pickupPointForm.latitude}
                      disabled={isSavingPickupPoint}
                      onChange={(event) => handlePickupPointFieldChange('latitude', event.target.value)}
                    />
                  </div>

                  <div className="field">
                    <label className="field-label" htmlFor="pickup-point-longitude">
                      Долгота
                    </label>
                    <input
                      id="pickup-point-longitude"
                      className="field-input"
                      value={pickupPointForm.longitude}
                      disabled={isSavingPickupPoint}
                      onChange={(event) => handlePickupPointFieldChange('longitude', event.target.value)}
                    />
                  </div>
                </div>

                <div className="field">
                  <label className="field-label" htmlFor="pickup-point-comment">
                    Комментарий
                  </label>
                  <textarea
                    id="pickup-point-comment"
                    className="field-input field-textarea"
                    value={pickupPointForm.comment}
                    disabled={isSavingPickupPoint}
                    onChange={(event) => handlePickupPointFieldChange('comment', event.target.value)}
                  />
                </div>

                <div className="delivery-zone-geometry-card">
                  <div className="delivery-zone-header-row">
                    <div className="catalog-card-copy">
                      <h4 className="delivery-subtitle">Точка на карте</h4>
                      <p className="catalog-meta">{getPickupPointCoordinateSummary(pickupPointForm)}</p>
                    </div>

                    <div className="delivery-table-link-group">
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={handlePickupPointOpenMap}
                        disabled={isSavingPickupPoint || deletingPickupPointId !== null || isDetectingPickupPointAddress}
                      >
                        Выбрать на карте
                      </button>

                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => void handlePickupPointDetectAddress()}
                        disabled={isSavingPickupPoint || deletingPickupPointId !== null || isDetectingPickupPointAddress}
                      >
                        {isDetectingPickupPointAddress ? 'Определение адреса...' : 'Определить адрес'}
                      </button>
                    </div>
                  </div>

                  <p className="catalog-meta">
                    Откройте карту, чтобы поставить точку пункта самовывоза кликом или перетащить существующий маркер.
                  </p>

                  {pickupPointDetectError ? (
                    <p className="form-error" role="alert">
                      {pickupPointDetectError}
                    </p>
                  ) : null}

                  {pickupPointDetectSuccess ? (
                    <p className="form-success" role="status">
                      {pickupPointDetectSuccess}
                    </p>
                  ) : null}
                </div>

                <label className="field-checkbox">
                  <input
                    type="checkbox"
                    checked={pickupPointForm.isActive}
                    disabled={isSavingPickupPoint || deletingPickupPointId !== null || isDetectingPickupPointAddress}
                    onChange={(event) => {
                      setPickupPointForm((currentForm) => ({
                        ...currentForm,
                        isActive: event.target.checked,
                      }));
                      setPickupPointDetectError('');
                      setPickupPointDetectSuccess('');
                      setPickupPointSaveError('');
                      setPickupPointSaveSuccess('');
                    }}
                  />
                  <span className="field-label">Показывать пункт самовывоза клиентам</span>
                </label>

                {pickupPointSaveError ? (
                  <p className="form-error" role="alert">
                    {pickupPointSaveError}
                  </p>
                ) : null}

                {pickupPointSaveSuccess ? (
                  <p className="form-success" role="status">
                    {pickupPointSaveSuccess}
                  </p>
                ) : null}

                <div className="delivery-form-actions">
                  <button
                    type="button"
                    className="submit-button"
                    onClick={() => void handlePickupPointSubmit()}
                    disabled={isSavingPickupPoint || deletingPickupPointId !== null || isDetectingPickupPointAddress}
                  >
                    {isSavingPickupPoint ? 'Сохранение...' : pickupPointForm.id ? 'Сохранить пункт' : 'Создать пункт'}
                  </button>

                  <button
                    type="button"
                    className="secondary-button"
                    onClick={handlePickupPointReset}
                    disabled={isSavingPickupPoint || deletingPickupPointId !== null || isDetectingPickupPointAddress}
                  >
                    Сбросить
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
    </main>
  );
}
