import type { Order, OrderDeliveryType, OrderStatus } from '@/entities/order';

export const ORDER_PAGE_SIZE_OPTIONS = [10, 20, 40] as const;

export type OrderDateRangeFilter = 'all' | 'today' | '3d' | '7d' | '30d';

export type OrderFilters = {
  statusFilter: 'all' | OrderStatus;
  deliveryFilter: 'all' | OrderDeliveryType;
  paymentFilter: 'unsupported';
  dateRangeFilter: OrderDateRangeFilter;
};

function getDayStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
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

export function filterOrders(orders: Order[], filters: OrderFilters): Order[] {
  const dateRangeStart = getDateRangeStart(filters.dateRangeFilter, new Date());

  return orders
    .slice()
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
    .filter((order) => {
      const matchesStatus = filters.statusFilter === 'all' || order.status === filters.statusFilter;
      const matchesDelivery = filters.deliveryFilter === 'all' || order.deliveryType === filters.deliveryFilter;
      const matchesPayment = filters.paymentFilter === 'unsupported';

      if (!dateRangeStart) {
        return Boolean(matchesStatus && matchesDelivery && matchesPayment);
      }

      const createdAtTimestamp = Date.parse(order.createdAt);

      if (Number.isNaN(createdAtTimestamp)) {
        return false;
      }

      return Boolean(matchesStatus && matchesDelivery && matchesPayment && createdAtTimestamp >= dateRangeStart.getTime());
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
