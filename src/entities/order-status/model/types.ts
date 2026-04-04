import type { components } from '@/shared/api/schema';

export type OrderStateType = components['schemas']['OrderStateType'];
export type UserRole = components['schemas']['UserRole'];
export type OrderStatusSummary = components['schemas']['OrderStatusSummaryResponse'];
export type OrderStatusDefinition = components['schemas']['OrderStatusResponse'];
export type UpsertOrderStatusPayload = components['schemas']['UpsertOrderStatusRequest'];
export type OrderStatusTransition = components['schemas']['OrderStatusTransitionResponse'];
export type CreateOrderStatusTransitionPayload = components['schemas']['CreateOrderStatusTransitionRequest'];
