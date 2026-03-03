import { CatalogCategory } from './catalogService';

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(price / 100);
}

export function countNestedProducts(category: CatalogCategory): number {
  return category.products.length + category.children.reduce((total, child) => total + countNestedProducts(child), 0);
}

export function countCategoryNodes(categories: CatalogCategory[]): number {
  return categories.reduce((total, category) => total + 1 + countCategoryNodes(category.children), 0);
}

export function buildCategoryLookup(categories: CatalogCategory[], lookup = new Map<number, string>()): Map<number, string> {
  categories.forEach((category) => {
    lookup.set(category.id, category.title);
    buildCategoryLookup(category.children, lookup);
  });

  return lookup;
}
