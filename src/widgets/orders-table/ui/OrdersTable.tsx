import { useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
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
import { DataTable } from '@/shared/ui/data-table';

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
  const columns = useMemo<ColumnDef<Order>[]>(
    () => [
      {
        id: 'number',
        header: 'Номер',
        cell: ({ row }) => (
          <button type="button" className="order-number-button" onClick={() => onOpenOrder(row.original.id)}>
            {row.original.orderNumber}
          </button>
        ),
      },
      {
        id: 'createdAt',
        header: 'Создан',
        cell: ({ row }) => formatOrderDateTime(row.original.createdAt),
        meta: {
          cellClassName: 'orders-cell-muted',
        },
      },
      {
        id: 'customer',
        header: 'Клиент',
        cell: ({ row }) => (
          <>
            <p className="orders-cell-title">{getCustomerLabel(row.original)}</p>
            <p className="orders-cell-meta">{buildCustomerMeta(row.original)}</p>
          </>
        ),
      },
      {
        id: 'items',
        header: 'Товары',
        cell: ({ row }) => (
          <>
            <p className="orders-cell-title">{formatOrderItemsSummary(row.original.items)}</p>
            <p className="orders-cell-meta">Позиций: {row.original.items.length}</p>
          </>
        ),
      },
      {
        id: 'total',
        header: 'Сумма',
        cell: ({ row }) => formatMoneyMinor(row.original.totalMinor),
        meta: {
          cellClassName: 'orders-cell-amount',
        },
      },
      {
        id: 'payment',
        header: 'Оплата',
        cell: ({ row }) => (
          <>
            <p className="orders-cell-title">{getPaymentMethodLabel(row.original.payment)}</p>
            <p className="orders-cell-meta">{getPaymentStatusPlaceholderLabel()}</p>
          </>
        ),
      },
      {
        id: 'delivery',
        header: 'Доставка',
        cell: ({ row }) => (
          <>
            <p className="orders-cell-title">
              {row.original.delivery.methodName || getDeliveryTypeLabel(row.original.deliveryMethod)}
            </p>
            <p className="orders-cell-meta orders-cell-ellipsis">{formatOrderDeliveryDestination(row.original)}</p>
          </>
        ),
      },
      {
        id: 'status',
        header: 'Статус',
        cell: ({ row }) => {
          const statusTone = getOrderStatusTone(row.original.status);

          return <span className={`order-pill order-pill-${statusTone}`}>{getOrderStatusLabel(row.original.status)}</span>;
        },
      },
      {
        id: 'actions',
        header: 'Действия',
        cell: ({ row }) => (
          <button type="button" className="secondary-button orders-action-button" onClick={() => onOpenOrder(row.original.id)}>
            Открыть
          </button>
        ),
      },
    ],
    [onOpenOrder],
  );

  return (
    <DataTable
      columns={columns}
      data={orders}
      getRowId={(order) => order.id}
      getRowClassName={(row) => (selectedOrderId === row.original.id ? 'orders-row-selected' : undefined)}
      wrapperClassName="orders-table-wrap"
      tableClassName="orders-table"
    />
  );
}
