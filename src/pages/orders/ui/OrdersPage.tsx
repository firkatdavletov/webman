import { useEffect, useMemo, useState } from 'react';
import {
  getAdminOrders,
  getOrderById,
  searchAdminOrderByNumber,
  type Order,
  type OrderStatus,
  updateOrderStatus,
} from '@/entities/order';
import { getAllProducts } from '@/entities/product';
import { getPrimaryMediaImageUrl } from '@/shared/lib/media/images';
import { OrderSearch } from '@/features/order-search';
import { paginateItems } from '@/pages/orders/model/orderPageView';
import { NavBar } from '@/shared/ui/NavBar';
import { OrderDetailsDrawer } from '@/widgets/order-details';
import { OrdersTable } from '@/widgets/orders-table';

type OrderProductMeta = {
  imageUrl: string | null;
  sku: string | null;
};

const ADMIN_QUEUE_STATUSES = new Set<OrderStatus>(['PENDING', 'CONFIRMED']);
const ORDERS_PAGE_SIZE = 10;

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
        imageUrl: getPrimaryMediaImageUrl(product.images) || null,
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

  const visibleOrders = useMemo(
    () => sourceOrders.slice().sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt)),
    [sourceOrders],
  );
  const pagination = useMemo(() => paginateItems(visibleOrders, page, ORDERS_PAGE_SIZE), [page, visibleOrders]);

  useEffect(() => {
    setPage(1);
  }, [sourceOrders]);

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
