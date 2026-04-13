import { useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { getUserRoleLabel, type OrderStatusTransition } from '@/entities/order';
import { cn } from '@/shared/lib/cn';
import { Badge, Button, LazyDataTable, type DataTableColumnMeta } from '@/shared/ui';
import { getOrderStatusBadgeClassName } from '@/pages/order-statuses/model/orderStatusPage';

type OrderStatusTransitionsTableProps = {
  transitions: OrderStatusTransition[];
  deletingTransitionId: string | null;
  onDeleteTransition: (transitionId: string) => void;
};

export function OrderStatusTransitionsTable({
  transitions,
  deletingTransitionId,
  onDeleteTransition,
}: OrderStatusTransitionsTableProps) {
  const columns = useMemo<ColumnDef<OrderStatusTransition>[]>(
    () => [
      {
        id: 'target',
        header: 'Целевой статус',
        cell: ({ row }) => (
          <div className="min-w-[15rem]">
            <Badge
              variant="outline"
              className={cn('h-auto rounded-full border px-2.5 py-1 text-[0.72rem] font-medium', getOrderStatusBadgeClassName(row.original.toStatus))}
            >
              {row.original.toStatus.name}
            </Badge>
            <p className="mt-2 font-mono text-[0.72rem] tracking-[0.18em] text-muted-foreground uppercase">
              {row.original.toStatus.code}
            </p>
          </div>
        ),
      },
      {
        id: 'mode',
        header: 'Тип перехода',
        cell: ({ row }) => (
          <div className="min-w-[12rem]">
            <Badge variant="outline" className="h-auto rounded-full px-2.5 py-1 text-[0.72rem] font-medium">
              {row.original.isAutomatic ? 'Автоматический' : 'Ручной'}
            </Badge>
            <p className="mt-2 text-xs text-muted-foreground">{row.original.isActive ? 'Переход активен' : 'Переход неактивен'}</p>
          </div>
        ),
      },
      {
        id: 'guards',
        header: 'Ограничения',
        cell: ({ row }) => (
          <div className="min-w-[16rem]">
            <p className="font-medium text-foreground">
              {row.original.requiredRole ? getUserRoleLabel(row.original.requiredRole) : 'Без ограничения по роли'}
            </p>
            <p className="mt-1 font-mono text-[0.72rem] tracking-[0.12em] text-muted-foreground">
              {row.original.guardCode?.trim() ? `guard: ${row.original.guardCode.trim()}` : 'guard не задан'}
            </p>
          </div>
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-xl bg-background/80"
              onClick={(event) => {
                event.stopPropagation();
                onDeleteTransition(row.original.id);
              }}
              disabled={deletingTransitionId === row.original.id}
            >
              {deletingTransitionId === row.original.id ? 'Удаление...' : 'Удалить'}
            </Button>
          </div>
        ),
        meta: {
          headerClassName: 'w-28',
          cellClassName: 'w-28',
        } satisfies DataTableColumnMeta,
      },
    ],
    [deletingTransitionId, onDeleteTransition],
  );

  return (
    <LazyDataTable
      columns={columns}
      data={transitions}
      fallback={
        <div className="rounded-[1.5rem] border border-border/70 bg-muted/30 px-5 py-8 text-sm text-muted-foreground">
          Загрузка таблицы переходов...
        </div>
      }
      getRowId={(transition) => transition.id}
      wrapperClassName="overflow-auto rounded-[1.5rem] border border-border/70 bg-background/80"
      tableClassName="min-w-full border-collapse"
      headerRowClassName="border-b border-border/70"
      getHeaderClassName={(header) => {
        const columnMeta = header.column.columnDef.meta as DataTableColumnMeta | undefined;

        return cn(
          'bg-muted/70 px-4 py-3 text-left text-[0.72rem] font-semibold tracking-[0.18em] text-muted-foreground uppercase first:pl-5 last:pr-5',
          columnMeta?.headerClassName,
        );
      }}
      getRowClassName={(row) =>
        cn(
          row.index % 2 === 0 ? 'bg-background/80' : 'bg-muted/10',
          row.index < transitions.length - 1 && 'border-b border-border/60',
        )
      }
      getCellClassName={(cell) => {
        const columnMeta = cell.column.columnDef.meta as DataTableColumnMeta | undefined;

        return cn('px-4 py-4 align-top text-sm text-foreground first:pl-5 last:pr-5', columnMeta?.cellClassName);
      }}
    />
  );
}
