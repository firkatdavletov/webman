import { getAccessToken } from '@/entities/session';
import type { Product, ProductOptionGroup, ProductVariant, ProductVariantOption } from '@/entities/product/model/types';
import { type ApiError, apiClient } from '@/shared/api/client';
import { getApiErrorMessage } from '@/shared/api/error';
import type { components } from '@/shared/api/schema';

type ProductResponse = components['schemas']['ProductResponse'];
type ProductDetailsResponse = components['schemas']['ProductDetailsResponse'];
type ProductOptionGroupResponse = components['schemas']['ProductOptionGroupResponse'];
type ProductVariantResponse = components['schemas']['ProductVariantResponse'];
type UpsertProductRequest = components['schemas']['UpsertProductRequest'];
type UpsertProductOptionGroupRequest = components['schemas']['UpsertProductOptionGroupRequest'];
type UpsertProductVariantRequest = components['schemas']['UpsertProductVariantRequest'];
type CreateUploadSessionResponse = components['schemas']['CreateUploadSessionResponse'];

type InitProductImageUploadRequest = {
  productId: string;
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

type AdminProductDetailsResult = {
  data?: ProductDetailsResponse;
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
};

export type ProductListResult = {
  products: Product[];
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
  imageUrl?: string | null;
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

function mapBaseProduct(product: ProductResponse | ProductDetailsResponse): Omit<Product, 'defaultVariantId' | 'optionGroups' | 'variants'> {
  const productWithActiveFlag = product as (ProductResponse | ProductDetailsResponse) & { isActive?: boolean };

  return {
    id: product.id,
    categoryId: product.categoryId,
    title: product.title,
    slug: product.slug,
    isActive: productWithActiveFlag.isActive ?? true,
    description: product.description ?? null,
    price: product.priceMinor,
    oldPrice: product.oldPriceMinor ?? null,
    imageUrl: product.imageUrl ?? null,
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
    variants: [],
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

function mapProductVariants(
  variants: ProductVariantResponse[],
  optionValueLookup: Map<string, ProductVariantOption>,
): ProductVariant[] {
  return variants.map((variant) => ({
    id: variant.id,
    externalId: variant.externalId ?? null,
    sku: variant.sku,
    title: variant.title ?? null,
    price: variant.priceMinor ?? null,
    oldPrice: variant.oldPriceMinor ?? null,
    imageUrl: variant.imageUrl ?? null,
    sortOrder: variant.sortOrder,
    isActive: variant.isActive,
    options: variant.optionValueIds
      .map((optionValueId) => optionValueLookup.get(optionValueId))
      .filter((option): option is ProductVariantOption => Boolean(option)),
  }));
}

function mapProductDetails(product: ProductDetailsResponse): Product {
  const optionGroups = mapProductOptionGroups(product.optionGroups);
  const optionValueLookup = buildOptionValueLookup(optionGroups);

  return {
    ...mapBaseProduct(product),
    defaultVariantId: product.defaultVariantId ?? null,
    optionGroups,
    variants: mapProductVariants(product.variants, optionValueLookup),
  };
}

function mapSaveProductOptionGroups(optionGroups: ProductOptionGroup[]): UpsertProductOptionGroupRequest[] {
  return optionGroups.map((group) => ({
    code: group.code,
    title: group.title,
    sortOrder: group.sortOrder,
    values: group.values.map((value) => ({
      code: value.code,
      title: value.title,
      sortOrder: value.sortOrder,
    })),
  }));
}

function mapSaveProductVariants(variants: ProductVariant[]): UpsertProductVariantRequest[] {
  return variants.map((variant) => ({
    externalId: variant.externalId,
    sku: variant.sku,
    title: variant.title,
    priceMinor: variant.price,
    oldPriceMinor: variant.oldPrice,
    imageUrl: variant.imageUrl,
    sortOrder: variant.sortOrder,
    isActive: variant.isActive,
    options: variant.options.map((option) => ({
      optionGroupCode: option.optionGroupCode,
      optionValueCode: option.optionValueCode,
    })),
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
    imageUrl: product.imageUrl,
    unit: product.unit,
    countStep: product.countStep,
    isActive: product.isActive,
    optionGroups: mapSaveProductOptionGroups(product.optionGroups),
    variants: mapSaveProductVariants(product.variants),
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

export async function saveProduct(product: Product): Promise<SaveProductResult> {
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
        defaultVariantId: product.defaultVariantId,
        optionGroups: product.optionGroups,
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

export async function initProductImageUpload({
  productId,
  contentType,
  sizeBytes,
  fileName,
}: InitProductImageUploadRequest): Promise<ProductImageUploadInitResult> {
  try {
    const result = await apiClient.POST('/api/v1/admin/media/uploads', {
      headers: buildAuthHeaders(),
      body: {
        targetType: 'PRODUCT',
        targetId: productId,
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
      imageUrl: result.data.publicUrl ?? result.data.objectKey,
    };
  } catch {
    return {
      error: 'Не удалось связаться с сервисом завершения загрузки изображения.',
    };
  }
}
