import { getAccessToken } from '@/entities/session';
import type {
  Order,
  OrderDeliveryAddress,
  OrderStatusHistoryEntry,
  OrderStatusTransition,
} from '@/entities/order/model/types';
import { type ApiError, apiClient } from '@/shared/api/client';
import { getApiErrorMessage } from '@/shared/api/error';
import type { components, operations } from '@/shared/api/schema';

type OrderResponse = components['schemas']['OrderResponse'];
type AdminOrderListItemResponse = components['schemas']['AdminOrderListItemResponse'];
type AdminOrderListMetaResponse = components['schemas']['AdminOrderListMetaResponse'];

type ChangeOrderStatusRequest = {
  orderId: string;
  statusId?: string | null;
  statusCode?: string | null;
  comment?: string | null;
};

type UpdateOrderStatusRequestBody = operations['changeOrderStatus']['requestBody']['content']['application/json'];
export type GetAdminOrdersParams = operations['getAdminOrders']['parameters']['query'];

export type OrderListResult = {
  orders: Order[];
  meta: AdminOrderListMetaResponse | null;
  error: string | null;
};

export type OrderResult = {
  order: Order | null;
  error: string | null;
};

export type UpdateOrderStatusResult = {
  order: Order | null;
  error: string | null;
};

export type OrderStatusTransitionsResult = {
  transitions: OrderStatusTransition[];
  error: string | null;
};

export type OrderStatusHistoryResult = {
  history: OrderStatusHistoryEntry[];
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

function mapOrderItem(item: OrderResponse['items'][number]): Order['items'][number] {
  return {
    id: item.id,
    productId: item.productId,
    variantId: item.variantId ?? null,
    sku: item.sku ?? null,
    title: item.title,
    imageUrl: item.imageUrl ?? null,
    unit: item.unit,
    quantity: item.quantity,
    priceMinor: item.priceMinor,
    totalMinor: item.totalMinor,
  };
}

function mapDeliveryAddress(address: OrderResponse['delivery']['address']): OrderDeliveryAddress | null {
  if (!address) {
    return null;
  }

  return {
    country: address.country ?? null,
    region: address.region ?? null,
    city: address.city ?? null,
    street: address.street ?? null,
    house: address.house ?? null,
    apartment: address.apartment ?? null,
    postalCode: address.postalCode ?? null,
    entrance: address.entrance ?? null,
    floor: address.floor ?? null,
    intercom: address.intercom ?? null,
    comment: address.comment ?? null,
    latitude: address.latitude ?? null,
    longitude: address.longitude ?? null,
  };
}

function mapAdminOrderListAddress(address: AdminOrderListItemResponse['delivery']['address']): OrderDeliveryAddress | null {
  if (!address) {
    return null;
  }

  return {
    country: address.country ?? null,
    region: address.region ?? null,
    city: address.city ?? null,
    street: address.street ?? null,
    house: address.house ?? null,
    apartment: address.apartment ?? null,
    postalCode: address.postalCode ?? null,
    entrance: address.entrance ?? null,
    floor: address.floor ?? null,
    intercom: address.intercom ?? null,
    comment: null,
    latitude: null,
    longitude: null,
  };
}

function mapOrder(order: OrderResponse): Order {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    customerType: order.customerType,
    userId: order.userId ?? null,
    guestInstallId: order.guestInstallId ?? null,
    customerName: order.customerName ?? null,
    customerPhone: order.customerPhone ?? null,
    customerEmail: order.customerEmail ?? null,
    statusCode: order.status,
    statusName: order.statusName,
    stateType: order.stateType,
    status: order.currentStatus,
    payment: order.payment
      ? {
          code: order.payment.code,
          name: order.payment.name,
        }
      : null,
    deliveryMethod: order.deliveryMethod,
    delivery: {
      method: order.delivery.method,
      methodName: order.delivery.methodName,
      priceMinor: order.delivery.priceMinor,
      currency: order.delivery.currency,
      zoneCode: order.delivery.zoneCode ?? null,
      zoneName: order.delivery.zoneName ?? null,
      estimatedDays: order.delivery.estimatedDays ?? null,
      deliveryMinutes: order.delivery.estimatesMinutes ?? null,
      pickupPointId: order.delivery.pickupPointId ?? null,
      pickupPointExternalId: order.delivery.pickupPointExternalId ?? null,
      pickupPointName: order.delivery.pickupPointName ?? null,
      pickupPointAddress: order.delivery.pickupPointAddress ?? null,
      address: mapDeliveryAddress(order.delivery.address),
    },
    comment: order.comment ?? null,
    items: order.items.map(mapOrderItem),
    statusHistory: order.statusHistory.map((entry) => ({
      code: entry.code,
      name: entry.name,
      timestamp: entry.timestamp,
    })),
    subtotalMinor: order.subtotalMinor,
    deliveryFeeMinor: order.deliveryFeeMinor,
    totalMinor: order.totalMinor,
    statusChangedAt: order.statusChangedAt,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

function mapAdminOrderListItem(order: AdminOrderListItemResponse): Order {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    customerType: order.customerType,
    userId: null,
    guestInstallId: null,
    customerName: order.customerName ?? null,
    customerPhone: order.customerPhone ?? null,
    customerEmail: order.customerEmail ?? null,
    statusCode: order.currentStatus.code,
    statusName: order.currentStatus.name,
    stateType: order.currentStatus.stateType,
    status: {
      id: order.currentStatus.id,
      code: order.currentStatus.code,
      name: order.currentStatus.name,
      stateType: order.currentStatus.stateType,
      color: null,
      icon: null,
      isFinal: order.currentStatus.isFinal,
      isCancellable: false,
      visibleToCustomer: false,
    },
    payment: order.payment
      ? {
          code: order.payment.code,
          name: order.payment.name,
        }
      : null,
    deliveryMethod: order.deliveryMethod,
    delivery: {
      method: order.delivery.method,
      methodName: order.delivery.methodName,
      priceMinor: order.deliveryFeeMinor,
      currency: 'RUB',
      zoneCode: null,
      zoneName: null,
      estimatedDays: null,
      deliveryMinutes: null,
      pickupPointId: null,
      pickupPointExternalId: null,
      pickupPointName: order.delivery.pickupPointName ?? null,
      pickupPointAddress: order.delivery.pickupPointAddress ?? null,
      address: mapAdminOrderListAddress(order.delivery.address),
    },
    comment: null,
    items: [],
    statusHistory: [],
    subtotalMinor: order.subtotalMinor,
    deliveryFeeMinor: order.deliveryFeeMinor,
    totalMinor: order.totalMinor,
    statusChangedAt: order.statusChangedAt,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

export async function getAdminOrders(params?: GetAdminOrdersParams): Promise<OrderListResult> {
  try {
    const result = await apiClient.GET('/api/v1/admin/orders', {
      headers: buildAuthHeaders(),
      params: params ? { query: params } : undefined,
    });

    if (result.error) {
      return {
        orders: [],
        meta: null,
        error: getProtectedErrorMessage(result.error, 'Не удалось загрузить список заказов.'),
      };
    }

    if (!result.data) {
      return {
        orders: [],
        meta: null,
        error: 'Сервис заказов вернул некорректный ответ.',
      };
    }

    return {
      orders: result.data.items.map(mapAdminOrderListItem),
      meta: result.data.meta,
      error: null,
    };
  } catch {
    return {
      orders: [],
      meta: null,
      error: 'Не удалось связаться с сервисом заказов.',
    };
  }
}

export async function searchAdminOrderByNumber(orderNumber: string): Promise<OrderResult> {
  const normalizedOrderNumber = orderNumber.trim();

  if (!normalizedOrderNumber) {
    return {
      order: null,
      error: 'Введите номер заказа для поиска.',
    };
  }

  try {
    const result = await apiClient.GET('/api/v1/admin/orders/search', {
      headers: buildAuthHeaders(),
      params: {
        query: {
          orderNumber: normalizedOrderNumber,
        },
      },
    });

    if (result.error) {
      if (result.error.code === 'NOT_FOUND') {
        return {
          order: null,
          error: 'Заказ с таким номером не найден.',
        };
      }

      return {
        order: null,
        error: getProtectedErrorMessage(result.error, 'Не удалось выполнить поиск заказа.'),
      };
    }

    if (!result.data) {
      return {
        order: null,
        error: 'Сервис поиска заказов вернул некорректный ответ.',
      };
    }

    return {
      order: mapOrder(result.data),
      error: null,
    };
  } catch {
    return {
      order: null,
      error: 'Не удалось связаться с сервисом поиска заказов.',
    };
  }
}

export async function getOrderById(orderId: string): Promise<OrderResult> {
  const normalizedOrderId = orderId.trim();

  if (!normalizedOrderId) {
    return {
      order: null,
      error: 'Некорректный идентификатор заказа.',
    };
  }

  try {
    const result = await apiClient.GET('/api/v1/admin/orders/{orderId}', {
      headers: buildAuthHeaders(),
      params: {
        path: {
          orderId: normalizedOrderId,
        },
      },
    });

    if (result.error) {
      return {
        order: null,
        error: getProtectedErrorMessage(result.error, 'Не удалось загрузить детали заказа.'),
      };
    }

    if (!result.data) {
      return {
        order: null,
        error: 'Сервис деталей заказа вернул некорректный ответ.',
      };
    }

    return {
      order: mapOrder(result.data),
      error: null,
    };
  } catch {
    return {
      order: null,
      error: 'Не удалось связаться с сервисом деталей заказа.',
    };
  }
}

export async function getAvailableOrderStatusTransitions(orderId: string): Promise<OrderStatusTransitionsResult> {
  try {
    const result = await apiClient.GET('/api/v1/admin/orders/{orderId}/available-status-transitions', {
      headers: buildAuthHeaders(),
      params: {
        path: {
          orderId,
        },
      },
    });

    if (result.error) {
      return {
        transitions: [],
        error: getProtectedErrorMessage(result.error, 'Не удалось загрузить доступные переходы статусов заказа.'),
      };
    }

    return {
      transitions: result.data ?? [],
      error: result.data ? null : 'Сервис переходов статусов заказа вернул некорректный ответ.',
    };
  } catch {
    return {
      transitions: [],
      error: 'Не удалось связаться с сервисом переходов статусов заказа.',
    };
  }
}

export async function getOrderStatusHistory(orderId: string): Promise<OrderStatusHistoryResult> {
  try {
    const result = await apiClient.GET('/api/v1/admin/orders/{orderId}/status-history', {
      headers: buildAuthHeaders(),
      params: {
        path: {
          orderId,
        },
      },
    });

    if (result.error) {
      return {
        history: [],
        error: getProtectedErrorMessage(result.error, 'Не удалось загрузить историю статусов заказа.'),
      };
    }

    return {
      history: result.data ?? [],
      error: result.data ? null : 'Сервис истории статусов заказа вернул некорректный ответ.',
    };
  } catch {
    return {
      history: [],
      error: 'Не удалось связаться с сервисом истории статусов заказа.',
    };
  }
}

export async function changeOrderStatus({
  orderId,
  statusId,
  statusCode,
  comment,
}: ChangeOrderStatusRequest): Promise<UpdateOrderStatusResult> {
  const nextStatusId = statusId?.trim() ?? '';
  const nextStatusCode = statusCode?.trim() ?? '';

  if (!nextStatusId && !nextStatusCode) {
    return {
      order: null,
      error: 'Не указан целевой статус заказа.',
    };
  }

  const body: UpdateOrderStatusRequestBody = {};

  if (nextStatusId) {
    body.statusId = nextStatusId;
  } else if (nextStatusCode) {
    body.statusCode = nextStatusCode;
  }

  const normalizedComment = comment?.trim() ?? '';

  if (normalizedComment) {
    body.comment = normalizedComment;
  }

  try {
    const result = await apiClient.POST('/api/v1/admin/orders/{orderId}/status', {
      headers: buildAuthHeaders(),
      params: {
        path: {
          orderId,
        },
      },
      body,
    });

    if (result.error) {
      return {
        order: null,
        error: getProtectedErrorMessage(result.error, 'Не удалось изменить статус заказа.'),
      };
    }

    if (!result.data) {
      return {
        order: null,
        error: 'Сервис изменения статуса вернул некорректный ответ.',
      };
    }

    return {
      order: mapOrder(result.data),
      error: null,
    };
  } catch {
    return {
      order: null,
      error: 'Не удалось связаться с сервисом изменения статуса заказа.',
    };
  }
}

export const updateOrderStatus = changeOrderStatus;
