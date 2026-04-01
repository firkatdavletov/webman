import type { components } from '@/shared/api/schema';

export type DeliveryMethod = components['schemas']['DeliveryMethodType'];
export type PaymentMethodCode = components['schemas']['PaymentMethodCode'];

export type DeliveryMethodSetting = components['schemas']['DeliveryMethodSettingResponse'];
export type UpsertDeliveryMethodSettingPayload = components['schemas']['UpsertDeliveryMethodSettingRequest'];

export type DeliveryZone = components['schemas']['DeliveryZoneResponse'];
export type DeliveryZoneType = components['schemas']['DeliveryZoneType'];
export type DeliveryZoneGeometry = components['schemas']['DeliveryZoneGeometry'];
export type UpsertDeliveryZonePayload = components['schemas']['UpsertDeliveryZoneRequest'];

export type DeliveryTariff = components['schemas']['DeliveryTariffResponse'];
export type UpsertDeliveryTariffPayload = components['schemas']['UpsertDeliveryTariffRequest'];

export type DeliveryAddress = components['schemas']['DeliveryAddressResponse'];
export type PickupPoint = components['schemas']['AdminPickupPointResponse'];
export type UpsertPickupPointPayload = components['schemas']['UpsertPickupPointRequest'];

export type CheckoutPaymentRule = components['schemas']['CheckoutPaymentRuleResponse'];
export type ReplaceCheckoutPaymentRulesPayload = components['schemas']['ReplaceCheckoutPaymentRulesRequest'];
export type UpsertCheckoutPaymentRulePayload = components['schemas']['UpsertCheckoutPaymentRuleRequest'];
