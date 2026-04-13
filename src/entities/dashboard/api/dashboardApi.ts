import { getAccessToken } from '@/entities/session';
import type { AdminDashboard } from '@/entities/dashboard/model/types';
import { type ApiError, apiClient } from '@/shared/api/client';
import { getApiErrorMessage } from '@/shared/api/error';

export type DashboardResult = {
  dashboard: AdminDashboard | null;
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

export async function getAdminDashboard(): Promise<DashboardResult> {
  try {
    const result = await apiClient.GET('/api/v1/admin/dashboard', {
      headers: buildAuthHeaders(),
    });

    if (result.error) {
      return {
        dashboard: null,
        error: getProtectedErrorMessage(result.error, 'Не удалось загрузить метрики дашборда.'),
      };
    }

    if (!result.data) {
      return {
        dashboard: null,
        error: 'Сервис дашборда вернул некорректный ответ.',
      };
    }

    return {
      dashboard: result.data,
      error: null,
    };
  } catch {
    return {
      dashboard: null,
      error: 'Не удалось связаться с сервисом дашборда.',
    };
  }
}
