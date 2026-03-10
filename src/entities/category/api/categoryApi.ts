import type { Category } from '@/entities/category/model/types';
import { getAccessToken } from '@/entities/session';
import { type ApiError, apiClient } from '@/shared/api/client';
import { getApiErrorMessage } from '@/shared/api/error';
import type { components } from '@/shared/api/schema';

type CategoryResponse = components['schemas']['CategoryResponse'];
type UpsertCategoryRequest = components['schemas']['UpsertCategoryRequest'];
type CreateUploadSessionResponse = components['schemas']['CreateUploadSessionResponse'];

type InitCategoryImageUploadRequest = {
  categoryId: string;
  contentType: string;
  sizeBytes: number;
  fileName?: string | null;
};

type UploadCategoryImageToStorageRequest = {
  uploadUrl: string;
  requiredHeaders: Record<string, string>;
  file: File;
};

type CompleteCategoryImageUploadRequest = {
  uploadId: string;
};

export type CategoryListResult = {
  categories: Category[];
  error: string | null;
};

export type CategoryResult = {
  category: Category | null;
  error: string | null;
};

export type SaveCategoryResult = {
  category: Category | null;
  error: string | null;
};

export type CategoryImageUploadInitData = {
  uploadId: string;
  objectKey: string;
  uploadUrl: string;
  requiredHeaders: Record<string, string>;
};

export type CategoryImageUploadInitResult = {
  upload: CategoryImageUploadInitData | null;
  error: string | null;
};

export type CategoryImageUploadStepResult = {
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

function mapCategory(category: CategoryResponse): Category {
  return {
    id: category.id,
    parentCategory: null,
    title: category.name,
    slug: category.slug,
    imageUrl: category.imageUrl ?? null,
    products: [],
    children: [],
    sku: null,
  };
}

function mapSaveCategoryRequest(category: Category): UpsertCategoryRequest {
  return {
    id: category.id || null,
    name: category.title,
    slug: category.slug || null,
    imageUrl: category.imageUrl,
    isActive: true,
  };
}

function mapUploadSession(data: CreateUploadSessionResponse): CategoryImageUploadInitData {
  return {
    uploadId: data.id,
    objectKey: data.objectKey,
    uploadUrl: data.uploadUrl,
    requiredHeaders: data.requiredHeaders,
  };
}

export async function getCategories(): Promise<CategoryListResult> {
  try {
    const result = await apiClient.GET('/api/v1/catalog/categories', {
      params: {
        query: {
          activeOnly: true,
        },
      },
    });

    if (result.error) {
      return {
        categories: [],
        error: getApiErrorMessage(result.error, 'Не удалось загрузить категории.'),
      };
    }

    if (!result.data) {
      return {
        categories: [],
        error: 'Сервис категорий вернул некорректный ответ.',
      };
    }

    return {
      categories: result.data.map(mapCategory),
      error: null,
    };
  } catch {
    return {
      categories: [],
      error: 'Не удалось связаться с сервисом категорий.',
    };
  }
}

export async function getCategoryById(id: string): Promise<CategoryResult> {
  const listResult = await getCategories();

  if (listResult.error) {
    return {
      category: null,
      error: listResult.error,
    };
  }

  const category = listResult.categories.find((item) => item.id === id) ?? null;

  if (!category) {
    return {
      category: null,
      error: 'Категория не найдена.',
    };
  }

  return {
    category,
    error: null,
  };
}

export async function saveCategory(category: Category): Promise<SaveCategoryResult> {
  try {
    const result = await apiClient.POST('/api/v1/admin/catalog/categories', {
      headers: buildAuthHeaders(),
      body: mapSaveCategoryRequest(category),
    });

    if (result.error) {
      return {
        category: null,
        error: getProtectedErrorMessage(result.error, 'Не удалось сохранить категорию.'),
      };
    }

    if (!result.data) {
      return {
        category: null,
        error: 'Сервис сохранения категории вернул некорректный ответ.',
      };
    }

    return {
      category: mapCategory(result.data),
      error: null,
    };
  } catch {
    return {
      category: null,
      error: 'Не удалось связаться с сервисом сохранения категории.',
    };
  }
}

export async function initCategoryImageUpload({
  categoryId,
  contentType,
  sizeBytes,
  fileName,
}: InitCategoryImageUploadRequest): Promise<CategoryImageUploadInitResult> {
  try {
    const result = await apiClient.POST('/api/v1/admin/media/uploads', {
      headers: buildAuthHeaders(),
      body: {
        targetType: 'CATEGORY',
        targetId: categoryId,
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

export async function uploadCategoryImageToStorage({
  uploadUrl,
  requiredHeaders,
  file,
}: UploadCategoryImageToStorageRequest): Promise<CategoryImageUploadStepResult> {
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

export async function completeCategoryImageUpload({
  uploadId,
}: CompleteCategoryImageUploadRequest): Promise<CategoryImageUploadStepResult> {
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
