import { useState } from 'react';
import { ArrowLeftIcon, CopyIcon, MailIcon, MapPinIcon, PhoneIcon, RefreshCcwIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  formatMoneyMinor,
  formatOrderDeliveryAddress,
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
import {
  AdminEmptyState,
  AdminNotice,
  AdminPage,
  AdminPageHeader,
  AdminPageStatus,
  AdminSectionCard,
  Badge,
  Button,
  buttonVariants,
} from '@/shared/ui';

type OrderItemProductMeta = {
  imageUrl: string | null;
  sku: string | null;
};

type OrderDetailsPageProps = {
  orderId: string;
  backPath: string;
  order: Order | null;
  isLoading: boolean;
  isRefreshing: boolean;
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
  onBack: () => void;
  onRefresh: () => void;
  onStatusSubmit: (payload: { statusId: string; comment: string | null }) => void;
};

const HUMAN_DATE_TIME_FORMATTER = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
});

const HUMAN_DATE_TIME_WITH_YEAR_FORMATTER = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const DELIVERY_MILESTONE_STATES = new Set<Order['stateType']>(['READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'COMPLETED']);

function renderInfoValue(value: string | null | undefined, emptyLabel = 'Не указано'): string {
  const normalizedValue = value?.trim() ?? '';

  return normalizedValue || emptyLabel;
}

function formatTimelineDateTime(value: string): string {
  const timestamp = Date.parse(value);

  if (Number.isNaN(timestamp)) {
    return 'Неизвестное время';
  }

  const date = new Date(timestamp);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;
  const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

  if (dateStart === todayStart) {
    return `Сегодня, ${date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
  }

  if (dateStart === yesterdayStart) {
    return `Вчера, ${date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
  }

  if (date.getFullYear() === now.getFullYear()) {
    return HUMAN_DATE_TIME_FORMATTER.format(date);
  }

  return HUMAN_DATE_TIME_WITH_YEAR_FORMATTER.format(date);
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
    return `Установлен начальный статус «${currentStatusLabel}»`;
  }

  return `Статус изменён: ${previousStatusLabel} → ${currentStatusLabel}`;
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

function buildOrderSourceLabel(order: Order): string {
  if (order.guestInstallId || order.customerType === 'GUEST') {
    return 'Гостевой checkout';
  }

  if (order.userId || order.customerType === 'USER') {
    return 'Аккаунт клиента';
  }

  return 'Источник не передаётся';
}

function DetailStat({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={cn('space-y-1 rounded-2xl border border-border/70 bg-background/70 p-3', wide && 'md:col-span-2')}>
      <p className="text-[0.72rem] font-semibold tracking-[0.16em] text-muted-foreground uppercase">{label}</p>
      <p className="text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

function SectionPlaceholder({
  title,
  description,
  tone = 'default',
}: {
  title: string;
  description: string;
  tone?: 'default' | 'destructive';
}) {
  return (
    <div
      className={cn(
        'rounded-[1.25rem] border border-dashed px-4 py-5',
        tone === 'destructive' ? 'border-destructive/25 bg-destructive/5 text-destructive' : 'border-border/70 bg-muted/30 text-muted-foreground',
      )}
    >
      <p className="font-medium text-current">{title}</p>
      <p className="mt-2 text-sm leading-6 text-current/80">{description}</p>
    </div>
  );
}

export function OrderDetailsPage({
  orderId,
  backPath,
  order,
  isLoading,
  isRefreshing,
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
  onBack,
  onRefresh,
  onStatusSubmit,
}: OrderDetailsPageProps) {
  const [actionFeedbackMessage, setActionFeedbackMessage] = useState('');

  const normalizedCustomerPhone = order?.customerPhone?.trim() ?? '';
  const normalizedCustomerEmail = order?.customerEmail?.trim() ?? '';
  const formattedAddress = order ? formatOrderDeliveryAddress(order.delivery.address) : '';
  const customerComment = order?.comment?.trim() ?? '';
  const operatorComments = statusHistory.filter((entry) => Boolean(entry.comment?.trim()));
  const deliveryMilestones = statusHistory.filter((entry) => DELIVERY_MILESTONE_STATES.has(entry.currentStatus.stateType));
  const fallbackTimelineEntries = order
    ? [...order.statusHistory].sort((left, right) => Date.parse(right.timestamp) - Date.parse(left.timestamp))
    : [];
  const richTimelineEntries = [...statusHistory].sort((left, right) => Date.parse(right.changedAt) - Date.parse(left.changedAt));
  const hasAddressIssue =
    order !== null &&
    (order.deliveryMethod === 'COURIER' || order.deliveryMethod === 'CUSTOM_DELIVERY_ADDRESS') &&
    !formattedAddress;

  const handleCopy = async (value: string, label: string) => {
    const normalizedValue = value.trim();

    if (!normalizedValue) {
      setActionFeedbackMessage(`Нет данных для поля «${label}».`);
      return;
    }

    if (typeof navigator === 'undefined' || !navigator.clipboard) {
      setActionFeedbackMessage('Буфер обмена недоступен в текущем окружении.');
      return;
    }

    try {
      await navigator.clipboard.writeText(normalizedValue);
      setActionFeedbackMessage(`Скопировано: ${label}.`);
    } catch {
      setActionFeedbackMessage(`Не удалось скопировать поле «${label}».`);
    }
  };

  return (
    <AdminPage>
      <nav className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground" aria-label="Хлебные крошки">
        <Link className="transition-colors hover:text-foreground" to={backPath}>
          Заказы
        </Link>
        <span>/</span>
        <span className="text-foreground">{order ? order.orderNumber : orderId}</span>
      </nav>

      <AdminPageHeader
        kicker="Заказы"
        title={order ? `Заказ ${order.orderNumber}` : `Заказ ${orderId}`}
        description={
          order
            ? `Создан ${formatOrderDateTime(order.createdAt)} • обновлён ${formatOrderDateTime(order.updatedAt)} • ID ${order.id}`
            : 'Загружаем карточку заказа, состав и историю статусов.'
        }
        actions={
          <>
            <Button variant="outline" onClick={onRefresh} disabled={isLoading || isStatusUpdating}>
              <RefreshCcwIcon className={cn('size-4', isRefreshing && 'animate-spin')} />
              {isRefreshing ? 'Обновление...' : 'Обновить'}
            </Button>
            <Button variant="outline" onClick={onBack}>
              <ArrowLeftIcon className="size-4" />
              К списку
            </Button>
          </>
        }
      />

      {errorMessage && order ? (
        <AdminNotice tone="destructive">
          {errorMessage} Показываем последние доступные данные, пока не получится подтянуть полную карточку заново.
        </AdminNotice>
      ) : null}

      {isLoading && !order ? (
        <AdminSectionCard title="Загрузка заказа">
          <AdminEmptyState
            title="Подготавливаем деталку"
            description="Запрашиваем новый detail endpoint, состав заказа и историю статусов."
          />
        </AdminSectionCard>
      ) : null}

      {!isLoading && !order ? (
        <AdminSectionCard title="Заказ не открыт">
          <SectionPlaceholder
            title="Не удалось получить данные заказа"
            description={errorMessage || 'Карточка заказа недоступна. Проверьте идентификатор или повторите запрос позже.'}
            tone="destructive"
          />
        </AdminSectionCard>
      ) : null}

      {order ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className={cn('h-auto rounded-full border px-3 py-1.5 text-[0.78rem] font-medium', getStatusBadgeClassName(order))}
            >
              {getOrderStatusLabel(order.status)}
            </Badge>
            <AdminPageStatus>Итого {formatMoneyMinor(order.totalMinor)}</AdminPageStatus>
            <AdminPageStatus>{order.items.length} позиций</AdminPageStatus>
            <AdminPageStatus>Статус обновлён {formatTimelineDateTime(order.statusChangedAt)}</AdminPageStatus>
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(21rem,0.95fr)]">
            <div className="space-y-6">
              <ChangeOrderStatus
                currentStatus={order.status}
                transitions={statusTransitions}
                isSubmitting={isStatusUpdating}
                isLoadingTransitions={isStatusMetaLoading}
                errorMessage={statusTransitionsErrorMessage || statusErrorMessage}
                successMessage={statusSuccessMessage}
                onSubmit={onStatusSubmit}
              />

              <AdminSectionCard title="Состав заказа" description="Позиции, количество и фактическая сумма заказа.">
                {order.items.length === 0 ? (
                  <>
                    <AdminNotice tone="destructive">
                      Заказ пришёл без товарных позиций. Это критичный data issue: проверьте backend или источник оформления.
                    </AdminNotice>
                    <SectionPlaceholder
                      title="Состав заказа пуст"
                      description="В карточке нет ни одной позиции, поэтому оператор не сможет проверить комплектность."
                      tone="destructive"
                    />
                  </>
                ) : (
                  <>
                    {productMetaErrorMessage ? <AdminNotice>{productMetaErrorMessage}</AdminNotice> : null}
                    <ul className="space-y-3">
                      {order.items.map((item) => {
                        const itemMeta = productMetaById.get(item.productId);
                        const imageUrl = item.imageUrl?.trim() || itemMeta?.imageUrl?.trim() || '';
                        const itemSku = renderInfoValue(item.sku, renderInfoValue(itemMeta?.sku, 'Не указан'));

                        return (
                          <li key={item.id} className="flex gap-3 rounded-[1.25rem] border border-border/70 bg-background/80 p-3">
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

                    <div className="grid gap-3 md:grid-cols-3">
                      <DetailStat label="Subtotal" value={formatMoneyMinor(order.subtotalMinor)} />
                      <DetailStat label="Доставка" value={formatMoneyMinor(order.deliveryFeeMinor)} />
                      <DetailStat label="Итого" value={formatMoneyMinor(order.totalMinor)} />
                    </div>
                  </>
                )}
              </AdminSectionCard>

              <AdminSectionCard title="Таймлайн" description="Человекочитаемая история движения заказа.">
                {statusHistoryErrorMessage ? (
                  <AdminNotice>
                    {fallbackTimelineEntries.length
                      ? `${statusHistoryErrorMessage} Показываем сокращённый таймлайн из detail payload.`
                      : statusHistoryErrorMessage}
                  </AdminNotice>
                ) : null}

                {richTimelineEntries.length ? (
                  <ol className="space-y-4">
                    {richTimelineEntries.map((entry) => (
                      <li key={entry.id} className="relative pl-6">
                        <span
                          className={cn(
                            'absolute top-2 left-0 size-2.5 rounded-full',
                            getOrderStatusTone(entry.currentStatus) === 'danger'
                              ? 'bg-rose-500'
                              : getOrderStatusTone(entry.currentStatus) === 'success'
                                ? 'bg-emerald-500'
                                : 'bg-amber-500',
                          )}
                        />

                        <div className="rounded-[1.25rem] border border-border/70 bg-background/80 p-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge
                              variant="outline"
                              className={cn('h-auto rounded-full border px-2.5 py-1 text-[0.72rem] font-medium', getStatusBadgeClassName(entry))}
                            >
                              {getOrderStatusLabel(entry.currentStatus)}
                            </Badge>
                            <p className="text-sm text-muted-foreground">{formatTimelineDateTime(entry.changedAt)}</p>
                          </div>

                          <p className="mt-3 text-sm font-medium text-foreground">{getStatusHistorySummary(entry)}</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            Источник: {getOrderStatusChangeSourceTypeLabel(entry.changeSourceType)}
                          </p>

                          {entry.comment?.trim() ? (
                            <div className="mt-3 rounded-xl border border-border/70 bg-muted/30 px-3 py-2 text-sm text-foreground">
                              {entry.comment.trim()}
                            </div>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ol>
                ) : fallbackTimelineEntries.length ? (
                  <ol className="space-y-3">
                    {fallbackTimelineEntries.map((entry) => (
                      <li key={`${entry.code}-${entry.timestamp}`} className="rounded-[1.25rem] border border-border/70 bg-background/80 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-medium text-foreground">{entry.name}</p>
                          <p className="text-sm text-muted-foreground">{formatTimelineDateTime(entry.timestamp)}</p>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">Код статуса: {entry.code}</p>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <SectionPlaceholder
                    title="История статусов пуста"
                    description="Сервис не вернул ни одной записи по движению заказа."
                  />
                )}
              </AdminSectionCard>

              <AdminSectionCard title="Комментарии" description="Комментарий клиента и заметки, оставленные при смене статуса.">
                <div className="space-y-4">
                  {customerComment ? (
                    <div className="rounded-[1.25rem] border border-border/70 bg-background/80 p-4">
                      <p className="text-[0.72rem] font-semibold tracking-[0.16em] text-muted-foreground uppercase">Комментарий клиента</p>
                      <p className="mt-2 text-sm leading-6 text-foreground">{customerComment}</p>
                    </div>
                  ) : null}

                  {operatorComments.length ? (
                    <div className="space-y-3">
                      {operatorComments.map((entry) => (
                        <div key={entry.id} className="rounded-[1.25rem] border border-border/70 bg-background/80 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="font-medium text-foreground">{getOrderStatusLabel(entry.currentStatus)}</p>
                            <p className="text-sm text-muted-foreground">{formatTimelineDateTime(entry.changedAt)}</p>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {getOrderStatusChangeSourceTypeLabel(entry.changeSourceType)}
                          </p>
                          <p className="mt-3 text-sm leading-6 text-foreground">{entry.comment?.trim()}</p>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {!customerComment && !operatorComments.length ? (
                    <SectionPlaceholder
                      title="Комментарии отсутствуют"
                      description="Ни клиент, ни оператор не оставляли текстовых заметок в доступных источниках заказа."
                    />
                  ) : null}
                </div>
              </AdminSectionCard>

              <AdminSectionCard title="Оплата и доставка" description="Что известно по оплате и fulfillment прямо сейчас.">
                <div className="grid gap-3 md:grid-cols-2">
                  <DetailStat label="Способ оплаты" value={getPaymentMethodLabel(order.payment)} />
                  <DetailStat label="Статус оплаты" value={getPaymentStatusPlaceholderLabel()} />
                  <DetailStat label="Способ доставки" value={order.delivery.methodName || getDeliveryTypeLabel(order.deliveryMethod)} />
                  <DetailStat label="Оценка доставки" value={formatDeliveryEstimate(order)} />
                </div>

                {deliveryMilestones.length ? (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-foreground">События доставки</p>
                    {deliveryMilestones.map((entry) => (
                      <div key={entry.id} className="rounded-[1.25rem] border border-border/70 bg-background/80 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-medium text-foreground">{getOrderStatusLabel(entry.currentStatus)}</p>
                          <p className="text-sm text-muted-foreground">{formatTimelineDateTime(entry.changedAt)}</p>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">{getStatusHistorySummary(entry)}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <SectionPlaceholder
                    title="Отдельной истории оплаты и доставки пока нет"
                    description="Новый detail API отдает текущее состояние заказа, но не возвращает отдельные события оплаты и fulfillment."
                  />
                )}
              </AdminSectionCard>
            </div>

            <div className="space-y-6">
              <AdminSectionCard title="Клиент" description="Основные контакты и тип оформления заказа.">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                  <DetailStat label="Имя" value={renderInfoValue(order.customerName)} />
                  <DetailStat label="Телефон" value={renderInfoValue(order.customerPhone)} />
                  <DetailStat label="Email" value={renderInfoValue(order.customerEmail)} />
                  <DetailStat label="Тип клиента" value={order.customerType} />
                  <DetailStat label="Источник" value={buildOrderSourceLabel(order)} wide />
                </div>
              </AdminSectionCard>

              <AdminSectionCard title="Адрес" description="Адрес доставки или выбранный пункт выдачи.">
                {hasAddressIssue ? (
                  <AdminNotice tone="destructive">
                    Для адресной доставки backend не вернул адрес. Это критично: оператору нечего передать в логистику.
                  </AdminNotice>
                ) : null}

                <div className="grid gap-3">
                  <DetailStat label="Назначение" value={formatOrderDeliveryDestination(order)} />
                  <div className="grid gap-3 md:grid-cols-2">
                    <DetailStat label="Город" value={renderInfoValue(order.delivery.address?.city)} />
                    <DetailStat label="Улица / дом" value={renderInfoValue([order.delivery.address?.street, order.delivery.address?.house].filter(Boolean).join(' '))} />
                    <DetailStat label="Квартира" value={renderInfoValue(order.delivery.address?.apartment)} />
                    <DetailStat label="Подъезд / этаж" value={renderInfoValue([order.delivery.address?.entrance, order.delivery.address?.floor].filter(Boolean).join(' / '))} />
                  </div>

                  {order.delivery.address?.comment?.trim() ? (
                    <div className="rounded-[1.25rem] border border-border/70 bg-background/80 p-4">
                      <p className="text-[0.72rem] font-semibold tracking-[0.16em] text-muted-foreground uppercase">Комментарий к адресу</p>
                      <p className="mt-2 text-sm leading-6 text-foreground">{order.delivery.address.comment.trim()}</p>
                    </div>
                  ) : null}
                </div>
              </AdminSectionCard>

              <AdminSectionCard title="Способ доставки" description="Параметры delivery, важные оператору.">
                <div className="grid gap-3">
                  <DetailStat label="Метод" value={order.delivery.methodName || getDeliveryTypeLabel(order.deliveryMethod)} />
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                    <DetailStat label="Стоимость" value={formatMoneyMinor(order.delivery.priceMinor)} />
                    <DetailStat label="Оценка" value={formatDeliveryEstimate(order)} />
                    <DetailStat label="Зона" value={renderInfoValue(order.delivery.zoneName, 'Не назначена')} />
                    <DetailStat label="ПВЗ" value={renderInfoValue(order.delivery.pickupPointName)} />
                  </div>
                </div>
              </AdminSectionCard>

              <AdminSectionCard title="Способ оплаты" description="То, что backend сообщает об оплате на текущий момент.">
                <div className="grid gap-3">
                  <DetailStat label="Метод" value={getPaymentMethodLabel(order.payment)} />
                  <DetailStat label="Статус" value={getPaymentStatusPlaceholderLabel()} />
                  <DetailStat label="Состояние заказа" value={getOrderStateTypeLabel(order.stateType)} />
                </div>
              </AdminSectionCard>

              <AdminSectionCard title="Внутренние заметки" description="Секция под staff-only заметки по заказу.">
                <SectionPlaceholder
                  title="Заметки пока недоступны"
                  description="Новый detail API не возвращает внутренние заметки. Секция зарезервирована, чтобы подключить их без переработки страницы."
                />
              </AdminSectionCard>

              <AdminSectionCard title="Действия" description="Операционные действия без переходов по дополнительным экранам.">
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={onBack}>
                    <ArrowLeftIcon className="size-4" />
                    К списку заказов
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => void handleCopy(order.orderNumber, 'номер заказа')}>
                    <CopyIcon className="size-4" />
                    Номер
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => void handleCopy(order.id, 'ID заказа')}>
                    <CopyIcon className="size-4" />
                    ID
                  </Button>
                  {normalizedCustomerPhone ? (
                    <a className={buttonVariants({ variant: 'outline', size: 'sm' })} href={`tel:${normalizedCustomerPhone}`}>
                      <PhoneIcon className="size-4" />
                      Позвонить
                    </a>
                  ) : null}
                  {normalizedCustomerEmail ? (
                    <a className={buttonVariants({ variant: 'outline', size: 'sm' })} href={`mailto:${normalizedCustomerEmail}`}>
                      <MailIcon className="size-4" />
                      Написать
                    </a>
                  ) : null}
                  {formatOrderDeliveryDestination(order) !== 'Не указано' ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void handleCopy(formatOrderDeliveryDestination(order), 'адрес или точка выдачи')}
                    >
                      <MapPinIcon className="size-4" />
                      Скопировать адрес
                    </Button>
                  ) : null}
                </div>

                {actionFeedbackMessage ? <p className="text-sm text-muted-foreground">{actionFeedbackMessage}</p> : null}
              </AdminSectionCard>
            </div>
          </div>
        </>
      ) : null}
    </AdminPage>
  );
}
