import { type ApiError, apiClient } from '@/shared/api/client';
import { getApiErrorMessage } from '@/shared/api/error';
import type { components } from '@/shared/api/schema';

const ACCESS_TOKEN_KEY = 'authAccessToken';
const REFRESH_TOKEN_KEY = 'authRefreshToken';

type TokenPair = {
  access: string;
  refresh: string | null;
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

function clearTokens(): void {
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
}

function persistTokens(tokens: TokenPair): void {
  window.localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access);

  if (tokens.refresh) {
    window.localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh);
    return;
  }

  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
}

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
    access: accessToken,
    refresh: refreshToken,
  };
}

function getLoginErrorMessage(error: ApiError | undefined): string {
  if (error?.code === 'UNAUTHORIZED') {
    return 'Неверный логин или пароль.';
  }

  return getApiErrorMessage(error, 'Не удалось выполнить вход.');
}

export async function login(loginValue: string, password: string): Promise<LoginResult> {
  clearTokens();

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

    persistTokens(tokens);

    return {
      token: tokens.access,
      error: null,
    };
  } catch {
    clearTokens();

    return {
      token: null,
      error: 'Не удалось связаться с сервисом авторизации.',
    };
  }
}

export function logout(): void {
  const accessToken = getAccessToken();
  const refreshToken = window.localStorage.getItem(REFRESH_TOKEN_KEY);

  void apiClient.POST('/api/v1/auth/logout', {
    headers: buildAuthHeaders(accessToken),
    body: {
      refreshToken,
    },
  });

  clearTokens();
}

export function getAccessToken(): string | null {
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function isAuthenticated(): boolean {
  const accessToken = getAccessToken();

  return Boolean(accessToken);
}
