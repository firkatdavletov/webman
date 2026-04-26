import type { AdminRole, AdminUser } from '@/entities/admin-user/model/types';

export const ADMIN_ROLE_LABELS: Record<AdminRole, string> = {
  SUPERADMIN: 'Суперадмин',
  OWNER: 'Владелец',
  MANAGER: 'Менеджер',
  ORDER_MANAGER: 'Заказы',
  KITCHEN: 'Кухня',
  DELIVERY_MANAGER: 'Доставка',
  CATALOG_MANAGER: 'Каталог',
  MARKETING_MANAGER: 'Маркетинг',
  SUPPORT: 'Поддержка',
};

const dateTimeFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

export function getAdminRoleLabel(role: AdminRole): string {
  return ADMIN_ROLE_LABELS[role] ?? role;
}

export function formatAdminUserDateTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Дата недоступна';
  }

  return dateTimeFormatter.format(date);
}

export function sortAdminUsers(users: AdminUser[]): AdminUser[] {
  return [...users].sort((left, right) => {
    if (left.active !== right.active) {
      return left.active ? -1 : 1;
    }

    return left.login.localeCompare(right.login, 'ru');
  });
}
