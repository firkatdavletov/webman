import { type ApiError, apiClient } from '@/shared/api/client';
import { getApiErrorMessage } from '@/shared/api/error';
import type { components } from '@/shared/api/schema';
import {
  clearSessionTokens,
  getAdminIdFromStorage,
  getAdminRoleFromStorage,
  getAccessTokenFromStorage,
  getRefreshTokenFromStorage,
  persistSessionTokens,
} from '@/entities/session/lib/tokenStorage';

type TokenPair = {
  accessToken: string;
  refreshToken: string | null;
  adminId: string | null;
  role: AdminRole | null;
};

type AdminRole = components['schemas']['AdminRole'];
type AdminAuthTokensResponse = components['schemas']['AdminAuthTokensResponse'];

export type LoginResult =
  | {
      token: string;
      error: null;
    }
  | {
      token: null;
      error: string;
    };

export type ChangeOwnPasswordResult = {
  changed: boolean;
  error: string | null;
};

function buildAuthHeaders(accessToken: string | null): HeadersInit | undefined {
  if (!accessToken) {
    return undefined;
  }

  return {
    Authorization: `Bearer ${accessToken}`,
  };
}

function extractTokens(body: AdminAuthTokensResponse | null): TokenPair | null {
  if (!body) {
    return null;
  }

  const accessToken = body.accessToken ?? null;
  const refreshToken = body.refreshToken ?? null;

  if (!accessToken) {
    return null;
  }

  return {
    accessToken,
    refreshToken,
    adminId: body.adminId ?? null,
    role: body.role ?? null,
  };
}

function getLoginErrorMessage(error: ApiError | undefined): string {
  if (error?.code === 'UNAUTHORIZED') {
    return 'Неверный логин или пароль.';
  }

  return getApiErrorMessage(error, 'Не удалось выполнить вход.');
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

export async function login(loginValue: string, password: string): Promise<LoginResult> {
  clearSessionTokens();

  try {
    const result = await apiClient.POST('/api/v1/admin/login', {
      body: {
        login: loginValue,
        password,
      },
    });
    const tokens = extractTokens(result.data ?? null);

    if (result.error || !tokens) {
      return {
        token: null,
        error: result.error
          ? getLoginErrorMessage(result.error)
          : 'Сервис авторизации вернул некорректный ответ.',
      };
    }

    persistSessionTokens(tokens);

    return {
      token: tokens.accessToken,
      error: null,
    };
  } catch {
    clearSessionTokens();

    return {
      token: null,
      error: 'Не удалось связаться с сервисом авторизации.',
    };
  }
}

export async function changeOwnPassword(currentPassword: string, newPassword: string): Promise<ChangeOwnPasswordResult> {
  try {
    const result = await apiClient.POST('/api/v1/admin/me/password', {
      headers: buildAuthHeaders(getAccessToken()),
      body: {
        currentPassword,
        newPassword,
      },
    });

    if (result.error) {
      return {
        changed: false,
        error: getProtectedErrorMessage(result.error, 'Не удалось изменить пароль.'),
      };
    }

    clearSessionTokens();

    return {
      changed: true,
      error: null,
    };
  } catch {
    return {
      changed: false,
      error: 'Не удалось связаться с сервисом смены пароля.',
    };
  }
}

export function logout(): void {
  const accessToken = getAccessToken();
  const refreshToken = getRefreshTokenFromStorage();

  void apiClient.POST('/api/v1/admin/logout', {
    headers: buildAuthHeaders(accessToken),
    body: {
      refreshToken,
    },
  });

  clearSessionTokens();
}

export function getAccessToken(): string | null {
  return getAccessTokenFromStorage();
}

export function getCurrentAdminId(): string | null {
  return getAdminIdFromStorage();
}

export function getCurrentAdminRole(): AdminRole | null {
  return getAdminRoleFromStorage();
}

export function isAuthenticated(): boolean {
  const accessToken = getAccessToken();

  return Boolean(accessToken);
}

export function isSuperAdmin(): boolean {
  return getCurrentAdminRole() === 'SUPERADMIN';
}
