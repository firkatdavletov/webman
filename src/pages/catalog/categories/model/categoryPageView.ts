import type { CategoryTreeItem } from '@/entities/category';

export const CATEGORY_PAGE_SIZE_OPTIONS = [8, 16, 32] as const;

export type CategoryStructureFilter = 'all' | 'root' | 'branch' | 'leaf';
export type CategoryImageFilter = 'all' | 'with-image' | 'without-image';

export type CategoryFilters = {
  searchQuery: string;
  structureFilter: CategoryStructureFilter;
  imageFilter: CategoryImageFilter;
};

export function filterCategoryTree(items: CategoryTreeItem[], filters: CategoryFilters): CategoryTreeItem[] {
  const normalizedQuery = filters.searchQuery.trim().toLowerCase();

  return items.filter((item) => {
    const matchesQuery =
      !normalizedQuery ||
      item.category.title.toLowerCase().includes(normalizedQuery) ||
      item.category.id.includes(normalizedQuery) ||
      item.parentTitle?.toLowerCase().includes(normalizedQuery) ||
      item.category.sku?.toLowerCase().includes(normalizedQuery);

    const matchesStructure =
      filters.structureFilter === 'all' ||
      (filters.structureFilter === 'root' && item.depth === 0) ||
      (filters.structureFilter === 'branch' && item.category.children.length > 0) ||
      (filters.structureFilter === 'leaf' && item.category.children.length === 0);

    const hasImage = Boolean(item.category.imageUrl);
    const matchesImage =
      filters.imageFilter === 'all' ||
      (filters.imageFilter === 'with-image' && hasImage) ||
      (filters.imageFilter === 'without-image' && !hasImage);

    return Boolean(matchesQuery && matchesStructure && matchesImage);
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
