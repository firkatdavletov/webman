import type { Order, OrderDeliveryType, OrderItem, OrderItemUnit, OrderStatus } from '@/entities/order/model/types';

const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: 'Новый',
  CONFIRMED: 'Подтвержден',
  CANCELLED: 'Отменен',
  COMPLETED: 'Выполнен',
};

const DELIVERY_TYPE_LABELS: Record<OrderDeliveryType, string> = {
  PICKUP: 'Самовывоз',
  DELIVERY: 'Доставка',
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

export function getDeliveryTypeLabel(deliveryType: OrderDeliveryType): string {
  return DELIVERY_TYPE_LABELS[deliveryType] ?? deliveryType;
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

export function getPaymentStatusPlaceholderLabel(): string {
  return 'Нет данных в API';
}

export function getPaymentMethodPlaceholderLabel(): string {
  return 'Не поддерживается API';
}
