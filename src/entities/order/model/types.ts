import type { components } from '@/shared/api/schema';

export type OrderStatus = components['schemas']['OrderStatus'];
export type OrderDeliveryType = components['schemas']['OrderDeliveryType'];
export type OrderCustomerType = components['schemas']['OrderCustomerType'];
export type OrderItemUnit = components['schemas']['ProductUnit'];

export type OrderItem = {
  id: string;
  productId: string;
  title: string;
  unit: OrderItemUnit;
  quantity: number;
  priceMinor: number;
  totalMinor: number;
};

export type Order = {
  id: string;
  orderNumber: string;
  customerType: OrderCustomerType;
  userId: string | null;
  guestInstallId: string | null;
  customerName: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  status: OrderStatus;
  deliveryType: OrderDeliveryType;
  deliveryAddress: string | null;
  comment: string | null;
  items: OrderItem[];
  subtotalMinor: number;
  deliveryFeeMinor: number;
  totalMinor: number;
  createdAt: string;
  updatedAt: string;
};
