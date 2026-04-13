import { useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Link } from 'react-router-dom';
import type { Product } from '@/entities/product';
import { formatPrice } from '@/entities/product';
import { cn } from '@/shared/lib/cn';
import { Badge, LazyDataTable, type DataTableColumnMeta } from '@/shared/ui';

type ProductTableProps = {
  products: Product[];
  categoryLookup: Map<string, string>;
};

export function ProductTable({ products, categoryLookup }: ProductTableProps) {
  const columns = useMemo<ColumnDef<Product>[]>(
    () => [
      {
        id: 'sku',
        header: 'SKU',
        cell: ({ row }) => (
          <span className="font-mono text-xs tracking-[0.18em] text-muted-foreground uppercase">
            {row.original.sku?.trim() || 'Не указан'}
          </span>
        ),
        meta: {
          cellClassName: 'text-muted-foreground',
        },
      },
      {
        id: 'title',
        header: 'Наименование',
        cell: ({ row }) => (
          <Link className="font-medium text-foreground transition-colors hover:text-primary" to={`/products/${row.original.id}`}>
            {row.original.title.trim() || 'Без названия'}
          </Link>
        ),
      },
      {
        id: 'category',
        header: 'Наименование категории',
        cell: ({ row }) => (
          <Badge variant="outline" className="h-auto rounded-full px-3 py-1.5 text-[0.72rem] font-medium">
            {categoryLookup.get(row.original.categoryId) ?? `#${row.original.categoryId}`}
          </Badge>
        ),
        meta: {
          cellClassName: 'text-muted-foreground',
        },
      },
      {
        id: 'price',
        header: 'Цена',
        cell: ({ row }) => <span className="font-semibold text-foreground">{formatPrice(row.original.price)}</span>,
        meta: {
          cellClassName: 'text-right',
          headerClassName: 'text-right',
        },
      },
    ],
    [categoryLookup],
  );

  return (
    <LazyDataTable
      columns={columns}
      data={products}
      fallback={
        <div className="rounded-[1.5rem] border border-border/70 bg-muted/30 px-5 py-8 text-sm text-muted-foreground">
          Загрузка таблицы товаров...
        </div>
      }
      getRowId={(product) => product.id}
      wrapperClassName="overflow-hidden rounded-[1.5rem] border border-border/70 bg-background/60"
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
          'transition-colors hover:bg-muted/40',
          row.index % 2 === 0 ? 'bg-background/70' : 'bg-muted/10',
          row.index < products.length - 1 && 'border-b border-border/70',
        )
      }
      getCellClassName={(cell) => {
        const columnMeta = cell.column.columnDef.meta as DataTableColumnMeta | undefined;

        return cn('px-4 py-4 align-top text-sm text-foreground first:pl-5 last:pr-5', columnMeta?.cellClassName);
      }}
    />
  );
}
