import type { Category } from '@/entities/category';

export type CategoryEditorValues = {
  title: string;
  imageUrl: string;
  isActive: boolean;
};

export const EMPTY_CATEGORY_EDITOR_VALUES: CategoryEditorValues = {
  title: '',
  imageUrl: '',
  isActive: true,
};

export function buildCategoryEditorValues(category: Category): CategoryEditorValues {
  return {
    title: category.title,
    imageUrl: category.imageUrl ?? '',
    isActive: category.isActive,
  };
}
