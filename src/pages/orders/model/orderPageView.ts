import {
  formatMoneyMinor,
  formatOrderDateTime,
  type GetAdminOrdersParams,
  getCustomerLabel,
  getDeliveryTypeLabel,
  getOrderStatusLabel,
  getPaymentMethodLabel,
  type Order,
  type OrderDeliveryMethod,
  type OrderStatusCode,
} from '@/entities/order';

export const ORDER_PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

export type OrderDateRangeFilter = 'all' | 'today' | '3d' | '7d' | '30d';
export type OrdersDensity = 'compact' | 'comfortable';
export type OrdersSortDirection = 'asc' | 'desc';
export type OrdersScopeViewId = 'all' | 'new' | 'in-work' | 'problematic';
export type OrdersSortKey =
  | 'orderNumber'
  | 'createdAt'
  | 'customer'
  | 'totalMinor'
  | 'payment'
  | 'delivery'
  | 'status'
  | 'source'
  | 'manager'
  | 'tags';
type ServerSortableOrdersKey = Exclude<OrdersSortKey, 'tags'>;
export type OrdersColumnId =
  | 'number'
  | 'date'
  | 'client'
  | 'amount'
  | 'payment'
  | 'delivery'
  | 'status'
  | 'source'
  | 'manager'
  | 'tags';

export type OrderFilters = {
  searchQuery: string;
  statusFilter: 'all' | OrderStatusCode;
  deliveryFilter: 'all' | OrderDeliveryMethod;
  dateRangeFilter: OrderDateRangeFilter;
};

export type OrdersSortState = {
  key: OrdersSortKey;
  direction: OrdersSortDirection;
};

export type OrdersSavedView = {
  id: string;
  name: string;
  scopeViewId?: OrdersScopeViewId;
  filters: OrderFilters;
  sort: OrdersSortState;
  visibleColumnIds: OrdersColumnId[];
  density: OrdersDensity;
  isSystem?: boolean;
};

export const DEFAULT_ORDER_FILTERS: OrderFilters = {
  searchQuery: '',
  statusFilter: 'all',
  deliveryFilter: 'all',
  dateRangeFilter: 'all',
};

export const DEFAULT_ORDER_SORT: OrdersSortState = {
  key: 'createdAt',
  direction: 'desc',
};

export const DEFAULT_VISIBLE_ORDER_COLUMNS: OrdersColumnId[] = [
  'number',
  'date',
  'client',
  'amount',
  'payment',
  'delivery',
  'status',
  'source',
  'manager',
  'tags',
];

export const DEFAULT_ORDERS_DENSITY: OrdersDensity = 'compact';
export const ORDER_TABLE_COLUMN_LABELS: Record<OrdersColumnId, string> = {
  number: 'Номер заказа',
  date: 'Дата',
  client: 'Клиент',
  amount: 'Сумма',
  payment: 'Оплата',
  delivery: 'Доставка',
  status: 'Статус',
  source: 'Источник',
  manager: 'Менеджер / оператор',
  tags: 'Теги',
};

const NEW_ORDER_STATE_TYPES = new Set<Order['stateType']>(['CREATED', 'AWAITING_CONFIRMATION']);
const IN_WORK_STATE_TYPES = new Set<Order['stateType']>(['CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY']);
const SERVER_SORTABLE_ORDERS_KEYS = new Set<ServerSortableOrdersKey>([
  'orderNumber',
  'createdAt',
  'customer',
  'totalMinor',
  'payment',
  'delivery',
  'status',
  'source',
  'manager',
]);

function getDayStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getDaysAgoStart(now: Date, daysAgo: number): Date {
  const today = getDayStart(now);

  return new Date(today.getFullYear(), today.getMonth(), today.getDate() - daysAgo);
}

function mapScopeViewIdToApiScope(scopeViewId: OrdersScopeViewId): NonNullable<GetAdminOrdersParams>['scope'] {
  if (scopeViewId === 'in-work') {
    return 'in_work';
  }

  return scopeViewId;
}

function compactText(value: string | null | undefined): string {
  return value?.trim() ?? '';
}

function getDateRangeStart(filter: OrderDateRangeFilter, now: Date): Date | null {
  const today = getDayStart(now);

  if (filter === 'today') {
    return today;
  }

  if (filter === '3d') {
    return new Date(today.getFullYear(), today.getMonth(), today.getDate() - 2);
  }

  if (filter === '7d') {
    return new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6);
  }

  if (filter === '30d') {
    return new Date(today.getFullYear(), today.getMonth(), today.getDate() - 29);
  }

  return null;
}

function getOrderSearchHaystack(order: Order): string[] {
  return [
    order.orderNumber,
    order.customerName,
    order.customerPhone,
    order.customerEmail,
    order.status.name,
    order.status.code,
    order.delivery.methodName,
    order.delivery.pickupPointName,
    order.delivery.pickupPointAddress,
  ]
    .map(compactText)
    .filter(Boolean);
}

export function isNewOrder(order: Order): boolean {
  return NEW_ORDER_STATE_TYPES.has(order.stateType);
}

export function isProblematicOrder(order: Order): boolean {
  const statusCode = compactText(order.status.code).toUpperCase();
  const statusName = compactText(order.status.name).toLowerCase();

  if (order.stateType === 'ON_HOLD') {
    return true;
  }

  return (
    statusCode.includes('HOLD') ||
    statusCode.includes('PROBLEM') ||
    statusCode.includes('FAILED') ||
    statusName.includes('проблем') ||
    statusName.includes('пауза') ||
    statusName.includes('ошиб')
  );
}

export function isInWorkOrder(order: Order): boolean {
  return IN_WORK_STATE_TYPES.has(order.stateType);
}

export function getOrderSourceLabel(order: Order): string {
  if (order.guestInstallId || order.customerType === 'GUEST') {
    return 'Гостевой checkout';
  }

  if (order.userId || order.customerType === 'USER') {
    return 'Аккаунт клиента';
  }

  return 'Не передается API';
}

export function getOrderManagerLabel(): string {
  return 'Нет в API';
}

export function getOrderTagsLabel(): string {
  return 'Нет в API';
}

export function isOrdersServerSortable(sortKey: OrdersSortKey): boolean {
  return SERVER_SORTABLE_ORDERS_KEYS.has(sortKey as ServerSortableOrdersKey);
}

export function sanitizeOrdersSort(sort: OrdersSortState | null | undefined): { key: ServerSortableOrdersKey; direction: OrdersSortDirection } {
  if (!sort || !isOrdersServerSortable(sort.key)) {
    return {
      key: DEFAULT_ORDER_SORT.key as ServerSortableOrdersKey,
      direction: DEFAULT_ORDER_SORT.direction,
    };
  }

  return {
    key: sort.key as ServerSortableOrdersKey,
    direction: sort.direction === 'asc' ? 'asc' : 'desc',
  };
}

export function buildOrdersRequestQuery({
  filters,
  page,
  pageSize,
  scopeViewId,
  sort,
}: {
  filters: OrderFilters;
  page: number;
  pageSize: number;
  scopeViewId: OrdersScopeViewId;
  sort: OrdersSortState;
}): GetAdminOrdersParams {
  const normalizedSort = sanitizeOrdersSort(sort);
  const nextQuery: NonNullable<GetAdminOrdersParams> = {
    page,
    pageSize: pageSize as NonNullable<GetAdminOrdersParams>['pageSize'],
    scope: mapScopeViewIdToApiScope(scopeViewId),
    sortBy: normalizedSort.key,
    sortDirection: normalizedSort.direction,
  };
  const normalizedSearchQuery = compactText(filters.searchQuery);

  if (normalizedSearchQuery) {
    nextQuery.search = normalizedSearchQuery;
  }

  if (filters.statusFilter !== 'all') {
    nextQuery.statusCodes = [filters.statusFilter];
  }

  if (filters.deliveryFilter !== 'all') {
    nextQuery.deliveryMethods = [filters.deliveryFilter];
  }

  const now = new Date();
  let createdFromDate: Date | null = null;

  if (filters.dateRangeFilter === 'today') {
    createdFromDate = getDayStart(now);
  } else if (filters.dateRangeFilter === '3d') {
    createdFromDate = getDaysAgoStart(now, 2);
  } else if (filters.dateRangeFilter === '7d') {
    createdFromDate = getDaysAgoStart(now, 6);
  } else if (filters.dateRangeFilter === '30d') {
    createdFromDate = getDaysAgoStart(now, 29);
  }

  if (createdFromDate) {
    nextQuery.createdFrom = createdFromDate.toISOString();
  }

  return nextQuery;
}

export function getOrderSortValue(order: Order, key: OrdersSortKey): string | number {
  if (key === 'orderNumber') {
    return compactText(order.orderNumber);
  }

  if (key === 'createdAt') {
    return Date.parse(order.createdAt) || 0;
  }

  if (key === 'customer') {
    return compactText(getCustomerLabel(order));
  }

  if (key === 'totalMinor') {
    return order.totalMinor;
  }

  if (key === 'payment') {
    return compactText(getPaymentMethodLabel(order.payment));
  }

  if (key === 'delivery') {
    return compactText(order.delivery.methodName || getDeliveryTypeLabel(order.deliveryMethod));
  }

  if (key === 'status') {
    return compactText(getOrderStatusLabel(order.status));
  }

  if (key === 'source') {
    return compactText(getOrderSourceLabel(order));
  }

  if (key === 'manager') {
    return compactText(getOrderManagerLabel());
  }

  return compactText(getOrderTagsLabel());
}

export function sortOrders(orders: Order[], sort: OrdersSortState): Order[] {
  const directionFactor = sort.direction === 'asc' ? 1 : -1;

  return orders.slice().sort((left, right) => {
    const leftValue = getOrderSortValue(left, sort.key);
    const rightValue = getOrderSortValue(right, sort.key);

    if (typeof leftValue === 'number' && typeof rightValue === 'number') {
      if (leftValue === rightValue) {
        return Date.parse(right.createdAt) - Date.parse(left.createdAt);
      }

      return (leftValue - rightValue) * directionFactor;
    }

    const comparison = String(leftValue).localeCompare(String(rightValue), 'ru', {
      numeric: true,
      sensitivity: 'base',
    });

    if (comparison === 0) {
      return (Date.parse(right.createdAt) - Date.parse(left.createdAt)) * (sort.key === 'createdAt' ? directionFactor : 1);
    }

    return comparison * directionFactor;
  });
}

export function filterOrders(orders: Order[], filters: OrderFilters): Order[] {
  const searchQuery = compactText(filters.searchQuery).toLowerCase();
  const dateRangeStart = getDateRangeStart(filters.dateRangeFilter, new Date());

  return orders.filter((order) => {
    const matchesStatus = filters.statusFilter === 'all' || order.status.code === filters.statusFilter;
    const matchesDelivery = filters.deliveryFilter === 'all' || order.deliveryMethod === filters.deliveryFilter;

    if (!matchesStatus || !matchesDelivery) {
      return false;
    }

    if (dateRangeStart) {
      const createdAtTimestamp = Date.parse(order.createdAt);

      if (Number.isNaN(createdAtTimestamp) || createdAtTimestamp < dateRangeStart.getTime()) {
        return false;
      }
    }

    if (!searchQuery) {
      return true;
    }

    return getOrderSearchHaystack(order).some((value) => value.toLowerCase().includes(searchQuery));
  });
}

export function paginateItems<T>(items: T[], page: number, pageSize: number): {
  totalPages: number;
  currentPage: number;
  paginatedItems: T[];
  visibleStart: number;
  visibleEnd: number;
} {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * pageSize;

  return {
    totalPages,
    currentPage,
    paginatedItems: items.slice(pageStart, pageStart + pageSize),
    visibleStart: items.length ? pageStart + 1 : 0,
    visibleEnd: items.length ? Math.min(pageStart + pageSize, items.length) : 0,
  };
}

export function buildSystemOrdersViews(): OrdersSavedView[] {
  return [
    {
      id: 'all',
      name: 'Все',
      scopeViewId: 'all',
      filters: { ...DEFAULT_ORDER_FILTERS },
      sort: { ...DEFAULT_ORDER_SORT },
      visibleColumnIds: [...DEFAULT_VISIBLE_ORDER_COLUMNS],
      density: DEFAULT_ORDERS_DENSITY,
      isSystem: true,
    },
    {
      id: 'new',
      name: 'Новые',
      scopeViewId: 'new',
      filters: {
        ...DEFAULT_ORDER_FILTERS,
      },
      sort: { ...DEFAULT_ORDER_SORT },
      visibleColumnIds: [...DEFAULT_VISIBLE_ORDER_COLUMNS],
      density: DEFAULT_ORDERS_DENSITY,
      isSystem: true,
    },
    {
      id: 'in-work',
      name: 'В работе',
      scopeViewId: 'in-work',
      filters: {
        ...DEFAULT_ORDER_FILTERS,
      },
      sort: { ...DEFAULT_ORDER_SORT },
      visibleColumnIds: [...DEFAULT_VISIBLE_ORDER_COLUMNS],
      density: DEFAULT_ORDERS_DENSITY,
      isSystem: true,
    },
    {
      id: 'problematic',
      name: 'Проблемные',
      scopeViewId: 'problematic',
      filters: {
        ...DEFAULT_ORDER_FILTERS,
      },
      sort: { ...DEFAULT_ORDER_SORT },
      visibleColumnIds: [...DEFAULT_VISIBLE_ORDER_COLUMNS],
      density: DEFAULT_ORDERS_DENSITY,
      isSystem: true,
    },
    {
      id: 'pickup',
      name: 'Самовывоз',
      scopeViewId: 'all',
      filters: {
        ...DEFAULT_ORDER_FILTERS,
        deliveryFilter: 'PICKUP',
      },
      sort: { ...DEFAULT_ORDER_SORT },
      visibleColumnIds: [...DEFAULT_VISIBLE_ORDER_COLUMNS],
      density: DEFAULT_ORDERS_DENSITY,
      isSystem: true,
    },
    {
      id: 'today',
      name: 'Сегодня',
      scopeViewId: 'all',
      filters: {
        ...DEFAULT_ORDER_FILTERS,
        dateRangeFilter: 'today',
      },
      sort: { ...DEFAULT_ORDER_SORT },
      visibleColumnIds: [...DEFAULT_VISIBLE_ORDER_COLUMNS],
      density: DEFAULT_ORDERS_DENSITY,
      isSystem: true,
    },
  ];
}

export function applySystemOrdersView(orders: Order[], viewId: string): Order[] {
  if (viewId === 'new') {
    return orders.filter(isNewOrder);
  }

  if (viewId === 'in-work') {
    return orders.filter(isInWorkOrder);
  }

  if (viewId === 'problematic') {
    return orders.filter(isProblematicOrder);
  }

  return orders;
}

export function getSystemOrdersViewCount(orders: Order[], viewId: string): number {
  return applySystemOrdersView(orders, viewId).length;
}

function escapeCsvValue(value: string): string {
  const normalizedValue = value.split('"').join('""');

  return `"${normalizedValue}"`;
}

export function getOrderExportValue(order: Order, columnId: OrdersColumnId): string {
  if (columnId === 'number') {
    return order.orderNumber;
  }

  if (columnId === 'date') {
    return formatOrderDateTime(order.createdAt);
  }

  if (columnId === 'client') {
    return [getCustomerLabel(order), compactText(order.customerPhone), compactText(order.customerEmail)].filter(Boolean).join(' • ');
  }

  if (columnId === 'amount') {
    return formatMoneyMinor(order.totalMinor);
  }

  if (columnId === 'payment') {
    return [getPaymentMethodLabel(order.payment), 'Статус оплаты недоступен в API'].join(' • ');
  }

  if (columnId === 'delivery') {
    return [order.delivery.methodName || getDeliveryTypeLabel(order.deliveryMethod), compactText(order.delivery.pickupPointName)].filter(Boolean).join(' • ');
  }

  if (columnId === 'status') {
    return getOrderStatusLabel(order.status);
  }

  if (columnId === 'source') {
    return getOrderSourceLabel(order);
  }

  if (columnId === 'manager') {
    return getOrderManagerLabel();
  }

  return getOrderTagsLabel();
}

export function buildOrdersCsv(orders: Order[], visibleColumnIds: OrdersColumnId[], columnLabels: Record<OrdersColumnId, string>): string {
  const header = visibleColumnIds.map((columnId) => escapeCsvValue(columnLabels[columnId])).join(',');
  const rows = orders.map((order) =>
    visibleColumnIds.map((columnId) => escapeCsvValue(getOrderExportValue(order, columnId))).join(','),
  );

  return [header, ...rows].join('\n');
}
