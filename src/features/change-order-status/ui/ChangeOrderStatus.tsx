import { useEffect, useMemo, useState } from 'react';
import { getOrderStatusLabel, type OrderStatus, type OrderStatusTransition } from '@/entities/order';

type ChangeOrderStatusProps = {
  currentStatus: OrderStatus;
  transitions: OrderStatusTransition[];
  isSubmitting: boolean;
  isLoadingTransitions?: boolean;
  disabled?: boolean;
  errorMessage?: string;
  successMessage?: string;
  onSubmit: (payload: { statusId: string; comment: string | null }) => void;
};

export function ChangeOrderStatus({
  currentStatus,
  transitions,
  isSubmitting,
  isLoadingTransitions = false,
  disabled = false,
  errorMessage,
  successMessage,
  onSubmit,
}: ChangeOrderStatusProps) {
  const transitionOptions = useMemo(() => {
    const uniqueTransitionsByStatusId = new Map<string, OrderStatusTransition>();

    transitions.forEach((transition) => {
      if (!uniqueTransitionsByStatusId.has(transition.toStatus.id)) {
        uniqueTransitionsByStatusId.set(transition.toStatus.id, transition);
      }
    });

    return [...uniqueTransitionsByStatusId.values()];
  }, [transitions]);

  const [nextStatusId, setNextStatusId] = useState('');
  const [comment, setComment] = useState('');

  useEffect(() => {
    setNextStatusId(transitionOptions[0]?.toStatus.id ?? '');
    setComment('');
  }, [currentStatus.id, transitionOptions]);

  const canSubmit = !disabled && !isSubmitting && !isLoadingTransitions && Boolean(nextStatusId);

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

          onSubmit({
            statusId: nextStatusId,
            comment: comment.trim() || null,
          });
        }}
      >
        <label className="field-label" htmlFor="change-order-status-select">
          Новый статус
        </label>

        <div className="change-order-status-controls">
          <select
            id="change-order-status-select"
            className="field-input"
            value={nextStatusId}
            onChange={(event) => setNextStatusId(event.target.value)}
            disabled={disabled || isSubmitting || isLoadingTransitions || !transitionOptions.length}
          >
            <option value="" disabled>
              {transitionOptions.length ? 'Выберите статус' : 'Нет доступных переходов'}
            </option>
            {transitionOptions.map((transition) => (
              <option key={transition.id} value={transition.toStatus.id}>
                {getOrderStatusLabel(transition.toStatus)}
              </option>
            ))}
          </select>

          <button type="submit" className="submit-button change-order-status-submit" disabled={!canSubmit}>
            {isSubmitting ? 'Сохранение...' : 'Сохранить статус'}
          </button>
        </div>

        <label className="field-label" htmlFor="change-order-status-comment">
          Комментарий к изменению
        </label>

        <textarea
          id="change-order-status-comment"
          className="field-input field-textarea"
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          placeholder="Необязательно. Комментарий попадет в историю статусов."
          disabled={disabled || isSubmitting || isLoadingTransitions}
        />
      </form>

      {isLoadingTransitions ? <p className="helper-text">Загрузка доступных переходов...</p> : null}

      {!isLoadingTransitions && !transitionOptions.length ? (
        <p className="helper-text">Для текущего статуса доступных переходов нет.</p>
      ) : null}

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
