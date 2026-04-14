import type { Category } from '@/entities/category';

export type CategoryEditorValues = {
  title: string;
  slug: string;
  externalId: string;
  description: string;
  sortOrder: string;
  isActive: boolean;
};

export const EMPTY_CATEGORY_EDITOR_VALUES: CategoryEditorValues = {
  title: '',
  slug: '',
  externalId: '',
  description: '',
  sortOrder: '',
  isActive: true,
};

export function buildCategoryEditorValues(category: Category): CategoryEditorValues {
  return {
    title: category.title,
    slug: category.slug,
    externalId: category.externalId ?? '',
    description: category.description ?? '',
    sortOrder: category.sortOrder == null ? '' : String(category.sortOrder),
    isActive: category.isActive,
  };
}

export function parseCategoryEditorSortOrder(value: string): {
  sortOrder: number | null;
  error: string | null;
} {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return {
      sortOrder: null,
      error: null,
    };
  }

  if (!/^-?\d+$/.test(normalizedValue)) {
    return {
      sortOrder: null,
      error: 'Поле «Порядок сортировки» должно содержать целое число.',
    };
  }

  return {
    sortOrder: Number(normalizedValue),
    error: null,
  };
}
