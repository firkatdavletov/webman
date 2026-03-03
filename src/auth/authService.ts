const ACCESS_TOKEN_KEY = 'authAccessToken';
const REFRESH_TOKEN_KEY = 'authRefreshToken';
const LOGIN_ENDPOINT = '/auth/loginByEmail';

type TokenPair = {
  access: string;
  refresh: string;
};

type LoginResponseBody = {
  tokens: TokenPair | null;
  success: boolean;
  error: string | null;
  code: number | null;
};

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
  window.localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh);
}

function getErrorMessage(body: LoginResponseBody | null): string {
  if (!body) {
    return 'Сервис авторизации вернул некорректный ответ.';
  }

  if (body.code === 401) {
    return 'Неверная электронная почта или пароль.';
  }

  return body.error ?? 'Не удалось выполнить вход.';
}

export async function login(email: string, password: string): Promise<LoginResult> {
  try {
    const response = await window.fetch(LOGIN_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
      }),
    });

    let body: LoginResponseBody | null = null;

    try {
      body = (await response.json()) as LoginResponseBody;
    } catch {
      return {
        token: null,
        error: 'Сервис авторизации вернул некорректный ответ.',
      };
    }

    if (!response.ok || !body.success || !body.tokens?.access || !body.tokens.refresh) {
      clearTokens();

      return {
        token: null,
        error: getErrorMessage(body),
      };
    }

    persistTokens(body.tokens);

    return {
      token: body.tokens.access,
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
  clearTokens();
}

export function getAccessToken(): string | null {
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function isAuthenticated(): boolean {
  const accessToken = getAccessToken();
  const refreshToken = window.localStorage.getItem(REFRESH_TOKEN_KEY);

  return Boolean(accessToken && refreshToken);
}
