import type { ProductModifierGroupLink } from '@/entities/modifier-group/model/types';
import { getAccessToken } from '@/entities/session';
import type {
  Product,
  ProductOptionGroup,
  ProductOptionValue,
  ProductPopularityItem,
  ProductVariant,
  ProductVariantDetails,
  ProductVariantOption,
} from '@/entities/product/model/types';
import { type ApiError, apiClient } from '@/shared/api/client';
import { getApiErrorMessage } from '@/shared/api/error';
import type { components } from '@/shared/api/schema';
import {
  buildMediaImagesFromUrls,
  getMediaImageIdsForSave,
  hasMediaImagesWithMissingIds,
} from '@/shared/lib/media/images';
import type { MediaImage } from '@/shared/model/media';

type ProductResponse = components['schemas']['ProductResponse'];
type ProductPopularityAdminItemResponse = components['schemas']['ProductPopularityAdminItemResponse'];
type AdminProductDetailsResponse = components['schemas']['AdminProductDetailsResponse'];
type ProductOptionGroupResponse = components['schemas']['ProductOptionGroupResponse'];
type ProductModifierGroupResponse = components['schemas']['ProductModifierGroupResponse'];
type AdminProductVariantResponse = components['schemas']['AdminProductVariantResponse'];
type ReorderProductPopularityRequest = components['schemas']['ReorderProductPopularityRequest'];
type UpsertProductRequest = components['schemas']['UpsertProductRequest'];
type UpsertProductModifierGroupLinkRequest = components['schemas']['UpsertProductModifierGroupLinkRequest'];
type UpsertProductOptionGroupRequest = components['schemas']['UpsertProductOptionGroupRequest'];
type UpsertProductOptionValueRequest = components['schemas']['UpsertProductOptionValueRequest'];
type UpsertProductVariantRequest = components['schemas']['UpsertProductVariantRequest'];
type CreateUploadSessionResponse = components['schemas']['CreateUploadSessionResponse'];
type MediaImageResponse = components['schemas']['MediaImageResponse'];
type MediaTargetType = components['schemas']['MediaTargetType'];

type InitProductImageUploadRequest = {
  targetType?: MediaTargetType;
  targetId?: string | null;
  contentType: string;
  sizeBytes: number;
  fileName?: string | null;
};

type UploadProductImageToStorageRequest = {
  uploadUrl: string;
  requiredHeaders: Record<string, string>;
  file: File;
};

type CompleteProductImageUploadRequest = {
  uploadId: string;
};

type GetAllProductsOptions = {
  isActive?: boolean;
};

type AdminProductListResult = {
  data?: ProductResponse[];
  error?: ApiError;
};

type AdminProductPopularityListResult = {
  data?: ProductPopularityAdminItemResponse[];
  error?: ApiError;
};

type AdminProductDetailsResult = {
  data?: AdminProductDetailsResponse;
  error?: ApiError;
};

type AdminProductOptionGroupResult = {
  data?: ProductOptionGroupResponse;
  error?: ApiError;
};

type AdminProductVariantResult = {
  data?: AdminProductVariantResponse;
  error?: ApiError;
};

type AdminProductOptionValueResult = {
  data?: components['schemas']['ProductOptionValueResponse'];
  error?: ApiError;
};

const adminProductsApiClient = apiClient as unknown as {
  GET(
    path: '/api/v1/admin/catalog/products',
    init: {
      headers?: HeadersInit;
      params?: {
        query: {
          isActive: boolean;
        };
      };
    },
  ): Promise<AdminProductListResult>;
  GET(
    path: '/api/v1/admin/product-stats/popularity',
    init: {
      headers?: HeadersInit;
    },
  ): Promise<AdminProductPopularityListResult>;
  PUT(
    path: '/api/v1/admin/product-stats/popularity/reorder',
    init: {
      headers?: HeadersInit;
      body: ReorderProductPopularityRequest;
    },
  ): Promise<AdminProductPopularityListResult>;
  GET(
    path: '/api/v1/admin/products/{productId}',
    init: {
      headers?: HeadersInit;
      params: {
        path: {
          productId: string;
        };
      };
    },
  ): Promise<AdminProductDetailsResult>;
  GET(
    path: '/api/v1/admin/products/{productId}/option-groups/{optionGroupId}',
    init: {
      headers?: HeadersInit;
      params: {
        path: {
          productId: string;
          optionGroupId: string;
        };
      };
    },
  ): Promise<AdminProductOptionGroupResult>;
  GET(
    path: '/api/v1/admin/products/{productId}/variants/{variantId}',
    init: {
      headers?: HeadersInit;
      params: {
        path: {
          productId: string;
          variantId: string;
        };
      };
    },
  ): Promise<AdminProductVariantResult>;
  POST(
    path: '/api/v1/admin/products/{productId}/option-groups',
    init: {
      headers?: HeadersInit;
      params: {
        path: {
          productId: string;
        };
      };
      body: UpsertProductOptionGroupRequest;
    },
  ): Promise<AdminProductOptionGroupResult>;
  POST(
    path: '/api/v1/admin/products/{productId}/option-groups/{optionGroupId}/values',
    init: {
      headers?: HeadersInit;
      params: {
        path: {
          productId: string;
          optionGroupId: string;
        };
      };
      body: UpsertProductOptionValueRequest;
    },
  ): Promise<AdminProductOptionValueResult>;
  POST(
    path: '/api/v1/admin/products/{productId}/variants',
    init: {
      headers?: HeadersInit;
      params: {
        path: {
          productId: string;
        };
      };
      body: UpsertProductVariantRequest;
    },
  ): Promise<AdminProductVariantResult>;
};

export type ProductListResult = {
  products: Product[];
  error: string | null;
};

export type ProductPopularityListResult = {
  items: ProductPopularityItem[];
  error: string | null;
};

export type ProductResult = {
  product: Product | null;
  error: string | null;
};

export type SaveProductResult = {
  product: Product | null;
  error: string | null;
};

export type ProductOptionGroupResult = {
  optionGroup: ProductOptionGroup | null;
  error: string | null;
};

export type ProductOptionValueResult = {
  optionValue: ProductOptionValue | null;
  error: string | null;
};

export type ProductVariantDetailsResult = {
  variant: ProductVariantDetails | null;
  error: string | null;
};

export type DeleteProductImageResult = {
  error: string | null;
};

export type ProductImageUploadInitData = {
  uploadId: string;
  objectKey: string;
  uploadUrl: string;
  requiredHeaders: Record<string, string>;
};

export type ProductImageUploadInitResult = {
  upload: ProductImageUploadInitData | null;
  error: string | null;
};

export type ProductImageUploadStepResult = {
  error: string | null;
  image?: MediaImage | null;
};

function buildAuthHeaders(): HeadersInit | undefined {
  const accessToken = getAccessToken();

  if (!accessToken) {
    return undefined;
  }

  return {
    Authorization: `Bearer ${accessToken}`,
  };
}

function getProtectedErrorMessage(error: ApiError | undefined, fallbackMessage: string): string {
  if (error?.code === 'UNAUTHORIZED') {
    return 'Нужно войти заново, чтобы выполнить действие.';
  }

  if (error?.code === 'FORBIDDEN') {
    return 'Недостаточно прав для выполнения действия.';
  }

  return getApiErrorMessage(error, fallbackMessage);
}

function mapBaseProduct(
  product: ProductResponse | AdminProductDetailsResponse,
): Omit<Product, 'defaultVariantId' | 'optionGroups' | 'modifierGroups' | 'variants'> {
  const productWithActiveFlag = product as (ProductResponse | AdminProductDetailsResponse) & { isActive?: boolean };
  const imageIds = 'imageIds' in product ? product.imageIds : undefined;

  return {
    id: product.id,
    categoryId: product.categoryId,
    title: product.title,
    slug: product.slug,
    isActive: productWithActiveFlag.isActive ?? true,
    description: product.description ?? null,
    price: product.priceMinor,
    oldPrice: product.oldPriceMinor ?? null,
    images: buildMediaImagesFromUrls(product.imageUrls, imageIds),
    unit: product.unit,
    displayWeight: null,
    countStep: product.countStep,
    sku: product.sku ?? null,
  };
}

function mapProduct(product: ProductResponse): Product {
  return {
    ...mapBaseProduct(product),
    defaultVariantId: null,
    optionGroups: [],
    modifierGroups: [],
    variants: [],
  };
}

function mapProductPopularityItem(item: ProductPopularityAdminItemResponse): ProductPopularityItem {
  return {
    product: mapProduct(item.product),
    enabled: item.enabled,
    manualScore: item.manualScore,
    updatedAt: item.updatedAt,
  };
}

function mapProductOptionGroups(optionGroups: ProductOptionGroupResponse[]): ProductOptionGroup[] {
  return optionGroups.map((group) => ({
    id: group.id,
    code: group.code,
    title: group.title,
    sortOrder: group.sortOrder,
    values: group.values.map((value) => ({
      id: value.id,
      code: value.code,
      title: value.title,
      sortOrder: value.sortOrder,
    })),
  }));
}

function mapProductOptionGroup(optionGroup: ProductOptionGroupResponse): ProductOptionGroup {
  return {
    id: optionGroup.id,
    code: optionGroup.code,
    title: optionGroup.title,
    sortOrder: optionGroup.sortOrder,
    values: optionGroup.values.map((value) => ({
      id: value.id,
      code: value.code,
      title: value.title,
      sortOrder: value.sortOrder,
    })),
  };
}

function mapProductOptionValue(optionValue: components['schemas']['ProductOptionValueResponse']): ProductOptionValue {
  return {
    id: optionValue.id,
    code: optionValue.code,
    title: optionValue.title,
    sortOrder: optionValue.sortOrder,
  };
}

function buildOptionValueLookup(optionGroups: ProductOptionGroup[]): Map<string, ProductVariantOption> {
  const lookup = new Map<string, ProductVariantOption>();

  optionGroups.forEach((group) => {
    group.values.forEach((value) => {
      if (!value.id) {
        return;
      }

      lookup.set(value.id, {
        optionGroupCode: group.code,
        optionValueCode: value.code,
      });
    });
  });

  return lookup;
}

function mapProductModifierGroups(modifierGroups: ProductModifierGroupResponse[]): ProductModifierGroupLink[] {
  return modifierGroups.map((group) => ({
    modifierGroupId: group.id,
    code: group.code,
    name: group.name,
    minSelected: group.minSelected,
    maxSelected: group.maxSelected,
    isRequired: group.isRequired,
    isActive: group.isActive,
    sortOrder: group.sortOrder,
    options: group.options.map((option) => ({
      id: option.id,
      code: option.code,
      name: option.name,
      description: option.description ?? null,
      priceType: option.priceType,
      price: option.price,
      applicationScope: option.applicationScope,
      isDefault: option.isDefault,
      isActive: option.isActive,
      sortOrder: option.sortOrder,
    })),
  }));
}

function mapProductVariants(
  variants: AdminProductVariantResponse[],
  optionValueLookup: Map<string, ProductVariantOption>,
): ProductVariant[] {
  return variants.map((variant) => ({
    id: variant.id,
    externalId: variant.externalId ?? null,
    sku: variant.sku,
    title: variant.title ?? null,
    price: variant.priceMinor ?? null,
    oldPrice: variant.oldPriceMinor ?? null,
    images: buildMediaImagesFromUrls(variant.imageUrls, variant.imageIds),
    sortOrder: variant.sortOrder,
    isActive: variant.isActive,
    options: variant.optionValueIds
      .map((optionValueId) => optionValueLookup.get(optionValueId))
      .filter((option): option is ProductVariantOption => Boolean(option)),
  }));
}

function mapProductVariantDetails(variant: AdminProductVariantResponse): ProductVariantDetails {
  return {
    id: variant.id,
    externalId: variant.externalId ?? null,
    sku: variant.sku,
    title: variant.title ?? null,
    price: variant.priceMinor ?? null,
    oldPrice: variant.oldPriceMinor ?? null,
    images: buildMediaImagesFromUrls(variant.imageUrls, variant.imageIds),
    sortOrder: variant.sortOrder,
    isActive: variant.isActive,
    optionValueIds: [...variant.optionValueIds],
  };
}

function mapProductDetails(product: AdminProductDetailsResponse): Product {
  const optionGroups = mapProductOptionGroups(product.optionGroups);
  const optionValueLookup = buildOptionValueLookup(optionGroups);

  return {
    ...mapBaseProduct(product),
    defaultVariantId: product.defaultVariantId ?? null,
    optionGroups,
    modifierGroups: mapProductModifierGroups(product.modifierGroups),
    variants: mapProductVariants(product.variants, optionValueLookup),
  };
}

function mapSaveProductModifierGroups(modifierGroups: ProductModifierGroupLink[]): UpsertProductModifierGroupLinkRequest[] {
  return modifierGroups.map((group) => ({
    modifierGroupId: group.modifierGroupId,
    sortOrder: group.sortOrder,
    isActive: group.isActive,
  }));
}

function mapSaveProductRequest(product: Product): UpsertProductRequest {
  return {
    id: product.id || null,
    categoryId: product.categoryId,
    title: product.title,
    slug: product.slug || null,
    description: product.description,
    priceMinor: product.price,
    oldPriceMinor: product.oldPrice,
    sku: product.sku,
    imageIds: getMediaImageIdsForSave(product.images),
    unit: product.unit,
    countStep: product.countStep,
    isActive: product.isActive,
    modifierGroups: mapSaveProductModifierGroups(product.modifierGroups),
  };
}

function mapSaveProductOptionGroupRequest(optionGroup: ProductOptionGroup): UpsertProductOptionGroupRequest {
  return {
    id: optionGroup.id,
    code: optionGroup.code,
    title: optionGroup.title,
    sortOrder: optionGroup.sortOrder,
  };
}

function mapSaveProductOptionValueRequest(optionValue: ProductOptionValue): UpsertProductOptionValueRequest {
  return {
    id: optionValue.id,
    code: optionValue.code,
    title: optionValue.title,
    sortOrder: optionValue.sortOrder,
  };
}

function mapSaveProductVariantRequest(variant: ProductVariantDetails): UpsertProductVariantRequest {
  return {
    id: variant.id,
    externalId: variant.externalId,
    sku: variant.sku,
    title: variant.title,
    priceMinor: variant.price,
    oldPriceMinor: variant.oldPrice,
    imageIds: getMediaImageIdsForSave(variant.images),
    sortOrder: variant.sortOrder,
    isActive: variant.isActive,
    optionValueIds: variant.optionValueIds,
  };
}

function mapUploadSession(data: CreateUploadSessionResponse): ProductImageUploadInitData {
  return {
    uploadId: data.id,
    objectKey: data.objectKey,
    uploadUrl: data.uploadUrl,
    requiredHeaders: data.requiredHeaders,
  };
}

function mapUploadedMediaImage(data: MediaImageResponse): MediaImage {
  return {
    id: data.id,
    url: data.publicUrl ?? data.objectKey,
    thumbUrl: data.thumbUrl ?? null,
    cardUrl: data.cardUrl ?? null,
  };
}

export async function getAllProducts(options: GetAllProductsOptions = {}): Promise<ProductListResult> {
  const isActive = options.isActive ?? true;

  try {
    const result = await adminProductsApiClient.GET('/api/v1/admin/catalog/products', {
      headers: buildAuthHeaders(),
      params: {
        query: {
          isActive,
        },
      },
    });

    if (result.error) {
      return {
        products: [],
        error: getApiErrorMessage(result.error, 'Не удалось загрузить товары.'),
      };
    }

    if (!result.data) {
      return {
        products: [],
        error: 'Сервис товаров вернул некорректный ответ.',
      };
    }

    return {
      products: result.data.map(mapProduct),
      error: null,
    };
  } catch {
    return {
      products: [],
      error: 'Не удалось связаться с сервисом товаров.',
    };
  }
}

export async function getPopularProducts(): Promise<ProductPopularityListResult> {
  try {
    const result = await adminProductsApiClient.GET('/api/v1/admin/product-stats/popularity', {
      headers: buildAuthHeaders(),
    });

    if (result.error) {
      return {
        items: [],
        error: getProtectedErrorMessage(result.error, 'Не удалось загрузить подборку популярного.'),
      };
    }

    if (!result.data) {
      return {
        items: [],
        error: 'Сервис популярного вернул некорректный ответ.',
      };
    }

    return {
      items: result.data.map(mapProductPopularityItem),
      error: null,
    };
  } catch {
    return {
      items: [],
      error: 'Не удалось связаться с сервисом популярного.',
    };
  }
}

export async function reorderPopularProducts(productIds: string[]): Promise<ProductPopularityListResult> {
  try {
    const result = await adminProductsApiClient.PUT('/api/v1/admin/product-stats/popularity/reorder', {
      headers: buildAuthHeaders(),
      body: {
        productIds,
      },
    });

    if (result.error) {
      return {
        items: [],
        error: getProtectedErrorMessage(result.error, 'Не удалось сохранить порядок популярного.'),
      };
    }

    if (!result.data) {
      return {
        items: [],
        error: 'Сервис популярного вернул некорректный ответ.',
      };
    }

    return {
      items: result.data.map(mapProductPopularityItem),
      error: null,
    };
  } catch {
    return {
      items: [],
      error: 'Не удалось связаться с сервисом популярного.',
    };
  }
}

async function getProductByIdFromAdminCatalog(id: string): Promise<ProductResult> {
  const activeResult = await getAllProducts({
    isActive: true,
  });
  const activeProduct = activeResult.products.find((item) => item.id === id) ?? null;

  if (activeProduct) {
    return {
      product: activeProduct,
      error: null,
    };
  }

  const inactiveResult = await getAllProducts({
    isActive: false,
  });
  const inactiveProduct = inactiveResult.products.find((item) => item.id === id) ?? null;

  if (inactiveProduct) {
    return {
      product: inactiveProduct,
      error: null,
    };
  }

  const nextError = [activeResult.error, inactiveResult.error].filter(Boolean).join(' ');

  if (nextError) {
    return {
      product: null,
      error: nextError,
    };
  }

  return {
    product: null,
    error: 'Товар не найден.',
  };
}

export async function getProductById(id: string): Promise<ProductResult> {
  try {
    const result = await adminProductsApiClient.GET('/api/v1/admin/products/{productId}', {
      headers: buildAuthHeaders(),
      params: {
        path: {
          productId: id,
        },
      },
    });

    if (result.error) {
      return getProductByIdFromAdminCatalog(id);
    }

    if (!result.data) {
      return getProductByIdFromAdminCatalog(id);
    }

    return {
      product: mapProductDetails(result.data),
      error: null,
    };
  } catch {
    return getProductByIdFromAdminCatalog(id);
  }
}

export async function getProductOptionGroupById(productId: string, optionGroupId: string): Promise<ProductOptionGroupResult> {
  try {
    const result = await adminProductsApiClient.GET('/api/v1/admin/products/{productId}/option-groups/{optionGroupId}', {
      headers: buildAuthHeaders(),
      params: {
        path: {
          productId,
          optionGroupId,
        },
      },
    });

    if (result.error) {
      return {
        optionGroup: null,
        error: getProtectedErrorMessage(result.error, 'Не удалось загрузить группу опций товара.'),
      };
    }

    if (!result.data) {
      return {
        optionGroup: null,
        error: 'Сервис групп опций товара вернул некорректный ответ.',
      };
    }

    return {
      optionGroup: mapProductOptionGroup(result.data),
      error: null,
    };
  } catch {
    return {
      optionGroup: null,
      error: 'Не удалось связаться с сервисом групп опций товара.',
    };
  }
}

export async function saveProductOptionGroup(productId: string, optionGroup: ProductOptionGroup): Promise<ProductOptionGroupResult> {
  try {
    const result = await adminProductsApiClient.POST('/api/v1/admin/products/{productId}/option-groups', {
      headers: buildAuthHeaders(),
      params: {
        path: {
          productId,
        },
      },
      body: mapSaveProductOptionGroupRequest(optionGroup),
    });

    if (result.error) {
      return {
        optionGroup: null,
        error: getProtectedErrorMessage(result.error, 'Не удалось сохранить группу опций товара.'),
      };
    }

    if (!result.data) {
      return {
        optionGroup: null,
        error: 'Сервис сохранения группы опций вернул некорректный ответ.',
      };
    }

    return {
      optionGroup: mapProductOptionGroup(result.data),
      error: null,
    };
  } catch {
    return {
      optionGroup: null,
      error: 'Не удалось связаться с сервисом сохранения группы опций.',
    };
  }
}

export async function saveProductOptionValue(
  productId: string,
  optionGroupId: string,
  optionValue: ProductOptionValue,
): Promise<ProductOptionValueResult> {
  try {
    const result = await adminProductsApiClient.POST('/api/v1/admin/products/{productId}/option-groups/{optionGroupId}/values', {
      headers: buildAuthHeaders(),
      params: {
        path: {
          productId,
          optionGroupId,
        },
      },
      body: mapSaveProductOptionValueRequest(optionValue),
    });

    if (result.error) {
      return {
        optionValue: null,
        error: getProtectedErrorMessage(result.error, 'Не удалось сохранить значение группы опций.'),
      };
    }

    if (!result.data) {
      return {
        optionValue: null,
        error: 'Сервис сохранения значения группы опций вернул некорректный ответ.',
      };
    }

    return {
      optionValue: mapProductOptionValue(result.data),
      error: null,
    };
  } catch {
    return {
      optionValue: null,
      error: 'Не удалось связаться с сервисом сохранения значения группы опций.',
    };
  }
}

export async function getProductVariantById(productId: string, variantId: string): Promise<ProductVariantDetailsResult> {
  try {
    const result = await adminProductsApiClient.GET('/api/v1/admin/products/{productId}/variants/{variantId}', {
      headers: buildAuthHeaders(),
      params: {
        path: {
          productId,
          variantId,
        },
      },
    });

    if (result.error) {
      return {
        variant: null,
        error: getProtectedErrorMessage(result.error, 'Не удалось загрузить вариант товара.'),
      };
    }

    if (!result.data) {
      return {
        variant: null,
        error: 'Сервис вариантов товара вернул некорректный ответ.',
      };
    }

    return {
      variant: mapProductVariantDetails(result.data),
      error: null,
    };
  } catch {
    return {
      variant: null,
      error: 'Не удалось связаться с сервисом вариантов товара.',
    };
  }
}

export async function saveProductVariant(productId: string, variant: ProductVariantDetails): Promise<ProductVariantDetailsResult> {
  if (hasMediaImagesWithMissingIds(variant.images)) {
    return {
      variant: null,
      error: 'Нельзя сохранить вариант: для части фотографий не хватает imageIds.',
    };
  }

  try {
    const result = await adminProductsApiClient.POST('/api/v1/admin/products/{productId}/variants', {
      headers: buildAuthHeaders(),
      params: {
        path: {
          productId,
        },
      },
      body: mapSaveProductVariantRequest(variant),
    });

    if (result.error) {
      return {
        variant: null,
        error: getProtectedErrorMessage(result.error, 'Не удалось сохранить вариант товара.'),
      };
    }

    if (!result.data) {
      return {
        variant: null,
        error: 'Сервис сохранения варианта товара вернул некорректный ответ.',
      };
    }

    return {
      variant: mapProductVariantDetails(result.data),
      error: null,
    };
  } catch {
    return {
      variant: null,
      error: 'Не удалось связаться с сервисом сохранения варианта товара.',
    };
  }
}

export async function saveProduct(product: Product): Promise<SaveProductResult> {
  if (hasMediaImagesWithMissingIds(product.images)) {
    return {
      product: null,
      error:
        'Нельзя сохранить товар: для части фотографий товара не хватает imageIds. Это может удалить фото товара при сохранении.',
    };
  }

  try {
    const result = await apiClient.POST('/api/v1/admin/catalog/products', {
      headers: buildAuthHeaders(),
      body: mapSaveProductRequest(product),
    });

    if (result.error) {
      return {
        product: null,
        error: getProtectedErrorMessage(result.error, 'Не удалось сохранить товар.'),
      };
    }

    if (!result.data) {
      return {
        product: null,
        error: 'Сервис сохранения товара вернул некорректный ответ.',
      };
    }

    return {
      product: {
        ...mapProduct(result.data),
        images: buildMediaImagesFromUrls(
          result.data.imageUrls,
          product.images.map((image) => image.id),
        ),
        defaultVariantId: product.defaultVariantId,
        optionGroups: product.optionGroups,
        modifierGroups: product.modifierGroups,
        variants: product.variants,
      },
      error: null,
    };
  } catch {
    return {
      product: null,
      error: 'Не удалось связаться с сервисом сохранения товара.',
    };
  }
}

export type DeleteProductVariantImageResult = {
  error: string | null;
};

export async function deleteProductVariantImage(productId: string, variantId: string, imageId: string): Promise<DeleteProductVariantImageResult> {
  try {
    const result = await apiClient.DELETE('/api/v1/admin/products/{productId}/variants/{variantId}/images/{imageId}', {
      headers: buildAuthHeaders(),
      params: {
        path: {
          productId,
          variantId,
          imageId,
        },
      },
    });

    if (result.error) {
      return {
        error: getProtectedErrorMessage(result.error, 'Не удалось удалить изображение варианта.'),
      };
    }

    return {
      error: null,
    };
  } catch {
    return {
      error: 'Не удалось связаться с сервисом удаления изображения варианта.',
    };
  }
}

export async function deleteProductImage(productId: string, imageId: string): Promise<DeleteProductImageResult> {
  try {
    const result = await apiClient.DELETE('/api/v1/admin/catalog/products/{productId}/images/{imageId}', {
      headers: buildAuthHeaders(),
      params: {
        path: {
          productId,
          imageId,
        },
      },
    });

    if (result.error) {
      return {
        error: getProtectedErrorMessage(result.error, 'Не удалось удалить изображение товара.'),
      };
    }

    return {
      error: null,
    };
  } catch {
    return {
      error: 'Не удалось связаться с сервисом удаления изображения товара.',
    };
  }
}

export async function initProductImageUpload({
  targetType = 'PRODUCT',
  targetId = null,
  contentType,
  sizeBytes,
  fileName,
}: InitProductImageUploadRequest): Promise<ProductImageUploadInitResult> {
  try {
    const result = await apiClient.POST('/api/v1/admin/media/uploads', {
      headers: buildAuthHeaders(),
      body: {
        targetType,
        targetId,
        originalFilename: fileName ?? 'image',
        contentType,
        fileSize: sizeBytes,
      },
    });

    if (result.error) {
      return {
        upload: null,
        error: getProtectedErrorMessage(result.error, 'Не удалось получить данные для загрузки изображения.'),
      };
    }

    if (!result.data) {
      return {
        upload: null,
        error: 'Сервис инициализации загрузки изображения вернул некорректный ответ.',
      };
    }

    return {
      upload: mapUploadSession(result.data),
      error: null,
    };
  } catch {
    return {
      upload: null,
      error: 'Не удалось связаться с сервисом инициализации загрузки изображения.',
    };
  }
}

export async function uploadProductImageToStorage({
  uploadUrl,
  requiredHeaders,
  file,
}: UploadProductImageToStorageRequest): Promise<ProductImageUploadStepResult> {
  const headers = new Headers();

  Object.entries(requiredHeaders).forEach(([name, value]) => {
    headers.set(name, value);
  });

  try {
    const response = await window.fetch(uploadUrl, {
      method: 'PUT',
      headers,
      body: file,
    });

    if (!response.ok) {
      return {
        error: 'Не удалось загрузить изображение в хранилище.',
      };
    }

    return {
      error: null,
    };
  } catch {
    return {
      error: 'Не удалось связаться с хранилищем при загрузке изображения.',
    };
  }
}

export async function completeProductImageUpload({
  uploadId,
}: CompleteProductImageUploadRequest): Promise<ProductImageUploadStepResult> {
  try {
    const result = await apiClient.POST('/api/v1/admin/media/uploads/{uploadId}/complete', {
      headers: buildAuthHeaders(),
      params: {
        path: {
          uploadId,
        },
      },
    });

    if (result.error) {
      return {
        error: getProtectedErrorMessage(result.error, 'Не удалось завершить загрузку изображения.'),
      };
    }

    if (!result.data) {
      return {
        error: 'Сервис завершения загрузки изображения вернул некорректный ответ.',
      };
    }

    return {
      error: null,
      image: mapUploadedMediaImage(result.data),
    };
  } catch {
    return {
      error: 'Не удалось связаться с сервисом завершения загрузки изображения.',
    };
  }
}
