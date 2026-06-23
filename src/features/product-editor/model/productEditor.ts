import type { MediaImage } from '@/shared/model/media';

export type ProductEditorOptionValueValues = {
  code: string;
  title: string;
  sortOrder: string;
};

export type ProductEditorOptionGroupValues = {
  code: string;
  title: string;
  sortOrder: string;
  values: ProductEditorOptionValueValues[];
};

export type ProductEditorVariantOptionValues = {
  optionGroupCode: string;
  optionValueCode: string;
};

export type ProductEditorVariantValues = {
  id: string | null;
  externalId: string;
  sku: string;
  title: string;
  price: string;
  oldPrice: string;
  images: MediaImage[];
  sortOrder: string;
  isActive: boolean;
  options: ProductEditorVariantOptionValues[];
};

export type ProductEditorModifierGroupValues = {
  modifierGroupId: string;
  sortOrder: string;
  isActive: boolean;
};

export type ProductEditorValues = {
  categoryId: string;
  title: string;
  description: string;
  price: string;
  oldPrice: string;
  isActive: boolean;
  unit: string;
  displayWeight: string;
  countStep: string;
  sku: string;
  hasVariants: boolean;
  optionGroups: ProductEditorOptionGroupValues[];
  modifierGroups: ProductEditorModifierGroupValues[];
  variants: ProductEditorVariantValues[];
};

export const PRODUCT_UNIT_OPTIONS = [
  { value: 'PIECE', label: 'шт' },
  { value: 'KILOGRAM', label: 'кг' },
  { value: 'GRAM', label: 'г' },
  { value: 'LITER', label: 'л' },
  { value: 'MILLILITER', label: 'мл' },
] as const;

export const EMPTY_PRODUCT_EDITOR_VALUES: ProductEditorValues = {
  categoryId: '',
  title: '',
  description: '',
  price: '',
  oldPrice: '',
  isActive: true,
  unit: 'PIECE',
  displayWeight: '',
  countStep: '1',
  sku: '',
  hasVariants: false,
  optionGroups: [],
  modifierGroups: [],
  variants: [],
};

export function parseProductEditorSortOrder(value: string): number | null {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return 0;
  }

  const numericValue = Number(normalizedValue);

  if (!Number.isInteger(numericValue)) {
    return null;
  }

  return numericValue;
}

export function normalizeProductEditorVariantOptions(
  optionGroups: ProductEditorOptionGroupValues[],
  options: ProductEditorVariantOptionValues[],
): ProductEditorVariantOptionValues[] {
  const selectedValueByGroupCode = new Map<string, string>();

  options.forEach((option) => {
    const normalizedGroupCode = option.optionGroupCode.trim();

    if (!normalizedGroupCode) {
      return;
    }

    selectedValueByGroupCode.set(normalizedGroupCode, option.optionValueCode.trim());
  });

  return optionGroups.map((group) => {
    const normalizedGroupCode = group.code.trim();
    const selectedValueCode = selectedValueByGroupCode.get(normalizedGroupCode) ?? '';

    if (!normalizedGroupCode) {
      return {
        optionGroupCode: '',
        optionValueCode: '',
      };
    }

    const hasSelectedValueInGroup = group.values.some((value) => value.code.trim() === selectedValueCode);

    return {
      optionGroupCode: normalizedGroupCode,
      optionValueCode: hasSelectedValueInGroup ? selectedValueCode : '',
    };
  });
}

export function createEmptyProductOptionValue(): ProductEditorOptionValueValues {
  return {
    code: '',
    title: '',
    sortOrder: '0',
  };
}

export function createEmptyProductOptionGroup(): ProductEditorOptionGroupValues {
  return {
    code: '',
    title: '',
    sortOrder: '0',
    values: [createEmptyProductOptionValue()],
  };
}

export function createEmptyProductVariant(
  optionGroups: ProductEditorOptionGroupValues[],
  options: ProductEditorVariantOptionValues[] = [],
): ProductEditorVariantValues {
  return {
    id: null,
    externalId: '',
    sku: '',
    title: '',
    price: '',
    oldPrice: '',
    images: [],
    sortOrder: '0',
    isActive: true,
    options: normalizeProductEditorVariantOptions(optionGroups, options),
  };
}

export function syncVariantOptionsByOptionGroups(
  optionGroups: ProductEditorOptionGroupValues[],
  variant: ProductEditorVariantValues,
): ProductEditorVariantValues {
  return {
    ...variant,
    options: normalizeProductEditorVariantOptions(optionGroups, variant.options),
  };
}
