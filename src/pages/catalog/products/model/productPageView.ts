import type { Product } from '@/entities/product';

export type ProductFilters = {
  searchQuery: string;
};

export function filterProducts(products: Product[], filters: ProductFilters): Product[] {
  const normalizedQuery = filters.searchQuery.trim().toLowerCase();

  if (!normalizedQuery) {
    return products;
  }

  return products.filter((product) => product.title.toLowerCase().includes(normalizedQuery));
}
