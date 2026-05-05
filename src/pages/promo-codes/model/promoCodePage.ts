import type { PromoCode, PromoCodeDiscountType, UpsertPromoCodePayload } from '@/entities/promo-code';
import { formatMinorToPriceInput, parseOptionalPriceInputToMinor, parsePriceInputToMinor } from '@/shared/lib/money/price';

export type PromoCodeFormValues = {
  code: string;
  discountType: PromoCodeDiscountType;
  discountValue: string;
  minOrderAmountMinor: string;
  maxDiscountMinor: string;
  currency: string;
  startsAt: string;
  endsAt: string;
  usageLimitTotal: string;
  usageLimitPerUser: string;
  active: boolean;
};

export type PromoCodeActivityFilter = 'all' | 'active' | 'inactive';

export const PROMO_CODE_DISCOUNT_TYPE_OPTIONS: { value: PromoCodeDiscountType; label: string }[] = [
  { value: 'PERCENT', label: 'Процентная' },
  { value: 'FIXED', label: 'Фиксированная' },
];

export const PROMO_CODE_ACTIVITY_OPTIONS: { value: PromoCodeActivityFilter; label: string }[] = [
  { value: 'all', label: 'Все' },
  { value: 'active', label: 'Активные' },
  { value: 'inactive', label: 'Неактивные' },
];

export const EMPTY_PROMO_CODE_FORM_VALUES: PromoCodeFormValues = {
  code: '',
  discountType: 'PERCENT',
  discountValue: '',
  minOrderAmountMinor: '',
  maxDiscountMinor: '',
  currency: 'RUB',
  startsAt: '',
  endsAt: '',
  usageLimitTotal: '',
  usageLimitPerUser: '',
  active: true,
};

function formatDateTimeLocal(isoDate: string | null | undefined): string {
  if (!isoDate) {
    return '';
  }

  const date = new Date(isoDate);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const pad = (value: number) => String(value).padStart(2, '0');

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function buildPromoCodeFormValues(promoCode: PromoCode): PromoCodeFormValues {
  return {
    code: promoCode.code,
    discountType: promoCode.discountType,
    discountValue:
      promoCode.discountType === 'FIXED' ? formatMinorToPriceInput(promoCode.discountValue) : String(promoCode.discountValue),
    minOrderAmountMinor: formatMinorToPriceInput(promoCode.minOrderAmountMinor),
    maxDiscountMinor: formatMinorToPriceInput(promoCode.maxDiscountMinor),
    currency: promoCode.currency ?? 'RUB',
    startsAt: formatDateTimeLocal(promoCode.startsAt),
    endsAt: formatDateTimeLocal(promoCode.endsAt),
    usageLimitTotal: promoCode.usageLimitTotal === null || promoCode.usageLimitTotal === undefined ? '' : String(promoCode.usageLimitTotal),
    usageLimitPerUser:
      promoCode.usageLimitPerUser === null || promoCode.usageLimitPerUser === undefined ? '' : String(promoCode.usageLimitPerUser),
    active: promoCode.active,
  };
}

function parseOptionalPositiveInteger(
  rawValue: string,
  fieldLabel: string,
): { value: number | null; error: string | null } {
  const normalizedValue = rawValue.trim();

  if (!normalizedValue) {
    return {
      value: null,
      error: null,
    };
  }

  const parsedValue = Number(normalizedValue);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    return {
      value: null,
      error: `Поле «${fieldLabel}» должно быть целым числом больше нуля.`,
    };
  }

  return {
    value: parsedValue,
    error: null,
  };
}

function parseOptionalDateTime(
  rawValue: string,
  fieldLabel: string,
): { value: string | null; timestamp: number | null; error: string | null } {
  const normalizedValue = rawValue.trim();

  if (!normalizedValue) {
    return {
      value: null,
      timestamp: null,
      error: null,
    };
  }

  const parsedDate = new Date(normalizedValue);

  if (Number.isNaN(parsedDate.getTime())) {
    return {
      value: null,
      timestamp: null,
      error: `Поле «${fieldLabel}» содержит некорректную дату.`,
    };
  }

  return {
    value: parsedDate.toISOString(),
    timestamp: parsedDate.getTime(),
    error: null,
  };
}

export function buildPromoCodePayload(values: PromoCodeFormValues): {
  payload: UpsertPromoCodePayload | null;
  error: string | null;
} {
  const code = values.code.trim().toUpperCase();

  if (!code) {
    return {
      payload: null,
      error: 'Укажите код промокода.',
    };
  }

  let discountValue = 0;

  if (values.discountType === 'FIXED') {
    const parsedFixedDiscount = parsePriceInputToMinor(values.discountValue);

    if (parsedFixedDiscount === null || parsedFixedDiscount <= 0) {
      return {
        payload: null,
        error: 'Укажите корректную фиксированную скидку в формате цены.',
      };
    }

    discountValue = parsedFixedDiscount;
  } else {
    const normalizedDiscountValue = values.discountValue.trim().replace(',', '.');

    if (!normalizedDiscountValue) {
      return {
        payload: null,
        error: 'Укажите размер скидки в процентах.',
      };
    }

    const parsedPercentDiscount = Number(normalizedDiscountValue);

    if (!Number.isInteger(parsedPercentDiscount) || parsedPercentDiscount <= 0 || parsedPercentDiscount > 100) {
      return {
        payload: null,
        error: 'Размер процентной скидки должен быть целым числом от 1 до 100.',
      };
    }

    discountValue = parsedPercentDiscount;
  }

  const parsedMinOrderAmountMinor = parseOptionalPriceInputToMinor(values.minOrderAmountMinor);

  if (parsedMinOrderAmountMinor === undefined) {
    return {
      payload: null,
      error: 'Поле «Минимальная сумма заказа» заполнено некорректно.',
    };
  }

  const parsedMaxDiscountMinor = parseOptionalPriceInputToMinor(values.maxDiscountMinor);

  if (parsedMaxDiscountMinor === undefined) {
    return {
      payload: null,
      error: 'Поле «Максимальная сумма скидки» заполнено некорректно.',
    };
  }

  const parsedUsageLimitTotal = parseOptionalPositiveInteger(values.usageLimitTotal, 'Лимит использований');

  if (parsedUsageLimitTotal.error) {
    return {
      payload: null,
      error: parsedUsageLimitTotal.error,
    };
  }

  const parsedUsageLimitPerUser = parseOptionalPositiveInteger(values.usageLimitPerUser, 'Лимит на пользователя');

  if (parsedUsageLimitPerUser.error) {
    return {
      payload: null,
      error: parsedUsageLimitPerUser.error,
    };
  }

  const parsedStartsAt = parseOptionalDateTime(values.startsAt, 'Дата начала');

  if (parsedStartsAt.error) {
    return {
      payload: null,
      error: parsedStartsAt.error,
    };
  }

  const parsedEndsAt = parseOptionalDateTime(values.endsAt, 'Дата окончания');

  if (parsedEndsAt.error) {
    return {
      payload: null,
      error: parsedEndsAt.error,
    };
  }

  if (
    parsedStartsAt.timestamp !== null &&
    parsedEndsAt.timestamp !== null &&
    parsedEndsAt.timestamp < parsedStartsAt.timestamp
  ) {
    return {
      payload: null,
      error: 'Дата окончания не может быть раньше даты начала.',
    };
  }

  const currency = values.currency.trim().toUpperCase() || null;

  if (
    !currency &&
    (values.discountType === 'FIXED' || parsedMinOrderAmountMinor !== null || parsedMaxDiscountMinor !== null)
  ) {
    return {
      payload: null,
      error: 'Укажите валюту для денежных лимитов и фиксированной скидки.',
    };
  }

  return {
    payload: {
      code,
      discountType: values.discountType,
      discountValue,
      minOrderAmountMinor: parsedMinOrderAmountMinor,
      maxDiscountMinor: parsedMaxDiscountMinor,
      currency,
      startsAt: parsedStartsAt.value,
      endsAt: parsedEndsAt.value,
      usageLimitTotal: parsedUsageLimitTotal.value,
      usageLimitPerUser: parsedUsageLimitPerUser.value,
      active: values.active,
    },
    error: null,
  };
}

export function sortPromoCodes(promoCodes: PromoCode[]): PromoCode[] {
  return [...promoCodes].sort((left, right) => {
    const activityCompare = Number(right.active) - Number(left.active);

    if (activityCompare !== 0) {
      return activityCompare;
    }

    const updatedAtCompare = new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();

    if (updatedAtCompare !== 0) {
      return Number.isNaN(updatedAtCompare) ? 0 : updatedAtCompare;
    }

    return left.code.localeCompare(right.code, 'ru');
  });
}

export function resolvePromoCodeActivityFilter(activityFilter: PromoCodeActivityFilter): boolean | undefined {
  if (activityFilter === 'active') {
    return true;
  }

  if (activityFilter === 'inactive') {
    return false;
  }

  return undefined;
}
