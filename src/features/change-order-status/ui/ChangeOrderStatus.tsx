import { useEffect, useState } from 'react';
import { getOrderStatusLabel, type OrderStatus } from '@/entities/order';

type ChangeOrderStatusProps = {
  currentStatus: OrderStatus;
  isSubmitting: boolean;
  disabled?: boolean;
  errorMessage?: string;
  successMessage?: string;
  onSubmit: (status: OrderStatus) => void;
};

const ORDER_STATUS_OPTIONS: OrderStatus[] = ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'];

export function ChangeOrderStatus({
  currentStatus,
  isSubmitting,
  disabled = false,
  errorMessage,
  successMessage,
  onSubmit,
}: ChangeOrderStatusProps) {
  const [nextStatus, setNextStatus] = useState<OrderStatus>(currentStatus);

  useEffect(() => {
    setNextStatus(currentStatus);
  }, [currentStatus]);

  const canSubmit = !disabled && !isSubmitting && nextStatus !== currentStatus;

  return (
    <section className="order-detail-section" aria-label="Изменение статуса заказа">
      <h4 className="order-detail-title">Статус заказа</h4>

      <form
        className="change-order-status"
        onSubmit={(event) => {
          event.preventDefault();

          if (!canSubmit) {
            return;
          }

          onSubmit(nextStatus);
        }}
      >
        <label className="field-label" htmlFor="change-order-status-select">
          Новый статус
        </label>

        <div className="change-order-status-controls">
          <select
            id="change-order-status-select"
            className="field-input"
            value={nextStatus}
            onChange={(event) => setNextStatus(event.target.value as OrderStatus)}
            disabled={disabled || isSubmitting}
          >
            {ORDER_STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {getOrderStatusLabel(status)}
              </option>
            ))}
          </select>

          <button type="submit" className="submit-button change-order-status-submit" disabled={!canSubmit}>
            {isSubmitting ? 'Сохранение...' : 'Сохранить статус'}
          </button>
        </div>
      </form>

      {errorMessage ? (
        <p className="form-error" role="alert">
          {errorMessage}
        </p>
      ) : null}

      {successMessage ? (
        <p className="form-success" role="status">
          {successMessage}
        </p>
      ) : null}
    </section>
  );
}
