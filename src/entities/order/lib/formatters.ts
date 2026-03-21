import type {
  Order,
  OrderDeliveryAddress,
  OrderDeliveryMethod,
  OrderItem,
  OrderItemUnit,
  OrderPayment,
  OrderStatus,
} from '@/entities/order/model/types';

const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: 'Новый',
  CONFIRMED: 'Подтвержден',
  CANCELLED: 'Отменен',
  COMPLETED: 'Выполнен',
};

const DELIVERY_TYPE_LABELS: Record<OrderDeliveryMethod, string> = {
  PICKUP: 'Самовывоз',
  COURIER: 'Курьер',
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

export function getOrderStatusLabel(status: OrderStatus): string {
  return ORDER_STATUS_LABELS[status] ?? status;
}

export function getOrderStatusTone(status: OrderStatus): 'pending' | 'success' | 'danger' | 'neutral' {
  if (status === 'PENDING') {
    return 'pending';
  }

  if (status === 'CONFIRMED') {
    return 'success';
  }

  if (status === 'CANCELLED') {
    return 'danger';
  }

  return 'neutral';
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
