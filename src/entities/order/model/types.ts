import type { components } from '@/shared/api/schema';

export type OrderStateType = components['schemas']['OrderStateType'];
export type OrderStatusChangeSourceType = components['schemas']['OrderStatusChangeSourceType'];
export type UserRole = components['schemas']['UserRole'];
export type OrderStatus = components['schemas']['OrderStatusSummaryResponse'];
export type OrderStatusCode = OrderStatus['code'];
export type OrderStatusDefinition = components['schemas']['OrderStatusResponse'];
export type OrderStatusTransition = components['schemas']['OrderStatusTransitionResponse'];
export type OrderStatusHistoryEntry = components['schemas']['OrderStatusHistoryResponse'];
export type OrderDeliveryMethod = components['schemas']['DeliveryMethodType'];
export type OrderCustomerType = components['schemas']['OrderCustomerType'];
export type OrderItemUnit = components['schemas']['ProductUnit'];
export type OrderPaymentMethodCode = components['schemas']['PaymentMethodCode'];

export type OrderPayment = {
  code: OrderPaymentMethodCode;
  name: string;
};

export type OrderDeliveryAddress = {
  country: string | null;
  region: string | null;
  city: string | null;
  street: string | null;
  house: string | null;
  apartment: string | null;
  postalCode: string | null;
  entrance: string | null;
  floor: string | null;
  intercom: string | null;
  comment: string | null;
  latitude: number | null;
  longitude: number | null;
};

export type OrderDelivery = {
  method: OrderDeliveryMethod;
  methodName: string;
  priceMinor: number;
  currency: string;
  zoneCode: string | null;
  zoneName: string | null;
  estimatedDays: number | null;
  deliveryMinutes: number | null;
  pickupPointId: string | null;
  pickupPointExternalId: string | null;
  pickupPointName: string | null;
  pickupPointAddress: string | null;
  address: OrderDeliveryAddress | null;
};

export type OrderItem = {
  id: string;
  productId: string;
  variantId: string | null;
  sku: string | null;
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
  statusCode: OrderStatusCode;
  statusName: string;
  stateType: OrderStateType;
  status: OrderStatus;
  payment: OrderPayment | null;
  deliveryMethod: OrderDeliveryMethod;
  delivery: OrderDelivery;
  comment: string | null;
  items: OrderItem[];
  subtotalMinor: number;
  deliveryFeeMinor: number;
  totalMinor: number;
  statusChangedAt: string;
  createdAt: string;
  updatedAt: string;
};
