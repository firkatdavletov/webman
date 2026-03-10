import {
  getDeliveryTypeLabel,
  getOrderStatusLabel,
  getPaymentStatusPlaceholderLabel,
  type OrderDeliveryType,
  type OrderStatus,
} from '@/entities/order';
import type { OrderDateRangeFilter } from '@/pages/orders/model/orderPageView';

type OrderFiltersProps = {
  statusFilter: 'all' | OrderStatus;
  paymentFilter: 'unsupported';
  deliveryFilter: 'all' | OrderDeliveryType;
  dateRangeFilter: OrderDateRangeFilter;
  pageSize: number;
  pageSizeOptions: readonly number[];
  disabled?: boolean;
  onStatusFilterChange: (value: 'all' | OrderStatus) => void;
  onPaymentFilterChange: (value: 'unsupported') => void;
  onDeliveryFilterChange: (value: 'all' | OrderDeliveryType) => void;
  onDateRangeFilterChange: (value: OrderDateRangeFilter) => void;
  onPageSizeChange: (value: number) => void;
};

const ORDER_STATUSES: OrderStatus[] = ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'];
const DELIVERY_TYPES: OrderDeliveryType[] = ['PICKUP', 'DELIVERY'];

export function OrderFilters({
  statusFilter,
  paymentFilter,
  deliveryFilter,
  dateRangeFilter,
  pageSize,
  pageSizeOptions,
  disabled = false,
  onStatusFilterChange,
  onPaymentFilterChange,
  onDeliveryFilterChange,
  onDateRangeFilterChange,
  onPageSizeChange,
}: OrderFiltersProps) {
  return (
    <div className="orders-filter-grid">
      <div className="field">
        <label className="field-label" htmlFor="orders-status-filter">
          Статус заказа
        </label>
        <select
          id="orders-status-filter"
          className="field-input"
          value={statusFilter}
          onChange={(event) => onStatusFilterChange(event.target.value as 'all' | OrderStatus)}
          disabled={disabled}
        >
          <option value="all">Все статусы</option>
          {ORDER_STATUSES.map((status) => (
            <option key={status} value={status}>
              {getOrderStatusLabel(status)}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label className="field-label" htmlFor="orders-payment-filter">
          Статус оплаты
        </label>
        <select
          id="orders-payment-filter"
          className="field-input"
          value={paymentFilter}
          onChange={(event) => onPaymentFilterChange(event.target.value as 'unsupported')}
          disabled
        >
          <option value="unsupported">{getPaymentStatusPlaceholderLabel()}</option>
        </select>
        <p className="helper-text">Поле оплаты отсутствует в `OrderResponse` текущего API.</p>
      </div>

      <div className="field">
        <label className="field-label" htmlFor="orders-delivery-filter">
          Доставка
        </label>
        <select
          id="orders-delivery-filter"
          className="field-input"
          value={deliveryFilter}
          onChange={(event) => onDeliveryFilterChange(event.target.value as 'all' | OrderDeliveryType)}
          disabled={disabled}
        >
          <option value="all">Все типы</option>
          {DELIVERY_TYPES.map((deliveryType) => (
            <option key={deliveryType} value={deliveryType}>
              {getDeliveryTypeLabel(deliveryType)}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label className="field-label" htmlFor="orders-date-filter">
          Период создания
        </label>
        <select
          id="orders-date-filter"
          className="field-input"
          value={dateRangeFilter}
          onChange={(event) => onDateRangeFilterChange(event.target.value as OrderDateRangeFilter)}
          disabled={disabled}
        >
          <option value="all">За все время</option>
          <option value="today">Сегодня</option>
          <option value="3d">Последние 3 дня</option>
          <option value="7d">Последние 7 дней</option>
          <option value="30d">Последние 30 дней</option>
        </select>
      </div>

      <div className="field">
        <label className="field-label" htmlFor="orders-page-size">
          Размер страницы
        </label>
        <select
          id="orders-page-size"
          className="field-input"
          value={pageSize}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
          disabled={disabled}
        >
          {pageSizeOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
