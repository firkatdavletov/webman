import type { CategoryTreeItem } from '@/entities/category';

export type CategoryFilters = {
  searchQuery: string;
};

export function filterCategoryTree(items: CategoryTreeItem[], filters: CategoryFilters): CategoryTreeItem[] {
  const normalizedQuery = filters.searchQuery.trim().toLowerCase();

  if (!normalizedQuery) {
    return items;
  }

  return items.filter((item) => item.category.title.toLowerCase().includes(normalizedQuery));
}
