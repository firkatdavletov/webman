import { useEffect, useMemo, useState } from 'react';
import {
  getAdminOrders,
  getOrderById,
  searchAdminOrderByNumber,
  type Order,
  type OrderDeliveryType,
  type OrderStatus,
  updateOrderStatus,
} from '@/entities/order';
import { getAllProducts } from '@/entities/product';
import { OrderFilters } from '@/features/order-filters';
import { OrderSearch } from '@/features/order-search';
import {
  filterOrders,
  OrderDateRangeFilter,
  ORDER_PAGE_SIZE_OPTIONS,
  paginateItems,
} from '@/pages/orders/model/orderPageView';
import { NavBar } from '@/shared/ui/NavBar';
import { OrderDetailsDrawer } from '@/widgets/order-details';
import { OrdersTable } from '@/widgets/orders-table';

type OrderProductMeta = {
  imageUrl: string | null;
  sku: string | null;
};

const ADMIN_QUEUE_STATUSES = new Set<OrderStatus>(['PENDING', 'CONFIRMED']);

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

  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all');
  const [paymentFilter, setPaymentFilter] = useState<'unsupported'>('unsupported');
  const [deliveryFilter, setDeliveryFilter] = useState<'all' | OrderDeliveryType>('all');
  const [dateRangeFilter, setDateRangeFilter] = useState<OrderDateRangeFilter>('all');
  const [pageSize, setPageSize] = useState<number>(ORDER_PAGE_SIZE_OPTIONS[0]);
  const [page, setPage] = useState(1);

  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isOrderDetailsLoading, setIsOrderDetailsLoading] = useState(false);
  const [orderDetailsErrorMessage, setOrderDetailsErrorMessage] = useState('');

  const [isStatusUpdating, setIsStatusUpdating] = useState(false);
  const [statusUpdateErrorMessage, setStatusUpdateErrorMessage] = useState('');
  const [statusUpdateSuccessMessage, setStatusUpdateSuccessMessage] = useState('');

  const [productMetaById, setProductMetaById] = useState<Map<string, OrderProductMeta>>(() => new Map());
  const [productMetaErrorMessage, setProductMetaErrorMessage] = useState('');

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
        imageUrl: product.imageUrl,
        sku: product.sku,
      });
    });

    setProductMetaById(nextProductMetaById);
    setProductMetaErrorMessage('');
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

  const filteredOrders = useMemo(
    () =>
      filterOrders(sourceOrders, {
        statusFilter,
        deliveryFilter,
        paymentFilter,
        dateRangeFilter,
      }),
    [dateRangeFilter, deliveryFilter, paymentFilter, sourceOrders, statusFilter],
  );

  const pagination = useMemo(() => paginateItems(filteredOrders, page, pageSize), [filteredOrders, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [dateRangeFilter, deliveryFilter, pageSize, paymentFilter, sourceOrders, statusFilter]);

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
    setIsOrderDetailsLoading(true);

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

  const handleRefresh = async () => {
    await loadOrdersData();

    if (isSearchActive) {
      await runSearch(activeSearchQuery);
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

  const handleStatusSubmit = async (status: OrderStatus) => {
    if (!selectedOrder) {
      return;
    }

    setIsStatusUpdating(true);
    setStatusUpdateErrorMessage('');
    setStatusUpdateSuccessMessage('');

    const result = await updateOrderStatus({
      orderId: selectedOrder.id,
      status,
    });

    if (!result.order) {
      setStatusUpdateErrorMessage(result.error ?? 'Не удалось изменить статус заказа.');
      setIsStatusUpdating(false);
      return;
    }

    const updatedOrder = result.order;

    setSelectedOrder(updatedOrder);
    setStatusUpdateSuccessMessage('Статус заказа обновлен.');

    setOrders((currentOrders) => {
      const nextOrders = currentOrders.filter((order) => order.id !== updatedOrder.id);

      if (ADMIN_QUEUE_STATUSES.has(updatedOrder.status)) {
        nextOrders.unshift(updatedOrder);
      }

      return nextOrders;
    });

    setSearchedOrder((currentOrder) => {
      if (!currentOrder || currentOrder.id !== updatedOrder.id) {
        return currentOrder;
      }

      return updatedOrder;
    });

    setIsStatusUpdating(false);

    void loadOrdersData();
  };

  const isDrawerOpen = Boolean(selectedOrderId);

  return (
    <div className="app-shell">
      <NavBar />

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
          </div>
        </header>

        <section className="catalog-card catalog-data-card" aria-label="Заказы в админке">
          <div className="catalog-card-copy">
            <p className="placeholder-eyebrow">MVP</p>
            <h3 className="catalog-card-title">Операционный список заказов</h3>
            <p className="catalog-card-text">
              Источник: `GET /api/v1/admin/orders`, поиск: `GET /api/v1/admin/orders/search`, детали: `GET /api/v1/orders/{'{orderId}'}`.
            </p>
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
              statusFilter={statusFilter}
              paymentFilter={paymentFilter}
              deliveryFilter={deliveryFilter}
              dateRangeFilter={dateRangeFilter}
              pageSize={pageSize}
              pageSizeOptions={ORDER_PAGE_SIZE_OPTIONS}
              disabled={isLoading || isSearching}
              onStatusFilterChange={setStatusFilter}
              onPaymentFilterChange={setPaymentFilter}
              onDeliveryFilterChange={setDeliveryFilter}
              onDateRangeFilterChange={setDateRangeFilter}
              onPageSizeChange={setPageSize}
            />

            <p className="catalog-results-meta">
              {filteredOrders.length
                ? `Показано ${pagination.visibleStart}-${pagination.visibleEnd} из ${filteredOrders.length} заказов`
                : 'Нет заказов, подходящих под текущие фильтры'}
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
                ? searchedOrder
                  ? 'Заказ найден, но не проходит текущие фильтры.'
                  : 'По указанному номеру заказа ничего не найдено.'
                : orders.length
                  ? 'Нет заказов, подходящих под текущие фильтры.'
                  : 'Очередь заказов пуста.'}
            </p>
          )}

          {!isLoading && filteredOrders.length ? (
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
        isStatusUpdating={isStatusUpdating}
        statusErrorMessage={statusUpdateErrorMessage}
        statusSuccessMessage={statusUpdateSuccessMessage}
        productMetaById={productMetaById}
        productMetaErrorMessage={productMetaErrorMessage}
        onClose={handleCloseOrderDrawer}
        onStatusSubmit={handleStatusSubmit}
      />
    </div>
  );
}
