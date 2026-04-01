import { useEffect } from 'react';
import {
  formatMoneyMinor,
  formatOrderDeliveryDestination,
  formatOrderDateTime,
  formatOrderItemQuantity,
  getDeliveryTypeLabel,
  getOrderStatusLabel,
  getOrderStatusTone,
  getPaymentMethodLabel,
  getPaymentStatusPlaceholderLabel,
  type Order,
  type OrderStatus,
} from '@/entities/order';
import { ChangeOrderStatus } from '@/features/change-order-status';

type OrderItemProductMeta = {
  imageUrl: string | null;
  sku: string | null;
};

type OrderDetailsDrawerProps = {
  isOpen: boolean;
  order: Order | null;
  isLoading: boolean;
  errorMessage: string;
  isStatusUpdating: boolean;
  statusErrorMessage: string;
  statusSuccessMessage: string;
  productMetaById: Map<string, OrderItemProductMeta>;
  productMetaErrorMessage: string;
  onClose: () => void;
  onStatusSubmit: (status: OrderStatus) => void;
};

function renderInfoValue(value: string | null | undefined, emptyLabel = 'Не указано'): string {
  const normalizedValue = value?.trim() ?? '';

  return normalizedValue || emptyLabel;
}

function formatDeliveryEstimate(order: Order): string {
  const parts = [];

  if (order.delivery.estimatedDays !== null) {
    parts.push(`${order.delivery.estimatedDays} дн.`);
  }

  if (order.delivery.deliveryMinutes !== null) {
    parts.push(`${order.delivery.deliveryMinutes} мин.`);
  }

  return parts.length ? parts.join(' • ') : 'Не указан';
}

export function OrderDetailsDrawer({
  isOpen,
  order,
  isLoading,
  errorMessage,
  isStatusUpdating,
  statusErrorMessage,
  statusSuccessMessage,
  productMetaById,
  productMetaErrorMessage,
  onClose,
  onStatusSubmit,
}: OrderDetailsDrawerProps) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);

    return () => {
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const statusTone = order ? getOrderStatusTone(order.status) : 'neutral';

  return (
    <div className="order-drawer-root" role="presentation">
      <button type="button" className="order-drawer-backdrop" aria-label="Закрыть панель заказа" onClick={onClose} />

      <aside className="order-drawer" aria-label="Детали заказа">
        <header className="order-drawer-header">
          <div>
            <p className="placeholder-eyebrow">Заказ</p>
            <h3 className="order-drawer-title">{order ? order.orderNumber : 'Детали заказа'}</h3>
            {order ? <p className="orders-cell-meta">Создан {formatOrderDateTime(order.createdAt)}</p> : null}
          </div>
          <button type="button" className="secondary-button" onClick={onClose}>
            Закрыть
          </button>
        </header>

        {errorMessage ? (
          <p className="form-error" role="alert">
            {errorMessage}
          </p>
        ) : null}

        {isLoading && !order ? (
          <p className="catalog-empty-state">Загрузка деталей заказа...</p>
        ) : null}

        {order ? (
          <div className="order-drawer-content">
            <section className="order-detail-section" aria-label="Общая информация по заказу">
              <h4 className="order-detail-title">Общая информация</h4>
              <div className="order-detail-grid">
                <div>
                  <p className="orders-cell-meta">Номер</p>
                  <p className="orders-cell-title">{order.orderNumber}</p>
                </div>
                <div>
                  <p className="orders-cell-meta">Дата и время</p>
                  <p className="orders-cell-title">{formatOrderDateTime(order.createdAt)}</p>
                </div>
              </div>
              <span className={`order-pill order-pill-${statusTone}`}>{getOrderStatusLabel(order.status)}</span>
            </section>

            <section className="order-detail-section" aria-label="Клиент">
              <h4 className="order-detail-title">Клиент</h4>
              <div className="order-detail-grid">
                <div>
                  <p className="orders-cell-meta">Имя</p>
                  <p className="orders-cell-title">{renderInfoValue(order.customerName, 'Не указано')}</p>
                </div>
                <div>
                  <p className="orders-cell-meta">Телефон</p>
                  <p className="orders-cell-title">{renderInfoValue(order.customerPhone, 'Не указан')}</p>
                </div>
                <div>
                  <p className="orders-cell-meta">Email</p>
                  <p className="orders-cell-title">{renderInfoValue(order.customerEmail, 'Не указан')}</p>
                </div>
              </div>
            </section>

            <section className="order-detail-section" aria-label="Товары в заказе">
              <h4 className="order-detail-title">Товары</h4>
              {productMetaErrorMessage ? <p className="orders-cell-meta">{productMetaErrorMessage}</p> : null}
              {order.items.length ? (
                <ul className="order-item-list">
                  {order.items.map((item) => {
                    const itemMeta = productMetaById.get(item.productId);
                    const imageUrl = itemMeta?.imageUrl?.trim() ?? '';
                    const itemSku = renderInfoValue(item.sku, renderInfoValue(itemMeta?.sku, 'Не указан'));

                    return (
                      <li key={item.id} className="order-item-row">
                        {imageUrl ? (
                          <img className="order-item-image" src={imageUrl} alt={item.title} />
                        ) : (
                          <div className="order-item-image-placeholder">Нет фото</div>
                        )}

                        <div className="order-item-main">
                          <p className="orders-cell-title">{item.title}</p>
                          <p className="orders-cell-meta">SKU: {itemSku}</p>
                          <p className="orders-cell-meta">Количество: {formatOrderItemQuantity(item)}</p>
                        </div>

                        <div className="order-item-pricing">
                          <p className="orders-cell-meta">Цена</p>
                          <p className="orders-cell-title">{formatMoneyMinor(item.priceMinor)}</p>
                          <p className="orders-cell-meta">Сумма позиции</p>
                          <p className="orders-cell-title">{formatMoneyMinor(item.totalMinor)}</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="catalog-empty-state">Товары в заказе отсутствуют.</p>
              )}
            </section>

            <section className="order-detail-section" aria-label="Суммы заказа">
              <h4 className="order-detail-title">Суммы</h4>
              <div className="order-summary-grid">
                <div>
                  <p className="orders-cell-meta">Subtotal</p>
                  <p className="orders-cell-title">{formatMoneyMinor(order.subtotalMinor)}</p>
                </div>
                <div>
                  <p className="orders-cell-meta">Скидка</p>
                  <p className="orders-cell-title">Нет данных в API</p>
                </div>
                <div>
                  <p className="orders-cell-meta">Доставка</p>
                  <p className="orders-cell-title">{formatMoneyMinor(order.deliveryFeeMinor)}</p>
                </div>
                <div>
                  <p className="orders-cell-meta">Итого</p>
                  <p className="orders-cell-title order-total-amount">{formatMoneyMinor(order.totalMinor)}</p>
                </div>
              </div>
            </section>

            <section className="order-detail-section" aria-label="Доставка">
              <h4 className="order-detail-title">Доставка</h4>
              <div className="order-detail-grid">
                <div>
                  <p className="orders-cell-meta">Способ доставки</p>
                  <p className="orders-cell-title">{order.delivery.methodName || getDeliveryTypeLabel(order.deliveryMethod)}</p>
                </div>
                <div>
                  <p className="orders-cell-meta">Стоимость доставки</p>
                  <p className="orders-cell-title">{formatMoneyMinor(order.delivery.priceMinor)}</p>
                </div>
                <div>
                  <p className="orders-cell-meta">Срок</p>
                  <p className="orders-cell-title">{formatDeliveryEstimate(order)}</p>
                </div>
                <div className="order-detail-grid-full">
                  <p className="orders-cell-meta">Адрес / пункт выдачи</p>
                  <p className="orders-cell-title">{formatOrderDeliveryDestination(order)}</p>
                </div>
              </div>
            </section>

            <section className="order-detail-section" aria-label="Оплата">
              <h4 className="order-detail-title">Оплата</h4>
              <div className="order-detail-grid">
                <div>
                  <p className="orders-cell-meta">Способ оплаты</p>
                  <p className="orders-cell-title">{getPaymentMethodLabel(order.payment)}</p>
                </div>
                <div>
                  <p className="orders-cell-meta">Статус оплаты</p>
                  <p className="orders-cell-title">{getPaymentStatusPlaceholderLabel()}</p>
                </div>
              </div>
            </section>

            {order.comment?.trim() ? (
              <section className="order-detail-section" aria-label="Комментарий клиента">
                <h4 className="order-detail-title">Комментарий клиента</h4>
                <p className="orders-cell-title">{order.comment.trim()}</p>
              </section>
            ) : null}

            <ChangeOrderStatus
              currentStatus={order.status}
              isSubmitting={isStatusUpdating}
              errorMessage={statusErrorMessage}
              successMessage={statusSuccessMessage}
              onSubmit={onStatusSubmit}
            />
          </div>
        ) : null}
      </aside>
    </div>
  );
}
