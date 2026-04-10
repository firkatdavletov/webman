import { getAccessToken } from '@/entities/session';
import { type ApiError, apiClient } from '@/shared/api/client';
import { getApiErrorMessage } from '@/shared/api/error';
import type { components } from '@/shared/api/schema';
import type { LegalDocument, LegalDocumentType, UpdateLegalDocumentPayload } from '../model/types';

type LegalDocumentResponse = components['schemas']['LegalDocumentResponse'];

export type LegalDocumentsResult = {
  documents: LegalDocument[];
  error: string | null;
};

export type LegalDocumentResult = {
  document: LegalDocument | null;
  error: string | null;
};

export type SaveLegalDocumentResult = {
  document: LegalDocument | null;
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

function mapLegalDocument(document: LegalDocumentResponse): LegalDocument {
  return {
    type: document.type,
    title: document.title,
    subtitle: document.subtitle ?? null,
    text: document.text,
    updatedAt: document.updatedAt,
  };
}

export async function getLegalDocuments(): Promise<LegalDocumentsResult> {
  try {
    const result = await apiClient.GET('/api/v1/admin/legal-documents', {
      headers: buildAuthHeaders(),
    });

    if (result.error) {
      return {
        documents: [],
        error: getProtectedErrorMessage(result.error, 'Не удалось загрузить юридические документы.'),
      };
    }

    if (!result.data) {
      return {
        documents: [],
        error: 'Сервис юридических документов вернул некорректный ответ.',
      };
    }

    return {
      documents: result.data.map(mapLegalDocument),
      error: null,
    };
  } catch {
    return {
      documents: [],
      error: 'Не удалось связаться с сервисом юридических документов.',
    };
  }
}

export async function getLegalDocument(type: LegalDocumentType): Promise<LegalDocumentResult> {
  try {
    const result = await apiClient.GET('/api/v1/admin/legal-documents/{type}', {
      headers: buildAuthHeaders(),
      params: {
        path: {
          type,
        },
      },
    });

    if (result.error) {
      return {
        document: null,
        error: getProtectedErrorMessage(result.error, 'Не удалось загрузить документ.'),
      };
    }

    if (!result.data) {
      return {
        document: null,
        error: 'Сервис юридических документов вернул некорректный ответ.',
      };
    }

    return {
      document: mapLegalDocument(result.data),
      error: null,
    };
  } catch {
    return {
      document: null,
      error: 'Не удалось связаться с сервисом юридических документов.',
    };
  }
}

export async function updateLegalDocument(
  type: LegalDocumentType,
  payload: UpdateLegalDocumentPayload,
): Promise<SaveLegalDocumentResult> {
  try {
    const result = await apiClient.PUT('/api/v1/admin/legal-documents/{type}', {
      headers: buildAuthHeaders(),
      params: {
        path: {
          type,
        },
      },
      body: payload,
    });

    if (result.error) {
      return {
        document: null,
        error: getProtectedErrorMessage(result.error, 'Не удалось сохранить документ.'),
      };
    }

    if (!result.data) {
      return {
        document: null,
        error: 'Сервис юридических документов вернул некорректный ответ.',
      };
    }

    return {
      document: mapLegalDocument(result.data),
      error: null,
    };
  } catch {
    return {
      document: null,
      error: 'Не удалось связаться с сервисом юридических документов.',
    };
  }
}
