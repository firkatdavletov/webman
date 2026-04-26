import type { components } from '@/shared/api/schema';

export type AdminRole = components['schemas']['AdminRole'];
export type AdminRoleOption = components['schemas']['AdminRoleResponse'];
export type AdminUser = components['schemas']['AdminUserResponse'];

export type GetAdminUsersFilters = {
  search?: string;
  role?: AdminRole;
  active?: boolean;
};

export type CreateAdminUserPayload = components['schemas']['CreateAdminUserRequest'];
export type UpdateAdminUserPayload = components['schemas']['UpdateAdminUserRequest'];
