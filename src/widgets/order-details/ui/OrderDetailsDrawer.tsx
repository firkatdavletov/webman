import type { ReactNode } from 'react';
import {
  formatMoneyMinor,
  formatOrderDeliveryDestination,
  formatOrderDateTime,
  formatOrderItemQuantity,
  getDeliveryTypeLabel,
  getOrderStateTypeLabel,
  getOrderStatusChangeSourceTypeLabel,
  getOrderStatusLabel,
  getOrderStatusTone,
  getPaymentMethodLabel,
  getPaymentStatusPlaceholderLabel,
  type Order,
  type OrderStatusHistoryEntry,
  type OrderStatusTransition,
} from '@/entities/order';
import { ChangeOrderStatus } from '@/features/change-order-status';
import { cn } from '@/shared/lib/cn';
import { AdminEmptyState, AdminNotice, Badge, Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/shared/ui';

type OrderItemProductMeta = {
  imageUrl: string | null;
  sku: string | null;
};

type OrderDetailsDrawerProps = {
  isOpen: boolean;
  order: Order | null;
  isLoading: boolean;
  errorMessage: string;
  isStatusMetaLoading: boolean;
  isStatusUpdating: boolean;
  statusTransitions: OrderStatusTransition[];
  statusTransitionsErrorMessage: string;
  statusHistory: OrderStatusHistoryEntry[];
  statusHistoryErrorMessage: string;
  statusErrorMessage: string;
  statusSuccessMessage: string;
  productMetaById: Map<string, OrderItemProductMeta>;
  productMetaErrorMessage: string;
  onClose: () => void;
  onStatusSubmit: (payload: { statusId: string; comment: string | null }) => void;
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

function getStatusHistorySummary(entry: OrderStatusHistoryEntry): string {
  const previousStatusLabel = entry.previousStatus ? getOrderStatusLabel(entry.previousStatus) : null;
  const currentStatusLabel = getOrderStatusLabel(entry.currentStatus);

  if (!previousStatusLabel) {
    return `Начальный статус: ${currentStatusLabel}`;
  }

  return `${previousStatusLabel} → ${currentStatusLabel}`;
}

function getStatusBadgeClassName(order: Order | Pick<OrderStatusHistoryEntry, 'currentStatus'>): string {
  const tone = 'currentStatus' in order ? getOrderStatusTone(order.currentStatus) : getOrderStatusTone(order.status);

  if (tone === 'success') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }

  if (tone === 'danger') {
    return 'border-rose-200 bg-rose-50 text-rose-700';
  }

  if (tone === 'pending') {
    return 'border-amber-200 bg-amber-50 text-amber-700';
  }

  return 'border-border bg-muted/40 text-muted-foreground';
}

function DetailStat({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={cn('space-y-1 rounded-2xl border border-border/70 bg-background/70 p-3', wide && 'md:col-span-2')}>
      <p className="text-[0.72rem] font-semibold tracking-[0.16em] text-muted-foreground uppercase">{label}</p>
      <p className="text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3 rounded-[1.25rem] border border-border/70 bg-muted/20 p-4">
      <h4 className="text-sm font-semibold text-foreground">{title}</h4>
      {children}
    </section>
  );
}

export function OrderDetailsDrawer({
  isOpen,
  order,
  isLoading,
  errorMessage,
  isStatusMetaLoading,
  isStatusUpdating,
  statusTransitions,
  statusTransitionsErrorMessage,
  statusHistory,
  statusHistoryErrorMessage,
  statusErrorMessage,
  statusSuccessMessage,
  productMetaById,
  productMetaErrorMessage,
  onClose,
  onStatusSubmit,
}: OrderDetailsDrawerProps) {
  return (
    <Sheet open={isOpen} onOpenChange={(nextOpen) => (!nextOpen ? onClose() : undefined)}>
      <SheetContent side="right" className="w-full max-w-[100vw] gap-0 overflow-hidden p-0 sm:max-w-[720px]">
        <SheetHeader className="border-b border-border/70 bg-background/95 px-6 py-5">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <SheetTitle>{order ? `Заказ ${order.orderNumber}` : 'Детали заказа'}</SheetTitle>
              {order ? (
                <Badge
                  variant="outline"
                  className={cn('h-auto rounded-full border px-2.5 py-1 text-[0.72rem] font-medium', getStatusBadgeClassName(order))}
                >
                  {getOrderStatusLabel(order.status)}
                </Badge>
              ) : null}
            </div>
            <SheetDescription>
              {order ? `Создан ${formatOrderDateTime(order.createdAt)} • ID ${order.id}` : 'Подготавливаем данные заказа и историю статусов.'}
            </SheetDescription>
          </div>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto bg-background px-6 py-5">
          {errorMessage ? <AdminNotice tone="destructive">{errorMessage}</AdminNotice> : null}

          {isLoading && !order ? (
            <AdminEmptyState
              title="Загружаем заказ"
              description="Проверяем основную карточку, состав заказа и историю статусов. Попробуйте закрыть preview и открыть строку снова, если загрузка не завершится."
            />
          ) : null}

          {order ? (
            <>
              <DetailSection title="Общая информация">
                <div className="grid gap-3 md:grid-cols-2">
                  <DetailStat label="Номер" value={order.orderNumber} />
                  <DetailStat label="Дата и время" value={formatOrderDateTime(order.createdAt)} />
                  <DetailStat label="Код статуса" value={order.status.code} />
                  <DetailStat label="Состояние" value={getOrderStateTypeLabel(order.stateType)} />
                  <DetailStat label="Статус обновлен" value={formatOrderDateTime(order.statusChangedAt)} />
                  <DetailStat label="Источник" value={order.guestInstallId ? 'Гостевой checkout' : order.userId ? 'Аккаунт клиента' : 'Не передается API'} />
                </div>
              </DetailSection>

              <DetailSection title="Клиент">
                <div className="grid gap-3 md:grid-cols-2">
                  <DetailStat label="Имя" value={renderInfoValue(order.customerName)} />
                  <DetailStat label="Телефон" value={renderInfoValue(order.customerPhone, 'Не указан')} />
                  <DetailStat label="Email" value={renderInfoValue(order.customerEmail, 'Не указан')} />
                  <DetailStat label="Тип клиента" value={order.customerType} />
                </div>
              </DetailSection>

              <DetailSection title="Товары">
                {productMetaErrorMessage ? <AdminNotice>{productMetaErrorMessage}</AdminNotice> : null}
                {order.items.length ? (
                  <ul className="space-y-3">
                    {order.items.map((item) => {
                      const itemMeta = productMetaById.get(item.productId);
                      const imageUrl = item.imageUrl?.trim() || itemMeta?.imageUrl?.trim() || '';
                      const itemSku = renderInfoValue(item.sku, renderInfoValue(itemMeta?.sku, 'Не указан'));

                      return (
                        <li key={item.id} className="flex gap-3 rounded-[1.15rem] border border-border/70 bg-background/70 p-3">
                          {imageUrl ? (
                            <img className="size-16 rounded-xl border border-border/70 object-cover" src={imageUrl} alt={item.title} />
                          ) : (
                            <div className="flex size-16 items-center justify-center rounded-xl border border-dashed border-border text-[0.72rem] text-muted-foreground">
                              Нет фото
                            </div>
                          )}

                          <div className="min-w-0 flex-1 space-y-1">
                            <p className="font-medium text-foreground">{item.title}</p>
                            <p className="text-xs text-muted-foreground">SKU: {itemSku}</p>
                            <p className="text-xs text-muted-foreground">Количество: {formatOrderItemQuantity(item)}</p>
                          </div>

                          <div className="shrink-0 text-right">
                            <p className="text-xs text-muted-foreground">Цена</p>
                            <p className="text-sm font-medium text-foreground">{formatMoneyMinor(item.priceMinor)}</p>
                            <p className="mt-2 text-xs text-muted-foreground">Сумма позиции</p>
                            <p className="text-sm font-medium text-foreground">{formatMoneyMinor(item.totalMinor)}</p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <AdminEmptyState
                    title="Состав заказа пуст"
                    description="Backend вернул заказ без товарных позиций. Стоит проверить источник формирования заказа или повторно запросить карточку."
                  />
                )}
              </DetailSection>

              <DetailSection title="Суммы">
                <div className="grid gap-3 md:grid-cols-2">
                  <DetailStat label="Subtotal" value={formatMoneyMinor(order.subtotalMinor)} />
                  <DetailStat label="Скидка" value="Нет данных в API" />
                  <DetailStat label="Доставка" value={formatMoneyMinor(order.deliveryFeeMinor)} />
                  <DetailStat label="Итого" value={formatMoneyMinor(order.totalMinor)} />
                </div>
              </DetailSection>

              <DetailSection title="Доставка и оплата">
                <div className="grid gap-3 md:grid-cols-2">
                  <DetailStat label="Способ доставки" value={order.delivery.methodName || getDeliveryTypeLabel(order.deliveryMethod)} />
                  <DetailStat label="Стоимость доставки" value={formatMoneyMinor(order.delivery.priceMinor)} />
                  <DetailStat label="Срок" value={formatDeliveryEstimate(order)} />
                  <DetailStat label="Способ оплаты" value={getPaymentMethodLabel(order.payment)} />
                  <DetailStat label="Статус оплаты" value={getPaymentStatusPlaceholderLabel()} />
                  <DetailStat label="Адрес / пункт выдачи" value={formatOrderDeliveryDestination(order)} wide />
                </div>
              </DetailSection>

              {order.comment?.trim() ? (
                <DetailSection title="Комментарий клиента">
                  <p className="text-sm leading-6 text-foreground">{order.comment.trim()}</p>
                </DetailSection>
              ) : null}

              {statusTransitionsErrorMessage ? <AdminNotice tone="destructive">{statusTransitionsErrorMessage}</AdminNotice> : null}

              <ChangeOrderStatus
                currentStatus={order.status}
                transitions={statusTransitions}
                isSubmitting={isStatusUpdating}
                isLoadingTransitions={isStatusMetaLoading}
                errorMessage={statusErrorMessage}
                successMessage={statusSuccessMessage}
                onSubmit={onStatusSubmit}
              />

              <DetailSection title="История статусов">
                {statusHistoryErrorMessage ? <AdminNotice tone="destructive">{statusHistoryErrorMessage}</AdminNotice> : null}

                {isStatusMetaLoading && !statusHistory.length && order.statusHistory.length ? (
                  <ul className="space-y-3">
                    {order.statusHistory.map((entry) => (
                      <li key={`${entry.code}-${entry.timestamp}`} className="rounded-[1.15rem] border border-border/70 bg-background/70 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <Badge variant="outline" className="h-auto rounded-full px-2.5 py-1 text-[0.72rem] font-medium">
                            {entry.name}
                          </Badge>
                          <p className="text-xs text-muted-foreground">{formatOrderDateTime(entry.timestamp)}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : isStatusMetaLoading && !statusHistory.length ? (
                  <AdminEmptyState
                    title="Загружаем историю"
                    description="Запрашиваем журнал переходов статусов. Если он не появится, проверьте доступность endpoint истории."
                  />
                ) : statusHistory.length ? (
                  <ul className="space-y-3">
                    {statusHistory.map((entry) => (
                      <li key={entry.id} className="space-y-2 rounded-[1.15rem] border border-border/70 bg-background/70 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <Badge
                            variant="outline"
                            className={cn(
                              'h-auto rounded-full border px-2.5 py-1 text-[0.72rem] font-medium',
                              getStatusBadgeClassName(entry),
                            )}
                          >
                            {getOrderStatusLabel(entry.currentStatus)}
                          </Badge>
                          <p className="text-xs text-muted-foreground">{formatOrderDateTime(entry.changedAt)}</p>
                        </div>
                        <p className="text-sm text-foreground">{getStatusHistorySummary(entry)}</p>
                        <p className="text-xs text-muted-foreground">
                          {getOrderStatusChangeSourceTypeLabel(entry.changeSourceType)}
                          {entry.changedByUserId ? ` • ${entry.changedByUserId}` : ''}
                        </p>
                        {entry.comment?.trim() ? <p className="text-sm leading-6 text-foreground">{entry.comment.trim()}</p> : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <AdminEmptyState
                    title="История пока пуста"
                    description="У этого заказа ещё нет записей в журнале переходов. После первого изменения статуса история появится здесь."
                  />
                )}
              </DetailSection>
            </>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
