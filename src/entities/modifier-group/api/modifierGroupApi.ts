import { getAccessToken } from '@/entities/session';
import type { ModifierGroup, ModifierOption } from '@/entities/modifier-group/model/types';
import { type ApiError, apiClient } from '@/shared/api/client';
import { getApiErrorMessage } from '@/shared/api/error';
import type { components } from '@/shared/api/schema';

type ModifierGroupResponse = components['schemas']['ModifierGroupResponse'];
type ModifierOptionResponse = components['schemas']['ModifierOptionResponse'];
type UpsertModifierGroupRequest = components['schemas']['UpsertModifierGroupRequest'];
type UpsertModifierOptionRequest = components['schemas']['UpsertModifierOptionRequest'];

type GetAllModifierGroupsOptions = {
  isActive?: boolean;
};

type GetModifierGroupOptionsOptions = {
  isActive?: boolean;
};

type AdminModifierGroupListResult = {
  data?: ModifierGroupResponse[];
  error?: ApiError;
};

type AdminModifierGroupResult = {
  data?: ModifierGroupResponse;
  error?: ApiError;
};

type AdminModifierOptionListResult = {
  data?: ModifierOptionResponse[];
  error?: ApiError;
};

type AdminModifierOptionResult = {
  data?: ModifierOptionResponse;
  error?: ApiError;
};

const adminModifierGroupsApiClient = apiClient as unknown as {
  GET(
    path: '/api/v1/admin/catalog/modifier-groups',
    init: {
      headers?: HeadersInit;
      params?: {
        query?: {
          isActive?: boolean;
        };
      };
    },
  ): Promise<AdminModifierGroupListResult>;
  GET(
    path: '/api/v1/admin/catalog/modifier-groups/{groupId}/options',
    init: {
      headers?: HeadersInit;
      params: {
        path: {
          groupId: string;
        };
        query?: {
          isActive?: boolean;
        };
      };
    },
  ): Promise<AdminModifierOptionListResult>;
  GET(
    path: '/api/v1/admin/catalog/modifier-groups/{groupId}/options/{optionId}',
    init: {
      headers?: HeadersInit;
      params: {
        path: {
          groupId: string;
          optionId: string;
        };
      };
    },
  ): Promise<AdminModifierOptionResult>;
  POST(
    path: '/api/v1/admin/catalog/modifier-groups',
    init: {
      headers?: HeadersInit;
      body: UpsertModifierGroupRequest;
    },
  ): Promise<AdminModifierGroupResult>;
  POST(
    path: '/api/v1/admin/catalog/modifier-groups/{groupId}/options',
    init: {
      headers?: HeadersInit;
      params: {
        path: {
          groupId: string;
        };
      };
      body: UpsertModifierOptionRequest;
    },
  ): Promise<AdminModifierOptionResult>;
};

export type ModifierGroupListResult = {
  modifierGroups: ModifierGroup[];
  error: string | null;
};

export type ModifierGroupResult = {
  modifierGroup: ModifierGroup | null;
  error: string | null;
};

export type SaveModifierGroupResult = {
  modifierGroup: ModifierGroup | null;
  error: string | null;
};

export type ModifierOptionListResult = {
  options: ModifierOption[];
  error: string | null;
};

export type ModifierOptionResult = {
  option: ModifierOption | null;
  error: string | null;
};

export type SaveModifierOptionResult = {
  option: ModifierOption | null;
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
    return 'Недостаточно прав для выполнения действия.';
  }

  return getApiErrorMessage(error, fallbackMessage);
}

function mapModifierGroup(group: ModifierGroupResponse): ModifierGroup {
  return {
    id: group.id,
    code: group.code,
    name: group.name,
    minSelected: group.minSelected,
    maxSelected: group.maxSelected,
    isRequired: group.isRequired,
    isActive: group.isActive,
    sortOrder: group.sortOrder,
  };
}

function mapModifierOption(option: ModifierOptionResponse): ModifierOption {
  return {
    id: option.id,
    code: option.code,
    name: option.name,
    description: option.description ?? null,
    priceType: option.priceType,
    price: option.price,
    applicationScope: option.applicationScope,
    isDefault: option.isDefault,
    isActive: option.isActive,
    sortOrder: option.sortOrder,
  };
}

function mapSaveModifierGroupRequest(modifierGroup: ModifierGroup): UpsertModifierGroupRequest {
  return {
    id: modifierGroup.id || null,
    code: modifierGroup.code,
    name: modifierGroup.name,
    minSelected: modifierGroup.minSelected,
    maxSelected: modifierGroup.maxSelected,
    isRequired: modifierGroup.isRequired,
    isActive: modifierGroup.isActive,
    sortOrder: modifierGroup.sortOrder,
  };
}

function mapSaveModifierOptionRequest(option: ModifierOption): UpsertModifierOptionRequest {
  return {
    id: option.id || null,
    code: option.code,
    name: option.name,
    description: option.description,
    priceType: option.priceType,
    price: option.price,
    applicationScope: option.applicationScope,
    isDefault: option.isDefault,
    isActive: option.isActive,
    sortOrder: option.sortOrder,
  };
}

async function fetchModifierGroupsByActivity(isActive?: boolean): Promise<ModifierGroupListResult> {
  try {
    const result = await adminModifierGroupsApiClient.GET('/api/v1/admin/catalog/modifier-groups', {
      headers: buildAuthHeaders(),
      params: isActive === undefined ? undefined : { query: { isActive } },
    });

    if (result.error) {
      return {
        modifierGroups: [],
        error: getProtectedErrorMessage(result.error, 'Не удалось загрузить модификаторы.'),
      };
    }

    if (!result.data) {
      return {
        modifierGroups: [],
        error: 'Сервис модификаторов вернул некорректный ответ.',
      };
    }

    return {
      modifierGroups: result.data.map(mapModifierGroup),
      error: null,
    };
  } catch {
    return {
      modifierGroups: [],
      error: 'Не удалось связаться с сервисом модификаторов.',
    };
  }
}

async function fetchModifierOptionsByActivity(groupId: string, isActive?: boolean): Promise<ModifierOptionListResult> {
  try {
    const result = await adminModifierGroupsApiClient.GET('/api/v1/admin/catalog/modifier-groups/{groupId}/options', {
      headers: buildAuthHeaders(),
      params: {
        path: {
          groupId,
        },
        ...(isActive === undefined
          ? {}
          : {
              query: {
                isActive,
              },
            }),
      },
    });

    if (result.error) {
      return {
        options: [],
        error: getProtectedErrorMessage(result.error, 'Не удалось загрузить опции модификаторов.'),
      };
    }

    if (!result.data) {
      return {
        options: [],
        error: 'Сервис опций модификаторов вернул некорректный ответ.',
      };
    }

    return {
      options: result.data.map(mapModifierOption),
      error: null,
    };
  } catch {
    return {
      options: [],
      error: 'Не удалось связаться с сервисом опций модификаторов.',
    };
  }
}

export async function getAllModifierGroups(options: GetAllModifierGroupsOptions = {}): Promise<ModifierGroupListResult> {
  if (options.isActive !== undefined) {
    return fetchModifierGroupsByActivity(options.isActive);
  }

  const [activeResult, inactiveResult] = await Promise.all([fetchModifierGroupsByActivity(true), fetchModifierGroupsByActivity(false)]);
  const modifierGroupById = new Map<string, ModifierGroup>();

  [...activeResult.modifierGroups, ...inactiveResult.modifierGroups].forEach((modifierGroup) => {
    modifierGroupById.set(modifierGroup.id, modifierGroup);
  });

  return {
    modifierGroups: Array.from(modifierGroupById.values()),
    error: [activeResult.error, inactiveResult.error].filter(Boolean).join(' ') || null,
  };
}

export async function getModifierGroupById(id: string): Promise<ModifierGroupResult> {
  const listResult = await getAllModifierGroups();

  if (listResult.error) {
    return {
      modifierGroup: null,
      error: listResult.error,
    };
  }

  const modifierGroup = listResult.modifierGroups.find((item) => item.id === id) ?? null;

  if (!modifierGroup) {
    return {
      modifierGroup: null,
      error: 'Группа модификаторов не найдена.',
    };
  }

  return {
    modifierGroup,
    error: null,
  };
}

export async function saveModifierGroup(modifierGroup: ModifierGroup): Promise<SaveModifierGroupResult> {
  try {
    const result = await adminModifierGroupsApiClient.POST('/api/v1/admin/catalog/modifier-groups', {
      headers: buildAuthHeaders(),
      body: mapSaveModifierGroupRequest(modifierGroup),
    });

    if (result.error) {
      return {
        modifierGroup: null,
        error: getProtectedErrorMessage(result.error, 'Не удалось сохранить группу модификаторов.'),
      };
    }

    if (!result.data) {
      return {
        modifierGroup: null,
        error: 'Сервис сохранения модификаторов вернул некорректный ответ.',
      };
    }

    return {
      modifierGroup: mapModifierGroup(result.data),
      error: null,
    };
  } catch {
    return {
      modifierGroup: null,
      error: 'Не удалось связаться с сервисом сохранения модификаторов.',
    };
  }
}

export async function getModifierGroupOptions(
  groupId: string,
  options: GetModifierGroupOptionsOptions = {},
): Promise<ModifierOptionListResult> {
  if (options.isActive !== undefined) {
    return fetchModifierOptionsByActivity(groupId, options.isActive);
  }

  const [activeResult, inactiveResult] = await Promise.all([
    fetchModifierOptionsByActivity(groupId, true),
    fetchModifierOptionsByActivity(groupId, false),
  ]);
  const optionById = new Map<string, ModifierOption>();

  [...activeResult.options, ...inactiveResult.options].forEach((option) => {
    optionById.set(option.id, option);
  });

  return {
    options: Array.from(optionById.values()),
    error: [activeResult.error, inactiveResult.error].filter(Boolean).join(' ') || null,
  };
}

export async function getModifierGroupOptionById(groupId: string, optionId: string): Promise<ModifierOptionResult> {
  try {
    const result = await adminModifierGroupsApiClient.GET('/api/v1/admin/catalog/modifier-groups/{groupId}/options/{optionId}', {
      headers: buildAuthHeaders(),
      params: {
        path: {
          groupId,
          optionId,
        },
      },
    });

    if (result.error) {
      return {
        option: null,
        error: getProtectedErrorMessage(result.error, 'Не удалось загрузить опцию модификатора.'),
      };
    }

    if (!result.data) {
      return {
        option: null,
        error: 'Сервис опции модификатора вернул некорректный ответ.',
      };
    }

    return {
      option: mapModifierOption(result.data),
      error: null,
    };
  } catch {
    return {
      option: null,
      error: 'Не удалось связаться с сервисом опции модификатора.',
    };
  }
}

export async function saveModifierGroupOption(groupId: string, option: ModifierOption): Promise<SaveModifierOptionResult> {
  try {
    const result = await adminModifierGroupsApiClient.POST('/api/v1/admin/catalog/modifier-groups/{groupId}/options', {
      headers: buildAuthHeaders(),
      params: {
        path: {
          groupId,
        },
      },
      body: mapSaveModifierOptionRequest(option),
    });

    if (result.error) {
      return {
        option: null,
        error: getProtectedErrorMessage(result.error, 'Не удалось сохранить опцию модификатора.'),
      };
    }

    if (!result.data) {
      return {
        option: null,
        error: 'Сервис сохранения опции модификатора вернул некорректный ответ.',
      };
    }

    return {
      option: mapModifierOption(result.data),
      error: null,
    };
  } catch {
    return {
      option: null,
      error: 'Не удалось связаться с сервисом сохранения опции модификатора.',
    };
  }
}
