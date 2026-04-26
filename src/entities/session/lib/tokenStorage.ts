import type { components } from '@/shared/api/schema';

const ACCESS_TOKEN_KEY = 'authAccessToken';
const REFRESH_TOKEN_KEY = 'authRefreshToken';
const ADMIN_ID_KEY = 'authAdminId';
const ADMIN_ROLE_KEY = 'authAdminRole';

type AdminRole = components['schemas']['AdminRole'];

type PersistSessionTokensInput = {
  accessToken: string;
  refreshToken: string | null;
  adminId?: string | null;
  role?: AdminRole | null;
};

const ADMIN_ROLE_VALUES: AdminRole[] = [
  'SUPERADMIN',
  'OWNER',
  'MANAGER',
  'ORDER_MANAGER',
  'KITCHEN',
  'DELIVERY_MANAGER',
  'CATALOG_MANAGER',
  'MARKETING_MANAGER',
  'SUPPORT',
];

function isAdminRole(value: string | null): value is AdminRole {
  return ADMIN_ROLE_VALUES.includes(value as AdminRole);
}

export function getAccessTokenFromStorage(): string | null {
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshTokenFromStorage(): string | null {
  return window.localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function getAdminIdFromStorage(): string | null {
  return window.localStorage.getItem(ADMIN_ID_KEY);
}

export function getAdminRoleFromStorage(): AdminRole | null {
  const role = window.localStorage.getItem(ADMIN_ROLE_KEY);

  return isAdminRole(role) ? role : null;
}

export function clearSessionTokens(): void {
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  window.localStorage.removeItem(ADMIN_ID_KEY);
  window.localStorage.removeItem(ADMIN_ROLE_KEY);
}

export function persistSessionTokens({ accessToken, refreshToken, adminId, role }: PersistSessionTokensInput): void {
  window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);

  if (refreshToken) {
    window.localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  } else {
    window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  }

  if (adminId !== undefined) {
    if (adminId) {
      window.localStorage.setItem(ADMIN_ID_KEY, adminId);
    } else {
      window.localStorage.removeItem(ADMIN_ID_KEY);
    }
  }

  if (role !== undefined) {
    if (role) {
      window.localStorage.setItem(ADMIN_ROLE_KEY, role);
    } else {
      window.localStorage.removeItem(ADMIN_ROLE_KEY);
    }
  }
}
