import { getAccessToken } from '@/entities/session';
import type { Product } from '@/entities/product/model/types';
import { type ApiError, apiClient } from '@/shared/api/client';
import { getApiErrorMessage } from '@/shared/api/error';
import type { components } from '@/shared/api/schema';

type ProductResponse = components['schemas']['ProductResponse'];
type UpsertProductRequest = components['schemas']['UpsertProductRequest'];
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

function mapProduct(product: ProductResponse): Product {
  return {
    id: product.id,
    categoryId: product.categoryId,
    title: product.title,
    slug: product.slug,
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
    isActive: true,
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

export async function getAllProducts(): Promise<ProductListResult> {
  try {
    const result = await apiClient.GET('/api/v1/catalog/products');

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

export async function getProductById(id: string): Promise<ProductResult> {
  try {
    const result = await apiClient.GET('/api/v1/catalog/products/{productId}', {
      params: {
        path: {
          productId: id,
        },
      },
    });

    if (result.error) {
      return {
        product: null,
        error: getApiErrorMessage(result.error, 'Не удалось загрузить товар.'),
      };
    }

    if (!result.data) {
      return {
        product: null,
        error: 'Сервис товара вернул некорректный ответ.',
      };
    }

    return {
      product: mapProduct(result.data),
      error: null,
    };
  } catch {
    return {
      product: null,
      error: 'Не удалось связаться с сервисом товара.',
    };
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
      product: mapProduct(result.data),
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
