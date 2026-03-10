import type { Product } from '@/entities/product';

export const PRODUCT_PAGE_SIZE_OPTIONS = [12, 24, 48] as const;

export type ProductFilters = {
  searchQuery: string;
  categoryFilter: string;
  unitFilter: string;
};

export function buildCategoryOptions(categoryLookup: Map<string, string>): Array<[string, string]> {
  return Array.from(categoryLookup.entries()).sort((left, right) => left[1].localeCompare(right[1], 'ru'));
}

export function buildUnitOptions(products: Product[]): string[] {
  return Array.from(new Set(products.map((product) => product.unit))).sort((left, right) => left.localeCompare(right, 'ru'));
}

export function filterProducts(products: Product[], categoryLookup: Map<string, string>, filters: ProductFilters): Product[] {
  const normalizedQuery = filters.searchQuery.trim().toLowerCase();

  return products.filter((product) => {
    const categoryName = categoryLookup.get(product.categoryId)?.toLowerCase() ?? '';
    const matchesQuery =
      !normalizedQuery ||
      product.title.toLowerCase().includes(normalizedQuery) ||
      product.id.includes(normalizedQuery) ||
      product.description?.toLowerCase().includes(normalizedQuery) ||
      product.sku?.toLowerCase().includes(normalizedQuery) ||
      categoryName.includes(normalizedQuery);

    const matchesCategory = filters.categoryFilter === 'all' || product.categoryId === filters.categoryFilter;
    const matchesUnit = filters.unitFilter === 'all' || product.unit === filters.unitFilter;

    return Boolean(matchesQuery && matchesCategory && matchesUnit);
  });
}

export function paginateItems<T>(items: T[], page: number, pageSize: number): {
  totalPages: number;
  currentPage: number;
  paginatedItems: T[];
  visibleStart: number;
  visibleEnd: number;
} {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * pageSize;

  return {
    totalPages,
    currentPage,
    paginatedItems: items.slice(pageStart, pageStart + pageSize),
    visibleStart: items.length ? pageStart + 1 : 0,
    visibleEnd: items.length ? Math.min(pageStart + pageSize, items.length) : 0,
  };
}
