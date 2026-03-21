import {
  formatMoneyMinor,
  formatOrderDeliveryDestination,
  formatOrderDateTime,
  formatOrderItemsSummary,
  getCustomerLabel,
  getDeliveryTypeLabel,
  getOrderStatusLabel,
  getOrderStatusTone,
  getPaymentMethodLabel,
  getPaymentStatusPlaceholderLabel,
  type Order,
} from '@/entities/order';

type OrdersTableProps = {
  orders: Order[];
  selectedOrderId: string | null;
  onOpenOrder: (orderId: string) => void;
};

function buildCustomerMeta(order: Order): string {
  const values = [order.customerPhone, order.customerEmail]
    .map((value) => value?.trim() ?? '')
    .filter(Boolean);

  return values.length ? values.join(' • ') : 'Контакты не указаны';
}

export function OrdersTable({ orders, selectedOrderId, onOpenOrder }: OrdersTableProps) {
  return (
    <div className="orders-table-wrap">
      <table className="orders-table">
        <thead>
          <tr>
            <th scope="col">Номер</th>
            <th scope="col">Создан</th>
            <th scope="col">Клиент</th>
            <th scope="col">Товары</th>
            <th scope="col">Сумма</th>
            <th scope="col">Оплата</th>
            <th scope="col">Доставка</th>
            <th scope="col">Статус</th>
            <th scope="col">Действия</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => {
            const statusTone = getOrderStatusTone(order.status);

            return (
              <tr key={order.id} className={selectedOrderId === order.id ? 'orders-row-selected' : ''}>
                <td>
                  <button type="button" className="order-number-button" onClick={() => onOpenOrder(order.id)}>
                    {order.orderNumber}
                  </button>
                </td>
                <td className="orders-cell-muted">{formatOrderDateTime(order.createdAt)}</td>
                <td>
                  <p className="orders-cell-title">{getCustomerLabel(order)}</p>
                  <p className="orders-cell-meta">{buildCustomerMeta(order)}</p>
                </td>
                <td>
                  <p className="orders-cell-title">{formatOrderItemsSummary(order.items)}</p>
                  <p className="orders-cell-meta">Позиций: {order.items.length}</p>
                </td>
                <td className="orders-cell-amount">{formatMoneyMinor(order.totalMinor)}</td>
                <td>
                  <p className="orders-cell-title">{getPaymentMethodLabel(order.payment)}</p>
                  <p className="orders-cell-meta">{getPaymentStatusPlaceholderLabel()}</p>
                </td>
                <td>
                  <p className="orders-cell-title">{order.delivery.methodName || getDeliveryTypeLabel(order.deliveryMethod)}</p>
                  <p className="orders-cell-meta orders-cell-ellipsis">{formatOrderDeliveryDestination(order)}</p>
                </td>
                <td>
                  <span className={`order-pill order-pill-${statusTone}`}>{getOrderStatusLabel(order.status)}</span>
                </td>
                <td>
                  <button type="button" className="secondary-button orders-action-button" onClick={() => onOpenOrder(order.id)}>
                    Открыть
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
