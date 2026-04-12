import { useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Link } from 'react-router-dom';
import type { Product } from '@/entities/product';
import { formatPrice } from '@/entities/product';
import { DataTable } from '@/shared/ui/data-table';

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
        cell: ({ row }) => row.original.sku?.trim() || 'Не указан',
        meta: {
          cellClassName: 'products-cell-muted',
        },
      },
      {
        id: 'title',
        header: 'Наименование',
        cell: ({ row }) => (
          <Link className="product-table-title-link" to={`/products/${row.original.id}`}>
            {row.original.title.trim() || 'Без названия'}
          </Link>
        ),
      },
      {
        id: 'category',
        header: 'Наименование категории',
        cell: ({ row }) => categoryLookup.get(row.original.categoryId) ?? `#${row.original.categoryId}`,
        meta: {
          cellClassName: 'products-cell-muted',
        },
      },
      {
        id: 'price',
        header: 'Цена',
        cell: ({ row }) => formatPrice(row.original.price),
        meta: {
          cellClassName: 'products-cell-price',
        },
      },
    ],
    [categoryLookup],
  );

  return (
    <DataTable
      columns={columns}
      data={products}
      getRowId={(product) => product.id}
      wrapperClassName="products-table-wrap"
      tableClassName="products-table"
    />
  );
}
