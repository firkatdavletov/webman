import type {
  BannerStatus,
  HeroBanner,
  HeroBannerImage,
  HeroBannerPage,
  HeroBannerTranslation,
} from '@/entities/hero-banner/model/types';
import { getAccessToken } from '@/entities/session';
import { type ApiError, apiClient } from '@/shared/api/client';
import { getApiErrorMessage } from '@/shared/api/error';
import type { components } from '@/shared/api/schema';

type HeroBannerAdminResponse = components['schemas']['HeroBannerAdminResponse'];
type HeroBannerAdminPageResponse = components['schemas']['HeroBannerAdminPageResponse'];
type HeroBannerTranslationResponse = components['schemas']['HeroBannerTranslationResponse'];
type HeroBannerImageResponse = components['schemas']['HeroBannerImageResponse'];
type CreateHeroBannerRequest = components['schemas']['CreateHeroBannerRequest'];
type UpdateHeroBannerRequest = components['schemas']['UpdateHeroBannerRequest'];

type ListHeroBannersOptions = {
  status?: BannerStatus;
  search?: string;
  page?: number;
  size?: number;
};

const adminHeroBannersApiClient = apiClient as unknown as {
  GET(
    path: '/api/v1/admin/hero-banners',
    init?: {
      headers?: HeadersInit;
      params?: {
        query?: {
          status?: string;
          search?: string;
          page?: number;
          size?: number;
        };
      };
    },
  ): Promise<{ data?: HeroBannerAdminPageResponse; error?: ApiError }>;
  GET(
    path: `/api/v1/admin/hero-banners/${string}`,
    init?: {
      headers?: HeadersInit;
      params?: {
        path: { id: string };
      };
    },
  ): Promise<{ data?: HeroBannerAdminResponse; error?: ApiError }>;
};

export type HeroBannerListResult = {
  page: HeroBannerPage | null;
  error: string | null;
};

export type HeroBannerResult = {
  banner: HeroBanner | null;
  error: string | null;
};

export type SaveHeroBannerResult = {
  banner: HeroBanner | null;
  error: string | null;
};

export type DeleteHeroBannerResult = {
  error: string | null;
};

export type ChangeStatusResult = {
  banner: HeroBanner | null;
  error: string | null;
};

export type ReorderResult = {
  error: string | null;
};

export type BannerImageUploadInitData = {
  uploadId: string;
  uploadUrl: string;
  requiredHeaders: Record<string, string>;
};

export type BannerImageUploadInitResult = {
  upload: BannerImageUploadInitData | null;
  error: string | null;
};

export type BannerImageUploadStepResult = {
  error: string | null;
};

export type BannerImageUploadCompleteResult = {
  image: HeroBannerImage | null;
  error: string | null;
};

export type DeleteBannerImageResult = {
  error: string | null;
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

function mapBannerImage(img: HeroBannerImageResponse): HeroBannerImage {
  return { id: img.id, url: img.url };
}

function mapTranslation(t: HeroBannerTranslationResponse): HeroBannerTranslation {
  return {
    id: t.id,
    locale: t.locale,
    title: t.title,
    subtitle: t.subtitle ?? null,
    description: t.description ?? null,
    desktopImageAlt: t.desktopImageAlt,
    mobileImageAlt: t.mobileImageAlt ?? null,
    primaryActionLabel: t.primaryActionLabel ?? null,
    secondaryActionLabel: t.secondaryActionLabel ?? null,
  };
}

function mapHeroBanner(response: HeroBannerAdminResponse): HeroBanner {
  return {
    id: response.id,
    code: response.code,
    storefrontCode: response.storefrontCode,
    placement: response.placement,
    status: response.status,
    sortOrder: response.sortOrder,
    desktopImageUrl: response.desktopImageUrl,
    mobileImageUrl: response.mobileImageUrl ?? null,
    images: (response.images ?? []).map(mapBannerImage),
    primaryActionUrl: response.primaryActionUrl ?? null,
    secondaryActionUrl: response.secondaryActionUrl ?? null,
    themeVariant: response.themeVariant,
    textAlignment: response.textAlignment,
    startsAt: response.startsAt ?? null,
    endsAt: response.endsAt ?? null,
    publishedAt: response.publishedAt ?? null,
    version: response.version,
    createdAt: response.createdAt,
    updatedAt: response.updatedAt,
    translations: (response.translations ?? []).map(mapTranslation),
  };
}

function mapHeroBannerPage(response: HeroBannerAdminPageResponse): HeroBannerPage {
  return {
    items: (response.content ?? []).map(mapHeroBanner),
    page: response.page,
    size: response.size,
    totalElements: response.totalElements,
    totalPages: response.totalPages,
  };
}

export async function getHeroBanners(options: ListHeroBannersOptions = {}): Promise<HeroBannerListResult> {
  try {
    const result = await adminHeroBannersApiClient.GET('/api/v1/admin/hero-banners', {
      headers: buildAuthHeaders(),
      params: {
        query: {
          status: options.status,
          search: options.search || undefined,
          page: options.page ?? 0,
          size: options.size ?? 20,
        },
      },
    });

    if (result.error) {
      return {
        page: null,
        error: getApiErrorMessage(result.error, 'Не удалось загрузить баннеры.'),
      };
    }

    if (!result.data) {
      return {
        page: null,
        error: 'Сервис баннеров вернул некорректный ответ.',
      };
    }

    return {
      page: mapHeroBannerPage(result.data),
      error: null,
    };
  } catch {
    return {
      page: null,
      error: 'Не удалось связаться с сервисом баннеров.',
    };
  }
}

export async function getHeroBannerById(id: string): Promise<HeroBannerResult> {
  try {
    const result = await apiClient.GET('/api/v1/admin/hero-banners/{id}', {
      headers: buildAuthHeaders(),
      params: {
        path: { id },
      },
    });

    if (result.error) {
      return {
        banner: null,
        error: getApiErrorMessage(result.error, 'Не удалось загрузить баннер.'),
      };
    }

    if (!result.data) {
      return {
        banner: null,
        error: 'Сервис баннеров вернул некорректный ответ.',
      };
    }

    return {
      banner: mapHeroBanner(result.data),
      error: null,
    };
  } catch {
    return {
      banner: null,
      error: 'Не удалось связаться с сервисом баннеров.',
    };
  }
}

function buildCreateRequest(banner: HeroBanner): CreateHeroBannerRequest {
  return {
    code: banner.code,
    storefrontCode: banner.storefrontCode,
    placement: banner.placement,
    status: banner.status,
    sortOrder: banner.sortOrder,
    desktopImageUrl: banner.desktopImageUrl,
    mobileImageUrl: banner.mobileImageUrl,
    primaryActionUrl: banner.primaryActionUrl,
    secondaryActionUrl: banner.secondaryActionUrl,
    themeVariant: banner.themeVariant,
    textAlignment: banner.textAlignment,
    startsAt: banner.startsAt,
    endsAt: banner.endsAt,
    translations: banner.translations.map((t) => ({
      locale: t.locale,
      title: t.title,
      subtitle: t.subtitle,
      description: t.description,
      desktopImageAlt: t.desktopImageAlt,
      mobileImageAlt: t.mobileImageAlt,
      primaryActionLabel: t.primaryActionLabel,
      secondaryActionLabel: t.secondaryActionLabel,
    })),
  };
}

function buildUpdateRequest(banner: HeroBanner): UpdateHeroBannerRequest {
  return buildCreateRequest(banner);
}

export async function createHeroBanner(banner: HeroBanner): Promise<SaveHeroBannerResult> {
  try {
    const result = await apiClient.POST('/api/v1/admin/hero-banners', {
      headers: buildAuthHeaders(),
      body: buildCreateRequest(banner),
    });

    if (result.error) {
      return {
        banner: null,
        error: getProtectedErrorMessage(result.error, 'Не удалось создать баннер.'),
      };
    }

    if (!result.data) {
      return {
        banner: null,
        error: 'Сервис создания баннера вернул некорректный ответ.',
      };
    }

    return {
      banner: mapHeroBanner(result.data),
      error: null,
    };
  } catch {
    return {
      banner: null,
      error: 'Не удалось связаться с сервисом создания баннера.',
    };
  }
}

export async function updateHeroBanner(banner: HeroBanner): Promise<SaveHeroBannerResult> {
  try {
    const result = await apiClient.PUT('/api/v1/admin/hero-banners/{id}', {
      headers: buildAuthHeaders(),
      params: {
        path: { id: banner.id },
      },
      body: buildUpdateRequest(banner),
    });

    if (result.error) {
      return {
        banner: null,
        error: getProtectedErrorMessage(result.error, 'Не удалось обновить баннер.'),
      };
    }

    if (!result.data) {
      return {
        banner: null,
        error: 'Сервис обновления баннера вернул некорректный ответ.',
      };
    }

    return {
      banner: mapHeroBanner(result.data),
      error: null,
    };
  } catch {
    return {
      banner: null,
      error: 'Не удалось связаться с сервисом обновления баннера.',
    };
  }
}

export async function deleteHeroBanner(id: string): Promise<DeleteHeroBannerResult> {
  try {
    const result = await apiClient.DELETE('/api/v1/admin/hero-banners/{id}', {
      headers: buildAuthHeaders(),
      params: {
        path: { id },
      },
    });

    if (result.error) {
      return {
        error: getProtectedErrorMessage(result.error, 'Не удалось удалить баннер.'),
      };
    }

    return { error: null };
  } catch {
    return {
      error: 'Не удалось связаться с сервисом удаления баннера.',
    };
  }
}

export async function changeHeroBannerStatus(id: string, status: BannerStatus): Promise<ChangeStatusResult> {
  try {
    const result = await apiClient.PATCH('/api/v1/admin/hero-banners/{id}/status', {
      headers: buildAuthHeaders(),
      params: {
        path: { id },
      },
      body: { status },
    });

    if (result.error) {
      return {
        banner: null,
        error: getProtectedErrorMessage(result.error, 'Не удалось изменить статус баннера.'),
      };
    }

    if (!result.data) {
      return {
        banner: null,
        error: 'Сервис изменения статуса баннера вернул некорректный ответ.',
      };
    }

    return {
      banner: mapHeroBanner(result.data),
      error: null,
    };
  } catch {
    return {
      banner: null,
      error: 'Не удалось связаться с сервисом изменения статуса баннера.',
    };
  }
}

export async function reorderHeroBanners(items: { id: string; sortOrder: number }[]): Promise<ReorderResult> {
  try {
    const result = await apiClient.PATCH('/api/v1/admin/hero-banners/reorder', {
      headers: buildAuthHeaders(),
      body: { items },
    });

    if (result.error) {
      return {
        error: getProtectedErrorMessage(result.error, 'Не удалось изменить порядок баннеров.'),
      };
    }

    return { error: null };
  } catch {
    return {
      error: 'Не удалось связаться с сервисом сортировки баннеров.',
    };
  }
}

export async function initBannerImageUpload({
  bannerId,
  contentType,
  sizeBytes,
  fileName,
}: {
  bannerId: string | null;
  contentType: string;
  sizeBytes: number;
  fileName?: string | null;
}): Promise<BannerImageUploadInitResult> {
  try {
    const result = await apiClient.POST('/api/v1/admin/media/uploads', {
      headers: buildAuthHeaders(),
      body: {
        targetType: 'BANNER',
        targetId: bannerId,
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
      upload: {
        uploadId: result.data.id,
        uploadUrl: result.data.uploadUrl,
        requiredHeaders: result.data.requiredHeaders,
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

export async function uploadBannerImageToStorage({
  uploadUrl,
  requiredHeaders,
  file,
}: {
  uploadUrl: string;
  requiredHeaders: Record<string, string>;
  file: File;
}): Promise<BannerImageUploadStepResult> {
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
      return { error: 'Не удалось загрузить изображение в хранилище.' };
    }

    return { error: null };
  } catch {
    return { error: 'Не удалось связаться с хранилищем при загрузке изображения.' };
  }
}

export async function completeBannerImageUpload(uploadId: string): Promise<BannerImageUploadCompleteResult> {
  try {
    const result = await apiClient.POST('/api/v1/admin/media/uploads/{uploadId}/complete', {
      headers: buildAuthHeaders(),
      params: {
        path: { uploadId },
      },
    });

    if (result.error) {
      return {
        image: null,
        error: getProtectedErrorMessage(result.error, 'Не удалось завершить загрузку изображения.'),
      };
    }

    if (!result.data) {
      return {
        image: null,
        error: 'Сервис завершения загрузки изображения вернул некорректный ответ.',
      };
    }

    return {
      image: {
        id: result.data.id,
        url: result.data.publicUrl ?? '',
      },
      error: null,
    };
  } catch {
    return {
      image: null,
      error: 'Не удалось связаться с сервисом завершения загрузки изображения.',
    };
  }
}

export async function deleteHeroBannerImage(bannerId: string, imageId: string): Promise<DeleteBannerImageResult> {
  try {
    const result = await apiClient.DELETE('/api/v1/admin/hero-banners/{bannerId}/images/{imageId}', {
      headers: buildAuthHeaders(),
      params: {
        path: { bannerId, imageId },
      },
    });

    if (result.error) {
      return {
        error: getProtectedErrorMessage(result.error, 'Не удалось удалить изображение баннера.'),
      };
    }

    return { error: null };
  } catch {
    return {
      error: 'Не удалось связаться с сервисом удаления изображения баннера.',
    };
  }
}
