import { parseOptionalPriceInputToMinor, parsePriceInputToMinor } from '@/shared/lib/money/price';
import { isUuid } from '@/shared/lib/uuid/isUuid';

export type ProductBasicValidationValues = {
  title: string;
  categoryId: string;
  price: string;
  oldPrice: string;
  countStep: string;
  unit?: string;
};

export type ProductBasicValidatedValues = {
  normalizedTitle: string;
  normalizedCategoryId: string;
  normalizedPrice: number;
  normalizedOldPrice: number | null;
  normalizedCountStep: number;
  normalizedUnit: string;
};

export type ProductBasicValidationOptions = {
  requireUnit?: boolean;
};

export type ProductBasicValidationResult =
  | {
      error: string;
      values: null;
    }
  | {
      error: null;
      values: ProductBasicValidatedValues;
    };

export function parseProductPrice(value: string): number | null {
  return parsePriceInputToMinor(value);
}

export function parseOptionalProductPrice(value: string): number | null | undefined {
  return parseOptionalPriceInputToMinor(value);
}

export function validateProductBasicFields(
  values: ProductBasicValidationValues,
  options: ProductBasicValidationOptions = {},
): ProductBasicValidationResult {
  const normalizedTitle = values.title.trim();
  const normalizedCategoryId = values.categoryId.trim();
  const normalizedPrice = parseProductPrice(values.price);
  const normalizedOldPrice = parseOptionalProductPrice(values.oldPrice);
  const normalizedCountStep = Number(values.countStep);
  const normalizedUnit = values.unit?.trim() ?? '';

  if (!normalizedTitle) {
    return {
      error: 'Укажите название товара.',
      values: null,
    };
  }

  if (!isUuid(normalizedCategoryId)) {
    return {
      error: 'Выберите корректную категорию.',
      values: null,
    };
  }

  if (normalizedPrice === null) {
    return {
      error: 'Укажите корректную цену в рублях.',
      values: null,
    };
  }

  if (normalizedOldPrice === undefined) {
    return {
      error: 'Укажите корректную старую цену в рублях или оставьте поле пустым.',
      values: null,
    };
  }

  if (!Number.isInteger(normalizedCountStep) || normalizedCountStep <= 0) {
    return {
      error: 'Шаг продажи должен быть положительным целым числом.',
      values: null,
    };
  }

  if (options.requireUnit && !normalizedUnit) {
    return {
      error: 'Выберите единицу измерения.',
      values: null,
    };
  }

  return {
    error: null,
    values: {
      normalizedTitle,
      normalizedCategoryId,
      normalizedPrice,
      normalizedOldPrice: normalizedOldPrice ?? null,
      normalizedCountStep,
      normalizedUnit,
    },
  };
}
