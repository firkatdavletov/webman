import type {
  Product,
  ProductOptionGroup,
  ProductOptionValue,
  ProductVariant,
  ProductVariantDetails,
  ProductVariantOption,
} from '@/entities/product';
import { formatMinorToPriceInput, parseOptionalPriceInputToMinor } from '@/shared/lib/money/price';

export type OptionGroupFormValues = {
  id: string | null;
  code: string;
  title: string;
  sortOrder: string;
};

export type OptionValueFormValues = {
  id: string | null;
  code: string;
  title: string;
  sortOrder: string;
};

export type VariantFormValues = {
  id: string | null;
  externalId: string;
  sku: string;
  title: string;
  price: string;
  oldPrice: string;
  sortOrder: string;
  isActive: boolean;
  selectedOptionValueByGroupCode: Record<string, string>;
};

export type VariantGenerationPreviewRow = {
  key: string;
  sku: string;
  title: string;
  options: ProductVariantOption[];
  existingVariantId: string | null;
  existingVariantSku: string | null;
};

type MappingResult<TValue> =
  | {
      value: TValue;
      error: null;
    }
  | {
      value: null;
      error: string;
    };

function parseInteger(value: string): number | null {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return null;
  }

  const numericValue = Number(normalizedValue);

  if (!Number.isInteger(numericValue)) {
    return null;
  }

  return numericValue;
}

function buildVariantOptionKey(options: ProductVariantOption[]): string {
  return options
    .map((option) => ({
      optionGroupCode: option.optionGroupCode.trim(),
      optionValueCode: option.optionValueCode.trim(),
    }))
    .filter((option) => option.optionGroupCode && option.optionValueCode)
    .sort((left, right) => left.optionGroupCode.localeCompare(right.optionGroupCode, 'en'))
    .map((option) => `${option.optionGroupCode}=${option.optionValueCode}`)
    .join('|');
}

function getSortedOptionGroups(optionGroups: ProductOptionGroup[]): ProductOptionGroup[] {
  return [...optionGroups].sort((left, right) => left.sortOrder - right.sortOrder || left.code.localeCompare(right.code, 'ru'));
}

function getSortedOptionValues(values: ProductOptionValue[]): ProductOptionValue[] {
  return [...values].sort((left, right) => left.sortOrder - right.sortOrder || left.code.localeCompare(right.code, 'ru'));
}

function buildSelectedOptionValueByGroupCode(
  optionGroups: ProductOptionGroup[],
  variant: Pick<ProductVariantDetails, 'optionValueIds' | 'options'>,
): Record<string, string> {
  const selectedOptionValueByGroupCode: Record<string, string> = {};
  const selectedValueCodeByGroupCode = new Map(
    variant.options.map((option) => [option.optionGroupCode, option.optionValueCode]),
  );

  optionGroups.forEach((group) => {
    const selectedValueCode = selectedValueCodeByGroupCode.get(group.code);
    const selectedValueByCode = group.values.find((value) => value.code === selectedValueCode);
    const selectedValueById = group.values.find((value) => value.id && variant.optionValueIds.includes(value.id));

    selectedOptionValueByGroupCode[group.code] = selectedValueByCode?.code ?? selectedValueById?.code ?? '';
  });

  return selectedOptionValueByGroupCode;
}

export function buildOptionGroupFormValues(
  optionGroup?: ProductOptionGroup,
  defaultSortOrder = 0,
): OptionGroupFormValues {
  return {
    id: optionGroup?.id ?? null,
    code: optionGroup?.code ?? '',
    title: optionGroup?.title ?? '',
    sortOrder: String(optionGroup?.sortOrder ?? defaultSortOrder),
  };
}

export function buildOptionValueFormValues(
  optionValue?: ProductOptionValue,
  defaultSortOrder = 0,
): OptionValueFormValues {
  return {
    id: optionValue?.id ?? null,
    code: optionValue?.code ?? '',
    title: optionValue?.title ?? '',
    sortOrder: String(optionValue?.sortOrder ?? defaultSortOrder),
  };
}

export function buildVariantFormValues(
  product: Product,
  variant?: ProductVariant | ProductVariantDetails | null,
  previewRow?: VariantGenerationPreviewRow | null,
): VariantFormValues {
  const previewOptionValueByGroupCode = new Map(
    previewRow?.options.map((option) => [option.optionGroupCode, option.optionValueCode]) ?? [],
  );
  const selectedOptionValueByGroupCode = variant
    ? buildSelectedOptionValueByGroupCode(product.optionGroups, {
        optionValueIds: 'optionValueIds' in variant ? variant.optionValueIds : [],
        options: variant.options,
      })
    : Object.fromEntries(product.optionGroups.map((group) => [group.code, previewOptionValueByGroupCode.get(group.code) ?? '']));

  return {
    id: variant?.id ?? null,
    externalId: variant?.externalId ?? '',
    sku: variant?.sku ?? previewRow?.sku ?? '',
    title: variant?.title ?? previewRow?.title ?? '',
    price: formatMinorToPriceInput(variant?.price ?? product.price),
    oldPrice: formatMinorToPriceInput(variant?.oldPrice ?? product.oldPrice),
    sortOrder: String(variant?.sortOrder ?? product.variants.length * 10),
    isActive: variant?.isActive ?? true,
    selectedOptionValueByGroupCode,
  };
}

export function mapOptionGroupFormToProductOptionGroup(
  product: Product,
  values: OptionGroupFormValues,
): MappingResult<ProductOptionGroup> {
  const normalizedCode = values.code.trim();
  const normalizedTitle = values.title.trim();
  const sortOrder = parseInteger(values.sortOrder);

  if (!normalizedCode) {
    return {
      value: null,
      error: 'Укажите code группы опций.',
    };
  }

  if (!normalizedTitle) {
    return {
      value: null,
      error: 'Укажите название группы опций.',
    };
  }

  if (sortOrder === null) {
    return {
      value: null,
      error: 'Sort order группы опций должен быть целым числом.',
    };
  }

  const hasDuplicateCode = product.optionGroups.some((group) =>
    group.id !== values.id && group.code.trim() === normalizedCode,
  );

  if (hasDuplicateCode) {
    return {
      value: null,
      error: `Code группы опций "${normalizedCode}" должен быть уникальным внутри товара.`,
    };
  }

  const currentOptionGroup = product.optionGroups.find((group) => group.id === values.id) ?? null;

  return {
    value: {
      id: values.id,
      code: normalizedCode,
      title: normalizedTitle,
      sortOrder,
      values: currentOptionGroup?.values ?? [],
    },
    error: null,
  };
}

export function mapOptionValueFormToProductOptionValue(
  optionGroup: ProductOptionGroup,
  values: OptionValueFormValues,
): MappingResult<ProductOptionValue> {
  const normalizedCode = values.code.trim();
  const normalizedTitle = values.title.trim();
  const sortOrder = parseInteger(values.sortOrder);

  if (!optionGroup.id) {
    return {
      value: null,
      error: 'Сначала сохраните группу опций, затем добавляйте значения.',
    };
  }

  if (!normalizedCode) {
    return {
      value: null,
      error: 'Укажите code значения опции.',
    };
  }

  if (!normalizedTitle) {
    return {
      value: null,
      error: 'Укажите название значения опции.',
    };
  }

  if (sortOrder === null) {
    return {
      value: null,
      error: 'Sort order значения опции должен быть целым числом.',
    };
  }

  const hasDuplicateCode = optionGroup.values.some((value) =>
    value.id !== values.id && value.code.trim() === normalizedCode,
  );

  if (hasDuplicateCode) {
    return {
      value: null,
      error: `Code значения "${normalizedCode}" должен быть уникальным внутри группы.`,
    };
  }

  return {
    value: {
      id: values.id,
      code: normalizedCode,
      title: normalizedTitle,
      sortOrder,
    },
    error: null,
  };
}

export function mapVariantFormToProductVariantDetails(
  product: Product,
  values: VariantFormValues,
  sourceVariant: ProductVariant | ProductVariantDetails | null,
): MappingResult<ProductVariantDetails> {
  const normalizedSku = values.sku.trim();
  const normalizedTitle = values.title.trim();
  const normalizedExternalId = values.externalId.trim();
  const sortOrder = parseInteger(values.sortOrder);
  const price = parseOptionalPriceInputToMinor(values.price);
  const oldPrice = parseOptionalPriceInputToMinor(values.oldPrice);

  if (!normalizedSku) {
    return {
      value: null,
      error: 'Укажите SKU варианта.',
    };
  }

  if (product.sku?.trim() && product.sku.trim() === normalizedSku) {
    return {
      value: null,
      error: `SKU варианта "${normalizedSku}" не должен совпадать с SKU товара.`,
    };
  }

  const hasDuplicateSku = product.variants.some((variant) =>
    variant.id !== values.id && variant.sku.trim() === normalizedSku,
  );

  if (hasDuplicateSku) {
    return {
      value: null,
      error: `SKU варианта "${normalizedSku}" должен быть уникальным внутри товара.`,
    };
  }

  if (sortOrder === null) {
    return {
      value: null,
      error: 'Sort order варианта должен быть целым числом.',
    };
  }

  if (price === undefined) {
    return {
      value: null,
      error: 'Цена варианта должна быть неотрицательным числом или пустым значением.',
    };
  }

  if (oldPrice === undefined) {
    return {
      value: null,
      error: 'Старая цена варианта должна быть неотрицательным числом или пустым значением.',
    };
  }

  const options: ProductVariantOption[] = [];

  for (const optionGroup of product.optionGroups) {
    if (!optionGroup.values.length) {
      continue;
    }

    const selectedValueCode = values.selectedOptionValueByGroupCode[optionGroup.code] ?? '';

    if (!selectedValueCode) {
      return {
        value: null,
        error: `Выберите значение для группы опций "${optionGroup.title || optionGroup.code}".`,
      };
    }

    const hasSelectedValue = optionGroup.values.some((value) => value.code === selectedValueCode);

    if (!hasSelectedValue) {
      return {
        value: null,
        error: `Выбрано неизвестное значение для группы опций "${optionGroup.title || optionGroup.code}".`,
      };
    }

    options.push({
      optionGroupCode: optionGroup.code,
      optionValueCode: selectedValueCode,
    });
  }

  return {
    value: {
      id: values.id,
      externalId: normalizedExternalId || null,
      sku: normalizedSku,
      title: normalizedTitle || null,
      price,
      oldPrice,
      images: sourceVariant?.images ?? [],
      sortOrder,
      isActive: values.isActive,
      optionValueIds: [],
      options,
    },
    error: null,
  };
}

export function buildVariantGenerationPreviewRows(product: Product): VariantGenerationPreviewRow[] {
  const optionGroupsWithValues = getSortedOptionGroups(product.optionGroups).filter((group) => group.values.length);

  if (!optionGroupsWithValues.length || optionGroupsWithValues.length !== product.optionGroups.length) {
    return [];
  }

  const existingVariantByOptionKey = new Map(
    product.variants
      .map((variant) => [buildVariantOptionKey(variant.options), variant] as const)
      .filter(([key]) => Boolean(key)),
  );
  const rows: VariantGenerationPreviewRow[] = [];
  const baseSku = product.sku?.trim() || product.slug.trim() || 'variant';

  const buildRows = (groupIndex: number, options: ProductVariantOption[], labels: string[]) => {
    if (groupIndex >= optionGroupsWithValues.length) {
      const key = buildVariantOptionKey(options);
      const existingVariant = existingVariantByOptionKey.get(key) ?? null;
      const skuSuffix = options.map((option) => option.optionValueCode.trim()).filter(Boolean).join('-');

      rows.push({
        key,
        sku: `${baseSku}-${skuSuffix}`,
        title: `${product.title} (${labels.join(' / ')})`,
        options,
        existingVariantId: existingVariant?.id ?? null,
        existingVariantSku: existingVariant?.sku ?? null,
      });
      return;
    }

    const optionGroup = optionGroupsWithValues[groupIndex];

    getSortedOptionValues(optionGroup.values).forEach((value) => {
      buildRows(
        groupIndex + 1,
        [
          ...options,
          {
            optionGroupCode: optionGroup.code,
            optionValueCode: value.code,
          },
        ],
        [...labels, value.title || value.code],
      );
    });
  };

  buildRows(0, [], []);

  return rows;
}

export { buildVariantOptionKey };
