import type { Product } from '@/entities/product';
import type { MediaImage } from '@/shared/model/media';

export type Category = {
  id: string;
  parentCategory: string | null;
  title: string;
  slug: string;
  isActive: boolean;
  images: MediaImage[];
  products: Product[];
  children: Category[];
};
