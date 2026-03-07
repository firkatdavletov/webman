import { getAccessToken } from '../auth/authService';

export type CatalogImportMode = 'products' | 'categories';
export type CatalogImportAction = 'insert' | 'update';
export type CatalogProduct = {
  id: number;
  categoryId: number;
  title: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  unit: string;
  displayWeight: string | null;
  countStep: number;
  sku: string | null;
};

export type CatalogCategory = {
  id: number;
  parentCategory: number | null;
  title: string;
  imageUrl: string | null;
  products: CatalogProduct[];
  children: CatalogCategory[];
  sku: string | null;
};

type ImportFileResponseBody = {
  success: boolean;
  error: string | null;
  code: number | null;
};

type GetCategoriesResponseBody = {
  catalog: CatalogCategory[] | null;
  success: boolean;
  error: string | null;
  code: number | null;
};

type GetProductsResponseBody = {
  products: CatalogProduct[];
  success: boolean;
  error: string | null;
  code: number | null;
};

type GetProductResponseBody = {
  product: CatalogProduct | null;
  success: boolean;
  error: string | null;
  code: number | null;
};

type GetCategoryResponseBody = {
  category: CatalogCategory | null;
  success: boolean;
  error: string | null;
  code: number | null;
};

type SaveCategoryResponseBody = {
  category: CatalogCategory | null;
  success: boolean;
  error: string | null;
  code: number | null;
};

type SaveProductResponseBody = {
  product: CatalogProduct | null;
  success: boolean;
  error: string | null;
  code: number | null;
};

type InitProductImageUploadResponseBody = {
  imageId: number;
  objectKey: string;
  uploadUrl: string;
  requiredHeaders: Record<string, string>;
};

type CatalogImportRequest = {
  file: File;
  mode: CatalogImportMode;
  importMode: CatalogImportAction;
};

type InitProductImageUploadRequest = {
  productId: number;
  contentType: string;
  sizeBytes: number;
  fileName?: string | null;
};

type InitCategoryImageUploadRequest = {
  categoryId: number;
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
  productId: number;
  imageId: number;
  objectKey: string;
};

type CompleteCategoryImageUploadRequest = {
  categoryId: number;
  imageId: number;
  objectKey: string;
};

export type CatalogImportResult = {
  success: boolean;
  error: string | null;
  code: number | null;
};

export type CatalogCategoriesResult = {
  categories: CatalogCategory[];
  error: string | null;
};

export type CatalogProductsResult = {
  products: CatalogProduct[];
  error: string | null;
};

export type CatalogProductResult = {
  product: CatalogProduct | null;
  error: string | null;
};

export type CatalogCategoryResult = {
  category: CatalogCategory | null;
  error: string | null;
};

export type SaveCategoryResult = {
  category: CatalogCategory | null;
  error: string | null;
};

export type SaveProductResult = {
  product: CatalogProduct | null;
  error: string | null;
};

export type ProductImageUploadInitData = {
  imageId: number;
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
};

export type CategoryImageUploadInitData = ProductImageUploadInitData;

export type CategoryImageUploadInitResult = {
  upload: CategoryImageUploadInitData | null;
  error: string | null;
};

const CATALOG_IMPORT_ENDPOINT = '/admin/catalog/import';
const SAVE_CATEGORY_ENDPOINT = '/admin/catalog/category';
const SAVE_PRODUCT_ENDPOINT = '/admin/catalog/product';
const PRODUCT_IMAGE_UPLOAD_ENDPOINT_PREFIX = '/admin/products';
const CATEGORY_IMAGE_UPLOAD_ENDPOINT_PREFIX = '/admin/categories';
const CATALOG_CATEGORY_ENDPOINT = '/catalog/category';
const CATALOG_CATEGORIES_ENDPOINT = '/catalog/categories';
const CATALOG_PRODUCT_ENDPOINT = '/catalog/product';
const CATALOG_PRODUCTS_ENDPOINT = '/catalog/products/all';

async function parseJson<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function importCatalogFile({
  file,
  mode,
  importMode,
}: CatalogImportRequest): Promise<CatalogImportResult> {
  const formData = new FormData();
  const accessToken = getAccessToken();
  const headers = new Headers();

  formData.append('file', file);
  formData.append('mode', mode);
  formData.append('importMode', importMode);

  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  try {
    const response = await window.fetch(CATALOG_IMPORT_ENDPOINT, {
      method: 'POST',
      headers,
      body: formData,
    });

    const body = await parseJson<ImportFileResponseBody>(response);

    if (!body) {
      return {
        success: false,
        error: 'Сервис импорта каталога вернул некорректный ответ.',
        code: null,
      };
    }

    if (!response.ok) {
      return {
        success: false,
        error: body.error ?? 'Не удалось выполнить импорт каталога.',
        code: body.code,
      };
    }

    return {
      success: body.success,
      error: body.error,
      code: body.code,
    };
  } catch {
    return {
      success: false,
      error: 'Не удалось связаться с сервисом импорта каталога.',
      code: null,
    };
  }
}

export async function getCategories(): Promise<CatalogCategoriesResult> {
  try {
    const response = await window.fetch(CATALOG_CATEGORIES_ENDPOINT);
    const body = await parseJson<GetCategoriesResponseBody>(response);

    if (!body) {
      return {
        categories: [],
        error: 'Сервис категорий вернул некорректный ответ.',
      };
    }

    if (!response.ok || !body.success) {
      return {
        categories: body.catalog ?? [],
        error: body.error ?? 'Не удалось загрузить категории.',
      };
    }

    return {
      categories: body.catalog ?? [],
      error: null,
    };
  } catch {
    return {
      categories: [],
      error: 'Не удалось связаться с сервисом категорий.',
    };
  }
}

export async function getAllProducts(): Promise<CatalogProductsResult> {
  try {
    const response = await window.fetch(CATALOG_PRODUCTS_ENDPOINT);
    const body = await parseJson<GetProductsResponseBody>(response);

    if (!body) {
      return {
        products: [],
        error: 'Сервис товаров вернул некорректный ответ.',
      };
    }

    if (!response.ok || !body.success) {
      return {
        products: body.products ?? [],
        error: body.error ?? 'Не удалось загрузить товары.',
      };
    }

    return {
      products: body.products ?? [],
      error: null,
    };
  } catch {
    return {
      products: [],
      error: 'Не удалось связаться с сервисом товаров.',
    };
  }
}

export async function getCategoryById(id: number): Promise<CatalogCategoryResult> {
  try {
    const response = await window.fetch(`${CATALOG_CATEGORY_ENDPOINT}?id=${id}`);
    const body = await parseJson<GetCategoryResponseBody>(response);

    if (!body) {
      return {
        category: null,
        error: 'Сервис категории вернул некорректный ответ.',
      };
    }

    if (!response.ok || !body.success || !body.category) {
      return {
        category: body.category ?? null,
        error: body.error ?? 'Не удалось загрузить категорию.',
      };
    }

    return {
      category: body.category,
      error: null,
    };
  } catch {
    return {
      category: null,
      error: 'Не удалось связаться с сервисом категории.',
    };
  }
}

export async function getProductById(id: number): Promise<CatalogProductResult> {
  try {
    const response = await window.fetch(`${CATALOG_PRODUCT_ENDPOINT}?id=${id}`);
    const body = await parseJson<GetProductResponseBody>(response);

    if (!body) {
      return {
        product: null,
        error: 'Сервис товара вернул некорректный ответ.',
      };
    }

    if (!response.ok || !body.success || !body.product) {
      return {
        product: body.product ?? null,
        error: body.error ?? 'Не удалось загрузить товар.',
      };
    }

    return {
      product: body.product,
      error: null,
    };
  } catch {
    return {
      product: null,
      error: 'Не удалось связаться с сервисом товара.',
    };
  }
}

export async function saveCategory(category: CatalogCategory): Promise<SaveCategoryResult> {
  const accessToken = getAccessToken();
  const headers = new Headers({
    'Content-Type': 'application/json',
  });

  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  try {
    const response = await window.fetch(SAVE_CATEGORY_ENDPOINT, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        category,
      }),
    });
    const body = await parseJson<SaveCategoryResponseBody>(response);

    if (!body) {
      return {
        category: null,
        error: 'Сервис сохранения категории вернул некорректный ответ.',
      };
    }

    if (!response.ok || !body.success || !body.category) {
      return {
        category: body.category ?? null,
        error: body.error ?? 'Не удалось сохранить категорию.',
      };
    }

    return {
      category: body.category,
      error: null,
    };
  } catch {
    return {
      category: null,
      error: 'Не удалось связаться с сервисом сохранения категории.',
    };
  }
}

export async function saveProduct(product: CatalogProduct): Promise<SaveProductResult> {
  const accessToken = getAccessToken();
  const headers = new Headers({
    'Content-Type': 'application/json',
  });

  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  try {
    const response = await window.fetch(SAVE_PRODUCT_ENDPOINT, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        product,
      }),
    });
    const body = await parseJson<SaveProductResponseBody>(response);

    if (!body) {
      return {
        product: null,
        error: 'Сервис сохранения товара вернул некорректный ответ.',
      };
    }

    if (!response.ok || !body.success || !body.product) {
      return {
        product: body.product ?? null,
        error: body.error ?? 'Не удалось сохранить товар.',
      };
    }

    return {
      product: body.product,
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
  const accessToken = getAccessToken();
  const headers = new Headers({
    'Content-Type': 'application/json',
  });

  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  try {
    const response = await window.fetch(`${PRODUCT_IMAGE_UPLOAD_ENDPOINT_PREFIX}/${productId}/images:init`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        contentType,
        sizeBytes,
        fileName: fileName ?? null,
      }),
    });
    const body = await parseJson<InitProductImageUploadResponseBody>(response);

    if (!response.ok) {
      return {
        upload: null,
        error: 'Не удалось получить данные для загрузки изображения.',
      };
    }

    if (
      !body ||
      !Number.isInteger(body.imageId) ||
      body.imageId <= 0 ||
      typeof body.objectKey !== 'string' ||
      !body.objectKey ||
      typeof body.uploadUrl !== 'string' ||
      !body.uploadUrl ||
      !body.requiredHeaders ||
      typeof body.requiredHeaders !== 'object' ||
      Array.isArray(body.requiredHeaders)
    ) {
      return {
        upload: null,
        error: 'Сервис инициализации загрузки изображения вернул некорректный ответ.',
      };
    }

    return {
      upload: {
        imageId: body.imageId,
        objectKey: body.objectKey,
        uploadUrl: body.uploadUrl,
        requiredHeaders: body.requiredHeaders,
      },
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
  productId,
  imageId,
  objectKey,
}: CompleteProductImageUploadRequest): Promise<ProductImageUploadStepResult> {
  const accessToken = getAccessToken();
  const headers = new Headers();

  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  try {
    const response = await window.fetch(
      `${PRODUCT_IMAGE_UPLOAD_ENDPOINT_PREFIX}/${productId}/images/${imageId}:complete?objectKey=${encodeURIComponent(objectKey)}`,
      {
        method: 'POST',
        headers,
      },
    );

    if (!response.ok) {
      return {
        error: 'Не удалось завершить загрузку изображения.',
      };
    }

    return {
      error: null,
    };
  } catch {
    return {
      error: 'Не удалось связаться с сервисом завершения загрузки изображения.',
    };
  }
}

export async function initCategoryImageUpload({
  categoryId,
  contentType,
  sizeBytes,
  fileName,
}: InitCategoryImageUploadRequest): Promise<CategoryImageUploadInitResult> {
  const accessToken = getAccessToken();
  const headers = new Headers({
    'Content-Type': 'application/json',
  });

  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  try {
    const response = await window.fetch(`${CATEGORY_IMAGE_UPLOAD_ENDPOINT_PREFIX}/${categoryId}/images:init`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        contentType,
        sizeBytes,
        fileName: fileName ?? null,
      }),
    });
    const body = await parseJson<InitProductImageUploadResponseBody>(response);

    if (!response.ok) {
      return {
        upload: null,
        error: 'Не удалось получить данные для загрузки изображения.',
      };
    }

    if (
      !body ||
      !Number.isInteger(body.imageId) ||
      body.imageId <= 0 ||
      typeof body.objectKey !== 'string' ||
      !body.objectKey ||
      typeof body.uploadUrl !== 'string' ||
      !body.uploadUrl ||
      !body.requiredHeaders ||
      typeof body.requiredHeaders !== 'object' ||
      Array.isArray(body.requiredHeaders)
    ) {
      return {
        upload: null,
        error: 'Сервис инициализации загрузки изображения вернул некорректный ответ.',
      };
    }

    return {
      upload: {
        imageId: body.imageId,
        objectKey: body.objectKey,
        uploadUrl: body.uploadUrl,
        requiredHeaders: body.requiredHeaders,
      },
      error: null,
    };
  } catch {
    return {
      upload: null,
      error: 'Не удалось связаться с сервисом инициализации загрузки изображения.',
    };
  }
}

export async function uploadCategoryImageToStorage(
  request: UploadProductImageToStorageRequest,
): Promise<ProductImageUploadStepResult> {
  return uploadProductImageToStorage(request);
}

export async function completeCategoryImageUpload({
  categoryId,
  imageId,
  objectKey,
}: CompleteCategoryImageUploadRequest): Promise<ProductImageUploadStepResult> {
  const accessToken = getAccessToken();
  const headers = new Headers();

  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  try {
    const response = await window.fetch(
      `${CATEGORY_IMAGE_UPLOAD_ENDPOINT_PREFIX}/${categoryId}/images/${imageId}:complete?objectKey=${encodeURIComponent(objectKey)}`,
      {
        method: 'POST',
        headers,
      },
    );

    if (!response.ok) {
      return {
        error: 'Не удалось завершить загрузку изображения.',
      };
    }

    return {
      error: null,
    };
  } catch {
    return {
      error: 'Не удалось связаться с сервисом завершения загрузки изображения.',
    };
  }
}
