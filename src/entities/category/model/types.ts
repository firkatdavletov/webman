import type { Product } from '@/entities/product';

export type Category = {
  id: string;
  parentCategory: string | null;
  title: string;
  slug: string;
  isActive: boolean;
  imageUrl: string | null;
  products: Product[];
  children: Category[];
};
