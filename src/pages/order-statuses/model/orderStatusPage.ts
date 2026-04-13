import { getOrderStateTypeLabel, getOrderStatusTone } from '@/entities/order';
import type {
  OrderStateType,
  OrderStatusDefinition,
  OrderStatusTransition,
  UserRole,
} from '@/entities/order-status';

export const ORDER_STATE_TYPE_OPTIONS: OrderStateType[] = [
  'CREATED',
  'AWAITING_CONFIRMATION',
  'CONFIRMED',
  'PREPARING',
  'READY_FOR_PICKUP',
  'OUT_FOR_DELIVERY',
  'COMPLETED',
  'CANCELED',
  'ON_HOLD',
];

export const USER_ROLE_OPTIONS: UserRole[] = ['CUSTOMER', 'WHOLESALE', 'MANAGER', 'ADMIN'];

export type OrderStatusFormValues = {
  id: string;
  code: string;
  name: string;
  description: string;
  stateType: OrderStateType;
  color: string;
  icon: string;
  isInitial: boolean;
  isFinal: boolean;
  isCancellable: boolean;
  isActive: boolean;
  visibleToCustomer: boolean;
  notifyCustomer: boolean;
  notifyStaff: boolean;
  sortOrder: string;
};

export type TransitionFormValues = {
  toStatusId: string;
  requiredRole: '' | UserRole;
  guardCode: string;
  isAutomatic: boolean;
  isActive: boolean;
};

export function createEmptyOrderStatusForm(): OrderStatusFormValues {
  return {
    id: '',
    code: '',
    name: '',
    description: '',
    stateType: 'CREATED',
    color: '',
    icon: '',
    isInitial: false,
    isFinal: false,
    isCancellable: false,
    isActive: true,
    visibleToCustomer: true,
    notifyCustomer: false,
    notifyStaff: true,
    sortOrder: '0',
  };
}

export function buildOrderStatusForm(status: OrderStatusDefinition): OrderStatusFormValues {
  return {
    id: status.id,
    code: status.code,
    name: status.name,
    description: status.description ?? '',
    stateType: status.stateType,
    color: status.color ?? '',
    icon: status.icon ?? '',
    isInitial: status.isInitial,
    isFinal: status.isFinal,
    isCancellable: status.isCancellable,
    isActive: status.isActive,
    visibleToCustomer: status.visibleToCustomer,
    notifyCustomer: status.notifyCustomer,
    notifyStaff: status.notifyStaff,
    sortOrder: String(status.sortOrder),
  };
}

export function createEmptyTransitionForm(): TransitionFormValues {
  return {
    toStatusId: '',
    requiredRole: '',
    guardCode: '',
    isAutomatic: false,
    isActive: true,
  };
}

export function sortStatuses(statuses: OrderStatusDefinition[]): OrderStatusDefinition[] {
  return [...statuses].sort(
    (left, right) =>
      Number(right.isActive) - Number(left.isActive) ||
      left.sortOrder - right.sortOrder ||
      left.name.localeCompare(right.name, 'ru') ||
      left.code.localeCompare(right.code, 'ru'),
  );
}

export function sortTransitions(transitions: OrderStatusTransition[]): OrderStatusTransition[] {
  return [...transitions].sort(
    (left, right) =>
      Number(right.isActive) - Number(left.isActive) ||
      Number(left.isAutomatic) - Number(right.isAutomatic) ||
      left.toStatus.name.localeCompare(right.toStatus.name, 'ru'),
  );
}

function normalizeSearchText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

export function matchesOrderStatusSearch(status: OrderStatusDefinition, searchQuery: string): boolean {
  const normalizedQuery = normalizeSearchText(searchQuery);

  if (!normalizedQuery) {
    return true;
  }

  const searchText = normalizeSearchText(
    [
      status.code,
      status.name,
      status.description ?? '',
      getOrderStateTypeLabel(status.stateType),
      status.isInitial ? 'начальный' : '',
      status.isFinal ? 'финальный' : '',
      status.isCancellable ? 'отмена' : '',
      status.isActive ? 'активный' : 'неактивный',
    ].join(' '),
  );

  return searchText.includes(normalizedQuery);
}

export function filterOrderStatuses(
  statuses: OrderStatusDefinition[],
  {
    includeInactive,
    searchQuery,
  }: {
    includeInactive: boolean;
    searchQuery: string;
  },
): OrderStatusDefinition[] {
  return sortStatuses(
    statuses.filter((status) => {
      if (!includeInactive && !status.isActive) {
        return false;
      }

      return matchesOrderStatusSearch(status, searchQuery);
    }),
  );
}

export function normalizeNullableText(value: string): string | null {
  const normalizedValue = value.trim();

  return normalizedValue || null;
}

export function parseOptionalInteger(value: string, label: string): { value: number | undefined; error: string | null } {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return {
      value: undefined,
      error: null,
    };
  }

  const parsedValue = Number(normalizedValue);

  if (!Number.isInteger(parsedValue)) {
    return {
      value: undefined,
      error: `Поле «${label}» должно быть целым числом.`,
    };
  }

  return {
    value: parsedValue,
    error: null,
  };
}

export function getOrderStatusBadgeClassName(status: Pick<OrderStatusDefinition, 'stateType' | 'isFinal'> | null | undefined): string {
  const tone = getOrderStatusTone(status);

  if (tone === 'success') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }

  if (tone === 'danger') {
    return 'border-rose-200 bg-rose-50 text-rose-700';
  }

  if (tone === 'pending') {
    return 'border-amber-200 bg-amber-50 text-amber-700';
  }

  return 'border-border bg-muted/40 text-muted-foreground';
}
