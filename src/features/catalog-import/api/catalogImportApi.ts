import { getAccessToken } from '@/entities/session';
import { type ApiError, apiClient } from '@/shared/api/client';
import { getApiErrorMessage } from '@/shared/api/error';
import type { components } from '@/shared/api/schema';

type CatalogImportMultipartRequest = components['schemas']['CatalogImportMultipartRequest'];
type CatalogImportMultipartUploadRequest = Omit<CatalogImportMultipartRequest, 'file'> & { file: File };

export type CatalogImportType = components['schemas']['CatalogImportType'];
export type CatalogImportMode = components['schemas']['CatalogImportMode'];
export type CatalogImportErrorCode = components['schemas']['CatalogImportErrorCode'];
export type CatalogImportReport = components['schemas']['CatalogImportResponse'];
export type CatalogImportRowError = components['schemas']['CatalogImportRowErrorResponse'];
export type CatalogImportExample = components['schemas']['CatalogImportExampleResponse'];

type CatalogImportRequest = {
  file: File;
  importType: CatalogImportType;
  importMode: CatalogImportMode;
};

type DownloadCatalogImportExampleRequest = {
  importType: CatalogImportType;
  importMode: CatalogImportMode;
  fileName?: string;
};

export type CatalogImportResult = {
  report: CatalogImportReport | null;
  error: string | null;
};

export type CatalogImportExamplesResult = {
  examples: CatalogImportExample[];
  error: string | null;
};

export type DownloadCatalogImportExampleResult = {
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

function serializeCatalogImportBody(body: CatalogImportMultipartUploadRequest): FormData {
  const formData = new FormData();

  formData.set('file', body.file);
  formData.set('importType', body.importType);
  formData.set('importMode', body.importMode);

  return formData;
}

function resolveFileNameFromContentDisposition(headerValue: string | null): string | null {
  if (!headerValue) {
    return null;
  }

  const utf8Match = headerValue.match(/filename\*=UTF-8''([^;]+)/i);

  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return utf8Match[1];
    }
  }

  const simpleMatch = headerValue.match(/filename="?([^"]+)"?/i);

  if (!simpleMatch?.[1]) {
    return null;
  }

  return simpleMatch[1].trim();
}

function downloadBlob(blob: Blob, fileName: string): void {
  const objectUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = objectUrl;
  anchor.download = fileName;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(objectUrl);
}

export async function importCatalogFile({
  file,
  importType,
  importMode,
}: CatalogImportRequest): Promise<CatalogImportResult> {
  const requestBody: CatalogImportMultipartUploadRequest = {
    file,
    importType,
    importMode,
  };

  try {
    const result = await apiClient.POST('/api/v1/admin/catalog-import', {
      headers: buildAuthHeaders(),
      body: requestBody as unknown as CatalogImportMultipartRequest,
      bodySerializer: (rawBody) =>
        serializeCatalogImportBody(rawBody as unknown as CatalogImportMultipartUploadRequest),
    });

    if (result.error) {
      return {
        report: null,
        error: getProtectedErrorMessage(result.error, 'Не удалось выполнить импорт каталога.'),
      };
    }

    if (!result.data) {
      return {
        report: null,
        error: 'Сервис импорта вернул некорректный ответ.',
      };
    }

    return {
      report: result.data,
      error: null,
    };
  } catch {
    return {
      report: null,
      error: 'Не удалось связаться с сервисом импорта.',
    };
  }
}

export async function getCatalogImportExamples(): Promise<CatalogImportExamplesResult> {
  try {
    const result = await apiClient.GET('/api/v1/admin/catalog-import/examples', {
      headers: buildAuthHeaders(),
    });

    if (result.error) {
      return {
        examples: [],
        error: getProtectedErrorMessage(result.error, 'Не удалось загрузить примеры CSV-файлов.'),
      };
    }

    if (!result.data) {
      return {
        examples: [],
        error: 'Сервис примеров CSV вернул некорректный ответ.',
      };
    }

    return {
      examples: result.data,
      error: null,
    };
  } catch {
    return {
      examples: [],
      error: 'Не удалось связаться с сервисом примеров CSV.',
    };
  }
}

export async function downloadCatalogImportExample({
  importType,
  importMode,
  fileName,
}: DownloadCatalogImportExampleRequest): Promise<DownloadCatalogImportExampleResult> {
  try {
    const result = await apiClient.GET('/api/v1/admin/catalog-import/examples/{importType}/{importMode}', {
      headers: buildAuthHeaders(),
      params: {
        path: {
          importType,
          importMode,
        },
      },
      parseAs: 'blob',
    });

    if (result.error) {
      return {
        error: getProtectedErrorMessage(result.error, 'Не удалось скачать пример CSV-файла.'),
      };
    }

    if (!result.data) {
      return {
        error: 'Сервис примеров CSV вернул пустой файл.',
      };
    }

    const contentDisposition = result.response.headers.get('Content-Disposition');
    const fileNameFromHeader = resolveFileNameFromContentDisposition(contentDisposition);
    const fallbackFileName = `${importType.toLowerCase()}-${importMode.toLowerCase()}.csv`;

    downloadBlob(result.data, fileNameFromHeader ?? fileName ?? fallbackFileName);

    return {
      error: null,
    };
  } catch {
    return {
      error: 'Не удалось связаться с сервисом примеров CSV.',
    };
  }
}
