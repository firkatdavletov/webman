import type { Product } from '@/entities/product';

export type ProductEditorValues = {
  categoryId: string;
  title: string;
  description: string;
  price: string;
  oldPrice: string;
  isActive: boolean;
  imageUrl: string;
  unit: string;
  displayWeight: string;
  countStep: string;
  sku: string;
};

export const PRODUCT_UNIT_OPTIONS = [
  { value: 'PIECE', label: 'шт' },
  { value: 'KILOGRAM', label: 'кг' },
  { value: 'GRAM', label: 'г' },
  { value: 'LITER', label: 'л' },
  { value: 'MILLILITER', label: 'мл' },
] as const;

export const EMPTY_PRODUCT_EDITOR_VALUES: ProductEditorValues = {
  categoryId: '',
  title: '',
  description: '',
  price: '',
  oldPrice: '',
  isActive: true,
  imageUrl: '',
  unit: 'PIECE',
  displayWeight: '',
  countStep: '1',
  sku: '',
};

function formatEditablePrice(price: number): string {
  const rawValue = (price / 100).toFixed(2);

  return rawValue.replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
}

export function buildProductEditorValues(product: Product): ProductEditorValues {
  return {
    categoryId: product.categoryId,
    title: product.title,
    description: product.description ?? '',
    price: formatEditablePrice(product.price),
    oldPrice: product.oldPrice === null ? '' : formatEditablePrice(product.oldPrice),
    isActive: product.isActive,
    imageUrl: product.imageUrl ?? '',
    unit: product.unit,
    displayWeight: product.displayWeight ?? '',
    countStep: String(product.countStep),
    sku: product.sku ?? '',
  };
}

export function parseProductPrice(value: string): number | null {
  const normalizedValue = value.trim().replace(',', '.');
  const numericValue = Number(normalizedValue);

  if (!normalizedValue || Number.isNaN(numericValue) || numericValue < 0) {
    return null;
  }

  return Math.round(numericValue * 100);
}

export function parseOptionalProductPrice(value: string): number | null | undefined {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return null;
  }

  return parseProductPrice(normalizedValue) ?? undefined;
}
