import type { Product } from '@/entities/product';
import type { MediaImage } from '@/shared/model/media';

export type Category = {
  id: string;
  parentCategory: string | null;
  externalId: string | null;
  title: string;
  slug: string;
  description: string | null;
  sortOrder: number | null;
  isActive: boolean;
  images: MediaImage[];
  products: Product[];
  children: Category[];
};
