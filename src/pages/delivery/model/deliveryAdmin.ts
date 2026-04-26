import type {
  CheckoutPaymentRule,
  DeliveryMethod,
  DeliveryMethodSetting,
  DeliveryTariff,
  DeliveryZone,
  PaymentMethodCode,
  PickupPoint,
} from '@/entities/delivery';
import { getDeliveryZoneGeometrySummary, getDeliveryZoneTypeLabel, mapDeliveryZoneGeometryDtoToDraft } from '@/features/delivery-zone-editor';
import { formatMinorToPriceInput } from '@/shared/lib/money/price';

export const DELIVERY_METHOD_LABELS: Record<DeliveryMethod, string> = {
  PICKUP: 'Самовывоз',
  COURIER: 'Курьер',
  CUSTOM_DELIVERY_ADDRESS: 'Доставка по адресу',
  YANDEX_PICKUP_POINT: 'Пункт выдачи Яндекс',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethodCode, string> = {
  CASH: 'Наличными',
  CARD_ON_DELIVERY: 'Картой при получении',
  CARD_ONLINE: 'Онлайн картой',
  SBP: 'СБП',
};

export const DELIVERY_METHOD_ORDER: DeliveryMethod[] = ['PICKUP', 'COURIER', 'CUSTOM_DELIVERY_ADDRESS', 'YANDEX_PICKUP_POINT'];
export const PAYMENT_METHOD_ORDER: PaymentMethodCode[] = ['CASH', 'CARD_ON_DELIVERY', 'CARD_ONLINE', 'SBP'];
export const DEFAULT_DELIVERY_METHOD: DeliveryMethod = 'COURIER';
export const DEFAULT_CURRENCY = 'RUB';

export type DeliveryTariffFormValues = {
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

export function getDeliveryMethodLabel(method: DeliveryMethod): string {
  return DELIVERY_METHOD_LABELS[method] ?? method;
}

export function getPaymentMethodLabel(method: PaymentMethodCode): string {
  return PAYMENT_METHOD_LABELS[method] ?? method;
}

export function isDeliveryMethod(value: string): value is DeliveryMethod {
  return DELIVERY_METHOD_ORDER.includes(value as DeliveryMethod);
}

export function getDeliveryMethodOrder(method: DeliveryMethod): number {
  const index = DELIVERY_METHOD_ORDER.indexOf(method);

  return index === -1 ? DELIVERY_METHOD_ORDER.length : index;
}

export function normalizeText(value: string): string | null {
  const normalizedValue = value.trim();

  return normalizedValue || null;
}

export function parseRequiredInteger(value: string, label: string): { value: number | null; error: string | null } {
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

export function parseOptionalInteger(value: string, label: string): { value: number | null; error: string | null } {
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

export function parseOptionalFloat(value: string, label: string): { value: number | null; error: string | null } {
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

export function formatNullableText(value: string | null | undefined): string {
  const normalizedValue = value?.trim() ?? '';

  return normalizedValue || '—';
}

export function formatDeliveryEstimate(estimatedDays: number | null | undefined, deliveryMinutes: number | null | undefined): string {
  const parts: string[] = [];

  if (estimatedDays !== null && estimatedDays !== undefined) {
    parts.push(`${estimatedDays} дн.`);
  }

  if (deliveryMinutes !== null && deliveryMinutes !== undefined) {
    parts.push(`${deliveryMinutes} мин.`);
  }

  return parts.length ? parts.join(' • ') : '—';
}

export function mergeDetectedAddressField(nextValue: string | null | undefined, currentValue: string): string {
  const normalizedValue = nextValue?.trim() ?? '';

  return normalizedValue || currentValue;
}

export function formatMoneyMinor(value: number, currency: string): string {
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

export function formatPickupPointAddress(pickupPoint: PickupPoint): string {
  const address = pickupPoint.address;
  const parts = [
    formatNullableText(address.city) !== '—' ? address.city?.trim() : null,
    formatNullableText(address.street) !== '—' ? [address.street?.trim(), address.house?.trim()].filter(Boolean).join(' ') : null,
    formatNullableText(address.apartment) !== '—' ? `кв. ${address.apartment?.trim()}` : null,
    formatNullableText(address.postalCode) !== '—' ? `индекс ${address.postalCode?.trim()}` : null,
  ].filter(Boolean);

  return parts.length ? parts.join(', ') : 'Адрес не заполнен';
}

export function getDeliveryZoneTargetSummary(zone: DeliveryZone): string {
  if (zone.type === 'CITY') {
    return formatNullableText(zone.city);
  }

  if (zone.type === 'POSTAL_CODE') {
    return formatNullableText(zone.postalCode);
  }

  return getDeliveryZoneGeometrySummary(mapDeliveryZoneGeometryDtoToDraft(zone.geometry));
}

export function sortDeliveryMethodSettings(settings: DeliveryMethodSetting[]): DeliveryMethodSetting[] {
  return [...settings].sort(
    (left, right) =>
      left.sortOrder - right.sortOrder ||
      getDeliveryMethodOrder(left.method) - getDeliveryMethodOrder(right.method) ||
      left.title.localeCompare(right.title, 'ru'),
  );
}

export function sortDeliveryZones(zones: DeliveryZone[]): DeliveryZone[] {
  return [...zones].sort(
    (left, right) =>
      Number(right.isActive) - Number(left.isActive) ||
      left.code.localeCompare(right.code, 'ru') ||
      left.name.localeCompare(right.name, 'ru'),
  );
}

export function sortDeliveryTariffs(tariffs: DeliveryTariff[]): DeliveryTariff[] {
  return [...tariffs].sort(
    (left, right) =>
      getDeliveryMethodOrder(left.method) - getDeliveryMethodOrder(right.method) ||
      (left.zoneName ?? '').localeCompare(right.zoneName ?? '', 'ru') ||
      left.fixedPriceMinor - right.fixedPriceMinor,
  );
}

export function sortPickupPoints(pickupPoints: PickupPoint[]): PickupPoint[] {
  return [...pickupPoints].sort(
    (left, right) =>
      Number(right.isActive) - Number(left.isActive) ||
      left.name.localeCompare(right.name, 'ru') ||
      left.code.localeCompare(right.code, 'ru'),
  );
}

export function sortCheckoutPaymentRules(rules: CheckoutPaymentRule[]): CheckoutPaymentRule[] {
  return [...rules].sort(
    (left, right) =>
      getDeliveryMethodOrder(left.deliveryMethod) - getDeliveryMethodOrder(right.deliveryMethod) ||
      left.deliveryMethodName.localeCompare(right.deliveryMethodName, 'ru'),
  );
}

export function upsertItemById<T extends { id: string }>(items: T[], nextItem: T): T[] {
  const existingIndex = items.findIndex((item) => item.id === nextItem.id);

  if (existingIndex === -1) {
    return [...items, nextItem];
  }

  const nextItems = [...items];
  nextItems[existingIndex] = nextItem;

  return nextItems;
}

export function upsertMethodSetting(settings: DeliveryMethodSetting[], nextSetting: DeliveryMethodSetting): DeliveryMethodSetting[] {
  const existingIndex = settings.findIndex((setting) => setting.method === nextSetting.method);

  if (existingIndex === -1) {
    return [...settings, nextSetting];
  }

  const nextSettings = [...settings];
  nextSettings[existingIndex] = nextSetting;

  return nextSettings;
}

export function createEmptyTariffForm(method: DeliveryMethod = DEFAULT_DELIVERY_METHOD): DeliveryTariffFormValues {
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

export function createTariffFormFromTariff(tariff: DeliveryTariff): DeliveryTariffFormValues {
  return {
    id: tariff.id,
    method: tariff.method,
    zoneId: tariff.zoneId ?? '',
    isAvailable: tariff.isAvailable,
    fixedPriceMinor: formatMinorToPriceInput(tariff.fixedPriceMinor),
    freeFromAmountMinor:
      tariff.freeFromAmountMinor === null || tariff.freeFromAmountMinor === undefined
        ? ''
        : formatMinorToPriceInput(tariff.freeFromAmountMinor),
    currency: tariff.currency,
    estimatedDays: tariff.estimatedDays === null || tariff.estimatedDays === undefined ? '' : String(tariff.estimatedDays),
    deliveryMinutes: tariff.deliveryMinutes === null || tariff.deliveryMinutes === undefined ? '' : String(tariff.deliveryMinutes),
  };
}

export function createFallbackMethodSetting(method: DeliveryMethod): DeliveryMethodSetting {
  const requiresPickupPoint = method === 'PICKUP' || method === 'YANDEX_PICKUP_POINT';
  const requiresAddress = method === 'COURIER' || method === 'CUSTOM_DELIVERY_ADDRESS';

  return {
    method,
    title: getDeliveryMethodLabel(method),
    description: null,
    isActive: true,
    requiresAddress,
    requiresPickupPoint,
    sortOrder: getDeliveryMethodOrder(method),
  };
}

export function getPaymentRuleSummary(rule: CheckoutPaymentRule | null | undefined): string {
  if (!rule) {
    return 'Правила оплаты не настроены';
  }

  if (rule.isDynamic) {
    return 'Правила оплаты вычисляются автоматически';
  }

  if (!rule.paymentMethods.length) {
    return 'Нет доступных способов оплаты';
  }

  return rule.paymentMethods.map(getPaymentMethodLabel).join(', ');
}

export function getDeliveryMethodKindLabel(setting: DeliveryMethodSetting): string {
  if (setting.requiresPickupPoint) {
    return 'Пункт выдачи';
  }

  if (setting.requiresAddress) {
    return 'Адресная доставка';
  }

  return 'Без привязки к адресу';
}

export function getDeliveryZoneTypeSummary(zone: DeliveryZone): string {
  return `${getDeliveryZoneTypeLabel(zone.type)} • ${getDeliveryZoneTargetSummary(zone)}`;
}
