import createClient from 'openapi-fetch';
import type { components, paths } from '@/shared/api/schema';

const rawBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();

const normalizedBaseUrl = rawBaseUrl ? rawBaseUrl.replace(/\/+$/, '') : '';

export const apiClient = createClient<paths>({
  baseUrl: normalizedBaseUrl,
});

export function resolveApiUrl(path: `/${string}`): string {
  if (!normalizedBaseUrl) {
    return path;
  }

  return `${normalizedBaseUrl}${path}`;
}

export type ApiError = components['schemas']['ApiError'];
