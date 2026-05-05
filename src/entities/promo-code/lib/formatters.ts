import type { PromoCodeDiscountType } from '@/entities/promo-code/model/types';

const PROMO_CODE_DISCOUNT_TYPE_LABELS: Record<PromoCodeDiscountType, string> = {
  FIXED: 'Фиксированная',
  PERCENT: 'Процентная',
};

export function getPromoCodeDiscountTypeLabel(discountType: PromoCodeDiscountType): string {
  return PROMO_CODE_DISCOUNT_TYPE_LABELS[discountType] ?? discountType;
}

export function formatPromoCodeDateTime(value: string | null | undefined): string {
  if (!value) {
    return '—';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function formatPromoCodeMoneyMinor(value: number | null | undefined, currency: string | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '—';
  }

  const normalizedCurrency = currency?.trim().toUpperCase() || 'RUB';

  try {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: normalizedCurrency,
      maximumFractionDigits: 2,
    }).format(value / 100);
  } catch {
    return `${(value / 100).toLocaleString('ru-RU')} ${normalizedCurrency}`;
  }
}

export function formatPromoCodeDiscountValue(
  discountType: PromoCodeDiscountType,
  discountValue: number,
  currency: string | null | undefined,
): string {
  if (discountType === 'FIXED') {
    return formatPromoCodeMoneyMinor(discountValue, currency);
  }

  return `${discountValue}%`;
}
