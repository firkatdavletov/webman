import { type ReactNode } from 'react';
import {
  type Cell,
  flexRender,
  getCoreRowModel,
  type Header,
  type Row,
  type ColumnDef,
  useReactTable,
} from '@tanstack/react-table';
import { cn } from '@/shared/lib/cn';

export type DataTableColumnMeta = {
  headerClassName?: string;
  cellClassName?: string;
};

export type DataTableProps<TData> = {
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  getRowId?: (originalRow: TData, index: number) => string;
  wrapperClassName?: string;
  tableClassName?: string;
  headerRowClassName?: string;
  bodyRowClassName?: string;
  getRowClassName?: (row: Row<TData>) => string | undefined;
  getCellClassName?: (cell: Cell<TData, unknown>) => string | undefined;
  getHeaderClassName?: (header: Header<TData, unknown>) => string | undefined;
  emptyContent?: ReactNode;
};

function getColumnMeta<TData>(headerOrCell: Header<TData, unknown> | Cell<TData, unknown>): DataTableColumnMeta | undefined {
  return headerOrCell.column.columnDef.meta as DataTableColumnMeta | undefined;
}

export function DataTable<TData>({
  columns,
  data,
  getRowId,
  wrapperClassName,
  tableClassName,
  headerRowClassName,
  bodyRowClassName,
  getRowClassName,
  getCellClassName,
  getHeaderClassName,
  emptyContent = null,
}: DataTableProps<TData>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    ...(getRowId ? { getRowId } : {}),
  });

  const rows = table.getRowModel().rows;

  return (
    <div className={wrapperClassName}>
      <table className={tableClassName}>
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className={headerRowClassName}>
              {headerGroup.headers.map((header) => {
                const meta = getColumnMeta(header);

                return (
                  <th
                    key={header.id}
                    className={cn(meta?.headerClassName, getHeaderClassName?.(header))}
                    colSpan={header.colSpan}
                  >
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {rows.length
            ? rows.map((row) => (
                <tr key={row.id} className={cn(bodyRowClassName, getRowClassName?.(row))}>
                  {row.getVisibleCells().map((cell) => {
                    const meta = getColumnMeta(cell);

                    return (
                      <td key={cell.id} className={cn(meta?.cellClassName, getCellClassName?.(cell))}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    );
                  })}
                </tr>
              ))
            : emptyContent}
        </tbody>
      </table>
    </div>
  );
}
