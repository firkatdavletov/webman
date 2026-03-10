import type { Category } from '@/entities/category/model/types';

export type CategoryTreeItem = {
  category: Category;
  depth: number;
  parentTitle: string | null;
  nestedProducts: number;
};

export function countNestedProducts(category: Category): number {
  return category.products.length + category.children.reduce((total, child) => total + countNestedProducts(child), 0);
}

export function countCategoryNodes(categories: Category[]): number {
  return categories.reduce((total, category) => total + 1 + countCategoryNodes(category.children), 0);
}

export function buildCategoryLookup(categories: Category[], lookup = new Map<string, string>()): Map<string, string> {
  categories.forEach((category) => {
    lookup.set(category.id, category.title);
    buildCategoryLookup(category.children, lookup);
  });

  return lookup;
}

export function flattenCategoryTree(
  categories: Category[],
  depth = 0,
  parentTitle: string | null = null,
): CategoryTreeItem[] {
  return categories.flatMap((category) => {
    const item: CategoryTreeItem = {
      category,
      depth,
      parentTitle,
      nestedProducts: countNestedProducts(category),
    };

    return [item, ...flattenCategoryTree(category.children, depth + 1, category.title)];
  });
}
