import { getAccessToken } from '@/entities/session';
import type { Order, OrderDeliveryAddress, OrderStatus } from '@/entities/order/model/types';
import { type ApiError, apiClient } from '@/shared/api/client';
import { getApiErrorMessage } from '@/shared/api/error';
import type { components } from '@/shared/api/schema';

type OrderResponse = components['schemas']['OrderResponse'];

type UpdateOrderStatusRequest = {
  orderId: string;
  status: OrderStatus;
};

export type OrderListResult = {
  orders: Order[];
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
    status: order.status,
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
    subtotalMinor: order.subtotalMinor,
    deliveryFeeMinor: order.deliveryFeeMinor,
    totalMinor: order.totalMinor,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

export async function getAdminOrders(): Promise<OrderListResult> {
  try {
    const result = await apiClient.GET('/api/v1/admin/orders', {
      headers: buildAuthHeaders(),
    });

    if (result.error) {
      return {
        orders: [],
        error: getProtectedErrorMessage(result.error, 'Не удалось загрузить список заказов.'),
      };
    }

    if (!result.data) {
      return {
        orders: [],
        error: 'Сервис заказов вернул некорректный ответ.',
      };
    }

    return {
      orders: result.data.map(mapOrder),
      error: null,
    };
  } catch {
    return {
      orders: [],
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

  const result = await getAdminOrders();

  if (result.error) {
    return {
      order: null,
      error: result.error,
    };
  }

  const matchedOrder = result.orders.find((order) => order.id === normalizedOrderId) ?? null;

  if (!matchedOrder) {
    return {
      order: null,
      error: 'Заказ не найден в очереди админки.',
    };
  }

  return {
    order: matchedOrder,
    error: null,
  };
}

export async function updateOrderStatus({ orderId, status }: UpdateOrderStatusRequest): Promise<UpdateOrderStatusResult> {
  try {
    const result = await apiClient.PATCH('/api/v1/admin/orders/{orderId}/status', {
      headers: buildAuthHeaders(),
      params: {
        path: {
          orderId,
        },
      },
      body: {
        status,
      },
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
