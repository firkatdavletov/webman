import { useEffect, useMemo, useRef } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import {
  ChevronDownIcon,
  ChevronUpIcon,
  ChevronsUpDownIcon,
  ExternalLinkIcon,
} from 'lucide-react';
import {
  formatMoneyMinor,
  formatOrderDeliveryDestination,
  formatOrderDateTime,
  getCustomerLabel,
  getDeliveryTypeLabel,
  getOrderStatusLabel,
  getOrderStatusTone,
  getPaymentMethodLabel,
  type Order,
} from '@/entities/order';
import { cn } from '@/shared/lib/cn';
import { Badge, DataTable, type DataTableColumnMeta } from '@/shared/ui';
import {
  getOrderManagerLabel,
  getOrderSourceLabel,
  getOrderTagsLabel,
  ORDER_TABLE_COLUMN_LABELS,
  type OrdersColumnId,
  type OrdersDensity,
  type OrdersSortKey,
  type OrdersSortState,
} from '@/pages/orders/model/orderPageView';

type OrdersTableProps = {
  orders: Order[];
  activeOrderId: string | null;
  density: OrdersDensity;
  visibleColumnIds: OrdersColumnId[];
  selectedOrderIds: Set<string>;
  sort: OrdersSortState;
  isAllPageRowsSelected: boolean;
  isSomePageRowsSelected: boolean;
  onOpenOrder: (orderId: string) => void;
  onSortChange: (key: OrdersSortKey) => void;
  onToggleOrderSelection: (orderId: string) => void;
  onTogglePageSelection: (checked: boolean) => void;
};

type SelectionCheckboxProps = {
  checked: boolean;
  indeterminate?: boolean;
  ariaLabel: string;
  onChange: (checked: boolean) => void;
};

function SelectionCheckbox({ checked, indeterminate = false, ariaLabel, onChange }: SelectionCheckboxProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!inputRef.current) {
      return;
    }

    inputRef.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <input
      ref={inputRef}
      type="checkbox"
      className="size-4 rounded border-border text-primary focus-visible:ring-2 focus-visible:ring-ring/40"
      aria-label={ariaLabel}
      checked={checked}
      onChange={(event) => onChange(event.target.checked)}
      onClick={(event) => event.stopPropagation()}
    />
  );
}

function buildCustomerMeta(order: Order): string {
  const parts = [order.customerPhone?.trim(), order.customerEmail?.trim()].filter(Boolean);

  return parts.length ? parts.join(' • ') : 'Контакты не указаны';
}

function getStatusBadgeClassName(order: Order): string {
  const tone = getOrderStatusTone(order.status);

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

function getDensityClassName(density: OrdersDensity): string {
  return density === 'comfortable' ? 'px-4 py-4 first:pl-5 last:pr-5' : 'px-4 py-3 first:pl-5 last:pr-5';
}

function SortHeader({
  columnKey,
  currentSort,
  children,
  onSortChange,
}: {
  columnKey: OrdersSortKey;
  currentSort: OrdersSortState;
  children: string;
  onSortChange: (key: OrdersSortKey) => void;
}) {
  const isActive = currentSort.key === columnKey;
  const Icon = !isActive ? ChevronsUpDownIcon : currentSort.direction === 'asc' ? ChevronUpIcon : ChevronDownIcon;

  return (
    <button
      type="button"
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg text-left transition-colors hover:text-foreground',
        isActive ? 'text-foreground' : 'text-muted-foreground',
      )}
      onClick={() => onSortChange(columnKey)}
    >
      <span>{children}</span>
      <Icon className="size-3.5" />
    </button>
  );
}

export function OrdersTable({
  orders,
  activeOrderId,
  density,
  visibleColumnIds,
  selectedOrderIds,
  sort,
  isAllPageRowsSelected,
  isSomePageRowsSelected,
  onOpenOrder,
  onSortChange,
  onToggleOrderSelection,
  onTogglePageSelection,
}: OrdersTableProps) {
  const visibleColumnSet = useMemo(() => new Set<OrdersColumnId>(visibleColumnIds), [visibleColumnIds]);

  const allColumns = useMemo<ColumnDef<Order>[]>(
    () => [
      {
        id: 'selection',
        header: () => (
          <SelectionCheckbox
            ariaLabel="Выбрать все заказы на текущей странице"
            checked={isAllPageRowsSelected}
            indeterminate={isSomePageRowsSelected}
            onChange={onTogglePageSelection}
          />
        ),
        cell: ({ row }) => (
          <SelectionCheckbox
            ariaLabel={`Выбрать заказ ${row.original.orderNumber}`}
            checked={selectedOrderIds.has(row.original.id)}
            onChange={() => onToggleOrderSelection(row.original.id)}
          />
        ),
        meta: {
          headerClassName: 'w-12',
          cellClassName: 'w-12',
        } satisfies DataTableColumnMeta,
      },
      {
        id: 'number',
        header: () => (
          <SortHeader columnKey="orderNumber" currentSort={sort} onSortChange={onSortChange}>
            {ORDER_TABLE_COLUMN_LABELS.number}
          </SortHeader>
        ),
        cell: ({ row }) => (
          <div className="min-w-[8rem]">
            <p className="font-mono text-xs font-semibold tracking-[0.18em] text-foreground uppercase">{row.original.orderNumber}</p>
            <p className="mt-1 text-xs text-muted-foreground">#{row.original.id.slice(0, 8)}</p>
          </div>
        ),
      },
      {
        id: 'date',
        header: () => (
          <SortHeader columnKey="createdAt" currentSort={sort} onSortChange={onSortChange}>
            {ORDER_TABLE_COLUMN_LABELS.date}
          </SortHeader>
        ),
        cell: ({ row }) => (
          <div className="min-w-[8rem]">
            <p className="font-medium text-foreground">{formatOrderDateTime(row.original.createdAt)}</p>
            <p className="mt-1 text-xs text-muted-foreground">Обновлен {formatOrderDateTime(row.original.updatedAt)}</p>
          </div>
        ),
      },
      {
        id: 'client',
        header: () => (
          <SortHeader columnKey="customer" currentSort={sort} onSortChange={onSortChange}>
            {ORDER_TABLE_COLUMN_LABELS.client}
          </SortHeader>
        ),
        cell: ({ row }) => (
          <div className="min-w-[14rem]">
            <p className="font-medium text-foreground">{getCustomerLabel(row.original)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{buildCustomerMeta(row.original)}</p>
          </div>
        ),
      },
      {
        id: 'amount',
        header: () => (
          <SortHeader columnKey="totalMinor" currentSort={sort} onSortChange={onSortChange}>
            {ORDER_TABLE_COLUMN_LABELS.amount}
          </SortHeader>
        ),
        cell: ({ row }) => (
          <div className="min-w-[8rem] text-right">
            <p className="font-semibold text-foreground">{formatMoneyMinor(row.original.totalMinor)}</p>
            <p className="mt-1 text-xs text-muted-foreground">Доставка {formatMoneyMinor(row.original.deliveryFeeMinor)}</p>
          </div>
        ),
        meta: {
          headerClassName: 'text-right',
          cellClassName: 'text-right',
        } satisfies DataTableColumnMeta,
      },
      {
        id: 'payment',
        header: () => (
          <SortHeader columnKey="payment" currentSort={sort} onSortChange={onSortChange}>
            {ORDER_TABLE_COLUMN_LABELS.payment}
          </SortHeader>
        ),
        cell: ({ row }) => (
          <div className="min-w-[10rem]">
            <p className="font-medium text-foreground">{getPaymentMethodLabel(row.original.payment)}</p>
            <p className="mt-1 text-xs text-muted-foreground">Статус оплаты недоступен в API</p>
          </div>
        ),
      },
      {
        id: 'delivery',
        header: () => (
          <SortHeader columnKey="delivery" currentSort={sort} onSortChange={onSortChange}>
            {ORDER_TABLE_COLUMN_LABELS.delivery}
          </SortHeader>
        ),
        cell: ({ row }) => (
          <div className="min-w-[13rem]">
            <p className="font-medium text-foreground">{row.original.delivery.methodName || getDeliveryTypeLabel(row.original.deliveryMethod)}</p>
            <p className="mt-1 truncate text-xs text-muted-foreground">{formatOrderDeliveryDestination(row.original)}</p>
          </div>
        ),
      },
      {
        id: 'status',
        header: () => (
          <SortHeader columnKey="status" currentSort={sort} onSortChange={onSortChange}>
            {ORDER_TABLE_COLUMN_LABELS.status}
          </SortHeader>
        ),
        cell: ({ row }) => (
          <Badge
            variant="outline"
            className={cn('h-auto rounded-full border px-2.5 py-1 text-[0.72rem] font-medium', getStatusBadgeClassName(row.original))}
          >
            {getOrderStatusLabel(row.original.status)}
          </Badge>
        ),
      },
      {
        id: 'source',
        header: () => (
          <SortHeader columnKey="source" currentSort={sort} onSortChange={onSortChange}>
            {ORDER_TABLE_COLUMN_LABELS.source}
          </SortHeader>
        ),
        cell: ({ row }) => (
          <div className="min-w-[10rem]">
            <p className="font-medium text-foreground">{getOrderSourceLabel(row.original)}</p>
            <p className="mt-1 text-xs text-muted-foreground">Точный канал не приходит из API</p>
          </div>
        ),
      },
      {
        id: 'manager',
        header: () => (
          <SortHeader columnKey="manager" currentSort={sort} onSortChange={onSortChange}>
            {ORDER_TABLE_COLUMN_LABELS.manager}
          </SortHeader>
        ),
        cell: () => (
          <Badge variant="outline" className="h-auto rounded-full px-2.5 py-1 text-[0.72rem] font-medium text-muted-foreground">
            {getOrderManagerLabel()}
          </Badge>
        ),
      },
      {
        id: 'tags',
        header: () => (
          <SortHeader columnKey="tags" currentSort={sort} onSortChange={onSortChange}>
            {ORDER_TABLE_COLUMN_LABELS.tags}
          </SortHeader>
        ),
        cell: () => (
          <Badge variant="outline" className="h-auto rounded-full px-2.5 py-1 text-[0.72rem] font-medium text-muted-foreground">
            {getOrderTagsLabel()}
          </Badge>
        ),
      },
      {
        id: 'open',
        header: '',
        cell: () => <ExternalLinkIcon className="ml-auto size-4 text-muted-foreground" />,
        meta: {
          headerClassName: 'w-10',
          cellClassName: 'w-10',
        } satisfies DataTableColumnMeta,
      },
    ],
    [
      isAllPageRowsSelected,
      isSomePageRowsSelected,
      onSortChange,
      onToggleOrderSelection,
      onTogglePageSelection,
      selectedOrderIds,
      sort,
    ],
  );

  const columns = useMemo(
    () => allColumns.filter((column) => column.id === 'selection' || column.id === 'open' || visibleColumnSet.has(column.id as OrdersColumnId)),
    [allColumns, visibleColumnSet],
  );

  const cellDensityClassName = getDensityClassName(density);

  return (
    <DataTable
      columns={columns}
      data={orders}
      getRowId={(order) => order.id}
      wrapperClassName="overflow-auto rounded-[1.5rem] border border-border/70 bg-background/80"
      tableClassName="min-w-full border-collapse"
      headerRowClassName="border-b border-border/70"
      getHeaderClassName={(header) => {
        const meta = header.column.columnDef.meta as DataTableColumnMeta | undefined;

        return cn(
          'sticky top-0 z-10 bg-muted/95 px-4 py-3 text-left text-[0.7rem] font-semibold tracking-[0.18em] text-muted-foreground uppercase backdrop-blur first:pl-5 last:pr-5',
          meta?.headerClassName,
        );
      }}
      getRowProps={(row) => ({
        onClick: () => onOpenOrder(row.original.id),
        className: cn(
          'cursor-pointer border-b border-border/60 align-top transition-colors last:border-b-0 hover:bg-muted/45',
          selectedOrderIds.has(row.original.id) && 'bg-primary/6',
          activeOrderId === row.original.id && 'bg-primary/10 ring-1 ring-inset ring-primary/20',
        ),
      })}
      getCellClassName={(cell) => {
        const meta = cell.column.columnDef.meta as DataTableColumnMeta | undefined;

        return cn(
          cellDensityClassName,
          'align-top text-sm text-foreground',
          meta?.cellClassName,
        );
      }}
    />
  );
}
