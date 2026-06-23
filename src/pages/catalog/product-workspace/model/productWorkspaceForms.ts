import type { ModifierGroup } from '@/entities/modifier-group';
import type { Product } from '@/entities/product';
import {
  mapProductModifierGroupAssignmentsToProduct,
  validateProductBasicFields,
  validateProductModifierGroupAssignments,
  type ProductModifierGroupAssignmentValues,
} from '@/features/product-editor';
import { formatMinorToPriceInput } from '@/shared/lib/money/price';

export type ProductWorkspaceMutationResult = {
  product: Product | null;
  error: string | null;
};

export type BasicInformationFormValues = {
  categoryId: string;
  title: string;
  description: string;
  isActive: boolean;
  unit: Product['unit'];
  countStep: string;
  sku: string;
};

export type ProductPricingFormValues = {
  price: string;
  oldPrice: string;
};

export type ProductModifierAssignmentFormValues = ProductModifierGroupAssignmentValues;

type ProductMappingResult =
  | {
      product: Product;
      error: null;
    }
  | {
      product: null;
      error: string;
    };

export function buildBasicInformationFormValues(product: Product): BasicInformationFormValues {
  return {
    categoryId: product.categoryId,
    title: product.title,
    description: product.description ?? '',
    isActive: product.isActive,
    unit: product.unit,
    countStep: String(product.countStep),
    sku: product.sku ?? '',
  };
}

export function buildProductPricingFormValues(product: Product): ProductPricingFormValues {
  return {
    price: formatMinorToPriceInput(product.price),
    oldPrice: formatMinorToPriceInput(product.oldPrice),
  };
}

export function buildProductModifierAssignmentFormValues(product: Product): ProductModifierAssignmentFormValues[] {
  return product.modifierGroups.map((group) => ({
    modifierGroupId: group.modifierGroupId,
    sortOrder: String(group.sortOrder),
    isActive: group.isActive,
  }));
}

export function applyBasicInformationFormValues(product: Product, values: BasicInformationFormValues): ProductMappingResult {
  const validationResult = validateProductBasicFields(
    {
      title: values.title,
      categoryId: values.categoryId,
      price: formatMinorToPriceInput(product.price),
      oldPrice: formatMinorToPriceInput(product.oldPrice),
      countStep: values.countStep,
      unit: values.unit,
    },
    {
      requireUnit: true,
    },
  );

  if (!validationResult.values) {
    return {
      product: null,
      error: validationResult.error,
    };
  }

  const {
    normalizedCategoryId,
    normalizedCountStep,
    normalizedTitle,
  } = validationResult.values;
  const normalizedDescription = values.description.trim();
  const normalizedSku = values.sku.trim();

  return {
    product: {
      ...product,
      categoryId: normalizedCategoryId,
      title: normalizedTitle,
      description: normalizedDescription || null,
      sku: normalizedSku || null,
      unit: values.unit,
      countStep: normalizedCountStep,
      isActive: values.isActive,
    },
    error: null,
  };
}

export function applyProductPricingFormValues(product: Product, values: ProductPricingFormValues): ProductMappingResult {
  const validationResult = validateProductBasicFields(
    {
      title: product.title,
      categoryId: product.categoryId,
      price: values.price,
      oldPrice: values.oldPrice,
      countStep: String(product.countStep),
      unit: product.unit,
    },
    {
      requireUnit: true,
    },
  );

  if (!validationResult.values) {
    return {
      product: null,
      error: validationResult.error,
    };
  }

  const {
    normalizedOldPrice,
    normalizedPrice,
  } = validationResult.values;

  return {
    product: {
      ...product,
      price: normalizedPrice,
      oldPrice: normalizedOldPrice,
    },
    error: null,
  };
}

export function applyProductModifierAssignmentFormValues(
  product: Product,
  values: ProductModifierAssignmentFormValues[],
  modifierGroups: ModifierGroup[],
): ProductMappingResult {
  const validationError = validateProductModifierGroupAssignments(values, modifierGroups, {
    allowEmptySortOrder: false,
  });

  if (validationError) {
    return {
      product: null,
      error: validationError,
    };
  }

  return {
    product: {
      ...product,
      modifierGroups: mapProductModifierGroupAssignmentsToProduct(values, modifierGroups, {
        allowEmptySortOrder: false,
      }),
    },
    error: null,
  };
}
