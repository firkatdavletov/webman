import type { Product } from '@/entities/product';

export const PRODUCT_UNIT_OPTIONS: Array<{ value: Product['unit']; label: string }> = [
  { value: 'PIECE', label: 'шт' },
  { value: 'KILOGRAM', label: 'кг' },
  { value: 'GRAM', label: 'г' },
  { value: 'LITER', label: 'л' },
  { value: 'MILLILITER', label: 'мл' },
];

export function parseProductSortOrder(value: string): number | null {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return 0;
  }

  const numericValue = Number(normalizedValue);

  if (!Number.isInteger(numericValue)) {
    return null;
  }

  return numericValue;
}
