import type { Product, ProductOptionGroup, ProductVariant } from '@/entities/product';

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
  externalId: string;
  sku: string;
  title: string;
  price: string;
  oldPrice: string;
  imageUrl: string;
  sortOrder: string;
  isActive: boolean;
  options: ProductEditorVariantOptionValues[];
};

export type ProductEditorValues = {
  categoryId: string;
  title: string;
  description: string;
  price: string;
  oldPrice: string;
  isActive: boolean;
  imageUrl: string;
  unit: string;
  displayWeight: string;
  countStep: string;
  sku: string;
  hasVariants: boolean;
  optionGroups: ProductEditorOptionGroupValues[];
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
  imageUrl: '',
  unit: 'PIECE',
  displayWeight: '',
  countStep: '1',
  sku: '',
  hasVariants: false,
  optionGroups: [],
  variants: [],
};

function formatEditablePrice(price: number): string {
  const rawValue = (price / 100).toFixed(2);

  return rawValue.replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
}

function formatOptionalEditablePrice(price: number | null): string {
  if (price === null) {
    return '';
  }

  return formatEditablePrice(price);
}

function parseSortOrder(value: string): number | null {
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

function normalizeVariantOptions(
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
    externalId: '',
    sku: '',
    title: '',
    price: '',
    oldPrice: '',
    imageUrl: '',
    sortOrder: '0',
    isActive: true,
    options: normalizeVariantOptions(optionGroups, options),
  };
}

export function syncVariantOptionsByOptionGroups(
  optionGroups: ProductEditorOptionGroupValues[],
  variant: ProductEditorVariantValues,
): ProductEditorVariantValues {
  return {
    ...variant,
    options: normalizeVariantOptions(optionGroups, variant.options),
  };
}

export function buildProductEditorValues(product: Product): ProductEditorValues {
  const optionGroups: ProductEditorOptionGroupValues[] = product.optionGroups.map((group) => ({
    code: group.code,
    title: group.title,
    sortOrder: String(group.sortOrder),
    values: group.values.map((value) => ({
      code: value.code,
      title: value.title,
      sortOrder: String(value.sortOrder),
    })),
  }));

  return {
    categoryId: product.categoryId,
    title: product.title,
    description: product.description ?? '',
    price: formatEditablePrice(product.price),
    oldPrice: product.oldPrice === null ? '' : formatEditablePrice(product.oldPrice),
    isActive: product.isActive,
    imageUrl: product.imageUrl ?? '',
    unit: product.unit,
    displayWeight: product.displayWeight ?? '',
    countStep: String(product.countStep),
    sku: product.sku ?? '',
    hasVariants: product.optionGroups.length > 0 || product.variants.length > 0,
    optionGroups,
    variants: product.variants.map((variant) => ({
      externalId: variant.externalId ?? '',
      sku: variant.sku,
      title: variant.title ?? '',
      price: formatOptionalEditablePrice(variant.price),
      oldPrice: formatOptionalEditablePrice(variant.oldPrice),
      imageUrl: variant.imageUrl ?? '',
      sortOrder: String(variant.sortOrder),
      isActive: variant.isActive,
      options: normalizeVariantOptions(optionGroups, variant.options),
    })),
  };
}

export function parseProductPrice(value: string): number | null {
  const normalizedValue = value.trim().replace(',', '.');
  const numericValue = Number(normalizedValue);

  if (!normalizedValue || Number.isNaN(numericValue) || numericValue < 0) {
    return null;
  }

  return Math.round(numericValue * 100);
}

export function parseOptionalProductPrice(value: string): number | null | undefined {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return null;
  }

  return parseProductPrice(normalizedValue) ?? undefined;
}

function mapFormOptionGroupsToProduct(optionGroups: ProductEditorOptionGroupValues[]): ProductOptionGroup[] {
  return optionGroups.map((group) => ({
    id: null,
    code: group.code.trim(),
    title: group.title.trim(),
    sortOrder: parseSortOrder(group.sortOrder) ?? 0,
    values: group.values.map((value) => ({
      id: null,
      code: value.code.trim(),
      title: value.title.trim(),
      sortOrder: parseSortOrder(value.sortOrder) ?? 0,
    })),
  }));
}

function mapFormVariantsToProduct(
  variants: ProductEditorVariantValues[],
  optionGroups: ProductEditorOptionGroupValues[],
): ProductVariant[] {
  return variants.map((variant) => {
    const normalizedPrice = parseOptionalProductPrice(variant.price);
    const normalizedOldPrice = parseOptionalProductPrice(variant.oldPrice);

    return {
      id: null,
      externalId: variant.externalId.trim() || null,
      sku: variant.sku.trim(),
      title: variant.title.trim() || null,
      price: normalizedPrice === undefined ? null : normalizedPrice,
      oldPrice: normalizedOldPrice === undefined ? null : normalizedOldPrice,
      imageUrl: variant.imageUrl.trim() || null,
      sortOrder: parseSortOrder(variant.sortOrder) ?? 0,
      isActive: variant.isActive,
      options: normalizeVariantOptions(optionGroups, variant.options)
        .map((option) => ({
          optionGroupCode: option.optionGroupCode.trim(),
          optionValueCode: option.optionValueCode.trim(),
        }))
        .filter((option) => option.optionGroupCode && option.optionValueCode),
    };
  });
}

export function mapProductEditorValuesToProductStructures(
  values: ProductEditorValues,
): Pick<Product, 'optionGroups' | 'variants'> {
  if (!values.hasVariants) {
    return {
      optionGroups: [],
      variants: [],
    };
  }

  return {
    optionGroups: mapFormOptionGroupsToProduct(values.optionGroups),
    variants: mapFormVariantsToProduct(values.variants, values.optionGroups),
  };
}

export function validateProductVariantsSection(values: ProductEditorValues): string | null {
  if (!values.hasVariants) {
    return null;
  }

  const normalizedGroupCodes = new Set<string>();
  const normalizedOptionValuesByGroup = new Map<string, Set<string>>();

  for (let groupIndex = 0; groupIndex < values.optionGroups.length; groupIndex += 1) {
    const group = values.optionGroups[groupIndex];
    const normalizedGroupCode = group.code.trim();
    const normalizedGroupTitle = group.title.trim();
    const groupSortOrder = parseSortOrder(group.sortOrder);

    if (!normalizedGroupCode) {
      return `Укажите code у группы опций №${groupIndex + 1}.`;
    }

    if (normalizedGroupCodes.has(normalizedGroupCode)) {
      return `Code группы опций "${normalizedGroupCode}" должен быть уникальным.`;
    }

    if (!normalizedGroupTitle) {
      return `Укажите название у группы опций "${normalizedGroupCode}".`;
    }

    if (groupSortOrder === null) {
      return `Sort order у группы "${normalizedGroupCode}" должен быть целым числом.`;
    }

    normalizedGroupCodes.add(normalizedGroupCode);

    const normalizedValueCodes = new Set<string>();
    normalizedOptionValuesByGroup.set(normalizedGroupCode, normalizedValueCodes);

    for (let valueIndex = 0; valueIndex < group.values.length; valueIndex += 1) {
      const value = group.values[valueIndex];
      const normalizedValueCode = value.code.trim();
      const normalizedValueTitle = value.title.trim();
      const valueSortOrder = parseSortOrder(value.sortOrder);

      if (!normalizedValueCode) {
        return `Укажите code у значения №${valueIndex + 1} в группе "${normalizedGroupCode}".`;
      }

      if (normalizedValueCodes.has(normalizedValueCode)) {
        return `Code значения "${normalizedValueCode}" в группе "${normalizedGroupCode}" должен быть уникальным.`;
      }

      if (!normalizedValueTitle) {
        return `Укажите название у значения "${normalizedValueCode}" в группе "${normalizedGroupCode}".`;
      }

      if (valueSortOrder === null) {
        return `Sort order значения "${normalizedValueCode}" в группе "${normalizedGroupCode}" должен быть целым числом.`;
      }

      normalizedValueCodes.add(normalizedValueCode);
    }
  }

  if (!values.variants.length) {
    return 'Добавьте хотя бы один вариант товара или выключите режим вариантов.';
  }

  for (let variantIndex = 0; variantIndex < values.variants.length; variantIndex += 1) {
    const variant = values.variants[variantIndex];
    const variantLabel = variant.sku.trim() || `№${variantIndex + 1}`;
    const variantSortOrder = parseSortOrder(variant.sortOrder);
    const variantPrice = parseOptionalProductPrice(variant.price);
    const variantOldPrice = parseOptionalProductPrice(variant.oldPrice);

    if (!variant.sku.trim()) {
      return `Укажите SKU у варианта №${variantIndex + 1}.`;
    }

    if (variantSortOrder === null) {
      return `Sort order варианта "${variantLabel}" должен быть целым числом.`;
    }

    if (variantPrice === undefined) {
      return `Цена варианта "${variantLabel}" должна быть неотрицательным числом или пустым значением.`;
    }

    if (variantOldPrice === undefined) {
      return `Старая цена варианта "${variantLabel}" должна быть неотрицательным числом или пустым значением.`;
    }

    if (normalizedGroupCodes.size > 0) {
      if (!variant.options.length) {
        return `Для варианта "${variantLabel}" укажите значения всех групп опций.`;
      }

      const selectedGroupCodes = new Set<string>();

      for (let optionIndex = 0; optionIndex < variant.options.length; optionIndex += 1) {
        const option = variant.options[optionIndex];
        const optionGroupCode = option.optionGroupCode.trim();
        const optionValueCode = option.optionValueCode.trim();

        if (!optionGroupCode) {
          return `У варианта "${variantLabel}" выбрана опция без группы.`;
        }

        if (selectedGroupCodes.has(optionGroupCode)) {
          return `У варианта "${variantLabel}" выбрано несколько значений группы "${optionGroupCode}".`;
        }

        if (!normalizedGroupCodes.has(optionGroupCode)) {
          return `У варианта "${variantLabel}" выбрана неизвестная группа "${optionGroupCode}".`;
        }

        if (!optionValueCode) {
          return `У варианта "${variantLabel}" не выбрано значение группы "${optionGroupCode}".`;
        }

        const groupValueCodes = normalizedOptionValuesByGroup.get(optionGroupCode);

        if (!groupValueCodes || !groupValueCodes.has(optionValueCode)) {
          return `У варианта "${variantLabel}" выбрано неизвестное значение "${optionValueCode}" для группы "${optionGroupCode}".`;
        }

        selectedGroupCodes.add(optionGroupCode);
      }

      if (selectedGroupCodes.size !== normalizedGroupCodes.size) {
        return `У варианта "${variantLabel}" должно быть выбрано по одному значению для каждой группы опций.`;
      }
    }
  }

  return null;
}
