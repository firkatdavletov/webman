import { useEffect, useMemo, useState } from 'react';
import { getOrderStatusLabel, type OrderStatus, type OrderStatusTransition } from '@/entities/order';
import { cn } from '@/shared/lib/cn';
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
  const selectedTransition = transitionOptions.find((transition) => transition.toStatus.id === nextStatusId) ?? null;

  return (
    <section className="space-y-4 rounded-[1.25rem] border border-border/70 bg-background/70 p-4" aria-label="Изменение статуса заказа">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h4 className="text-sm font-semibold text-foreground">Смена статуса</h4>
          <p className="text-sm text-muted-foreground">Переходы доступны прямо на странице заказа, без дополнительных модалок.</p>
        </div>
        <div className="rounded-full border border-border/70 bg-muted/40 px-3 py-1 text-xs font-medium text-foreground">
          Текущий статус: {getOrderStatusLabel(currentStatus)}
        </div>
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
        {transitionOptions.length ? (
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Следующий статус</p>
            <div className="flex flex-wrap gap-2">
              {transitionOptions.map((transition) => {
                const isActive = transition.toStatus.id === nextStatusId;

                return (
                  <button
                    key={transition.id}
                    type="button"
                    className={cn(
                      'rounded-full border px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'border-primary/30 bg-primary/10 text-primary'
                        : 'border-border bg-background text-foreground hover:bg-muted/60',
                    )}
                    onClick={() => setNextStatusId(transition.toStatus.id)}
                    disabled={disabled || isSubmitting || isLoadingTransitions}
                    aria-pressed={isActive}
                  >
                    {getOrderStatusLabel(transition.toStatus)}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

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
          {selectedTransition ? (
            <p className="text-sm text-muted-foreground">
              Будет установлен статус <span className="font-medium text-foreground">{getOrderStatusLabel(selectedTransition.toStatus)}</span>
            </p>
          ) : null}
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
