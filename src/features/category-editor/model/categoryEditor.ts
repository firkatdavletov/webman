import type { Category } from '@/entities/category';

export type CategoryEditorValues = {
  title: string;
  isActive: boolean;
};

export const EMPTY_CATEGORY_EDITOR_VALUES: CategoryEditorValues = {
  title: '',
  isActive: true,
};

export function buildCategoryEditorValues(category: Category): CategoryEditorValues {
  return {
    title: category.title,
    isActive: category.isActive,
  };
}
