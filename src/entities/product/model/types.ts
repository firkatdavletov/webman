import type { components } from '@/shared/api/schema';

export type ProductUnit = components['schemas']['ProductUnit'];

export type Product = {
  id: string;
  categoryId: string;
  title: string;
  slug: string;
  description: string | null;
  price: number;
  oldPrice: number | null;
  imageUrl: string | null;
  unit: ProductUnit;
  displayWeight: string | null;
  countStep: number;
  sku: string | null;
};
