import { useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { ArrowUpRightIcon } from 'lucide-react';
import { getOrderStateTypeLabel, type OrderStatusDefinition } from '@/entities/order';
import { cn } from '@/shared/lib/cn';
import { Badge, LazyDataTable, type DataTableColumnMeta } from '@/shared/ui';
import { getOrderStatusBadgeClassName } from '@/pages/order-statuses/model/orderStatusPage';

type OrderStatusesTableProps = {
  statuses: OrderStatusDefinition[];
  onOpenStatus: (status: OrderStatusDefinition) => void;
};

function buildLogicBadges(status: OrderStatusDefinition): string[] {
  const badges: string[] = [];

  if (status.isInitial) {
    badges.push('Начальный');
  }

  if (status.isFinal) {
    badges.push('Финальный');
  }

  if (status.isCancellable) {
    badges.push('Разрешает отмену');
  }

  return badges;
}

export function OrderStatusesTable({ statuses, onOpenStatus }: OrderStatusesTableProps) {
  const columns = useMemo<ColumnDef<OrderStatusDefinition>[]>(
    () => [
      {
        id: 'status',
        header: 'Статус',
        cell: ({ row }) => (
          <div className="min-w-[17rem]">
            <button
              type="button"
              className="font-medium text-foreground transition-colors hover:text-primary"
              onClick={(event) => {
                event.stopPropagation();
                onOpenStatus(row.original);
              }}
            >
              {row.original.name.trim() || 'Без названия'}
            </button>
            <p className="mt-1 font-mono text-[0.72rem] tracking-[0.18em] text-muted-foreground uppercase">
              {row.original.code.trim() || 'Код не задан'}
            </p>
          </div>
        ),
      },
      {
        id: 'state',
        header: 'Сценарий',
        cell: ({ row }) => (
          <div className="min-w-[15rem]">
            <Badge
              variant="outline"
              className={cn('h-auto rounded-full border px-2.5 py-1 text-[0.72rem] font-medium', getOrderStatusBadgeClassName(row.original))}
            >
              {getOrderStateTypeLabel(row.original.stateType)}
            </Badge>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              {row.original.description?.trim() || 'Описание не задано.'}
            </p>
          </div>
        ),
      },
      {
        id: 'logic',
        header: 'Логика',
        cell: ({ row }) => {
          const logicBadges = buildLogicBadges(row.original);

          return (
            <div className="min-w-[15rem]">
              <div className="flex flex-wrap gap-2">
                {logicBadges.length ? (
                  logicBadges.map((badge) => (
                    <Badge key={badge} variant="outline" className="h-auto rounded-full px-2.5 py-1 text-[0.72rem] font-medium">
                      {badge}
                    </Badge>
                  ))
                ) : (
                  <Badge variant="outline" className="h-auto rounded-full px-2.5 py-1 text-[0.72rem] font-medium text-muted-foreground">
                    Базовый статус
                  </Badge>
                )}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Sort order: {row.original.sortOrder}</p>
            </div>
          );
        },
      },
      {
        id: 'communication',
        header: 'Коммуникации',
        cell: ({ row }) => (
          <div className="min-w-[14rem]">
            <p className="font-medium text-foreground">{row.original.visibleToCustomer ? 'Виден клиенту' : 'Скрыт от клиента'}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Клиент: {row.original.notifyCustomer ? 'уведомлять' : 'без уведомлений'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Сотрудники: {row.original.notifyStaff ? 'уведомлять' : 'без уведомлений'}
            </p>
          </div>
        ),
      },
      {
        id: 'activity',
        header: 'Активность',
        cell: ({ row }) => (
          <div className="min-w-[11rem]">
            <Badge
              variant="outline"
              className={cn(
                'h-auto rounded-full px-2.5 py-1 text-[0.72rem] font-medium',
                row.original.isActive ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-border bg-muted/40 text-muted-foreground',
              )}
            >
              {row.original.isActive ? 'Активен' : 'Неактивен'}
            </Badge>
            <p className="mt-2 font-mono text-[0.72rem] tracking-[0.18em] text-muted-foreground uppercase">
              #{row.original.id.slice(0, 8)}
            </p>
          </div>
        ),
      },
      {
        id: 'open',
        header: '',
        cell: () => <ArrowUpRightIcon className="ml-auto size-4 text-muted-foreground" />,
        meta: {
          headerClassName: 'w-10',
          cellClassName: 'w-10',
        } satisfies DataTableColumnMeta,
      },
    ],
    [onOpenStatus],
  );

  return (
    <LazyDataTable
      columns={columns}
      data={statuses}
      fallback={
        <div className="rounded-[1.5rem] border border-border/70 bg-muted/30 px-5 py-8 text-sm text-muted-foreground">
          Загрузка таблицы статусов...
        </div>
      }
      getRowId={(status) => status.id}
      wrapperClassName="overflow-auto rounded-[1.5rem] border border-border/70 bg-background/80"
      tableClassName="min-w-full border-collapse"
      headerRowClassName="border-b border-border/70"
      getHeaderClassName={(header) => {
        const columnMeta = header.column.columnDef.meta as DataTableColumnMeta | undefined;

        return cn(
          'sticky top-0 z-10 bg-muted/95 px-4 py-3 text-left text-[0.7rem] font-semibold tracking-[0.18em] text-muted-foreground uppercase backdrop-blur first:pl-5 last:pr-5',
          columnMeta?.headerClassName,
        );
      }}
      getRowProps={(row) => ({
        onClick: () => onOpenStatus(row.original),
        className: cn(
          'cursor-pointer border-b border-border/60 align-top transition-colors last:border-b-0 hover:bg-muted/45',
          row.index % 2 === 0 ? 'bg-background/80' : 'bg-muted/10',
          !row.original.isActive && 'bg-muted/20',
        ),
      })}
      getCellClassName={(cell) => {
        const columnMeta = cell.column.columnDef.meta as DataTableColumnMeta | undefined;

        return cn('px-4 py-4 align-top text-sm text-foreground first:pl-5 last:pr-5', columnMeta?.cellClassName);
      }}
    />
  );
}
