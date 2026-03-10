const ACCESS_TOKEN_KEY = 'authAccessToken';
const REFRESH_TOKEN_KEY = 'authRefreshToken';

type PersistSessionTokensInput = {
  accessToken: string;
  refreshToken: string | null;
};

export function getAccessTokenFromStorage(): string | null {
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshTokenFromStorage(): string | null {
  return window.localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function clearSessionTokens(): void {
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function persistSessionTokens({ accessToken, refreshToken }: PersistSessionTokensInput): void {
  window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);

  if (refreshToken) {
    window.localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    return;
  }

  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
}
