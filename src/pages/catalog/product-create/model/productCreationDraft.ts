import {
  EMPTY_PRODUCT_EDITOR_VALUES,
  type ProductEditorValues,
} from '@/features/product-editor';
import { isUuid } from '@/shared/lib/uuid/isUuid';

export type ProductCreationDraft = {
  formValues: ProductEditorValues;
  hasStartedVariantSave: boolean;
  serverProductId: string | null;
};

const PRODUCT_CREATION_DRAFT_STORAGE_PREFIX = 'webman.product-creation-draft:';

type StoredProductCreationDraft = Omit<ProductCreationDraft, 'serverProductId'> & {
  serverProductId?: string | null;
};

function getStorageKey(draftId: string): string {
  return `${PRODUCT_CREATION_DRAFT_STORAGE_PREFIX}${draftId}`;
}

function getSessionStorage(): Storage | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function cloneProductEditorValues(values: ProductEditorValues): ProductEditorValues {
  return {
    ...values,
    optionGroups: values.optionGroups.map((group) => ({
      ...group,
      values: group.values.map((value) => ({
        ...value,
      })),
    })),
    modifierGroups: values.modifierGroups.map((group) => ({
      ...group,
    })),
    variants: values.variants.map((variant) => ({
      ...variant,
      images: variant.images.map((image) => ({
        ...image,
      })),
      options: variant.options.map((option) => ({
        ...option,
      })),
    })),
  };
}

function buildProductEditorValuesForStorage(values: ProductEditorValues): ProductEditorValues {
  return {
    ...cloneProductEditorValues(values),
    variants: values.variants.map((variant) => ({
      ...variant,
      images: variant.images.map((image) => {
        const imageUrl = image.url.trim();

        if (imageUrl.startsWith('data:')) {
          throw new Error('Variant image does not have a persistent server URL.');
        }

        return {
          id: image.id,
          url: imageUrl,
          thumbUrl: image.thumbUrl ?? null,
          cardUrl: image.cardUrl ?? null,
        };
      }),
    })),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

function isProductEditorOptionValue(value: unknown): boolean {
  return (
    isRecord(value)
    && typeof value.code === 'string'
    && typeof value.title === 'string'
    && typeof value.sortOrder === 'string'
  );
}

function isProductEditorOptionGroup(value: unknown): boolean {
  return (
    isRecord(value)
    && typeof value.code === 'string'
    && typeof value.title === 'string'
    && typeof value.sortOrder === 'string'
    && Array.isArray(value.values)
    && value.values.every(isProductEditorOptionValue)
  );
}

function isProductEditorModifierGroup(value: unknown): boolean {
  return (
    isRecord(value)
    && typeof value.modifierGroupId === 'string'
    && typeof value.sortOrder === 'string'
    && typeof value.isActive === 'boolean'
  );
}

function isProductEditorVariantImage(value: unknown): boolean {
  return (
    isRecord(value)
    && (typeof value.id === 'string' || value.id === null)
    && typeof value.url === 'string'
    && (value.thumbUrl === undefined || typeof value.thumbUrl === 'string' || value.thumbUrl === null)
    && (value.cardUrl === undefined || typeof value.cardUrl === 'string' || value.cardUrl === null)
  );
}

function isProductEditorVariantOption(value: unknown): boolean {
  return (
    isRecord(value)
    && typeof value.optionGroupCode === 'string'
    && typeof value.optionValueCode === 'string'
  );
}

function isProductEditorVariant(value: unknown): boolean {
  return (
    isRecord(value)
    && (typeof value.id === 'string' || value.id === null)
    && typeof value.externalId === 'string'
    && typeof value.sku === 'string'
    && typeof value.title === 'string'
    && typeof value.price === 'string'
    && typeof value.oldPrice === 'string'
    && Array.isArray(value.images)
    && value.images.every(isProductEditorVariantImage)
    && typeof value.sortOrder === 'string'
    && typeof value.isActive === 'boolean'
    && Array.isArray(value.options)
    && value.options.every(isProductEditorVariantOption)
  );
}

function isProductEditorValues(value: unknown): value is ProductEditorValues {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const values = value as Partial<ProductEditorValues>;

  return (
    typeof values.categoryId === 'string'
    && typeof values.title === 'string'
    && typeof values.description === 'string'
    && typeof values.price === 'string'
    && typeof values.oldPrice === 'string'
    && typeof values.isActive === 'boolean'
    && typeof values.unit === 'string'
    && typeof values.displayWeight === 'string'
    && typeof values.countStep === 'string'
    && typeof values.sku === 'string'
    && typeof values.hasVariants === 'boolean'
    && Array.isArray(values.optionGroups)
    && values.optionGroups.every(isProductEditorOptionGroup)
    && Array.isArray(values.modifierGroups)
    && values.modifierGroups.every(isProductEditorModifierGroup)
    && Array.isArray(values.variants)
    && values.variants.every(isProductEditorVariant)
  );
}

function isProductCreationDraft(value: unknown): value is StoredProductCreationDraft {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const draft = value as Partial<StoredProductCreationDraft>;
  const hasValidServerProductId =
    draft.serverProductId === undefined
    || draft.serverProductId === null
    || (typeof draft.serverProductId === 'string' && isUuid(draft.serverProductId));

  return (
    typeof draft.hasStartedVariantSave === 'boolean'
    && hasValidServerProductId
    && isProductEditorValues(draft.formValues)
  );
}

export function createEmptyProductCreationDraft(): ProductCreationDraft {
  return {
    formValues: cloneProductEditorValues(EMPTY_PRODUCT_EDITOR_VALUES),
    hasStartedVariantSave: false,
    serverProductId: null,
  };
}

export function readProductCreationDraft(draftId: string): ProductCreationDraft | null {
  const sessionStorage = getSessionStorage();

  if (!sessionStorage) {
    return null;
  }

  try {
    const rawValue = sessionStorage.getItem(getStorageKey(draftId));

    if (!rawValue) {
      return null;
    }

    const parsedValue = JSON.parse(rawValue) as unknown;

    if (!isProductCreationDraft(parsedValue)) {
      sessionStorage.removeItem(getStorageKey(draftId));
      return null;
    }

    return {
      formValues: cloneProductEditorValues(parsedValue.formValues),
      hasStartedVariantSave: parsedValue.hasStartedVariantSave,
      serverProductId: parsedValue.serverProductId ?? null,
    };
  } catch {
    return null;
  }
}

export function writeProductCreationDraft(draftId: string, draft: ProductCreationDraft): boolean {
  const sessionStorage = getSessionStorage();

  if (!sessionStorage) {
    return false;
  }

  try {
    const serializedDraft = JSON.stringify({
      formValues: buildProductEditorValuesForStorage(draft.formValues),
      hasStartedVariantSave: draft.hasStartedVariantSave,
      serverProductId: draft.serverProductId,
    });

    sessionStorage.setItem(
      getStorageKey(draftId),
      serializedDraft,
    );
    return true;
  } catch {
    // sessionStorage.setItem is atomic, so a failed write leaves the last valid snapshot available.
    return false;
  }
}

export function clearProductCreationDraft(draftId: string): void {
  const sessionStorage = getSessionStorage();

  if (!sessionStorage) {
    return;
  }

  try {
    sessionStorage.removeItem(getStorageKey(draftId));
  } catch {
    // Draft cleanup must not block navigation after a successful save.
  }
}
