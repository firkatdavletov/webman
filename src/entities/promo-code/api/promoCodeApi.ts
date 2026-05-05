import { getAccessToken } from '@/entities/session';
import { type ApiError, apiClient } from '@/shared/api/client';
import { getApiErrorMessage } from '@/shared/api/error';
import type { PromoCode, PromoCodeDiscountType, UpsertPromoCodePayload } from '../model/types';

type GetPromoCodesOptions = {
  active?: boolean;
  discountType?: PromoCodeDiscountType;
  code?: string;
  validAt?: string;
};

export type PromoCodesResult = {
  promoCodes: PromoCode[];
  error: string | null;
};

export type PromoCodeResult = {
  promoCode: PromoCode | null;
  error: string | null;
};

export type SavePromoCodeResult = {
  promoCode: PromoCode | null;
  error: string | null;
};

export type DeletePromoCodeResult = {
  error: string | null;
};

function buildAuthHeaders(): HeadersInit | undefined {
  const accessToken = getAccessToken();

  if (!accessToken) {
    return undefined;
  }

  return {
    Authorization: `Bearer ${accessToken}`,
  };
}

function getProtectedErrorMessage(error: ApiError | undefined, fallbackMessage: string): string {
  if (error?.code === 'UNAUTHORIZED') {
    return 'Нужно войти заново, чтобы выполнить действие.';
  }

  if (error?.code === 'FORBIDDEN') {
    return 'Недостаточно прав для выполнения действия.';
  }

  return getApiErrorMessage(error, fallbackMessage);
}

function buildGetPromoCodesQuery(options: GetPromoCodesOptions): {
  active?: boolean;
  discountType?: PromoCodeDiscountType;
  code?: string;
  validAt?: string;
} | undefined {
  const normalizedCode = options.code?.trim();
  const normalizedValidAt = options.validAt?.trim();

  const query = {
    active: options.active,
    discountType: options.discountType,
    code: normalizedCode || undefined,
    validAt: normalizedValidAt || undefined,
  };

  if (
    query.active === undefined &&
    query.discountType === undefined &&
    query.code === undefined &&
    query.validAt === undefined
  ) {
    return undefined;
  }

  return query;
}

export async function getPromoCodes(options: GetPromoCodesOptions = {}): Promise<PromoCodesResult> {
  try {
    const query = buildGetPromoCodesQuery(options);
    const result = await apiClient.GET('/api/v1/admin/promo-codes', {
      headers: buildAuthHeaders(),
      params: query ? { query } : undefined,
    });

    if (result.error) {
      return {
        promoCodes: [],
        error: getProtectedErrorMessage(result.error, 'Не удалось загрузить промокоды.'),
      };
    }

    if (!result.data) {
      return {
        promoCodes: [],
        error: 'Сервис промокодов вернул некорректный ответ.',
      };
    }

    return {
      promoCodes: result.data,
      error: null,
    };
  } catch {
    return {
      promoCodes: [],
      error: 'Не удалось связаться с сервисом промокодов.',
    };
  }
}

export async function getPromoCodeById(promoCodeId: string): Promise<PromoCodeResult> {
  try {
    const result = await apiClient.GET('/api/v1/admin/promo-codes/{promoCodeId}', {
      headers: buildAuthHeaders(),
      params: {
        path: {
          promoCodeId,
        },
      },
    });

    if (result.error) {
      return {
        promoCode: null,
        error: getProtectedErrorMessage(result.error, 'Не удалось загрузить промокод.'),
      };
    }

    if (!result.data) {
      return {
        promoCode: null,
        error: 'Сервис промокодов вернул некорректный ответ.',
      };
    }

    return {
      promoCode: result.data,
      error: null,
    };
  } catch {
    return {
      promoCode: null,
      error: 'Не удалось связаться с сервисом промокодов.',
    };
  }
}

export async function searchPromoCodeByCode(code: string): Promise<PromoCodeResult> {
  const normalizedCode = code.trim();

  if (!normalizedCode) {
    return {
      promoCode: null,
      error: 'Укажите код промокода для поиска.',
    };
  }

  try {
    const result = await apiClient.GET('/api/v1/admin/promo-codes/search', {
      headers: buildAuthHeaders(),
      params: {
        query: {
          code: normalizedCode,
        },
      },
    });

    if (result.error) {
      return {
        promoCode: null,
        error: getProtectedErrorMessage(result.error, 'Не удалось найти промокод.'),
      };
    }

    if (!result.data) {
      return {
        promoCode: null,
        error: 'Сервис промокодов вернул некорректный ответ.',
      };
    }

    return {
      promoCode: result.data,
      error: null,
    };
  } catch {
    return {
      promoCode: null,
      error: 'Не удалось связаться с сервисом промокодов.',
    };
  }
}

export async function createPromoCode(payload: UpsertPromoCodePayload): Promise<SavePromoCodeResult> {
  try {
    const result = await apiClient.POST('/api/v1/admin/promo-codes', {
      headers: buildAuthHeaders(),
      body: payload,
    });

    if (result.error) {
      return {
        promoCode: null,
        error: getProtectedErrorMessage(result.error, 'Не удалось создать промокод.'),
      };
    }

    if (!result.data) {
      return {
        promoCode: null,
        error: 'Сервис промокодов вернул некорректный ответ.',
      };
    }

    return {
      promoCode: result.data,
      error: null,
    };
  } catch {
    return {
      promoCode: null,
      error: 'Не удалось связаться с сервисом промокодов.',
    };
  }
}

export async function updatePromoCode(
  promoCodeId: string,
  payload: UpsertPromoCodePayload,
): Promise<SavePromoCodeResult> {
  try {
    const result = await apiClient.PUT('/api/v1/admin/promo-codes/{promoCodeId}', {
      headers: buildAuthHeaders(),
      params: {
        path: {
          promoCodeId,
        },
      },
      body: payload,
    });

    if (result.error) {
      return {
        promoCode: null,
        error: getProtectedErrorMessage(result.error, 'Не удалось обновить промокод.'),
      };
    }

    if (!result.data) {
      return {
        promoCode: null,
        error: 'Сервис промокодов вернул некорректный ответ.',
      };
    }

    return {
      promoCode: result.data,
      error: null,
    };
  } catch {
    return {
      promoCode: null,
      error: 'Не удалось связаться с сервисом промокодов.',
    };
  }
}

export async function deletePromoCode(promoCodeId: string): Promise<DeletePromoCodeResult> {
  try {
    const result = await apiClient.DELETE('/api/v1/admin/promo-codes/{promoCodeId}', {
      headers: buildAuthHeaders(),
      params: {
        path: {
          promoCodeId,
        },
      },
    });

    if (result.error) {
      return {
        error: getProtectedErrorMessage(result.error, 'Не удалось удалить промокод.'),
      };
    }

    return {
      error: null,
    };
  } catch {
    return {
      error: 'Не удалось связаться с сервисом промокодов.',
    };
  }
}
