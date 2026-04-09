import type {
  Order,
  OrderDeliveryAddress,
  OrderDeliveryMethod,
  OrderItem,
  OrderItemUnit,
  OrderPayment,
  OrderStateType,
  OrderStatus,
  OrderStatusChangeSourceType,
  UserRole,
} from '@/entities/order/model/types';

const ORDER_STATE_TYPE_LABELS: Record<OrderStateType, string> = {
  CREATED: 'Создан',
  AWAITING_CONFIRMATION: 'Ожидает подтверждения',
  CONFIRMED: 'Подтвержден',
  PREPARING: 'Готовится',
  READY_FOR_PICKUP: 'Готов к выдаче',
  OUT_FOR_DELIVERY: 'Передан в доставку',
  COMPLETED: 'Завершен',
  CANCELED: 'Отменен',
  ON_HOLD: 'На паузе',
};

const ORDER_STATUS_CHANGE_SOURCE_LABELS: Record<OrderStatusChangeSourceType, string> = {
  SYSTEM: 'Система',
  ADMIN: 'Администратор',
  CUSTOMER: 'Клиент',
};

const USER_ROLE_LABELS: Record<UserRole, string> = {
  CUSTOMER: 'Клиент',
  WHOLESALE: 'Опт',
  MANAGER: 'Менеджер',
  ADMIN: 'Администратор',
};

const DELIVERY_TYPE_LABELS: Record<OrderDeliveryMethod, string> = {
  PICKUP: 'Самовывоз',
  COURIER: 'Курьер',
  CUSTOM_DELIVERY_ADDRESS: 'Доставка по адресу',
  YANDEX_PICKUP_POINT: 'Пункт выдачи Яндекс',
};

const UNIT_LABELS: Record<OrderItemUnit, string> = {
  PIECE: 'шт',
  KILOGRAM: 'кг',
  GRAM: 'г',
  LITER: 'л',
  MILLILITER: 'мл',
};

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const MONEY_FORMATTER = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function getOrderStatusLabel(status: Pick<OrderStatus, 'name' | 'code'> | string | null | undefined): string {
  if (typeof status === 'string') {
    return status;
  }

  return compactText(status?.name) ?? compactText(status?.code) ?? 'Не указан';
}

export function getOrderStateTypeLabel(stateType: OrderStateType): string {
  return ORDER_STATE_TYPE_LABELS[stateType] ?? stateType;
}

export function getOrderStatusTone(
  status: Pick<OrderStatus, 'stateType' | 'isFinal'> | null | undefined,
): 'pending' | 'success' | 'danger' | 'neutral' {
  if (!status) {
    return 'neutral';
  }

  if (status.stateType === 'CANCELED') {
    return 'danger';
  }

  if (
    status.stateType === 'CONFIRMED' ||
    status.stateType === 'PREPARING' ||
    status.stateType === 'READY_FOR_PICKUP' ||
    status.stateType === 'OUT_FOR_DELIVERY' ||
    status.stateType === 'COMPLETED'
  ) {
    return 'success';
  }

  if (
    status.stateType === 'CREATED' ||
    status.stateType === 'AWAITING_CONFIRMATION' ||
    status.stateType === 'ON_HOLD'
  ) {
    return 'pending';
  }

  return status.isFinal ? 'neutral' : 'pending';
}

export function getOrderStatusChangeSourceTypeLabel(sourceType: OrderStatusChangeSourceType): string {
  return ORDER_STATUS_CHANGE_SOURCE_LABELS[sourceType] ?? sourceType;
}

export function getUserRoleLabel(role: UserRole): string {
  return USER_ROLE_LABELS[role] ?? role;
}

function compactText(value: string | null | undefined): string | null {
  const normalizedValue = value?.trim() ?? '';

  return normalizedValue || null;
}

export function getDeliveryTypeLabel(deliveryMethod: OrderDeliveryMethod): string {
  return DELIVERY_TYPE_LABELS[deliveryMethod] ?? deliveryMethod;
}

export function getCustomerLabel(order: Order): string {
  if (order.customerName?.trim()) {
    return order.customerName.trim();
  }

  if (order.customerPhone?.trim()) {
    return order.customerPhone.trim();
  }

  if (order.customerEmail?.trim()) {
    return order.customerEmail.trim();
  }

  return order.customerType === 'GUEST' ? 'Гостевой заказ' : 'Пользователь';
}

export function formatOrderDateTime(value: string): string {
  const timestamp = Date.parse(value);

  if (Number.isNaN(timestamp)) {
    return 'Неизвестно';
  }

  return DATE_TIME_FORMATTER.format(new Date(timestamp));
}

export function formatMoneyMinor(value: number): string {
  return MONEY_FORMATTER.format(value / 100);
}

export function formatOrderItemsSummary(items: OrderItem[]): string {
  if (!items.length) {
    return 'Без товаров';
  }

  if (items.length === 1) {
    return items[0].title;
  }

  return `${items[0].title} и еще ${items.length - 1}`;
}

export function formatOrderItemQuantity(item: OrderItem): string {
  const unit = UNIT_LABELS[item.unit] ?? item.unit;

  return `${item.quantity} ${unit}`;
}

export function getPaymentMethodLabel(payment: OrderPayment | null | undefined): string {
  return compactText(payment?.name) ?? 'Не указан';
}

export function formatOrderDeliveryAddress(address: OrderDeliveryAddress | null | undefined): string {
  if (!address) {
    return '';
  }

  const localityParts = [compactText(address.country), compactText(address.region), compactText(address.city)].filter(Boolean);
  const streetParts = [compactText(address.street), compactText(address.house)].filter(Boolean);
  const extraParts = [
    compactText(address.apartment) ? `кв. ${compactText(address.apartment)}` : null,
    compactText(address.entrance) ? `подъезд ${compactText(address.entrance)}` : null,
    compactText(address.floor) ? `этаж ${compactText(address.floor)}` : null,
    compactText(address.intercom) ? `домофон ${compactText(address.intercom)}` : null,
    compactText(address.postalCode) ? `индекс ${compactText(address.postalCode)}` : null,
  ].filter(Boolean);

  return [...localityParts, streetParts.join(' '), ...extraParts].filter(Boolean).join(', ');
}

export function formatOrderDeliveryDestination(order: Order): string {
  const pickupParts = [compactText(order.delivery.pickupPointName), compactText(order.delivery.pickupPointAddress)].filter(Boolean);

  if (pickupParts.length) {
    return pickupParts.join(' • ');
  }

  const formattedAddress = formatOrderDeliveryAddress(order.delivery.address);

  return formattedAddress || 'Не указано';
}

export function getPaymentStatusPlaceholderLabel(): string {
  return 'Статус недоступен в API';
}
