import { useEffect, useMemo, useState } from 'react';
import { getOrderStatusLabel, type OrderStatus, type OrderStatusTransition } from '@/entities/order';
import { Button } from '@/shared/ui';

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
    <section className="space-y-4 rounded-[1.25rem] border border-border/70 bg-background/70 p-4" aria-label="Изменение статуса заказа">
      <div className="space-y-1">
        <h4 className="text-sm font-semibold text-foreground">Статус заказа</h4>
        <p className="text-sm text-muted-foreground">Меняйте workflow прямо из preview, история обновится после сохранения.</p>
      </div>

      <form
        className="space-y-3"
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
        <label className="space-y-2 text-sm font-medium text-foreground" htmlFor="change-order-status-select">
          <span>Новый статус</span>
          <select
            id="change-order-status-select"
            className="flex h-10 w-full min-w-0 rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none transition focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-60"
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
        </label>

        <label className="space-y-2 text-sm font-medium text-foreground" htmlFor="change-order-status-comment">
          <span>Комментарий к изменению</span>
          <textarea
            id="change-order-status-comment"
            className="flex min-h-24 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-60"
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="Необязательно. Комментарий попадет в историю статусов."
            disabled={disabled || isSubmitting || isLoadingTransitions}
          />
        </label>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" disabled={!canSubmit}>
            {isSubmitting ? 'Сохранение...' : 'Сохранить статус'}
          </Button>
        </div>
      </form>

      {isLoadingTransitions ? <p className="text-sm text-muted-foreground">Загрузка доступных переходов...</p> : null}
      {!isLoadingTransitions && !transitionOptions.length ? (
        <p className="text-sm text-muted-foreground">Для текущего статуса доступных переходов нет.</p>
      ) : null}
      {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
      {successMessage ? <p className="text-sm text-emerald-700">{successMessage}</p> : null}
    </section>
  );
}
