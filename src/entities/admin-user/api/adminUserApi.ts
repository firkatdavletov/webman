import { getAccessToken } from '@/entities/session';
import type {
  AdminRoleOption,
  AdminUser,
  CreateAdminUserPayload,
  GetAdminUsersFilters,
  UpdateAdminUserPayload,
} from '@/entities/admin-user/model/types';
import { type ApiError, apiClient } from '@/shared/api/client';
import { getApiErrorMessage } from '@/shared/api/error';

export type AdminRolesResult = {
  roles: AdminRoleOption[];
  error: string | null;
};

export type AdminUsersResult = {
  users: AdminUser[];
  error: string | null;
};

export type AdminUserResult = {
  user: AdminUser | null;
  error: string | null;
};

export type AdminUserActionResult = {
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
    return 'Раздел доступен только суперадминистратору.';
  }

  if (error?.code === 'CONFLICT') {
    return getApiErrorMessage(error, 'Сотрудник с таким логином уже существует.');
  }

  return getApiErrorMessage(error, fallbackMessage);
}

export async function getAdminRoles(): Promise<AdminRolesResult> {
  try {
    const result = await apiClient.GET('/api/v1/admin/users/roles', {
      headers: buildAuthHeaders(),
    });

    if (result.error) {
      return {
        roles: [],
        error: getProtectedErrorMessage(result.error, 'Не удалось загрузить роли сотрудников.'),
      };
    }

    return {
      roles: result.data ?? [],
      error: result.data ? null : 'Сервис ролей сотрудников вернул некорректный ответ.',
    };
  } catch {
    return {
      roles: [],
      error: 'Не удалось связаться с сервисом ролей сотрудников.',
    };
  }
}

export async function getAdminUsers(filters: GetAdminUsersFilters = {}): Promise<AdminUsersResult> {
  const search = filters.search?.trim();

  try {
    const result = await apiClient.GET('/api/v1/admin/users', {
      headers: buildAuthHeaders(),
      params: {
        query: {
          ...(search ? { search } : {}),
          ...(filters.role ? { role: filters.role } : {}),
          ...(filters.active === undefined ? {} : { active: filters.active }),
        },
      },
    });

    if (result.error) {
      return {
        users: [],
        error: getProtectedErrorMessage(result.error, 'Не удалось загрузить список сотрудников.'),
      };
    }

    return {
      users: result.data ?? [],
      error: result.data ? null : 'Сервис сотрудников вернул некорректный ответ.',
    };
  } catch {
    return {
      users: [],
      error: 'Не удалось связаться с сервисом сотрудников.',
    };
  }
}

export async function createAdminUser(payload: CreateAdminUserPayload): Promise<AdminUserResult> {
  try {
    const result = await apiClient.POST('/api/v1/admin/users', {
      headers: buildAuthHeaders(),
      body: payload,
    });

    if (result.error) {
      return {
        user: null,
        error: getProtectedErrorMessage(result.error, 'Не удалось добавить сотрудника.'),
      };
    }

    return {
      user: result.data ?? null,
      error: result.data ? null : 'Сервис создания сотрудника вернул некорректный ответ.',
    };
  } catch {
    return {
      user: null,
      error: 'Не удалось связаться с сервисом создания сотрудника.',
    };
  }
}

export async function updateAdminUser(userId: string, payload: UpdateAdminUserPayload): Promise<AdminUserResult> {
  try {
    const result = await apiClient.PUT('/api/v1/admin/users/{id}', {
      headers: buildAuthHeaders(),
      body: payload,
      params: {
        path: {
          id: userId,
        },
      },
    });

    if (result.error) {
      return {
        user: null,
        error: getProtectedErrorMessage(result.error, 'Не удалось обновить сотрудника.'),
      };
    }

    return {
      user: result.data ?? null,
      error: result.data ? null : 'Сервис обновления сотрудника вернул некорректный ответ.',
    };
  } catch {
    return {
      user: null,
      error: 'Не удалось связаться с сервисом обновления сотрудника.',
    };
  }
}

export async function deleteAdminUser(userId: string): Promise<AdminUserActionResult> {
  try {
    const result = await apiClient.DELETE('/api/v1/admin/users/{id}', {
      headers: buildAuthHeaders(),
      params: {
        path: {
          id: userId,
        },
      },
    });

    if (result.error) {
      return {
        error: getProtectedErrorMessage(result.error, 'Не удалось удалить сотрудника.'),
      };
    }

    return {
      error: null,
    };
  } catch {
    return {
      error: 'Не удалось связаться с сервисом удаления сотрудника.',
    };
  }
}

export async function resetAdminUserPassword(userId: string, password: string): Promise<AdminUserActionResult> {
  try {
    const result = await apiClient.POST('/api/v1/admin/users/{id}/password', {
      headers: buildAuthHeaders(),
      body: {
        password,
      },
      params: {
        path: {
          id: userId,
        },
      },
    });

    if (result.error) {
      return {
        error: getProtectedErrorMessage(result.error, 'Не удалось сменить пароль сотрудника.'),
      };
    }

    return {
      error: null,
    };
  } catch {
    return {
      error: 'Не удалось связаться с сервисом смены пароля сотрудника.',
    };
  }
}
