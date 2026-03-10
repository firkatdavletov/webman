import type { ApiError } from '@/shared/api/client';

export function getApiErrorMessage(error: ApiError | undefined, fallbackMessage: string): string {
  if (!error) {
    return fallbackMessage;
  }

  return error.message ?? fallbackMessage;
}
