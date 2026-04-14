import type { ModifierGroup } from '@/entities/modifier-group';

export type ModifierGroupEditorValues = {
  code: string;
  name: string;
  minSelected: string;
  maxSelected: string;
  isRequired: boolean;
  isActive: boolean;
  sortOrder: string;
};

export const EMPTY_MODIFIER_GROUP_EDITOR_VALUES: ModifierGroupEditorValues = {
  code: '',
  name: '',
  minSelected: '0',
  maxSelected: '1',
  isRequired: false,
  isActive: true,
  sortOrder: '0',
};

function parseInteger(value: string): number | null {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return 0;
  }

  const numericValue = Number(normalizedValue);

  if (!Number.isInteger(numericValue) || numericValue < 0) {
    return null;
  }

  return numericValue;
}

export function buildModifierGroupEditorValues(modifierGroup: ModifierGroup): ModifierGroupEditorValues {
  return {
    code: modifierGroup.code,
    name: modifierGroup.name,
    minSelected: String(modifierGroup.minSelected),
    maxSelected: String(modifierGroup.maxSelected),
    isRequired: modifierGroup.isRequired,
    isActive: modifierGroup.isActive,
    sortOrder: String(modifierGroup.sortOrder),
  };
}

export function mapModifierGroupEditorValuesToModifierGroup(
  values: ModifierGroupEditorValues,
  id = '',
): ModifierGroup {
  return {
    id,
    code: values.code.trim(),
    name: values.name.trim(),
    minSelected: parseInteger(values.minSelected) ?? 0,
    maxSelected: parseInteger(values.maxSelected) ?? 0,
    isRequired: values.isRequired,
    isActive: values.isActive,
    sortOrder: parseInteger(values.sortOrder) ?? 0,
  };
}

export function validateModifierGroupEditorValues(values: ModifierGroupEditorValues): string | null {
  const normalizedCode = values.code.trim();
  const normalizedName = values.name.trim();
  const minSelected = parseInteger(values.minSelected);
  const maxSelected = parseInteger(values.maxSelected);
  const sortOrder = parseInteger(values.sortOrder);

  if (!normalizedCode) {
    return 'Укажите code группы модификаторов.';
  }

  if (!normalizedName) {
    return 'Укажите название группы модификаторов.';
  }

  if (minSelected === null) {
    return 'Минимум выбранных должен быть целым неотрицательным числом.';
  }

  if (maxSelected === null) {
    return 'Максимум выбранных должен быть целым неотрицательным числом.';
  }

  if (sortOrder === null) {
    return 'Sort order группы должен быть целым неотрицательным числом.';
  }

  if (values.isRequired && minSelected < 1) {
    return 'Для обязательной группы минимум выбранных должен быть не меньше 1.';
  }

  if (maxSelected < minSelected) {
    return 'Максимум выбранных не может быть меньше минимума.';
  }

  return null;
}
