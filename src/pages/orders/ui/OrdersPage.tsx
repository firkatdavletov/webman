import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import {
  DownloadIcon,
  Link2OffIcon,
  RefreshCcwIcon,
  SearchIcon,
  Settings2Icon,
  SlidersHorizontalIcon,
  Trash2Icon,
} from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  changeOrderStatus,
  getAdminOrders,
  getAvailableOrderStatusTransitions,
  getOrderById,
  getOrderStatusHistory,
  type Order,
  type OrderStatus,
  type OrderStatusCode,
  type OrderStatusHistoryEntry,
  type OrderStatusTransition,
} from '@/entities/order';
import { getAllProducts } from '@/entities/product';
import { getPrimaryMediaImageUrl } from '@/shared/lib/media/images';
import { cn } from '@/shared/lib/cn';
import {
  AdminEmptyState,
  AdminNotice,
  AdminPage,
  AdminPageHeader,
  AdminPageStatus,
  AdminSectionCard,
  Badge,
  Button,
  Input,
  SegmentedControl,
  buttonVariants,
} from '@/shared/ui';
import {
  applySystemOrdersView,
  buildOrdersCsv,
  buildSystemOrdersViews,
  DEFAULT_ORDER_FILTERS,
  DEFAULT_ORDERS_DENSITY,
  DEFAULT_ORDER_SORT,
  DEFAULT_VISIBLE_ORDER_COLUMNS,
  filterOrders,
  getSystemOrdersViewCount,
  isInWorkOrder,
  isNewOrder,
  isProblematicOrder,
  ORDER_PAGE_SIZE_OPTIONS,
  ORDER_TABLE_COLUMN_LABELS,
  paginateItems,
  sortOrders,
  type OrderDateRangeFilter,
  type OrderFilters,
  type OrdersColumnId,
  type OrdersDensity,
  type OrdersSavedView,
  type OrdersSortKey,
  type OrdersSortState,
} from '@/pages/orders/model/orderPageView';
import { OrderDetailsDrawer } from '@/widgets/order-details';
import { OrdersTable } from '@/widgets/orders-table';

type OrderProductMeta = {
  imageUrl: string | null;
  sku: string | null;
};

const ORDERS_CUSTOM_VIEWS_STORAGE_KEY = 'webman.orders.saved-views.v1';

const DELIVERY_FILTER_OPTIONS = [
  { value: 'all', label: 'Все доставки' },
  { value: 'PICKUP', label: 'Самовывоз' },
  { value: 'COURIER', label: 'Курьер' },
  { value: 'CUSTOM_DELIVERY_ADDRESS', label: 'По адресу' },
  { value: 'YANDEX_PICKUP_POINT', label: 'Яндекс ПВЗ' },
] as const;

const DATE_FILTER_OPTIONS: { value: OrderDateRangeFilter; label: string }[] = [
  { value: 'all', label: 'За все время' },
  { value: 'today', label: 'Сегодня' },
  { value: '3d', label: '3 дня' },
  { value: '7d', label: '7 дней' },
  { value: '30d', label: '30 дней' },
];

type ActiveFilterToken = {
  key: string;
  label: string;
  onRemove: () => void;
};

function upsertOrderById(orders: Order[], nextOrder: Order): Order[] {
  const nextOrders = [...orders];
  const existingOrderIndex = nextOrders.findIndex((order) => order.id === nextOrder.id);

  if (existingOrderIndex === -1) {
    nextOrders.unshift(nextOrder);
    return nextOrders;
  }

  nextOrders[existingOrderIndex] = nextOrder;
  return nextOrders;
}

function buildAvailableStatuses(orders: Order[]): OrderStatus[] {
  const statusesByCode = new Map<OrderStatusCode, OrderStatus>();

  orders.forEach((order) => {
    if (!statusesByCode.has(order.status.code)) {
      statusesByCode.set(order.status.code, order.status);
    }
  });

  return [...statusesByCode.values()].sort((left, right) => left.name.localeCompare(right.name, 'ru'));
}

function sanitizeVisibleColumnIds(value: unknown): OrdersColumnId[] {
  if (!Array.isArray(value)) {
    return [...DEFAULT_VISIBLE_ORDER_COLUMNS];
  }

  const nextVisibleColumnIds = DEFAULT_VISIBLE_ORDER_COLUMNS.filter((columnId) => value.includes(columnId));

  return nextVisibleColumnIds.length ? nextVisibleColumnIds : [...DEFAULT_VISIBLE_ORDER_COLUMNS];
}

function readCustomViews(): OrdersSavedView[] {
  if (typeof window === 'undefined') {
    return [];
  }

  const rawValue = window.localStorage.getItem(ORDERS_CUSTOM_VIEWS_STORAGE_KEY);

  if (!rawValue) {
    return [];
  }

  try {
    const parsedValue = JSON.parse(rawValue) as unknown;

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue
      .filter((item): item is OrdersSavedView => {
        if (!item || typeof item !== 'object') {
          return false;
        }

        const candidate = item as Partial<OrdersSavedView>;
        return typeof candidate.id === 'string' && typeof candidate.name === 'string' && Boolean(candidate.filters) && Boolean(candidate.sort);
      })
      .map((view) => ({
        ...view,
        scopeViewId: typeof view.scopeViewId === 'string' ? view.scopeViewId : 'all',
        filters: {
          ...DEFAULT_ORDER_FILTERS,
          ...view.filters,
        },
        sort: {
          ...DEFAULT_ORDER_SORT,
          ...view.sort,
        },
        density: view.density === 'comfortable' ? 'comfortable' : DEFAULT_ORDERS_DENSITY,
        visibleColumnIds: sanitizeVisibleColumnIds(view.visibleColumnIds),
        isSystem: false,
      }));
  } catch {
    return [];
  }
}

function persistCustomViews(views: OrdersSavedView[]) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(ORDERS_CUSTOM_VIEWS_STORAGE_KEY, JSON.stringify(views));
}

function downloadCsv(filename: string, csv: string) {
  if (typeof window === 'undefined') {
    return;
  }

  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const link = window.document.createElement('a');

  link.href = url;
  link.setAttribute('download', filename);
  window.document.body.append(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

function formatViewCount(value: number): string {
  return new Intl.NumberFormat('ru-RU').format(value);
}

function formatActiveScopeLabel(scopeViewId: string): string | null {
  if (scopeViewId === 'all') {
    return null;
  }

  if (scopeViewId === 'new') {
    return 'Срез: новые';
  }

  if (scopeViewId === 'in-work') {
    return 'Срез: в работе';
  }

  if (scopeViewId === 'problematic') {
    return 'Срез: проблемные';
  }

  return null;
}

function getSortColumnLabel(sortKey: OrdersSortKey): string {
  if (sortKey === 'orderNumber') {
    return ORDER_TABLE_COLUMN_LABELS.number;
  }

  if (sortKey === 'createdAt') {
    return ORDER_TABLE_COLUMN_LABELS.date;
  }

  if (sortKey === 'customer') {
    return ORDER_TABLE_COLUMN_LABELS.client;
  }

  if (sortKey === 'totalMinor') {
    return ORDER_TABLE_COLUMN_LABELS.amount;
  }

  return ORDER_TABLE_COLUMN_LABELS[sortKey];
}

function OrdersTableSkeleton() {
  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-border/70 bg-background/80">
      <div className="grid grid-cols-[3rem_10rem_10rem_1fr_10rem_12rem_14rem_11rem_10rem_12rem_10rem_2.5rem] gap-0 border-b border-border/70 bg-muted/80 px-5 py-3">
        {Array.from({ length: 12 }).map((_, index) => (
          <div key={index} className="h-3 animate-pulse rounded-full bg-muted-foreground/15" />
        ))}
      </div>
      <div className="space-y-0">
        {Array.from({ length: 8 }).map((_, rowIndex) => (
          <div
            key={rowIndex}
            className="grid grid-cols-[3rem_10rem_10rem_1fr_10rem_12rem_14rem_11rem_10rem_12rem_10rem_2.5rem] gap-0 border-b border-border/60 px-5 py-3 last:border-b-0"
          >
            {Array.from({ length: 12 }).map((__, cellIndex) => (
              <div
                key={`${rowIndex}-${cellIndex}`}
                className={cn('h-3 animate-pulse rounded-full bg-muted', cellIndex === 3 ? 'w-4/5' : 'w-3/4')}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function FilterChip({
  isActive,
  label,
  onClick,
}: {
  isActive: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
        isActive
          ? 'border-primary/25 bg-primary/10 text-primary'
          : 'border-border/80 bg-background text-muted-foreground hover:border-border hover:bg-muted/60 hover:text-foreground',
      )}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function ViewChip({
  isActive,
  label,
  hint,
  removable = false,
  onClick,
  onRemove,
}: {
  isActive: boolean;
  label: string;
  hint?: string;
  removable?: boolean;
  onClick: () => void;
  onRemove?: () => void;
}) {
  return (
    <div className="inline-flex items-center">
      <button
        type="button"
        className={cn(
          'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
          isActive
            ? 'border-primary/30 bg-primary/10 text-primary'
            : 'border-border/80 bg-background text-foreground hover:bg-muted/60',
          removable && 'rounded-r-none',
        )}
        onClick={onClick}
      >
        <span>{label}</span>
        {hint ? <span className="text-xs text-current/70">{hint}</span> : null}
      </button>
      {removable && onRemove ? (
        <button
          type="button"
          className={cn(
            'rounded-r-full border border-l-0 px-2 py-1.5 transition-colors',
            isActive ? 'border-primary/30 bg-primary/10 text-primary' : 'border-border/80 bg-background text-muted-foreground hover:bg-muted/60 hover:text-foreground',
          )}
          aria-label={`Удалить представление ${label}`}
          onClick={(event) => {
            event.stopPropagation();
            onRemove();
          }}
        >
          <Trash2Icon className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}

export function OrdersPage() {
  const navigate = useNavigate();
  const params = useParams<{ orderId?: string }>();
  const selectedOrderId = params.orderId ?? null;

  const systemViews = useMemo(() => buildSystemOrdersViews(), []);

  const [orders, setOrders] = useState<Order[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [filters, setFilters] = useState<OrderFilters>(DEFAULT_ORDER_FILTERS);
  const deferredSearchQuery = useDeferredValue(filters.searchQuery);
  const [activeScopeViewId, setActiveScopeViewId] = useState('all');
  const [activeViewId, setActiveViewId] = useState<string | null>('all');
  const [customViews, setCustomViews] = useState<OrdersSavedView[]>(() => readCustomViews());
  const [sort, setSort] = useState<OrdersSortState>(DEFAULT_ORDER_SORT);
  const [density, setDensity] = useState<OrdersDensity>(DEFAULT_ORDERS_DENSITY);
  const [visibleColumnIds, setVisibleColumnIds] = useState<OrdersColumnId[]>(DEFAULT_VISIBLE_ORDER_COLUMNS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(ORDER_PAGE_SIZE_OPTIONS[0]);
  const [isColumnSettingsOpen, setIsColumnSettingsOpen] = useState(false);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(() => new Set());
  const [bulkFeedbackMessage, setBulkFeedbackMessage] = useState('');

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isOrderDetailsLoading, setIsOrderDetailsLoading] = useState(false);
  const [orderDetailsErrorMessage, setOrderDetailsErrorMessage] = useState('');
  const [isStatusMetaLoading, setIsStatusMetaLoading] = useState(false);
  const [availableStatusTransitions, setAvailableStatusTransitions] = useState<OrderStatusTransition[]>([]);
  const [statusTransitionsErrorMessage, setStatusTransitionsErrorMessage] = useState('');
  const [statusHistory, setStatusHistory] = useState<OrderStatusHistoryEntry[]>([]);
  const [statusHistoryErrorMessage, setStatusHistoryErrorMessage] = useState('');
  const [isStatusUpdating, setIsStatusUpdating] = useState(false);
  const [statusUpdateErrorMessage, setStatusUpdateErrorMessage] = useState('');
  const [statusUpdateSuccessMessage, setStatusUpdateSuccessMessage] = useState('');

  const [productMetaById, setProductMetaById] = useState<Map<string, OrderProductMeta>>(() => new Map());
  const [productMetaErrorMessage, setProductMetaErrorMessage] = useState('');
  const statusMetaRequestIdRef = useRef(0);

  const loadOrdersData = async (showInitialLoader = false) => {
    if (showInitialLoader) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    setErrorMessage('');

    const result = await getAdminOrders();

    setOrders(result.orders);
    setErrorMessage(result.error ?? '');
    setIsLoading(false);
    setIsRefreshing(false);
  };

  const loadProductMetaData = async () => {
    const result = await getAllProducts();

    if (result.error) {
      setProductMetaById(new Map());
      setProductMetaErrorMessage('Не удалось загрузить SKU и изображения товаров для preview заказа.');
      return;
    }

    const nextProductMetaById = new Map<string, OrderProductMeta>();

    result.products.forEach((product) => {
      nextProductMetaById.set(product.id, {
        imageUrl: getPrimaryMediaImageUrl(product.images) || null,
        sku: product.sku,
      });
    });

    setProductMetaById(nextProductMetaById);
    setProductMetaErrorMessage('');
  };

  const loadSelectedOrderStatusData = async (orderId: string) => {
    const requestId = statusMetaRequestIdRef.current + 1;
    statusMetaRequestIdRef.current = requestId;

    setIsStatusMetaLoading(true);
    setStatusTransitionsErrorMessage('');
    setStatusHistoryErrorMessage('');

    const [transitionsResult, historyResult] = await Promise.all([
      getAvailableOrderStatusTransitions(orderId),
      getOrderStatusHistory(orderId),
    ]);

    if (requestId !== statusMetaRequestIdRef.current) {
      return;
    }

    setAvailableStatusTransitions(transitionsResult.transitions);
    setStatusTransitionsErrorMessage(transitionsResult.error ?? '');
    setStatusHistory(historyResult.history);
    setStatusHistoryErrorMessage(historyResult.error ?? '');
    setIsStatusMetaLoading(false);
  };

  useEffect(() => {
    void loadOrdersData(true);
    void loadProductMetaData();
  }, []);

  useEffect(() => {
    persistCustomViews(customViews);
  }, [customViews]);

  const knownOrderLookup = useMemo(() => {
    const nextLookup = new Map<string, Order>();

    orders.forEach((order) => {
      nextLookup.set(order.id, order);
    });

    return nextLookup;
  }, [orders]);

  const availableStatuses = useMemo(() => buildAvailableStatuses(orders), [orders]);

  const scopedOrders = useMemo(() => applySystemOrdersView(orders, activeScopeViewId), [activeScopeViewId, orders]);
  const filteredOrders = useMemo(
    () =>
      filterOrders(scopedOrders, {
        ...filters,
        searchQuery: deferredSearchQuery,
      }),
    [deferredSearchQuery, filters, scopedOrders],
  );
  const visibleOrders = useMemo(() => sortOrders(filteredOrders, sort), [filteredOrders, sort]);
  const pagination = useMemo(() => paginateItems(visibleOrders, page, pageSize), [page, pageSize, visibleOrders]);
  const selectedOrders = useMemo(() => orders.filter((order) => selectedOrderIds.has(order.id)), [orders, selectedOrderIds]);

  useEffect(() => {
    setPage(1);
  }, [activeScopeViewId, deferredSearchQuery, filters.deliveryFilter, filters.dateRangeFilter, filters.statusFilter, pageSize]);

  useEffect(() => {
    setSelectedOrderIds((currentSelectedOrderIds) => {
      const nextSelectedOrderIds = new Set([...currentSelectedOrderIds].filter((orderId) => knownOrderLookup.has(orderId)));

      return nextSelectedOrderIds.size === currentSelectedOrderIds.size ? currentSelectedOrderIds : nextSelectedOrderIds;
    });
  }, [knownOrderLookup]);

  useEffect(() => {
    if (!selectedOrderId) {
      setSelectedOrder(null);
      setOrderDetailsErrorMessage('');
      setIsOrderDetailsLoading(false);
      return;
    }

    const fallbackOrder = knownOrderLookup.get(selectedOrderId) ?? null;

    setSelectedOrder(fallbackOrder);
    setOrderDetailsErrorMessage('');
    setIsOrderDetailsLoading(!fallbackOrder);

    if (fallbackOrder) {
      return;
    }

    let isCancelled = false;

    void (async () => {
      const result = await getOrderById(selectedOrderId);

      if (isCancelled) {
        return;
      }

      if (result.order) {
        setSelectedOrder(result.order);
      } else {
        setSelectedOrder(fallbackOrder);
      }

      setOrderDetailsErrorMessage(result.error ?? '');
      setIsOrderDetailsLoading(false);
    })();

    return () => {
      isCancelled = true;
    };
  }, [knownOrderLookup, selectedOrderId]);

  useEffect(() => {
    if (!selectedOrderId) {
      statusMetaRequestIdRef.current += 1;
      setIsStatusMetaLoading(false);
      setAvailableStatusTransitions([]);
      setStatusTransitionsErrorMessage('');
      setStatusHistory([]);
      setStatusHistoryErrorMessage('');
      return;
    }

    void loadSelectedOrderStatusData(selectedOrderId);
  }, [selectedOrderId]);

  const updateFilters = (updater: (currentFilters: OrderFilters) => OrderFilters) => {
    setFilters((currentFilters) => updater(currentFilters));
    setActiveViewId(null);
    setBulkFeedbackMessage('');
  };

  const handleSortChange = (key: OrdersSortKey) => {
    setSort((currentSort) =>
      currentSort.key === key
        ? {
            key,
            direction: currentSort.direction === 'asc' ? 'desc' : 'asc',
          }
        : {
            key,
            direction: key === 'orderNumber' ? 'asc' : 'desc',
          },
    );
    setActiveViewId(null);
  };

  const handleOpenOrder = (orderId: string) => {
    setStatusUpdateErrorMessage('');
    setStatusUpdateSuccessMessage('');
    navigate(`/orders/${orderId}`);
  };

  const handleCloseOrderDrawer = () => {
    setSelectedOrder(null);
    setOrderDetailsErrorMessage('');
    setStatusUpdateErrorMessage('');
    setStatusUpdateSuccessMessage('');
    setIsStatusUpdating(false);
    navigate('/orders', { replace: true });
  };

  const handleRefresh = async () => {
    await loadOrdersData();

    if (selectedOrderId) {
      await loadSelectedOrderStatusData(selectedOrderId);
    }
  };

  const handleStatusSubmit = async ({ statusId, comment }: { statusId: string; comment: string | null }) => {
    if (!selectedOrder) {
      return;
    }

    setIsStatusUpdating(true);
    setStatusUpdateErrorMessage('');
    setStatusUpdateSuccessMessage('');

    const result = await changeOrderStatus({
      orderId: selectedOrder.id,
      statusId,
      comment,
    });

    if (!result.order) {
      setStatusUpdateErrorMessage(result.error ?? 'Не удалось изменить статус заказа.');
      setIsStatusUpdating(false);
      return;
    }

    const updatedOrder = result.order;

    setSelectedOrder(updatedOrder);
    setStatusUpdateSuccessMessage(`Статус заказа изменен на «${updatedOrder.status.name}».`);
    setOrders((currentOrders) => upsertOrderById(currentOrders, updatedOrder));
    setIsStatusUpdating(false);

    await loadSelectedOrderStatusData(updatedOrder.id);
    void loadOrdersData();
  };

  const applyView = (view: OrdersSavedView) => {
    setActiveViewId(view.id);
    setActiveScopeViewId(view.scopeViewId ?? 'all');
    setFilters({
      ...DEFAULT_ORDER_FILTERS,
      ...view.filters,
    });
    setSort(view.sort);
    setDensity(view.density);
    setVisibleColumnIds(sanitizeVisibleColumnIds(view.visibleColumnIds));
    setSelectedOrderIds(new Set());
    setBulkFeedbackMessage('');
  };

  const handleSaveCurrentView = () => {
    if (typeof window === 'undefined') {
      return;
    }

    const suggestedName = activeViewId ? `Копия ${activeViewId}` : 'Мой список';
    const nextName = window.prompt('Название сохраненного представления', suggestedName)?.trim() ?? '';

    if (!nextName) {
      return;
    }

    const nextView: OrdersSavedView = {
      id: `custom-${Date.now()}`,
      name: nextName,
      scopeViewId: activeScopeViewId,
      filters,
      sort,
      visibleColumnIds,
      density,
      isSystem: false,
    };

    setCustomViews((currentViews) => [...currentViews, nextView]);
    setActiveViewId(nextView.id);
  };

  const handleDeleteCustomView = (viewId: string) => {
    setCustomViews((currentViews) => currentViews.filter((view) => view.id !== viewId));

    if (activeViewId === viewId) {
      setActiveViewId(null);
    }
  };

  const handleResetTableState = () => {
    setActiveScopeViewId('all');
    setActiveViewId('all');
    setFilters(DEFAULT_ORDER_FILTERS);
    setSort(DEFAULT_ORDER_SORT);
    setDensity(DEFAULT_ORDERS_DENSITY);
    setVisibleColumnIds(DEFAULT_VISIBLE_ORDER_COLUMNS);
    setSelectedOrderIds(new Set());
    setBulkFeedbackMessage('');
  };

  const currentPageOrderIds = useMemo(() => pagination.paginatedItems.map((order) => order.id), [pagination.paginatedItems]);
  const isAllPageRowsSelected = currentPageOrderIds.length > 0 && currentPageOrderIds.every((orderId) => selectedOrderIds.has(orderId));
  const isSomePageRowsSelected = !isAllPageRowsSelected && currentPageOrderIds.some((orderId) => selectedOrderIds.has(orderId));

  const handleTogglePageSelection = (checked: boolean) => {
    setSelectedOrderIds((currentSelectedOrderIds) => {
      const nextSelectedOrderIds = new Set(currentSelectedOrderIds);

      currentPageOrderIds.forEach((orderId) => {
        if (checked) {
          nextSelectedOrderIds.add(orderId);
        } else {
          nextSelectedOrderIds.delete(orderId);
        }
      });

      return nextSelectedOrderIds;
    });
  };

  const handleToggleOrderSelection = (orderId: string) => {
    setSelectedOrderIds((currentSelectedOrderIds) => {
      const nextSelectedOrderIds = new Set(currentSelectedOrderIds);

      if (nextSelectedOrderIds.has(orderId)) {
        nextSelectedOrderIds.delete(orderId);
      } else {
        nextSelectedOrderIds.add(orderId);
      }

      return nextSelectedOrderIds;
    });
  };

  const handleCopySelectedOrderNumbers = async () => {
    if (!selectedOrders.length || typeof navigator === 'undefined' || !navigator.clipboard) {
      return;
    }

    try {
      await navigator.clipboard.writeText(selectedOrders.map((order) => order.orderNumber).join('\n'));
      setBulkFeedbackMessage(`Скопировано ${selectedOrders.length} номеров заказов.`);
    } catch {
      setBulkFeedbackMessage('Не удалось скопировать номера заказов в буфер обмена.');
    }
  };

  const handleExport = (source: Order[], label: string) => {
    if (!source.length) {
      return;
    }

    const csv = buildOrdersCsv(source, visibleColumnIds, ORDER_TABLE_COLUMN_LABELS);
    const dateSuffix = new Date().toISOString().slice(0, 10);

    downloadCsv(`orders-${label}-${dateSuffix}.csv`, csv);
  };

  const activeFilterTokens = useMemo<ActiveFilterToken[]>(
    () =>
      [
        formatActiveScopeLabel(activeScopeViewId)
          ? {
              key: 'scope',
              label: formatActiveScopeLabel(activeScopeViewId) as string,
              onRemove: () => {
                setActiveScopeViewId('all');
                setActiveViewId(null);
              },
            }
          : null,
        filters.searchQuery.trim()
          ? {
              key: 'search',
              label: `Поиск: ${filters.searchQuery.trim()}`,
              onRemove: () => updateFilters((currentFilters) => ({ ...currentFilters, searchQuery: '' })),
            }
          : null,
        filters.statusFilter !== 'all'
          ? {
              key: 'status',
              label: `Статус: ${availableStatuses.find((status) => status.code === filters.statusFilter)?.name ?? filters.statusFilter}`,
              onRemove: () => updateFilters((currentFilters) => ({ ...currentFilters, statusFilter: 'all' })),
            }
          : null,
        filters.deliveryFilter !== 'all'
          ? {
              key: 'delivery',
              label: `Доставка: ${DELIVERY_FILTER_OPTIONS.find((option) => option.value === filters.deliveryFilter)?.label ?? filters.deliveryFilter}`,
              onRemove: () => updateFilters((currentFilters) => ({ ...currentFilters, deliveryFilter: 'all' })),
            }
          : null,
        filters.dateRangeFilter !== 'all'
          ? {
              key: 'date',
              label: `Период: ${DATE_FILTER_OPTIONS.find((option) => option.value === filters.dateRangeFilter)?.label ?? filters.dateRangeFilter}`,
              onRemove: () => updateFilters((currentFilters) => ({ ...currentFilters, dateRangeFilter: 'all' })),
            }
          : null,
      ].filter((token): token is ActiveFilterToken => Boolean(token)),
    [activeScopeViewId, availableStatuses, filters],
  );

  const filteredScopeSummary = useMemo(() => {
    if (activeScopeViewId === 'new') {
      return scopedOrders.filter(isNewOrder).length;
    }

    if (activeScopeViewId === 'in-work') {
      return scopedOrders.filter(isInWorkOrder).length;
    }

    if (activeScopeViewId === 'problematic') {
      return scopedOrders.filter(isProblematicOrder).length;
    }

    return scopedOrders.length;
  }, [activeScopeViewId, scopedOrders]);

  const statusText = isLoading
    ? 'Загрузка заказов...'
    : `В очереди ${formatViewCount(orders.length)} • после фильтров ${formatViewCount(visibleOrders.length)}`;

  const visibleColumnsSummary = visibleColumnIds.map((columnId) => ORDER_TABLE_COLUMN_LABELS[columnId]).join(', ');
  const hasNoOrders = !orders.length && !isLoading;
  const hasNoScopedOrders = Boolean(orders.length) && !scopedOrders.length && !isLoading;
  const hasNoFilteredOrders = Boolean(scopedOrders.length) && !visibleOrders.length && !isLoading;

  return (
    <>
      <AdminPage>
        <AdminPageHeader
          kicker="Операции"
          title="Заказы"
          description="Очередь заказов"
          actions={
            <>
              <AdminPageStatus>{statusText}</AdminPageStatus>
              <Button variant="outline" onClick={() => void handleRefresh()} disabled={isLoading || isRefreshing}>
                <RefreshCcwIcon className={cn('size-4', isRefreshing && 'animate-spin')} />
                {isRefreshing ? 'Обновление...' : 'Обновить'}
              </Button>
              <Link className={buttonVariants({ variant: 'outline' })} to="/order-statuses">
                Справочник статусов
              </Link>
            </>
          }
        />

        <AdminSectionCard
          eyebrow="Список заказов"
          title="Операционный список заказов"
          description="Сохранённые представления задают рабочий контекст, quick filters уточняют выдачу, а экспорт всегда учитывает текущие фильтры и видимые колонки."
          action={
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" onClick={handleSaveCurrentView}>
                <SlidersHorizontalIcon className="size-4" />
                Сохранить вид
              </Button>
              <Button variant="outline" onClick={() => setIsColumnSettingsOpen((currentValue) => !currentValue)} aria-pressed={isColumnSettingsOpen}>
                <Settings2Icon className="size-4" />
                Колонки
              </Button>
              <Button variant="outline" onClick={() => handleExport(visibleOrders, 'filtered')} disabled={!visibleOrders.length}>
                <DownloadIcon className="size-4" />
                Экспорт
              </Button>
            </div>
          }
        >
          <div className="space-y-5">
            <div className="space-y-3">
              <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">Saved Views</p>
              <div className="flex flex-wrap gap-2">
                {systemViews.map((view) => {
                  const scopedSystemOrders = applySystemOrdersView(orders, view.scopeViewId ?? 'all');
                  const count =
                    view.id === 'pickup' || view.id === 'today'
                      ? filterOrders(scopedSystemOrders, view.filters).length
                      : getSystemOrdersViewCount(orders, view.id);

                  return (
                    <ViewChip
                      key={view.id}
                      isActive={activeViewId === view.id}
                      label={view.name}
                      hint={formatViewCount(count)}
                      onClick={() => applyView(view)}
                    />
                  );
                })}
                {customViews.map((view) => (
                  <ViewChip
                    key={view.id}
                    isActive={activeViewId === view.id}
                    label={view.name}
                    removable
                    onClick={() => applyView(view)}
                    onRemove={() => handleDeleteCustomView(view.id)}
                  />
                ))}
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[minmax(18rem,24rem)_1fr]">
              <label className="space-y-2 text-sm font-medium text-foreground" htmlFor="orders-search-input">
                <span>Быстрый поиск</span>
                <div className="relative">
                  <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="orders-search-input"
                    type="search"
                    className="h-11 rounded-xl bg-background/80 pl-10 shadow-sm"
                    placeholder="Номер, клиент, телефон, email, статус"
                    value={filters.searchQuery}
                    onChange={(event) => updateFilters((currentFilters) => ({ ...currentFilters, searchQuery: event.target.value }))}
                  />
                </div>
              </label>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">Период</p>
                  <div className="flex flex-wrap gap-2">
                    {DATE_FILTER_OPTIONS.map((option) => (
                      <FilterChip
                        key={option.value}
                        isActive={filters.dateRangeFilter === option.value}
                        label={option.label}
                        onClick={() => updateFilters((currentFilters) => ({ ...currentFilters, dateRangeFilter: option.value }))}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">Доставка</p>
                  <div className="flex flex-wrap gap-2">
                    {DELIVERY_FILTER_OPTIONS.map((option) => (
                      <FilterChip
                        key={option.value}
                        isActive={filters.deliveryFilter === option.value}
                        label={option.label}
                        onClick={() =>
                          updateFilters((currentFilters) => ({
                            ...currentFilters,
                            deliveryFilter: option.value,
                          }))
                        }
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">Статусы</p>
                  <div className="flex flex-wrap gap-2">
                    <FilterChip
                      isActive={filters.statusFilter === 'all'}
                      label="Все статусы"
                      onClick={() => updateFilters((currentFilters) => ({ ...currentFilters, statusFilter: 'all' }))}
                    />
                    {availableStatuses.map((status) => (
                      <FilterChip
                        key={status.id}
                        isActive={filters.statusFilter === status.code}
                        label={status.name}
                        onClick={() => updateFilters((currentFilters) => ({ ...currentFilters, statusFilter: status.code }))}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {activeFilterTokens.length ? (
              <div className="flex flex-wrap items-center gap-2">
                {activeFilterTokens.map((token) => (
                  <Badge key={token.key} variant="outline" className="h-auto rounded-full px-3 py-1.5 text-[0.78rem] font-medium">
                    <span>{token.label}</span>
                    <button
                      type="button"
                      className="ml-1 text-muted-foreground transition-colors hover:text-foreground"
                      onClick={token.onRemove}
                      aria-label={`Удалить фильтр ${token.label}`}
                    >
                      <Link2OffIcon className="size-3.5" />
                    </button>
                  </Badge>
                ))}
                <Button variant="ghost" size="sm" onClick={handleResetTableState}>
                  Сбросить все
                </Button>
              </div>
            ) : null}

            <AdminNotice>
              Колонки <strong>Источник</strong>, <strong>Менеджер / оператор</strong> и <strong>Теги</strong> обязательны в интерфейсе, но backend их пока не отдает.
              Источник частично выводится как производный признак, менеджер и теги помечены как `API gap`.
            </AdminNotice>

            {isColumnSettingsOpen ? (
              <div className="grid gap-4 rounded-[1.25rem] border border-border/70 bg-muted/20 p-4 lg:grid-cols-[minmax(0,1fr)_18rem_18rem]">
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-foreground">Видимые колонки</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {DEFAULT_VISIBLE_ORDER_COLUMNS.map((columnId) => {
                      const isChecked = visibleColumnIds.includes(columnId);

                      return (
                        <label key={columnId} className="flex items-center gap-2 rounded-xl border border-border/70 bg-background/70 px-3 py-2 text-sm text-foreground">
                          <input
                            type="checkbox"
                            className="size-4 rounded border-border text-primary focus-visible:ring-2 focus-visible:ring-ring/40"
                            checked={isChecked}
                            onChange={(event) => {
                              setVisibleColumnIds((currentVisibleColumnIds) => {
                                if (event.target.checked) {
                                  return DEFAULT_VISIBLE_ORDER_COLUMNS.filter((candidate) =>
                                    candidate === columnId || currentVisibleColumnIds.includes(candidate),
                                  );
                                }

                                const nextVisibleColumnIds = currentVisibleColumnIds.filter((candidate) => candidate !== columnId);
                                return nextVisibleColumnIds.length ? nextVisibleColumnIds : currentVisibleColumnIds;
                              });
                              setActiveViewId(null);
                            }}
                          />
                          <span>{ORDER_TABLE_COLUMN_LABELS[columnId]}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-semibold text-foreground">Плотность</p>
                  <SegmentedControl
                    ariaLabel="Плотность таблицы заказов"
                    value={density}
                    onValueChange={(nextValue) => {
                      setDensity(nextValue);
                      setActiveViewId(null);
                    }}
                    options={[
                      { label: 'Компактно', value: 'compact' },
                      { label: 'Свободно', value: 'comfortable' },
                    ]}
                  />
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-semibold text-foreground">Размер страницы</p>
                  <select
                    className="flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none transition focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                    value={pageSize}
                    onChange={(event) => setPageSize(Number(event.target.value))}
                  >
                    {ORDER_PAGE_SIZE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option} строк
                      </option>
                    ))}
                  </select>
                  <p className="text-xs leading-5 text-muted-foreground">Экспорт использует текущие фильтры и колонки: {visibleColumnsSummary}.</p>
                </div>
              </div>
            ) : null}

            {selectedOrders.length ? (
              <div className="flex flex-wrap items-center gap-2 rounded-[1.25rem] border border-primary/20 bg-primary/8 px-4 py-3">
                <Badge className="h-auto rounded-full bg-primary px-3 py-1 text-primary-foreground">
                  Выбрано: {selectedOrders.length}
                </Badge>
                <Button variant="outline" size="sm" onClick={() => handleOpenOrder(selectedOrders[0].id)}>
                  Открыть первый
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleExport(selectedOrders, 'selected')}>
                  <DownloadIcon className="size-4" />
                  Экспорт выделенного
                </Button>
                <Button variant="outline" size="sm" onClick={() => void handleCopySelectedOrderNumbers()}>
                  Скопировать номера
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setSelectedOrderIds(new Set())}>
                  Снять выделение
                </Button>
                {bulkFeedbackMessage ? <p className="text-sm text-muted-foreground">{bulkFeedbackMessage}</p> : null}
              </div>
            ) : null}

            {errorMessage ? <AdminNotice tone="destructive">{errorMessage}</AdminNotice> : null}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                {visibleOrders.length
                  ? `Показано ${pagination.visibleStart}-${pagination.visibleEnd} из ${visibleOrders.length}. Срез содержит ${filteredScopeSummary} заказов до дополнительных фильтров.`
                  : 'Ни одна строка не попала в текущий срез.'}
              </p>
              <p className="text-sm text-muted-foreground">
                Сортировка: {getSortColumnLabel(sort.key)}
                {' • '}
                {sort.direction === 'asc' ? 'по возрастанию' : 'по убыванию'}
              </p>
            </div>

            {isLoading ? (
              <OrdersTableSkeleton />
            ) : hasNoOrders ? (
              <AdminEmptyState
                title="Очередь заказов пуста"
                description="Backend не вернул ни одного активного заказа. Обновите данные позже или проверьте, не ушли ли заказы в финальные статусы вне этой очереди."
              />
            ) : hasNoScopedOrders ? (
              <AdminEmptyState
                title="В выбранном представлении нет заказов"
                description="Этот saved view сейчас пуст. Переключитесь на другой срез или сохраните новый view под актуальную рабочую ситуацию."
              />
            ) : hasNoFilteredOrders ? (
              <AdminEmptyState
                title="Фильтры скрыли все строки"
                description="Очередь заказов не пуста, но текущие chips и search не дают ни одного совпадения. Сбросьте часть токенов или вернитесь к базовому представлению."
              />
            ) : (
              <OrdersTable
                orders={pagination.paginatedItems}
                activeOrderId={selectedOrderId}
                density={density}
                visibleColumnIds={visibleColumnIds}
                selectedOrderIds={selectedOrderIds}
                sort={sort}
                isAllPageRowsSelected={isAllPageRowsSelected}
                isSomePageRowsSelected={isSomePageRowsSelected}
                onOpenOrder={handleOpenOrder}
                onSortChange={handleSortChange}
                onToggleOrderSelection={handleToggleOrderSelection}
                onTogglePageSelection={handleTogglePageSelection}
              />
            )}

            {!isLoading && visibleOrders.length ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
                    disabled={pagination.currentPage === 1}
                  >
                    Назад
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setPage((currentPage) => Math.min(pagination.totalPages, currentPage + 1))}
                    disabled={pagination.currentPage === pagination.totalPages}
                  >
                    Вперёд
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Страница {pagination.currentPage} из {pagination.totalPages}
                </p>
              </div>
            ) : null}
          </div>
        </AdminSectionCard>
      </AdminPage>

      <OrderDetailsDrawer
        isOpen={Boolean(selectedOrderId)}
        order={selectedOrder}
        isLoading={isOrderDetailsLoading}
        errorMessage={orderDetailsErrorMessage}
        isStatusMetaLoading={isStatusMetaLoading}
        isStatusUpdating={isStatusUpdating}
        statusTransitions={availableStatusTransitions}
        statusTransitionsErrorMessage={statusTransitionsErrorMessage}
        statusHistory={statusHistory}
        statusHistoryErrorMessage={statusHistoryErrorMessage}
        statusErrorMessage={statusUpdateErrorMessage}
        statusSuccessMessage={statusUpdateSuccessMessage}
        productMetaById={productMetaById}
        productMetaErrorMessage={productMetaErrorMessage}
        onClose={handleCloseOrderDrawer}
        onStatusSubmit={handleStatusSubmit}
      />
    </>
  );
}

export default OrdersPage;
