import { getAccessToken } from '@/entities/session';
import type {
  CreateOrderStatusTransitionPayload,
  OrderStatusDefinition,
  OrderStatusTransition,
  UpsertOrderStatusPayload,
} from '@/entities/order-status/model/types';
import { type ApiError, apiClient } from '@/shared/api/client';
import { getApiErrorMessage } from '@/shared/api/error';

type GetOrderStatusesOptions = {
  includeInactive?: boolean;
};

type GetOrderStatusTransitionsOptions = {
  statusId?: string;
};

export type OrderStatusesResult = {
  statuses: OrderStatusDefinition[];
  error: string | null;
};

export type OrderStatusResult = {
  status: OrderStatusDefinition | null;
  error: string | null;
};

export type SaveOrderStatusResult = {
  status: OrderStatusDefinition | null;
  error: string | null;
};

export type OrderStatusTransitionsResult = {
  transitions: OrderStatusTransition[];
  error: string | null;
};

export type SaveOrderStatusTransitionResult = {
  transition: OrderStatusTransition | null;
  error: string | null;
};

export type DeleteOrderStatusTransitionResult = {
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

export async function getOrderStatuses(options: GetOrderStatusesOptions = {}): Promise<OrderStatusesResult> {
  try {
    const result = await apiClient.GET('/api/v1/admin/order-statuses', {
      headers: buildAuthHeaders(),
      params: options.includeInactive === undefined ? undefined : { query: { includeInactive: options.includeInactive } },
    });

    if (result.error) {
      return {
        statuses: [],
        error: getProtectedErrorMessage(result.error, 'Не удалось загрузить справочник статусов заказов.'),
      };
    }

    return {
      statuses: result.data ?? [],
      error: result.data ? null : 'Сервис статусов заказов вернул некорректный ответ.',
    };
  } catch {
    return {
      statuses: [],
      error: 'Не удалось связаться с сервисом статусов заказов.',
    };
  }
}

export async function getOrderStatus(statusId: string): Promise<OrderStatusResult> {
  try {
    const result = await apiClient.GET('/api/v1/admin/order-statuses/{statusId}', {
      headers: buildAuthHeaders(),
      params: {
        path: {
          statusId,
        },
      },
    });

    if (result.error) {
      return {
        status: null,
        error: getProtectedErrorMessage(result.error, 'Не удалось загрузить статус заказа.'),
      };
    }

    return {
      status: result.data ?? null,
      error: result.data ? null : 'Сервис статусов заказов вернул некорректный ответ.',
    };
  } catch {
    return {
      status: null,
      error: 'Не удалось связаться с сервисом статусов заказов.',
    };
  }
}

export async function saveOrderStatus(payload: UpsertOrderStatusPayload): Promise<SaveOrderStatusResult> {
  const statusId = payload.id?.trim() ?? '';

  if (statusId) {
    return updateOrderStatusDefinition(statusId, payload);
  }

  return createOrderStatus(payload);
}

export async function createOrderStatus(payload: UpsertOrderStatusPayload): Promise<SaveOrderStatusResult> {
  try {
    const result = await apiClient.POST('/api/v1/admin/order-statuses', {
      headers: buildAuthHeaders(),
      body: payload,
    });

    if (result.error) {
      return {
        status: null,
        error: getProtectedErrorMessage(result.error, 'Не удалось создать статус заказа.'),
      };
    }

    return {
      status: result.data ?? null,
      error: result.data ? null : 'Сервис сохранения статуса заказа вернул некорректный ответ.',
    };
  } catch {
    return {
      status: null,
      error: 'Не удалось связаться с сервисом сохранения статуса заказа.',
    };
  }
}

export async function updateOrderStatusDefinition(
  statusId: string,
  payload: UpsertOrderStatusPayload,
): Promise<SaveOrderStatusResult> {
  try {
    const result = await apiClient.PUT('/api/v1/admin/order-statuses/{statusId}', {
      headers: buildAuthHeaders(),
      body: payload,
      params: {
        path: {
          statusId,
        },
      },
    });

    if (result.error) {
      return {
        status: null,
        error: getProtectedErrorMessage(result.error, 'Не удалось обновить статус заказа.'),
      };
    }

    return {
      status: result.data ?? null,
      error: result.data ? null : 'Сервис обновления статуса заказа вернул некорректный ответ.',
    };
  } catch {
    return {
      status: null,
      error: 'Не удалось связаться с сервисом обновления статуса заказа.',
    };
  }
}

export async function deactivateOrderStatusDefinition(statusId: string): Promise<SaveOrderStatusResult> {
  try {
    const result = await apiClient.DELETE('/api/v1/admin/order-statuses/{statusId}', {
      headers: buildAuthHeaders(),
      params: {
        path: {
          statusId,
        },
      },
    });

    if (result.error) {
      return {
        status: null,
        error: getProtectedErrorMessage(result.error, 'Не удалось деактивировать статус заказа.'),
      };
    }

    return {
      status: result.data ?? null,
      error: result.data ? null : 'Сервис деактивации статуса заказа вернул некорректный ответ.',
    };
  } catch {
    return {
      status: null,
      error: 'Не удалось связаться с сервисом деактивации статуса заказа.',
    };
  }
}

export async function getOrderStatusTransitions(
  options: GetOrderStatusTransitionsOptions = {},
): Promise<OrderStatusTransitionsResult> {
  try {
    const result = await apiClient.GET('/api/v1/admin/order-status-transitions', {
      headers: buildAuthHeaders(),
      params: options.statusId ? { query: { statusId: options.statusId } } : undefined,
    });

    if (result.error) {
      return {
        transitions: [],
        error: getProtectedErrorMessage(result.error, 'Не удалось загрузить переходы статусов заказов.'),
      };
    }

    return {
      transitions: result.data ?? [],
      error: result.data ? null : 'Сервис переходов статусов заказов вернул некорректный ответ.',
    };
  } catch {
    return {
      transitions: [],
      error: 'Не удалось связаться с сервисом переходов статусов заказов.',
    };
  }
}

export async function createOrderStatusTransition(
  payload: CreateOrderStatusTransitionPayload,
): Promise<SaveOrderStatusTransitionResult> {
  try {
    const result = await apiClient.POST('/api/v1/admin/order-status-transitions', {
      headers: buildAuthHeaders(),
      body: payload,
    });

    if (result.error) {
      return {
        transition: null,
        error: getProtectedErrorMessage(result.error, 'Не удалось создать переход статуса заказа.'),
      };
    }

    return {
      transition: result.data ?? null,
      error: result.data ? null : 'Сервис сохранения перехода статуса вернул некорректный ответ.',
    };
  } catch {
    return {
      transition: null,
      error: 'Не удалось связаться с сервисом сохранения перехода статуса заказа.',
    };
  }
}

export async function deleteOrderStatusTransition(transitionId: string): Promise<DeleteOrderStatusTransitionResult> {
  try {
    const result = await apiClient.DELETE('/api/v1/admin/order-status-transitions/{transitionId}', {
      headers: buildAuthHeaders(),
      params: {
        path: {
          transitionId,
        },
      },
    });

    if (result.error) {
      return {
        error: getProtectedErrorMessage(result.error, 'Не удалось удалить переход статуса заказа.'),
      };
    }

    return {
      error: null,
    };
  } catch {
    return {
      error: 'Не удалось связаться с сервисом удаления перехода статуса заказа.',
    };
  }
}
