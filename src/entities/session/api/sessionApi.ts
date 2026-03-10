import { type ApiError, apiClient } from '@/shared/api/client';
import { getApiErrorMessage } from '@/shared/api/error';
import type { components } from '@/shared/api/schema';
import {
  clearSessionTokens,
  getAccessTokenFromStorage,
  getRefreshTokenFromStorage,
  persistSessionTokens,
} from '@/entities/session/lib/tokenStorage';

type TokenPair = {
  accessToken: string;
  refreshToken: string | null;
};

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
  };
}

function getLoginErrorMessage(error: ApiError | undefined): string {
  if (error?.code === 'UNAUTHORIZED') {
    return 'Неверный логин или пароль.';
  }

  return getApiErrorMessage(error, 'Не удалось выполнить вход.');
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

export function logout(): void {
  const accessToken = getAccessToken();
  const refreshToken = getRefreshTokenFromStorage();

  void apiClient.POST('/api/v1/auth/logout', {
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

export function isAuthenticated(): boolean {
  const accessToken = getAccessToken();

  return Boolean(accessToken);
}
