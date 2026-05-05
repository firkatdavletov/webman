import { useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { ArrowUpRightIcon } from 'lucide-react';
import {
  formatPromoCodeDateTime,
  formatPromoCodeDiscountValue,
  formatPromoCodeMoneyMinor,
  getPromoCodeDiscountTypeLabel,
  type PromoCode,
} from '@/entities/promo-code';
import { cn } from '@/shared/lib/cn';
import { Badge, LazyDataTable, type DataTableColumnMeta } from '@/shared/ui';

type PromoCodesTableProps = {
  promoCodes: PromoCode[];
  onOpenPromoCode: (promoCode: PromoCode) => void;
};

function getActivityBadgeClassName(active: boolean): string {
  return active
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : 'border-border bg-muted/40 text-muted-foreground';
}

export function PromoCodesTable({ promoCodes, onOpenPromoCode }: PromoCodesTableProps) {
  const columns = useMemo<ColumnDef<PromoCode>[]>(
    () => [
      {
        id: 'code',
        header: 'Промокод',
        cell: ({ row }) => (
          <div className="min-w-[13rem]">
            <button
              type="button"
              className="font-medium text-foreground transition-colors hover:text-primary"
              onClick={(event) => {
                event.stopPropagation();
                onOpenPromoCode(row.original);
              }}
            >
              {row.original.code}
            </button>
            <p className="mt-1 font-mono text-[0.72rem] tracking-[0.18em] text-muted-foreground uppercase">
              ID: {row.original.id.slice(0, 8)}
            </p>
          </div>
        ),
      },
      {
        id: 'discount',
        header: 'Скидка',
        cell: ({ row }) => (
          <div className="min-w-[14rem]">
            <Badge variant="outline" className="h-auto rounded-full px-2.5 py-1 text-[0.72rem] font-medium">
              {getPromoCodeDiscountTypeLabel(row.original.discountType)}
            </Badge>
            <p className="mt-2 text-sm font-medium text-foreground">
              {formatPromoCodeDiscountValue(row.original.discountType, row.original.discountValue, row.original.currency)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Валюта: {row.original.currency ?? '—'}</p>
          </div>
        ),
      },
      {
        id: 'limits',
        header: 'Ограничения',
        cell: ({ row }) => (
          <div className="min-w-[15rem] space-y-1 text-xs text-muted-foreground">
            <p>Мин. заказ: {formatPromoCodeMoneyMinor(row.original.minOrderAmountMinor, row.original.currency)}</p>
            <p>Макс. скидка: {formatPromoCodeMoneyMinor(row.original.maxDiscountMinor, row.original.currency)}</p>
            <p>Лимит всего: {row.original.usageLimitTotal ?? '—'}</p>
            <p>Лимит на пользователя: {row.original.usageLimitPerUser ?? '—'}</p>
          </div>
        ),
      },
      {
        id: 'period',
        header: 'Период действия',
        cell: ({ row }) => (
          <div className="min-w-[13rem] space-y-1 text-xs text-muted-foreground">
            <p>Начало: {formatPromoCodeDateTime(row.original.startsAt)}</p>
            <p>Окончание: {formatPromoCodeDateTime(row.original.endsAt)}</p>
          </div>
        ),
      },
      {
        id: 'stats',
        header: 'Статус',
        cell: ({ row }) => (
          <div className="min-w-[11rem]">
            <Badge
              variant="outline"
              className={cn('h-auto rounded-full px-2.5 py-1 text-[0.72rem] font-medium', getActivityBadgeClassName(row.original.active))}
            >
              {row.original.active ? 'Активен' : 'Неактивен'}
            </Badge>
            <p className="mt-2 text-xs text-muted-foreground">Использован: {row.original.usedCount}</p>
            <p className="mt-1 text-xs text-muted-foreground">Обновлен: {formatPromoCodeDateTime(row.original.updatedAt)}</p>
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
    [onOpenPromoCode],
  );

  return (
    <LazyDataTable
      columns={columns}
      data={promoCodes}
      fallback={
        <div className="rounded-[1.5rem] border border-border/70 bg-muted/30 px-5 py-8 text-sm text-muted-foreground">
          Загрузка таблицы промокодов...
        </div>
      }
      getRowId={(promoCode) => promoCode.id}
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
        onClick: () => onOpenPromoCode(row.original),
        className: cn(
          'cursor-pointer border-b border-border/60 align-top transition-colors last:border-b-0 hover:bg-muted/45',
          row.index % 2 === 0 ? 'bg-background/80' : 'bg-muted/10',
          !row.original.active && 'bg-muted/20',
        ),
      })}
      getCellClassName={(cell) => {
        const columnMeta = cell.column.columnDef.meta as DataTableColumnMeta | undefined;

        return cn('px-4 py-4 align-top text-sm text-foreground first:pl-5 last:pr-5', columnMeta?.cellClassName);
      }}
    />
  );
}
