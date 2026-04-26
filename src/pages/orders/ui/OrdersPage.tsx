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
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  changeOrderStatus,
  getAdminOrders,
  getAvailableOrderStatusTransitions,
  getOrderById,
  getOrderStatusHistory,
  type OrderListResult,
  type Order,
  type OrderStatusHistoryEntry,
  type OrderStatusTransition,
} from '@/entities/order';
import { getOrderStatuses } from '@/entities/order-status';
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
  FormField,
  Input,
  Select,
  SegmentedControl,
  buttonVariants,
} from '@/shared/ui';
import {
  buildOrdersCsv,
  buildOrdersRequestQuery,
  buildSystemOrdersViews,
  DEFAULT_ORDER_FILTERS,
  DEFAULT_ORDERS_DENSITY,
  DEFAULT_ORDER_SORT,
  DEFAULT_VISIBLE_ORDER_COLUMNS,
  isOrdersServerSortable,
  ORDER_PAGE_SIZE_OPTIONS,
  ORDER_TABLE_COLUMN_LABELS,
  sanitizeOrdersSort,
  type OrderDateRangeFilter,
  type OrderFilters,
  type OrdersColumnId,
  type OrdersDensity,
  type OrdersSavedView,
  type OrdersScopeViewId,
  type OrdersSortKey,
  type OrdersSortState,
} from '@/pages/orders/model/orderPageView';
import { OrderDetailsPage } from '@/pages/orders/ui/OrderDetailsPage';
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

function sanitizeVisibleColumnIds(value: unknown): OrdersColumnId[] {
  if (!Array.isArray(value)) {
    return [...DEFAULT_VISIBLE_ORDER_COLUMNS];
  }

  const nextVisibleColumnIds = DEFAULT_VISIBLE_ORDER_COLUMNS.filter((columnId) => value.includes(columnId));

  return nextVisibleColumnIds.length ? nextVisibleColumnIds : [...DEFAULT_VISIBLE_ORDER_COLUMNS];
}

function sanitizeScopeViewId(value: unknown): OrdersScopeViewId {
  if (value === 'new' || value === 'in-work' || value === 'problematic') {
    return value;
  }

  return 'all';
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
        scopeViewId: sanitizeScopeViewId(view.scopeViewId),
        filters: {
          ...DEFAULT_ORDER_FILTERS,
          ...view.filters,
        },
        sort: sanitizeOrdersSort({
          ...DEFAULT_ORDER_SORT,
          ...view.sort,
        }),
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
  const location = useLocation();
  const params = useParams<{ orderId?: string }>();
  const selectedOrderId = params.orderId ?? null;
  const ordersBasePath = location.pathname.startsWith('/admin/orders') ? '/admin/orders' : '/orders';

  const systemViews = useMemo(() => buildSystemOrdersViews(), []);

  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersMeta, setOrdersMeta] = useState<OrderListResult['meta']>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const [filters, setFilters] = useState<OrderFilters>(DEFAULT_ORDER_FILTERS);
  const deferredSearchQuery = useDeferredValue(filters.searchQuery);
  const [activeScopeViewId, setActiveScopeViewId] = useState<OrdersScopeViewId>('all');
  const [activeViewId, setActiveViewId] = useState<string | null>('all');
  const [customViews, setCustomViews] = useState<OrdersSavedView[]>(() => readCustomViews());
  const [sort, setSort] = useState<OrdersSortState>(() => sanitizeOrdersSort(DEFAULT_ORDER_SORT));
  const [density, setDensity] = useState<OrdersDensity>(DEFAULT_ORDERS_DENSITY);
  const [visibleColumnIds, setVisibleColumnIds] = useState<OrdersColumnId[]>(DEFAULT_VISIBLE_ORDER_COLUMNS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(ORDER_PAGE_SIZE_OPTIONS[0]);
  const [isColumnSettingsOpen, setIsColumnSettingsOpen] = useState(false);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(() => new Set());
  const [bulkFeedbackMessage, setBulkFeedbackMessage] = useState('');
  const [availableStatuses, setAvailableStatuses] = useState<Awaited<ReturnType<typeof getOrderStatuses>>['statuses']>([]);
  const [statusOptionsErrorMessage, setStatusOptionsErrorMessage] = useState('');

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
  const ordersRequestIdRef = useRef(0);
  const isFirstOrdersLoadRef = useRef(true);
  const orderDetailsRequestIdRef = useRef(0);
  const statusMetaRequestIdRef = useRef(0);

  const ordersQuery = useMemo(
    () =>
      buildOrdersRequestQuery({
        filters: {
          ...filters,
          searchQuery: deferredSearchQuery,
        },
        page,
        pageSize,
        scopeViewId: activeScopeViewId,
        sort,
      }),
    [activeScopeViewId, deferredSearchQuery, filters.dateRangeFilter, filters.deliveryFilter, filters.statusFilter, page, pageSize, sort],
  );

  const loadOrdersData = async ({
    query = ordersQuery,
    showInitialLoader = false,
  }: {
    query?: Parameters<typeof getAdminOrders>[0];
    showInitialLoader?: boolean;
  } = {}) => {
    const requestId = ordersRequestIdRef.current + 1;
    ordersRequestIdRef.current = requestId;

    if (showInitialLoader) {
      setIsLoading(true);
      setIsRefreshing(false);
    } else {
      setIsRefreshing(true);
    }

    setErrorMessage('');

    const result = await getAdminOrders(query);

    if (requestId !== ordersRequestIdRef.current) {
      return result;
    }

    setOrders(result.orders);
    setOrdersMeta(result.meta);
    setErrorMessage(result.error ?? '');
    setIsLoading(false);
    setIsRefreshing(false);

    return result;
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

  const loadOrderStatuses = async () => {
    const result = await getOrderStatuses();

    if (result.error) {
      setAvailableStatuses([]);
      setStatusOptionsErrorMessage(result.error);
      return;
    }

    setAvailableStatuses(result.statuses.filter((status) => status.isActive).sort((left, right) => left.name.localeCompare(right.name, 'ru')));
    setStatusOptionsErrorMessage('');
  };

  const loadSelectedOrderDetails = async (orderId: string, fallbackOrder?: Order | null) => {
    const requestId = orderDetailsRequestIdRef.current + 1;
    orderDetailsRequestIdRef.current = requestId;

    setIsOrderDetailsLoading(true);
    setOrderDetailsErrorMessage('');

    if (fallbackOrder !== undefined) {
      setSelectedOrder(fallbackOrder);
    }

    const result = await getOrderById(orderId);

    if (requestId !== orderDetailsRequestIdRef.current) {
      return result;
    }

    if (!result.order) {
      setSelectedOrder(fallbackOrder ?? null);
      setOrderDetailsErrorMessage(result.error ?? 'Не удалось загрузить детали заказа.');
      setIsOrderDetailsLoading(false);
      return result;
    }

    const nextOrder = result.order;

    setSelectedOrder(nextOrder);
    setOrders((currentOrders) => upsertOrderById(currentOrders, nextOrder));
    setOrderDetailsErrorMessage('');
    setIsOrderDetailsLoading(false);

    return result;
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
    if (selectedOrderId) {
      return;
    }

    const shouldShowInitialLoader = isFirstOrdersLoadRef.current;

    isFirstOrdersLoadRef.current = false;

    void loadOrdersData({
      query: ordersQuery,
      showInitialLoader: shouldShowInitialLoader,
    });
  }, [ordersQuery, selectedOrderId]);

  useEffect(() => {
    void loadProductMetaData();
    void loadOrderStatuses();
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

  const selectedOrders = useMemo(() => orders.filter((order) => selectedOrderIds.has(order.id)), [orders, selectedOrderIds]);

  useEffect(() => {
    setSelectedOrderIds((currentSelectedOrderIds) => {
      const nextSelectedOrderIds = new Set([...currentSelectedOrderIds].filter((orderId) => knownOrderLookup.has(orderId)));

      return nextSelectedOrderIds.size === currentSelectedOrderIds.size ? currentSelectedOrderIds : nextSelectedOrderIds;
    });
  }, [knownOrderLookup]);

  useEffect(() => {
    if (!selectedOrderId) {
      orderDetailsRequestIdRef.current += 1;
      setSelectedOrder(null);
      setOrderDetailsErrorMessage('');
      setIsOrderDetailsLoading(false);
      setStatusUpdateErrorMessage('');
      setStatusUpdateSuccessMessage('');
      return;
    }

    const fallbackOrder = knownOrderLookup.get(selectedOrderId) ?? null;

    setStatusUpdateErrorMessage('');
    setStatusUpdateSuccessMessage('');
    void loadSelectedOrderDetails(selectedOrderId, fallbackOrder);
  }, [selectedOrderId]);

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
    setPage(1);
    setActiveViewId(null);
    setBulkFeedbackMessage('');
  };

  const handleSortChange = (key: OrdersSortKey) => {
    if (!isOrdersServerSortable(key)) {
      return;
    }

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
    setPage(1);
    setActiveViewId(null);
  };

  const handleOpenOrder = (orderId: string) => {
    setStatusUpdateErrorMessage('');
    setStatusUpdateSuccessMessage('');
    navigate(`${ordersBasePath}/${orderId}`);
  };

  const handleCloseOrderPage = () => {
    setSelectedOrder(null);
    setOrderDetailsErrorMessage('');
    setStatusUpdateErrorMessage('');
    setStatusUpdateSuccessMessage('');
    setIsStatusUpdating(false);
    navigate(ordersBasePath, { replace: true });
  };

  const handleRefresh = async () => {
    if (selectedOrderId) {
      await Promise.all([
        loadSelectedOrderDetails(selectedOrderId, selectedOrder),
        loadSelectedOrderStatusData(selectedOrderId),
      ]);
      return;
    }

    await loadOrdersData({ query: ordersQuery });
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
    void loadOrdersData({ query: ordersQuery });
  };

  const applyView = (view: OrdersSavedView) => {
    setActiveViewId(view.id);
    setActiveScopeViewId(view.scopeViewId ?? 'all');
    setFilters({
      ...DEFAULT_ORDER_FILTERS,
      ...view.filters,
    });
    setSort(sanitizeOrdersSort(view.sort));
    setDensity(view.density);
    setVisibleColumnIds(sanitizeVisibleColumnIds(view.visibleColumnIds));
    setPage(1);
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
      sort: sanitizeOrdersSort(sort),
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
    setSort(sanitizeOrdersSort(DEFAULT_ORDER_SORT));
    setDensity(DEFAULT_ORDERS_DENSITY);
    setVisibleColumnIds(DEFAULT_VISIBLE_ORDER_COLUMNS);
    setPage(1);
    setSelectedOrderIds(new Set());
    setBulkFeedbackMessage('');
  };

  const currentPageOrderIds = useMemo(() => orders.map((order) => order.id), [orders]);
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

  const handleExportCurrentResult = async () => {
    if (isExporting) {
      return;
    }

    setIsExporting(true);
    setErrorMessage('');

    const exportQuery = {
      ...ordersQuery,
      pageSize: 100 as const,
    };
    const exportedOrders: Order[] = [];
    let nextPage = 1;
    let totalPages = 1;

    try {
      do {
        const result = await getAdminOrders({
          ...exportQuery,
          page: nextPage,
        });

        if (result.error || !result.meta) {
          setErrorMessage(result.error ?? 'Не удалось выгрузить текущую выборку заказов.');
          return;
        }

        exportedOrders.push(...result.orders);
        totalPages = result.meta.totalPages;
        nextPage += 1;
      } while (nextPage <= totalPages);

      handleExport(exportedOrders, 'filtered');
    } finally {
      setIsExporting(false);
    }
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
                setPage(1);
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

  const currentPage = ordersMeta?.page ?? page;
  const totalPages = ordersMeta?.totalPages ?? 1;
  const totalItems = ordersMeta?.totalItems ?? orders.length;
  const visibleStart = orders.length ? (currentPage - 1) * pageSize + 1 : 0;
  const visibleEnd = orders.length ? visibleStart + orders.length - 1 : 0;
  const statusText = isLoading
    ? 'Загрузка заказов...'
    : totalItems
      ? `Найдено ${formatViewCount(totalItems)} • страница ${currentPage} из ${formatViewCount(totalPages)}`
      : 'Совпадений нет';
  const visibleColumnsSummary = visibleColumnIds.map((columnId) => ORDER_TABLE_COLUMN_LABELS[columnId]).join(', ');
  const hasNoOrders = !orders.length && !isLoading;
  const hasActiveServerFilters = activeFilterTokens.length > 0;

  if (selectedOrderId) {
    return (
      <OrderDetailsPage
        orderId={selectedOrderId}
        backPath={ordersBasePath}
        order={selectedOrder}
        isLoading={isOrderDetailsLoading}
        isRefreshing={isOrderDetailsLoading || isStatusMetaLoading}
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
        onBack={handleCloseOrderPage}
        onRefresh={() => void handleRefresh()}
        onStatusSubmit={handleStatusSubmit}
      />
    );
  }

  return (
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
            <Button variant="outline" onClick={() => void handleExportCurrentResult()} disabled={!totalItems || isExporting}>
              <DownloadIcon className="size-4" />
              {isExporting ? 'Экспорт...' : 'Экспорт'}
            </Button>
          </div>
        }
      >
        <div className="space-y-5">
            <div className="space-y-3">
              <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">Saved Views</p>
              <div className="flex flex-wrap gap-2">
                {systemViews.map((view) => (
                  <ViewChip key={view.id} isActive={activeViewId === view.id} label={view.name} onClick={() => applyView(view)} />
                ))}
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

            <div className="grid gap-4 xl:grid-cols-[minmax(18rem,24rem)_minmax(10rem,13rem)_minmax(12rem,15rem)_minmax(12rem,1fr)]">
              <FormField className="min-w-0" htmlFor="orders-search-input" label="Быстрый поиск">
                <div className="relative">
                  <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="orders-search-input"
                    type="search"
                    className="h-11 rounded-xl bg-background/80 pl-10 shadow-sm"
                    placeholder="Номер, клиент, телефон, email"
                    value={filters.searchQuery}
                    onChange={(event) => updateFilters((currentFilters) => ({ ...currentFilters, searchQuery: event.target.value }))}
                  />
                </div>
              </FormField>

              <FormField htmlFor="orders-date-filter" label="Период">
                <Select
                  id="orders-date-filter"
                  value={filters.dateRangeFilter}
                  onChange={(event) =>
                    updateFilters((currentFilters) => ({
                      ...currentFilters,
                      dateRangeFilter: event.target.value as OrderDateRangeFilter,
                    }))
                  }
                >
                  {DATE_FILTER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </FormField>

              <FormField htmlFor="orders-delivery-filter" label="Доставка">
                <Select
                  id="orders-delivery-filter"
                  value={filters.deliveryFilter}
                  onChange={(event) =>
                    updateFilters((currentFilters) => ({
                      ...currentFilters,
                      deliveryFilter: event.target.value as OrderFilters['deliveryFilter'],
                    }))
                  }
                >
                  {DELIVERY_FILTER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </FormField>

              <FormField htmlFor="orders-status-filter" label="Статус">
                <Select
                  id="orders-status-filter"
                  value={filters.statusFilter}
                  onChange={(event) =>
                    updateFilters((currentFilters) => ({
                      ...currentFilters,
                      statusFilter: event.target.value as OrderFilters['statusFilter'],
                    }))
                  }
                >
                  <option value="all">Все статусы</option>
                  {availableStatuses.map((status) => (
                    <option key={status.id} value={status.code}>
                      {status.name}
                    </option>
                  ))}
                </Select>
              </FormField>
            </div>

            {statusOptionsErrorMessage ? <AdminNotice tone="destructive">{statusOptionsErrorMessage}</AdminNotice> : null}

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
              Детали заказа теперь открываются отдельной страницей. Таблица остаётся server-side, а поля <strong>Источник</strong>,{' '}
              <strong>Менеджер / оператор</strong> и <strong>Теги</strong> в списке пока ещё показываются с fallback-значениями.
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
                  <Select
                    className="h-10"
                    value={pageSize}
                    onChange={(event) => {
                      setPageSize(Number(event.target.value));
                      setPage(1);
                    }}
                  >
                    {ORDER_PAGE_SIZE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option} строк
                      </option>
                    ))}
                  </Select>
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
                {orders.length
                  ? `Показано ${visibleStart}-${visibleEnd} из ${formatViewCount(totalItems)}. Фильтры, поиск, сортировка и пагинация выполняются на сервере.`
                  : 'Ни одна строка не попала в текущую выборку.'}
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
                title={hasActiveServerFilters ? 'Ничего не найдено' : 'Очередь заказов пуста'}
                description={
                  hasActiveServerFilters
                    ? 'Текущие фильтры и поиск не вернули ни одного заказа. Сбросьте часть ограничений или переключитесь на другой сохранённый view.'
                    : 'Backend не вернул ни одного активного заказа. Обновите данные позже или проверьте, не ушли ли заказы в финальные статусы вне этой очереди.'
                }
              />
            ) : (
              <OrdersTable
                orders={orders}
                activeOrderId={null}
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

            {!isLoading && orders.length ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    Назад
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setPage((currentPageValue) => Math.min(totalPages, currentPageValue + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Вперёд
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Страница {currentPage} из {totalPages}
                </p>
              </div>
            ) : null}
        </div>
      </AdminSectionCard>
    </AdminPage>
  );
}

export default OrdersPage;
