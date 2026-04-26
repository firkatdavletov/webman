import createClient from 'openapi-fetch';
import {
  clearSessionTokens,
  getRefreshTokenFromStorage,
  persistSessionTokens,
} from '@/entities/session/lib/tokenStorage';
import type { components, paths } from '@/shared/api/schema';
import { env } from '@/shared/config/env';

const normalizedBaseUrl = env.apiBaseUrl ? env.apiBaseUrl.replace(/\/+$/, '') : '';
const ADMIN_LOGIN_PATH = '/api/v1/admin/login';
const ADMIN_REFRESH_PATH = '/api/v1/admin/refresh';

type AdminAuthTokensResponse = components['schemas']['AdminAuthTokensResponse'];

export const apiClient = createClient<paths>({
  baseUrl: normalizedBaseUrl,
});

const retryableRequestById = new Map<string, Request>();
let refreshAccessTokenPromise: Promise<string | null> | null = null;

function isAuthSessionPath(schemaPath: string): boolean {
  return schemaPath === ADMIN_LOGIN_PATH || schemaPath === ADMIN_REFRESH_PATH;
}

function extractAccessToken(tokens: AdminAuthTokensResponse | null): string | null {
  const accessToken = tokens?.accessToken?.trim() ?? '';

  return accessToken || null;
}

function extractRefreshToken(tokens: AdminAuthTokensResponse | null): string | null {
  const refreshToken = tokens?.refreshToken?.trim() ?? '';

  return refreshToken || null;
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshTokenFromStorage();

  if (!refreshToken) {
    clearSessionTokens();
    return null;
  }

  try {
    const response = await window.fetch(resolveApiUrl(ADMIN_REFRESH_PATH), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        refreshToken,
      }),
    });

    if (!response.ok) {
      clearSessionTokens();
      return null;
    }

    const tokens = (await response.json().catch(() => null)) as AdminAuthTokensResponse | null;
    const nextAccessToken = extractAccessToken(tokens);

    if (!nextAccessToken) {
      clearSessionTokens();
      return null;
    }

    persistSessionTokens({
      accessToken: nextAccessToken,
      refreshToken: extractRefreshToken(tokens),
      adminId: tokens?.adminId ?? null,
      role: tokens?.role ?? null,
    });

    return nextAccessToken;
  } catch {
    clearSessionTokens();
    return null;
  }
}

async function getRefreshedAccessToken(): Promise<string | null> {
  if (!refreshAccessTokenPromise) {
    refreshAccessTokenPromise = refreshAccessToken().finally(() => {
      refreshAccessTokenPromise = null;
    });
  }

  return refreshAccessTokenPromise;
}

apiClient.use({
  onRequest({ request, id, schemaPath }) {
    if (isAuthSessionPath(schemaPath)) {
      return;
    }

    retryableRequestById.set(id, request.clone());
  },
  async onResponse({ response, id, schemaPath, options }) {
    const retryableRequest = retryableRequestById.get(id);
    retryableRequestById.delete(id);

    if (response.status !== 401 || isAuthSessionPath(schemaPath) || !retryableRequest) {
      return response;
    }

    const authorizationHeader = retryableRequest.headers.get('Authorization') ?? '';

    if (!authorizationHeader.startsWith('Bearer ')) {
      return response;
    }

    const nextAccessToken = await getRefreshedAccessToken();

    if (!nextAccessToken) {
      return response;
    }

    const retryHeaders = new Headers(retryableRequest.headers);
    retryHeaders.set('Authorization', `Bearer ${nextAccessToken}`);

    return options.fetch(new Request(retryableRequest, { headers: retryHeaders }));
  },
  onError({ id }) {
    retryableRequestById.delete(id);
  },
});

export function resolveApiUrl(path: `/${string}`): string {
  if (!normalizedBaseUrl) {
    return path;
  }

  return `${normalizedBaseUrl}${path}`;
}

export type ApiError = components['schemas']['ApiError'];
