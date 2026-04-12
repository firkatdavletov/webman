import { lazy, Suspense, type ComponentType, type ReactNode } from 'react';
import type { DataTableProps } from './data-table';

type LazyDataTableProps<TData> = DataTableProps<TData> & {
  fallback?: ReactNode;
};

const DataTableComponent = lazy(async () => {
  const module = await import('./data-table');

  return {
    default: module.DataTable as ComponentType<DataTableProps<unknown>>,
  };
});

export function LazyDataTable<TData>({ fallback = null, ...props }: LazyDataTableProps<TData>) {
  return (
    <Suspense fallback={fallback}>
      <DataTableComponent {...(props as DataTableProps<unknown>)} />
    </Suspense>
  );
}
