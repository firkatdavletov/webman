import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  changeOrderStatus,
  getAdminOrders,
  getAvailableOrderStatusTransitions,
  getOrderById,
  getOrderStatusHistory,
  searchAdminOrderByNumber,
  type Order,
  type OrderStatus,
  type OrderStatusCode,
  type OrderStatusHistoryEntry,
  type OrderStatusTransition,
} from '@/entities/order';
import { getAllProducts } from '@/entities/product';
import { OrderFilters } from '@/features/order-filters';
import { OrderSearch } from '@/features/order-search';
import { filterOrders, ORDER_PAGE_SIZE_OPTIONS, paginateItems, type OrderFilters as OrdersPageFilterState } from '@/pages/orders/model/orderPageView';
import { getPrimaryMediaImageUrl } from '@/shared/lib/media/images';
import { OrderDetailsDrawer } from '@/widgets/order-details';
import { OrdersTable } from '@/widgets/orders-table';

type OrderProductMeta = {
  imageUrl: string | null;
  sku: string | null;
};

const DEFAULT_ORDER_FILTERS: OrdersPageFilterState = {
  statusFilter: 'all',
  deliveryFilter: 'all',
  paymentFilter: 'unsupported',
  dateRangeFilter: 'all',
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

export function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearchQuery, setActiveSearchQuery] = useState('');
  const [searchedOrder, setSearchedOrder] = useState<Order | null>(null);
  const [searchErrorMessage, setSearchErrorMessage] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const [filters, setFilters] = useState<OrdersPageFilterState>(DEFAULT_ORDER_FILTERS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(ORDER_PAGE_SIZE_OPTIONS[0]);

  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
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
      setProductMetaErrorMessage('Не удалось загрузить данные товаров (SKU и фото) для деталей заказа.');
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

  const runSearch = async (orderNumber: string) => {
    const normalizedOrderNumber = orderNumber.trim();

    if (!normalizedOrderNumber) {
      setActiveSearchQuery('');
      setSearchedOrder(null);
      setSearchErrorMessage('');
      return;
    }

    setIsSearching(true);
    setSearchErrorMessage('');

    const result = await searchAdminOrderByNumber(normalizedOrderNumber);

    setActiveSearchQuery(normalizedOrderNumber);
    setSearchedOrder(result.order);
    setSearchErrorMessage(result.error ?? '');
    setIsSearching(false);
  };

  const isSearchActive = Boolean(activeSearchQuery.trim());

  const sourceOrders = useMemo(() => {
    if (!isSearchActive) {
      return orders;
    }

    if (!searchedOrder) {
      return [];
    }

    return [searchedOrder];
  }, [isSearchActive, orders, searchedOrder]);

  const visibleOrders = useMemo(
    () => filterOrders(sourceOrders, filters),
    [filters, sourceOrders],
  );
  const pagination = useMemo(() => paginateItems(visibleOrders, page, pageSize), [page, pageSize, visibleOrders]);

  useEffect(() => {
    setPage(1);
  }, [filters, pageSize, sourceOrders]);

  const knownOrders = useMemo(() => {
    const nextOrders = [...orders];

    if (searchedOrder && !nextOrders.some((order) => order.id === searchedOrder.id)) {
      nextOrders.unshift(searchedOrder);
    }

    return nextOrders;
  }, [orders, searchedOrder]);

  const knownOrderLookup = useMemo(() => {
    const nextLookup = new Map<string, Order>();

    knownOrders.forEach((order) => {
      nextLookup.set(order.id, order);
    });

    return nextLookup;
  }, [knownOrders]);

  const availableStatuses = useMemo(() => buildAvailableStatuses(knownOrders), [knownOrders]);

  useEffect(() => {
    if (filters.statusFilter === 'all') {
      return;
    }

    const statusExists = availableStatuses.some((status) => status.code === filters.statusFilter);

    if (!statusExists) {
      setFilters((currentFilters) => ({
        ...currentFilters,
        statusFilter: 'all',
      }));
    }
  }, [availableStatuses, filters.statusFilter]);

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

  const handleRefresh = async () => {
    await loadOrdersData();

    if (isSearchActive) {
      await runSearch(activeSearchQuery);
    }

    if (selectedOrderId) {
      await loadSelectedOrderStatusData(selectedOrderId);
    }
  };

  const handleSearch = async () => {
    await runSearch(searchQuery);
  };

  const handleResetSearch = () => {
    setSearchQuery('');
    setActiveSearchQuery('');
    setSearchedOrder(null);
    setSearchErrorMessage('');
  };

  const handleOpenOrder = (orderId: string) => {
    setSelectedOrderId(orderId);
    setStatusUpdateErrorMessage('');
    setStatusUpdateSuccessMessage('');
  };

  const handleCloseOrderDrawer = () => {
    setSelectedOrderId(null);
    setSelectedOrder(null);
    setOrderDetailsErrorMessage('');
    setStatusUpdateErrorMessage('');
    setStatusUpdateSuccessMessage('');
    setIsStatusUpdating(false);
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

    setSearchedOrder((currentOrder) => {
      if (!currentOrder || currentOrder.id !== updatedOrder.id) {
        return currentOrder;
      }

      return updatedOrder;
    });

    setIsStatusUpdating(false);

    await loadSelectedOrderStatusData(updatedOrder.id);
    void loadOrdersData();
  };

  const isDrawerOpen = Boolean(selectedOrderId);

  return (
    <>
      <main className="dashboard">
        <header className="dashboard-header">
          <div>
            <p className="page-kicker">Операции</p>
            <h2 className="page-title">Заказы</h2>
          </div>
          <div className="dashboard-actions">
            <span className="status-chip">
              {isLoading
                ? 'Загрузка заказов...'
                : isSearchActive
                  ? `Поиск по номеру: ${activeSearchQuery}`
                  : `${orders.length} заказов в очереди`}
            </span>
            <button
              type="button"
              className="secondary-button"
              onClick={() => void handleRefresh()}
              disabled={isLoading || isRefreshing || isSearching}
            >
              {isRefreshing ? 'Обновление...' : 'Обновить данные'}
            </button>
            <Link className="secondary-link" to="/order-statuses">
              Справочник статусов
            </Link>
          </div>
        </header>

        <section className="catalog-card catalog-data-card" aria-label="Заказы в админке">
          <div className="catalog-card-copy">
            <p className="placeholder-eyebrow">MVP</p>
            <h3 className="catalog-card-title">Операционный список заказов</h3>
          </div>

          <div className="catalog-controls orders-controls">
            <OrderSearch
              searchQuery={searchQuery}
              activeSearchQuery={activeSearchQuery}
              isSearching={isSearching}
              disabled={isLoading}
              onSearchQueryChange={setSearchQuery}
              onSearch={handleSearch}
              onResetSearch={handleResetSearch}
            />

            <OrderFilters
              availableStatuses={availableStatuses}
              statusFilter={filters.statusFilter}
              paymentFilter={filters.paymentFilter}
              deliveryFilter={filters.deliveryFilter}
              dateRangeFilter={filters.dateRangeFilter}
              pageSize={pageSize}
              pageSizeOptions={ORDER_PAGE_SIZE_OPTIONS}
              disabled={isLoading || isSearching}
              onStatusFilterChange={(value) =>
                setFilters((currentFilters) => ({
                  ...currentFilters,
                  statusFilter: value,
                }))
              }
              onPaymentFilterChange={(value) =>
                setFilters((currentFilters) => ({
                  ...currentFilters,
                  paymentFilter: value,
                }))
              }
              onDeliveryFilterChange={(value) =>
                setFilters((currentFilters) => ({
                  ...currentFilters,
                  deliveryFilter: value,
                }))
              }
              onDateRangeFilterChange={(value) =>
                setFilters((currentFilters) => ({
                  ...currentFilters,
                  dateRangeFilter: value,
                }))
              }
              onPageSizeChange={setPageSize}
            />

            <p className="catalog-results-meta">
              {visibleOrders.length
                ? `Показано ${pagination.visibleStart}-${pagination.visibleEnd} из ${visibleOrders.length} заказов`
                : 'Нет заказов для отображения'}
            </p>
          </div>

          {errorMessage ? (
            <p className="form-error" role="alert">
              {errorMessage}
            </p>
          ) : null}

          {searchErrorMessage ? (
            <p className="form-error" role="alert">
              {searchErrorMessage}
            </p>
          ) : null}

          {isLoading ? (
            <p className="catalog-empty-state">Загрузка заказов с бэкенда...</p>
          ) : pagination.paginatedItems.length ? (
            <OrdersTable
              orders={pagination.paginatedItems}
              selectedOrderId={selectedOrderId}
              onOpenOrder={handleOpenOrder}
            />
          ) : (
            <p className="catalog-empty-state">
              {isSearchActive
                ? 'По указанному номеру заказа ничего не найдено.'
                : orders.length
                  ? 'Нет заказов для отображения.'
                  : 'Очередь заказов пуста.'}
            </p>
          )}

          {!isLoading && visibleOrders.length ? (
            <div className="pagination-bar">
              <button
                type="button"
                className="secondary-button pagination-button"
                onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
                disabled={pagination.currentPage === 1}
              >
                Назад
              </button>
              <p className="pagination-text">
                Страница {pagination.currentPage} из {pagination.totalPages}
              </p>
              <button
                type="button"
                className="secondary-button pagination-button"
                onClick={() => setPage((currentPage) => Math.min(pagination.totalPages, currentPage + 1))}
                disabled={pagination.currentPage === pagination.totalPages}
              >
                Далее
              </button>
            </div>
          ) : null}
        </section>
      </main>

      <OrderDetailsDrawer
        isOpen={isDrawerOpen}
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
