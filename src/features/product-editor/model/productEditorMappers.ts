import type { ModifierGroup } from '@/entities/modifier-group';
import type { Product, ProductOptionGroup, ProductVariant } from '@/entities/product';
import { formatMinorToPriceInput } from '@/shared/lib/money/price';
import {
  normalizeProductEditorVariantOptions,
  parseProductEditorSortOrder,
  type ProductEditorOptionGroupValues,
  type ProductEditorValues,
  type ProductEditorVariantValues,
} from '@/features/product-editor/model/productEditor';
import { parseOptionalProductPrice } from '@/features/product-editor/model/productBasicValidation';
import { mapProductEditorModifierGroupsToProduct } from '@/features/product-editor/model/productModifierAssignments';

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
    price: formatMinorToPriceInput(product.price),
    oldPrice: formatMinorToPriceInput(product.oldPrice),
    isActive: product.isActive,
    unit: product.unit,
    displayWeight: product.displayWeight ?? '',
    countStep: String(product.countStep),
    sku: product.sku ?? '',
    hasVariants: product.optionGroups.length > 0 || product.variants.length > 0,
    optionGroups,
    modifierGroups: product.modifierGroups.map((group) => ({
      modifierGroupId: group.modifierGroupId,
      sortOrder: String(group.sortOrder),
      isActive: group.isActive,
    })),
    variants: product.variants.map((variant) => ({
      id: variant.id,
      externalId: variant.externalId ?? '',
      sku: variant.sku,
      title: variant.title ?? '',
      price: formatMinorToPriceInput(variant.price),
      oldPrice: formatMinorToPriceInput(variant.oldPrice),
      images: variant.images.map((image) => ({
        ...image,
      })),
      sortOrder: String(variant.sortOrder),
      isActive: variant.isActive,
      options: normalizeProductEditorVariantOptions(optionGroups, variant.options),
    })),
  };
}

function mapFormOptionGroupsToProduct(optionGroups: ProductEditorOptionGroupValues[]): ProductOptionGroup[] {
  return optionGroups.map((group) => ({
    id: null,
    code: group.code.trim(),
    title: group.title.trim(),
    sortOrder: parseProductEditorSortOrder(group.sortOrder) ?? 0,
    values: group.values.map((value) => ({
      id: null,
      code: value.code.trim(),
      title: value.title.trim(),
      sortOrder: parseProductEditorSortOrder(value.sortOrder) ?? 0,
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
      id: variant.id,
      externalId: variant.externalId.trim() || null,
      sku: variant.sku.trim(),
      title: variant.title.trim() || null,
      price: normalizedPrice === undefined ? null : normalizedPrice,
      oldPrice: normalizedOldPrice === undefined ? null : normalizedOldPrice,
      images: variant.images.map((image) => ({
        ...image,
      })),
      sortOrder: parseProductEditorSortOrder(variant.sortOrder) ?? 0,
      isActive: variant.isActive,
      options: normalizeProductEditorVariantOptions(optionGroups, variant.options)
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
  availableModifierGroups: ModifierGroup[],
): Pick<Product, 'optionGroups' | 'modifierGroups' | 'variants'> {
  const modifierGroups = mapProductEditorModifierGroupsToProduct(values.modifierGroups, availableModifierGroups);

  if (!values.hasVariants) {
    return {
      optionGroups: [],
      modifierGroups,
      variants: [],
    };
  }

  return {
    optionGroups: mapFormOptionGroupsToProduct(values.optionGroups),
    modifierGroups,
    variants: mapFormVariantsToProduct(values.variants, values.optionGroups),
  };
}
