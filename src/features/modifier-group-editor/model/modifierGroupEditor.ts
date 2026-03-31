import type { ModifierApplicationScope, ModifierGroup, ModifierPriceType } from '@/entities/modifier-group';

export type ModifierGroupEditorOptionValues = {
  code: string;
  name: string;
  description: string;
  priceType: ModifierPriceType;
  price: string;
  applicationScope: ModifierApplicationScope;
  isDefault: boolean;
  isActive: boolean;
  sortOrder: string;
};

export type ModifierGroupEditorValues = {
  code: string;
  name: string;
  minSelected: string;
  maxSelected: string;
  isRequired: boolean;
  isActive: boolean;
  sortOrder: string;
  options: ModifierGroupEditorOptionValues[];
};

export const MODIFIER_PRICE_TYPE_OPTIONS = [
  { value: 'FREE', label: 'Бесплатно' },
  { value: 'FIXED', label: 'Платно' },
] as const;

export const MODIFIER_APPLICATION_SCOPE_OPTIONS = [
  { value: 'PER_ITEM', label: 'За единицу товара' },
  { value: 'PER_LINE', label: 'За всю позицию' },
] as const;

export const EMPTY_MODIFIER_GROUP_EDITOR_VALUES: ModifierGroupEditorValues = {
  code: '',
  name: '',
  minSelected: '0',
  maxSelected: '1',
  isRequired: false,
  isActive: true,
  sortOrder: '0',
  options: [],
};

function formatEditablePrice(price: number): string {
  const rawValue = (price / 100).toFixed(2);

  return rawValue.replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
}

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

export function parseModifierPrice(value: string): number | null {
  const normalizedValue = value.trim().replace(',', '.');

  if (!normalizedValue) {
    return null;
  }

  const numericValue = Number(normalizedValue);

  if (Number.isNaN(numericValue) || numericValue < 0) {
    return null;
  }

  return Math.round(numericValue * 100);
}

export function createEmptyModifierOption(): ModifierGroupEditorOptionValues {
  return {
    code: '',
    name: '',
    description: '',
    priceType: 'FREE',
    price: '',
    applicationScope: 'PER_ITEM',
    isDefault: false,
    isActive: true,
    sortOrder: '0',
  };
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
    options: modifierGroup.options.map((option) => ({
      code: option.code,
      name: option.name,
      description: option.description ?? '',
      priceType: option.priceType,
      price: option.priceType === 'FREE' ? '' : formatEditablePrice(option.price),
      applicationScope: option.applicationScope,
      isDefault: option.isDefault,
      isActive: option.isActive,
      sortOrder: String(option.sortOrder),
    })),
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
    options: values.options.map((option, optionIndex) => ({
      id: `${id || 'new'}:option:${optionIndex}`,
      code: option.code.trim(),
      name: option.name.trim(),
      description: option.description.trim() || null,
      priceType: option.priceType,
      price: option.priceType === 'FREE' ? 0 : parseModifierPrice(option.price) ?? 0,
      applicationScope: option.applicationScope,
      isDefault: option.isDefault,
      isActive: option.isActive,
      sortOrder: parseInteger(option.sortOrder) ?? 0,
    })),
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

  if (!values.options.length) {
    return 'Добавьте хотя бы одну опцию модификатора.';
  }

  if (maxSelected < 1) {
    return 'Максимум выбранных должен быть не меньше 1.';
  }

  if (minSelected > values.options.length || maxSelected > values.options.length) {
    return 'Ограничения выбора не могут превышать количество доступных опций.';
  }

  const normalizedOptionCodes = new Set<string>();
  let defaultOptionsCount = 0;

  for (let optionIndex = 0; optionIndex < values.options.length; optionIndex += 1) {
    const option = values.options[optionIndex];
    const normalizedOptionCode = option.code.trim();
    const normalizedOptionName = option.name.trim();
    const optionSortOrder = parseInteger(option.sortOrder);

    if (!normalizedOptionCode) {
      return `Укажите code у опции №${optionIndex + 1}.`;
    }

    if (normalizedOptionCodes.has(normalizedOptionCode)) {
      return `Code опции "${normalizedOptionCode}" должен быть уникальным в пределах группы.`;
    }

    if (!normalizedOptionName) {
      return `Укажите название у опции "${normalizedOptionCode}".`;
    }

    if (optionSortOrder === null) {
      return `Sort order у опции "${normalizedOptionCode}" должен быть целым неотрицательным числом.`;
    }

    if (option.priceType === 'FIXED' && parseModifierPrice(option.price) === null) {
      return `Укажите корректную цену для платной опции "${normalizedOptionCode}".`;
    }

    if (option.isDefault) {
      if (!option.isActive) {
        return `Опция "${normalizedOptionCode}" не может быть выбрана по умолчанию, пока она выключена.`;
      }

      defaultOptionsCount += 1;
    }

    normalizedOptionCodes.add(normalizedOptionCode);
  }

  if (defaultOptionsCount > maxSelected) {
    return 'Количество опций по умолчанию не может превышать максимум выбранных.';
  }

  return null;
}
