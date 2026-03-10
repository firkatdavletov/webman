import type { Category } from '@/entities/category';

export type CategoryEditorValues = {
  title: string;
  imageUrl: string;
  sku: string;
};

export const EMPTY_CATEGORY_EDITOR_VALUES: CategoryEditorValues = {
  title: '',
  imageUrl: '',
  sku: '',
};

export function buildCategoryEditorValues(category: Category): CategoryEditorValues {
  return {
    title: category.title,
    imageUrl: category.imageUrl ?? '',
    sku: category.sku ?? '',
  };
}
