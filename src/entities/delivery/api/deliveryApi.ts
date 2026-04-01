import { getAccessToken } from '@/entities/session';
import { type ApiError, apiClient } from '@/shared/api/client';
import { getApiErrorMessage } from '@/shared/api/error';
import type {
  CheckoutPaymentRule,
  DeliveryAddress,
  DeliveryMethodSetting,
  DeliveryTariff,
  DeliveryZone,
  DetectPickupPointAddressPayload,
  PickupPoint,
  UpsertCheckoutPaymentRulePayload,
  UpsertDeliveryMethodSettingPayload,
  UpsertDeliveryTariffPayload,
  UpsertDeliveryZonePayload,
  UpsertPickupPointPayload,
} from '@/entities/delivery/model/types';

type GetListOptions = {
  isActive?: boolean;
};

export type DeliveryMethodSettingsResult = {
  settings: DeliveryMethodSetting[];
  error: string | null;
};

export type SaveDeliveryMethodSettingResult = {
  setting: DeliveryMethodSetting | null;
  error: string | null;
};

export type DeliveryZonesResult = {
  zones: DeliveryZone[];
  error: string | null;
};

export type SaveDeliveryZoneResult = {
  zone: DeliveryZone | null;
  error: string | null;
};

export type DeliveryTariffsResult = {
  tariffs: DeliveryTariff[];
  error: string | null;
};

export type SaveDeliveryTariffResult = {
  tariff: DeliveryTariff | null;
  error: string | null;
};

export type PickupPointsResult = {
  pickupPoints: PickupPoint[];
  error: string | null;
};

export type SavePickupPointResult = {
  pickupPoint: PickupPoint | null;
  error: string | null;
};

export type DetectPickupPointAddressResult = {
  address: DeliveryAddress | null;
  error: string | null;
};

export type CheckoutPaymentRulesResult = {
  rules: CheckoutPaymentRule[];
  error: string | null;
};

export type ReplaceCheckoutPaymentRulesResult = {
  rules: CheckoutPaymentRule[];
  error: string | null;
};

export type DeleteDeliveryEntityResult = {
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

export async function getDeliveryMethodSettings(): Promise<DeliveryMethodSettingsResult> {
  try {
    const result = await apiClient.GET('/api/v1/admin/delivery/methods', {
      headers: buildAuthHeaders(),
    });

    if (result.error) {
      return {
        settings: [],
        error: getProtectedErrorMessage(result.error, 'Не удалось загрузить способы доставки.'),
      };
    }

    return {
      settings: result.data ?? [],
      error: result.data ? null : 'Сервис способов доставки вернул некорректный ответ.',
    };
  } catch {
    return {
      settings: [],
      error: 'Не удалось связаться с сервисом способов доставки.',
    };
  }
}

export async function saveDeliveryMethodSetting(
  payload: UpsertDeliveryMethodSettingPayload,
): Promise<SaveDeliveryMethodSettingResult> {
  try {
    const result = await apiClient.POST('/api/v1/admin/delivery/methods', {
      headers: buildAuthHeaders(),
      body: payload,
    });

    if (result.error) {
      return {
        setting: null,
        error: getProtectedErrorMessage(result.error, 'Не удалось сохранить настройки способа доставки.'),
      };
    }

    return {
      setting: result.data ?? null,
      error: result.data ? null : 'Сервис сохранения способа доставки вернул некорректный ответ.',
    };
  } catch {
    return {
      setting: null,
      error: 'Не удалось связаться с сервисом сохранения способа доставки.',
    };
  }
}

export async function getDeliveryZones(options: GetListOptions = {}): Promise<DeliveryZonesResult> {
  try {
    const result = await apiClient.GET('/api/v1/admin/delivery/zones', {
      headers: buildAuthHeaders(),
      params: options.isActive === undefined ? undefined : { query: { isActive: options.isActive } },
    });

    if (result.error) {
      return {
        zones: [],
        error: getProtectedErrorMessage(result.error, 'Не удалось загрузить зоны доставки.'),
      };
    }

    return {
      zones: result.data ?? [],
      error: result.data ? null : 'Сервис зон доставки вернул некорректный ответ.',
    };
  } catch {
    return {
      zones: [],
      error: 'Не удалось связаться с сервисом зон доставки.',
    };
  }
}

export async function saveDeliveryZone(payload: UpsertDeliveryZonePayload): Promise<SaveDeliveryZoneResult> {
  const zoneId = payload.id?.trim() ?? '';

  if (zoneId) {
    return updateDeliveryZone(zoneId, payload);
  }

  return createDeliveryZone(payload);
}

export async function getDeliveryZoneById(zoneId: string): Promise<SaveDeliveryZoneResult> {
  try {
    const result = await apiClient.GET('/api/v1/admin/delivery/zones/{zoneId}', {
      headers: buildAuthHeaders(),
      params: {
        path: {
          zoneId,
        },
      },
    });

    if (result.error) {
      return {
        zone: null,
        error: getProtectedErrorMessage(result.error, 'Не удалось загрузить зону доставки.'),
      };
    }

    return {
      zone: result.data ?? null,
      error: result.data ? null : 'Сервис зон доставки вернул некорректный ответ.',
    };
  } catch {
    return {
      zone: null,
      error: 'Не удалось связаться с сервисом зон доставки.',
    };
  }
}

export async function createDeliveryZone(payload: UpsertDeliveryZonePayload): Promise<SaveDeliveryZoneResult> {
  try {
    const result = await apiClient.POST('/api/v1/admin/delivery/zones', {
      headers: buildAuthHeaders(),
      body: payload,
    });

    if (result.error) {
      return {
        zone: null,
        error: getProtectedErrorMessage(result.error, 'Не удалось сохранить зону доставки.'),
      };
    }

    return {
      zone: result.data ?? null,
      error: result.data ? null : 'Сервис сохранения зоны доставки вернул некорректный ответ.',
    };
  } catch {
    return {
      zone: null,
      error: 'Не удалось связаться с сервисом сохранения зоны доставки.',
    };
  }
}

export async function updateDeliveryZone(
  zoneId: string,
  payload: UpsertDeliveryZonePayload,
): Promise<SaveDeliveryZoneResult> {
  try {
    const result = await apiClient.PUT('/api/v1/admin/delivery/zones/{zoneId}', {
      headers: buildAuthHeaders(),
      body: payload,
      params: {
        path: {
          zoneId,
        },
      },
    });

    if (result.error) {
      return {
        zone: null,
        error: getProtectedErrorMessage(result.error, 'Не удалось обновить зону доставки.'),
      };
    }

    return {
      zone: result.data ?? null,
      error: result.data ? null : 'Сервис зон доставки вернул некорректный ответ.',
    };
  } catch {
    return {
      zone: null,
      error: 'Не удалось связаться с сервисом обновления зоны доставки.',
    };
  }
}

export async function deleteDeliveryZone(zoneId: string): Promise<DeleteDeliveryEntityResult> {
  try {
    const result = await apiClient.DELETE('/api/v1/admin/delivery/zones/{zoneId}', {
      headers: buildAuthHeaders(),
      params: {
        path: {
          zoneId,
        },
      },
    });

    if (result.error) {
      return {
        error: getProtectedErrorMessage(result.error, 'Не удалось удалить зону доставки.'),
      };
    }

    return {
      error: null,
    };
  } catch {
    return {
      error: 'Не удалось связаться с сервисом удаления зоны доставки.',
    };
  }
}

export async function getDeliveryTariffs(): Promise<DeliveryTariffsResult> {
  try {
    const result = await apiClient.GET('/api/v1/admin/delivery/tariffs', {
      headers: buildAuthHeaders(),
    });

    if (result.error) {
      return {
        tariffs: [],
        error: getProtectedErrorMessage(result.error, 'Не удалось загрузить тарифы доставки.'),
      };
    }

    return {
      tariffs: result.data ?? [],
      error: result.data ? null : 'Сервис тарифов доставки вернул некорректный ответ.',
    };
  } catch {
    return {
      tariffs: [],
      error: 'Не удалось связаться с сервисом тарифов доставки.',
    };
  }
}

export async function saveDeliveryTariff(payload: UpsertDeliveryTariffPayload): Promise<SaveDeliveryTariffResult> {
  try {
    const result = await apiClient.POST('/api/v1/admin/delivery/tariffs', {
      headers: buildAuthHeaders(),
      body: payload,
    });

    if (result.error) {
      return {
        tariff: null,
        error: getProtectedErrorMessage(result.error, 'Не удалось сохранить тариф доставки.'),
      };
    }

    return {
      tariff: result.data ?? null,
      error: result.data ? null : 'Сервис сохранения тарифа доставки вернул некорректный ответ.',
    };
  } catch {
    return {
      tariff: null,
      error: 'Не удалось связаться с сервисом сохранения тарифа доставки.',
    };
  }
}

export async function deleteDeliveryTariff(tariffId: string): Promise<DeleteDeliveryEntityResult> {
  try {
    const result = await apiClient.DELETE('/api/v1/admin/delivery/tariffs/{tariffId}', {
      headers: buildAuthHeaders(),
      params: {
        path: {
          tariffId,
        },
      },
    });

    if (result.error) {
      return {
        error: getProtectedErrorMessage(result.error, 'Не удалось удалить тариф доставки.'),
      };
    }

    return {
      error: null,
    };
  } catch {
    return {
      error: 'Не удалось связаться с сервисом удаления тарифа доставки.',
    };
  }
}

export async function getPickupPoints(options: GetListOptions = {}): Promise<PickupPointsResult> {
  try {
    const result = await apiClient.GET('/api/v1/admin/delivery/pickup-points', {
      headers: buildAuthHeaders(),
      params: options.isActive === undefined ? undefined : { query: { isActive: options.isActive } },
    });

    if (result.error) {
      return {
        pickupPoints: [],
        error: getProtectedErrorMessage(result.error, 'Не удалось загрузить пункты самовывоза.'),
      };
    }

    return {
      pickupPoints: result.data ?? [],
      error: result.data ? null : 'Сервис пунктов самовывоза вернул некорректный ответ.',
    };
  } catch {
    return {
      pickupPoints: [],
      error: 'Не удалось связаться с сервисом пунктов самовывоза.',
    };
  }
}

export async function savePickupPoint(payload: UpsertPickupPointPayload): Promise<SavePickupPointResult> {
  try {
    const result = await apiClient.POST('/api/v1/admin/delivery/pickup-points', {
      headers: buildAuthHeaders(),
      body: payload,
    });

    if (result.error) {
      return {
        pickupPoint: null,
        error: getProtectedErrorMessage(result.error, 'Не удалось сохранить пункт самовывоза.'),
      };
    }

    return {
      pickupPoint: result.data ?? null,
      error: result.data ? null : 'Сервис сохранения пункта самовывоза вернул некорректный ответ.',
    };
  } catch {
    return {
      pickupPoint: null,
      error: 'Не удалось связаться с сервисом сохранения пункта самовывоза.',
    };
  }
}

export async function detectPickupPointAddress(
  payload: DetectPickupPointAddressPayload,
): Promise<DetectPickupPointAddressResult> {
  try {
    const result = await apiClient.POST('/api/v1/admin/delivery/pickup-points/address-detect', {
      headers: buildAuthHeaders(),
      body: payload,
    });

    if (result.error) {
      return {
        address: null,
        error: getProtectedErrorMessage(result.error, 'Не удалось определить адрес пункта самовывоза по координатам.'),
      };
    }

    if (!result.data) {
      return {
        address: null,
        error: 'Сервис определения адреса пункта самовывоза вернул некорректный ответ.',
      };
    }

    return {
      address: result.data.address ?? null,
      error: null,
    };
  } catch {
    return {
      address: null,
      error: 'Не удалось связаться с сервисом определения адреса пункта самовывоза.',
    };
  }
}

export async function deletePickupPoint(pickupPointId: string): Promise<DeleteDeliveryEntityResult> {
  try {
    const result = await apiClient.DELETE('/api/v1/admin/delivery/pickup-points/{pickupPointId}', {
      headers: buildAuthHeaders(),
      params: {
        path: {
          pickupPointId,
        },
      },
    });

    if (result.error) {
      return {
        error: getProtectedErrorMessage(result.error, 'Не удалось удалить пункт самовывоза.'),
      };
    }

    return {
      error: null,
    };
  } catch {
    return {
      error: 'Не удалось связаться с сервисом удаления пункта самовывоза.',
    };
  }
}

export async function getCheckoutPaymentRules(): Promise<CheckoutPaymentRulesResult> {
  try {
    const result = await apiClient.GET('/api/v1/admin/delivery/payment-rules', {
      headers: buildAuthHeaders(),
    });

    if (result.error) {
      return {
        rules: [],
        error: getProtectedErrorMessage(result.error, 'Не удалось загрузить правила оплаты для доставки.'),
      };
    }

    return {
      rules: result.data ?? [],
      error: result.data ? null : 'Сервис правил оплаты вернул некорректный ответ.',
    };
  } catch {
    return {
      rules: [],
      error: 'Не удалось связаться с сервисом правил оплаты.',
    };
  }
}

export async function replaceCheckoutPaymentRules(
  rules: UpsertCheckoutPaymentRulePayload[],
): Promise<ReplaceCheckoutPaymentRulesResult> {
  try {
    const result = await apiClient.POST('/api/v1/admin/delivery/payment-rules/bulk', {
      headers: buildAuthHeaders(),
      body: {
        rules,
      },
    });

    if (result.error) {
      return {
        rules: [],
        error: getProtectedErrorMessage(result.error, 'Не удалось сохранить правила оплаты для доставки.'),
      };
    }

    return {
      rules: result.data ?? [],
      error: result.data ? null : 'Сервис сохранения правил оплаты вернул некорректный ответ.',
    };
  } catch {
    return {
      rules: [],
      error: 'Не удалось связаться с сервисом сохранения правил оплаты.',
    };
  }
}
