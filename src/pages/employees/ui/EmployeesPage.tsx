import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import {
  KeyRoundIcon,
  PencilIcon,
  PlusIcon,
  RefreshCcwIcon,
  SearchIcon,
  Trash2Icon,
} from 'lucide-react';
import {
  createAdminUser,
  deleteAdminUser,
  formatAdminUserDateTime,
  getAdminRoleLabel,
  getAdminRoles,
  getAdminUsers,
  resetAdminUserPassword,
  sortAdminUsers,
  updateAdminUser,
  type AdminRole,
  type AdminRoleOption,
  type AdminUser,
} from '@/entities/admin-user';
import { getCurrentAdminId } from '@/entities/session';
import { cn } from '@/shared/lib/cn';
import {
  AdminEmptyState,
  AdminNotice,
  AdminPage,
  AdminPageHeader,
  AdminPageStatus,
  AdminSectionCard,
  Badge,
  Button,
  DataTable,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  FormField,
  Input,
  SegmentedControl,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/shared/ui';

type ActivityFilter = 'active' | 'inactive' | 'all';
type EmployeeEditorMode = 'create' | 'edit';

type EmployeeEditorValues = {
  login: string;
  password: string;
  passwordConfirm: string;
  role: AdminRole;
  active: boolean;
};

type EmployeeEditorErrors = Partial<Record<keyof EmployeeEditorValues, string>>;

type PasswordValues = {
  password: string;
  passwordConfirm: string;
};

type PasswordErrors = Partial<Record<keyof PasswordValues, string>>;

const DEFAULT_ADMIN_ROLES: AdminRole[] = [
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

const DEFAULT_ROLE_OPTIONS: AdminRoleOption[] = DEFAULT_ADMIN_ROLES.map((role) => ({
  code: role,
  name: getAdminRoleLabel(role),
}));

const nativeFieldClassName =
  'h-11 w-full rounded-xl border border-input bg-background/80 px-3 text-sm text-foreground shadow-sm outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-60';

const checkboxInputClassName =
  'size-4 rounded border border-input text-primary outline-none transition focus-visible:ring-3 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-60';

function getDefaultRole(roleOptions: AdminRoleOption[]): AdminRole {
  return roleOptions.some((role) => role.code === 'MANAGER') ? 'MANAGER' : roleOptions[0]?.code ?? 'MANAGER';
}

function createEmptyEditorValues(roleOptions: AdminRoleOption[]): EmployeeEditorValues {
  return {
    login: '',
    password: '',
    passwordConfirm: '',
    role: getDefaultRole(roleOptions),
    active: true,
  };
}

function createEditorValuesFromUser(user: AdminUser): EmployeeEditorValues {
  return {
    login: user.login,
    password: '',
    passwordConfirm: '',
    role: user.role,
    active: user.active,
  };
}

function validateEmployeeEditor(values: EmployeeEditorValues, mode: EmployeeEditorMode): EmployeeEditorErrors {
  const errors: EmployeeEditorErrors = {};

  if (!values.login.trim()) {
    errors.login = 'Укажите логин сотрудника.';
  }

  if (mode === 'create') {
    if (!values.password) {
      errors.password = 'Укажите временный пароль.';
    } else if (values.password.length < 8) {
      errors.password = 'Пароль должен быть не короче 8 символов.';
    }

    if (values.password !== values.passwordConfirm) {
      errors.passwordConfirm = 'Пароли не совпадают.';
    }
  }

  return errors;
}

function validatePassword(values: PasswordValues): PasswordErrors {
  const errors: PasswordErrors = {};

  if (!values.password) {
    errors.password = 'Укажите новый пароль.';
  } else if (values.password.length < 8) {
    errors.password = 'Пароль должен быть не короче 8 символов.';
  }

  if (values.password !== values.passwordConfirm) {
    errors.passwordConfirm = 'Пароли не совпадают.';
  }

  return errors;
}

function getStatusBadge(user: AdminUser) {
  return (
    <Badge
      variant={user.active ? 'secondary' : 'outline'}
      className={cn(
        'h-auto rounded-full px-3 py-1 text-[0.72rem] font-medium',
        user.active ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'bg-muted/40 text-muted-foreground',
      )}
    >
      {user.active ? 'Активен' : 'Отключен'}
    </Badge>
  );
}

export function EmployeesPage() {
  const currentAdminId = getCurrentAdminId();
  const requestIdRef = useRef(0);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<AdminRoleOption[]>(DEFAULT_ROLE_OPTIONS);
  const [searchQuery, setSearchQuery] = useState('');
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>('active');
  const [roleFilter, setRoleFilter] = useState<AdminRole | 'ALL'>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [actionError, setActionError] = useState('');

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<EmployeeEditorMode>('create');
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [editorValues, setEditorValues] = useState<EmployeeEditorValues>(() => createEmptyEditorValues(DEFAULT_ROLE_OPTIONS));
  const [editorErrors, setEditorErrors] = useState<EmployeeEditorErrors>({});
  const [editorError, setEditorError] = useState('');
  const [isSavingEmployee, setIsSavingEmployee] = useState(false);

  const [deleteCandidate, setDeleteCandidate] = useState<AdminUser | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const [passwordCandidate, setPasswordCandidate] = useState<AdminUser | null>(null);
  const [passwordValues, setPasswordValues] = useState<PasswordValues>({ password: '', passwordConfirm: '' });
  const [passwordErrors, setPasswordErrors] = useState<PasswordErrors>({});
  const [passwordError, setPasswordError] = useState('');
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  const roleOptions = roles.length ? roles : DEFAULT_ROLE_OPTIONS;
  const roleNameByCode = useMemo(() => new Map(roleOptions.map((role) => [role.code, role.name])), [roleOptions]);

  const loadEmployees = async ({ showInitialLoader = false }: { showInitialLoader?: boolean } = {}) => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    if (showInitialLoader) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    setErrorMessage('');

    const [usersResult, rolesResult] = await Promise.all([getAdminUsers(), getAdminRoles()]);

    if (requestId !== requestIdRef.current) {
      return;
    }

    setUsers(sortAdminUsers(usersResult.users));
    setRoles(rolesResult.roles.length ? rolesResult.roles : DEFAULT_ROLE_OPTIONS);
    setErrorMessage([usersResult.error, rolesResult.error].filter(Boolean).join(' '));
    setIsLoading(false);
    setIsRefreshing(false);
  };

  useEffect(() => {
    void loadEmployees({
      showInitialLoader: true,
    });
  }, []);

  const activeCount = useMemo(() => users.filter((user) => user.active).length, [users]);
  const inactiveCount = users.length - activeCount;
  const visibleUsers = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return users.filter((user) => {
      if (activityFilter === 'active' && !user.active) {
        return false;
      }

      if (activityFilter === 'inactive' && user.active) {
        return false;
      }

      if (roleFilter !== 'ALL' && user.role !== roleFilter) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const searchFields = [user.login, user.id, roleNameByCode.get(user.role) ?? getAdminRoleLabel(user.role), user.role]
        .join(' ')
        .toLowerCase();

      return searchFields.includes(normalizedQuery);
    });
  }, [activityFilter, roleFilter, roleNameByCode, searchQuery, users]);

  const statusText = isLoading
    ? 'Загрузка сотрудников...'
    : `${visibleUsers.length} из ${users.length} сотрудников • активных ${activeCount}${inactiveCount ? ` • отключенных ${inactiveCount}` : ''}`;

  const resultsMeta = visibleUsers.length
    ? `Показано ${visibleUsers.length} записей. Поиск работает по логину, роли и id сотрудника.`
    : searchQuery.trim() || roleFilter !== 'ALL'
      ? 'По текущим фильтрам сотрудники не найдены.'
      : activityFilter === 'active'
        ? 'Активных сотрудников нет. Переключитесь на режим «Все», чтобы проверить отключенные записи.'
        : 'Список сотрудников пуст.';

  const openCreateEditor = () => {
    setEditorMode('create');
    setEditingUser(null);
    setEditorValues(createEmptyEditorValues(roleOptions));
    setEditorErrors({});
    setEditorError('');
    setActionError('');
    setActionMessage('');
    setIsEditorOpen(true);
  };

  const openEditEditor = (user: AdminUser) => {
    setEditorMode('edit');
    setEditingUser(user);
    setEditorValues(createEditorValuesFromUser(user));
    setEditorErrors({});
    setEditorError('');
    setActionError('');
    setActionMessage('');
    setIsEditorOpen(true);
  };

  const openPasswordDialog = (user: AdminUser) => {
    if (user.id === currentAdminId) {
      setActionError('Для собственного пароля используйте действие «Сменить пароль» в сайдбаре.');
      return;
    }

    setPasswordCandidate(user);
    setPasswordValues({ password: '', passwordConfirm: '' });
    setPasswordErrors({});
    setPasswordError('');
  };

  const openDeleteDialog = (user: AdminUser) => {
    if (user.id === currentAdminId) {
      setActionError('Нельзя удалить текущего пользователя из собственной сессии.');
      return;
    }

    setDeleteCandidate(user);
    setDeleteError('');
  };

  const handleEditorValueChange = <TKey extends keyof EmployeeEditorValues>(key: TKey, value: EmployeeEditorValues[TKey]) => {
    setEditorValues((currentValues) => ({
      ...currentValues,
      [key]: value,
    }));
    setEditorErrors((currentErrors) => ({
      ...currentErrors,
      [key]: undefined,
    }));
    setEditorError('');
  };

  const handlePasswordValueChange = <TKey extends keyof PasswordValues>(key: TKey, value: PasswordValues[TKey]) => {
    setPasswordValues((currentValues) => ({
      ...currentValues,
      [key]: value,
    }));
    setPasswordErrors((currentErrors) => ({
      ...currentErrors,
      [key]: undefined,
    }));
    setPasswordError('');
  };

  const handleEditorSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors = validateEmployeeEditor(editorValues, editorMode);

    if (Object.keys(nextErrors).length) {
      setEditorErrors(nextErrors);
      return;
    }

    setIsSavingEmployee(true);
    setEditorError('');
    setActionError('');
    setActionMessage('');

    if (editorMode === 'create') {
      const result = await createAdminUser({
        active: editorValues.active,
        login: editorValues.login.trim(),
        password: editorValues.password,
        role: editorValues.role,
      });

      setIsSavingEmployee(false);

      if (!result.user || result.error) {
        setEditorError(result.error ?? 'Не удалось добавить сотрудника.');
        return;
      }

      setUsers((currentUsers) => sortAdminUsers([result.user as AdminUser, ...currentUsers.filter((user) => user.id !== result.user?.id)]));
      setActionMessage(`Сотрудник ${result.user.login} добавлен.`);
      setIsEditorOpen(false);
      return;
    }

    if (!editingUser) {
      setIsSavingEmployee(false);
      setEditorError('Не удалось определить сотрудника для сохранения.');
      return;
    }

    const isCurrentUser = editingUser.id === currentAdminId;
    const result = await updateAdminUser(editingUser.id, {
      active: isCurrentUser ? editingUser.active : editorValues.active,
      login: editorValues.login.trim(),
      role: isCurrentUser ? editingUser.role : editorValues.role,
    });

    setIsSavingEmployee(false);

    if (!result.user || result.error) {
      setEditorError(result.error ?? 'Не удалось сохранить сотрудника.');
      return;
    }

    setUsers((currentUsers) =>
      sortAdminUsers(currentUsers.map((user) => (user.id === result.user?.id ? (result.user as AdminUser) : user))),
    );
    setActionMessage(`Сотрудник ${result.user.login} сохранен.`);
    setIsEditorOpen(false);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteCandidate) {
      return;
    }

    setIsDeleting(true);
    setDeleteError('');
    setActionError('');
    setActionMessage('');

    const result = await deleteAdminUser(deleteCandidate.id);

    setIsDeleting(false);

    if (result.error) {
      setDeleteError(result.error);
      return;
    }

    const deletedAt = new Date().toISOString();
    setUsers((currentUsers) =>
      sortAdminUsers(
        currentUsers.map((user) =>
          user.id === deleteCandidate.id
            ? {
                ...user,
                active: false,
                updatedAt: deletedAt,
              }
            : user,
        ),
      ),
    );
    setActionMessage(`Сотрудник ${deleteCandidate.login} удален.`);
    setDeleteCandidate(null);
  };

  const handleResetPasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!passwordCandidate) {
      return;
    }

    const nextErrors = validatePassword(passwordValues);

    if (Object.keys(nextErrors).length) {
      setPasswordErrors(nextErrors);
      return;
    }

    setIsResettingPassword(true);
    setPasswordError('');
    setActionError('');
    setActionMessage('');

    const result = await resetAdminUserPassword(passwordCandidate.id, passwordValues.password);

    setIsResettingPassword(false);

    if (result.error) {
      setPasswordError(result.error);
      return;
    }

    setActionMessage(`Пароль сотрудника ${passwordCandidate.login} изменен. Его активные сессии будут отозваны backend API.`);
    setPasswordCandidate(null);
  };

  const columns = useMemo<ColumnDef<AdminUser>[]>(
    () => [
      {
        id: 'login',
        header: 'Сотрудник',
        cell: ({ row }) => (
          <div className="min-w-[12rem]">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium text-foreground">{row.original.login}</p>
              {row.original.id === currentAdminId ? (
                <Badge variant="outline" className="h-auto rounded-full px-2 py-0.5 text-[0.68rem]">
                  Это вы
                </Badge>
              ) : null}
            </div>
            <p className="mt-1 font-mono text-xs text-muted-foreground">#{row.original.id.slice(0, 8)}</p>
          </div>
        ),
      },
      {
        id: 'role',
        header: 'Роль',
        cell: ({ row }) => (
          <div className="min-w-[10rem]">
            <p className="font-medium text-foreground">{roleNameByCode.get(row.original.role) ?? getAdminRoleLabel(row.original.role)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{row.original.role}</p>
          </div>
        ),
      },
      {
        id: 'status',
        header: 'Статус',
        cell: ({ row }) => getStatusBadge(row.original),
      },
      {
        id: 'updated',
        header: 'Обновлен',
        cell: ({ row }) => (
          <div className="min-w-[10rem]">
            <p className="font-medium text-foreground">{formatAdminUserDateTime(row.original.updatedAt)}</p>
            <p className="mt-1 text-xs text-muted-foreground">Создан {formatAdminUserDateTime(row.original.createdAt)}</p>
          </div>
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const isCurrentUser = row.original.id === currentAdminId;

          return (
            <div className="flex min-w-[12rem] flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-xl bg-background/80"
                onClick={(event) => {
                  event.stopPropagation();
                  openEditEditor(row.original);
                }}
              >
                <PencilIcon />
                Изменить
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                className="rounded-xl bg-background/80"
                disabled={isCurrentUser}
                title={isCurrentUser ? 'Собственный пароль меняется в сайдбаре' : 'Сменить пароль сотрудника'}
                onClick={(event) => {
                  event.stopPropagation();
                  openPasswordDialog(row.original);
                }}
              >
                <KeyRoundIcon />
                <span className="sr-only">Сменить пароль</span>
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="icon-sm"
                className="rounded-xl"
                disabled={isCurrentUser}
                title={isCurrentUser ? 'Нельзя удалить текущего пользователя' : 'Удалить сотрудника'}
                onClick={(event) => {
                  event.stopPropagation();
                  openDeleteDialog(row.original);
                }}
              >
                <Trash2Icon />
                <span className="sr-only">Удалить сотрудника</span>
              </Button>
            </div>
          );
        },
        meta: {
          headerClassName: 'text-right',
          cellClassName: 'text-right',
        },
      },
    ],
    [currentAdminId, roleNameByCode],
  );

  const isEditingCurrentUser = editingUser?.id === currentAdminId;

  return (
    <AdminPage>
      <AdminPageHeader
        kicker="Управление"
        title="Сотрудники"
        description="Список администраторов с быстрым созданием, редактированием, отключением и сменой пароля без перехода между экранами."
        actions={
          <>
            <AdminPageStatus>{statusText}</AdminPageStatus>
            <Button type="button" size="lg" className="rounded-xl shadow-sm" onClick={openCreateEditor}>
              <PlusIcon />
              Новый сотрудник
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="rounded-xl bg-card/80 shadow-sm"
              onClick={() => void loadEmployees()}
              disabled={isLoading || isRefreshing}
            >
              <RefreshCcwIcon className={cn('size-4', isRefreshing && 'animate-spin')} />
              {isRefreshing ? 'Обновление...' : 'Обновить'}
            </Button>
          </>
        }
      />

      {actionMessage ? <AdminNotice role="status">{actionMessage}</AdminNotice> : null}
      {actionError ? (
        <AdminNotice tone="destructive" role="alert">
          {actionError}
        </AdminNotice>
      ) : null}

      <AdminSectionCard
        aria-label="Список сотрудников"
        eyebrow="Доступ"
        title="Администраторы панели"
        description="Удаление отключает сотрудника и отзывает его сессии. Сброс пароля также завершает активные сессии выбранного сотрудника."
      >
        <div className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[auto_minmax(12rem,16rem)_minmax(18rem,22rem)] xl:items-end xl:justify-between">
            <SegmentedControl
              ariaLabel="Фильтр активности сотрудников"
              onValueChange={setActivityFilter}
              options={[
                { label: 'Активные', value: 'active', hint: activeCount },
                { label: 'Все', value: 'all', hint: users.length },
                { label: 'Отключенные', value: 'inactive', hint: inactiveCount },
              ]}
              value={activityFilter}
            />

            <FormField htmlFor="employees-role-filter" label="Роль">
              <select
                id="employees-role-filter"
                className={nativeFieldClassName}
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value as AdminRole | 'ALL')}
              >
                <option value="ALL">Все роли</option>
                {roleOptions.map((role) => (
                  <option key={role.code} value={role.code}>
                    {role.name}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField className="min-w-0" htmlFor="employees-search" label="Поиск">
              <div className="relative">
                <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="employees-search"
                  type="search"
                  className="h-11 rounded-xl bg-background/80 pl-10 shadow-sm"
                  placeholder="Логин, роль или id"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
              </div>
            </FormField>
          </div>

          <p className="text-sm text-muted-foreground">{resultsMeta}</p>
        </div>

        {errorMessage ? (
          <AdminNotice tone="destructive" role="alert">
            {errorMessage}
          </AdminNotice>
        ) : null}

        {isLoading ? (
          <AdminEmptyState title="Загрузка сотрудников" description="Получаем сотрудников и справочник ролей из admin API." />
        ) : visibleUsers.length ? (
          <DataTable
            columns={columns}
            data={visibleUsers}
            getRowId={(user) => user.id}
            wrapperClassName="overflow-x-auto rounded-[1.5rem] border border-border/70 bg-card/80"
            tableClassName="w-full min-w-[760px] text-left text-sm"
            headerRowClassName="border-b border-border/70 bg-muted/45 text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase"
            bodyRowClassName="border-b border-border/60 last:border-b-0"
            getCellClassName={() => 'px-4 py-3 align-top'}
            getHeaderClassName={() => 'px-4 py-3 align-bottom'}
            getRowProps={(row) => ({
              className: 'cursor-pointer transition hover:bg-muted/35',
              onClick: () => openEditEditor(row.original),
            })}
          />
        ) : (
          <AdminEmptyState
            title={users.length ? 'Сотрудники не найдены' : 'Сотрудников нет'}
            description={
              users.length
                ? 'Измените поисковый запрос, роль или фильтр активности.'
                : 'Добавьте первого сотрудника, чтобы выдать доступ к панели управления.'
            }
          />
        )}
      </AdminSectionCard>

      <Sheet
        open={isEditorOpen}
        onOpenChange={(nextOpen) => {
          if (isSavingEmployee) {
            return;
          }

          setIsEditorOpen(nextOpen);
        }}
      >
        <SheetContent side="right" className="w-[min(100vw,40rem)] max-w-[100vw] overflow-y-auto p-0 sm:max-w-xl">
          <form className="flex min-h-full flex-col" onSubmit={handleEditorSubmit} noValidate>
            <SheetHeader className="border-b border-border/70 px-5 py-5">
              <SheetTitle>{editorMode === 'create' ? 'Новый сотрудник' : 'Редактирование сотрудника'}</SheetTitle>
              <SheetDescription>
                {editorMode === 'create'
                  ? 'Создайте учетную запись и передайте временный пароль сотруднику.'
                  : 'Измените логин, роль или доступ сотрудника.'}
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 space-y-5 px-5 py-5">
              <FormField error={editorErrors.login} htmlFor="employee-login" label="Логин">
                <Input
                  id="employee-login"
                  className="h-11 rounded-xl bg-background/80 shadow-sm"
                  value={editorValues.login}
                  disabled={isSavingEmployee}
                  autoComplete="username"
                  onChange={(event) => handleEditorValueChange('login', event.target.value)}
                  aria-invalid={Boolean(editorErrors.login)}
                  aria-describedby={editorErrors.login ? 'employee-login-error' : undefined}
                />
              </FormField>

              <FormField htmlFor="employee-role" label="Роль">
                <select
                  id="employee-role"
                  className={nativeFieldClassName}
                  value={editorValues.role}
                  disabled={isSavingEmployee || isEditingCurrentUser}
                  onChange={(event) => handleEditorValueChange('role', event.target.value as AdminRole)}
                >
                  {roleOptions.map((role) => (
                    <option key={role.code} value={role.code}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </FormField>

              <label className="flex items-start gap-3 rounded-2xl border border-border/70 bg-muted/25 px-4 py-3">
                <input
                  type="checkbox"
                  className={cn(checkboxInputClassName, 'mt-0.5')}
                  checked={editorValues.active}
                  disabled={isSavingEmployee || isEditingCurrentUser}
                  onChange={(event) => handleEditorValueChange('active', event.target.checked)}
                />
                <span>
                  <span className="block text-sm font-medium text-foreground">Активный доступ</span>
                  <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                    Отключенный сотрудник не сможет работать в панели.
                  </span>
                </span>
              </label>

              {isEditingCurrentUser ? (
                <AdminNotice>
                  Роль и активность текущего пользователя не меняются из этого раздела, чтобы не потерять доступ к панели.
                </AdminNotice>
              ) : null}

              {editorMode === 'create' ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField error={editorErrors.password} htmlFor="employee-password" label="Временный пароль">
                    <Input
                      id="employee-password"
                      type="password"
                      className="h-11 rounded-xl bg-background/80 shadow-sm"
                      value={editorValues.password}
                      disabled={isSavingEmployee}
                      autoComplete="new-password"
                      onChange={(event) => handleEditorValueChange('password', event.target.value)}
                      aria-invalid={Boolean(editorErrors.password)}
                      aria-describedby={editorErrors.password ? 'employee-password-error' : undefined}
                    />
                  </FormField>

                  <FormField error={editorErrors.passwordConfirm} htmlFor="employee-password-confirm" label="Повтор пароля">
                    <Input
                      id="employee-password-confirm"
                      type="password"
                      className="h-11 rounded-xl bg-background/80 shadow-sm"
                      value={editorValues.passwordConfirm}
                      disabled={isSavingEmployee}
                      autoComplete="new-password"
                      onChange={(event) => handleEditorValueChange('passwordConfirm', event.target.value)}
                      aria-invalid={Boolean(editorErrors.passwordConfirm)}
                      aria-describedby={editorErrors.passwordConfirm ? 'employee-password-confirm-error' : undefined}
                    />
                  </FormField>
                </div>
              ) : null}

              {editorError ? (
                <AdminNotice tone="destructive" role="alert">
                  {editorError}
                </AdminNotice>
              ) : null}
            </div>

            <SheetFooter className="border-t border-border/70 bg-muted/35 px-5 py-4">
              {editorMode === 'edit' && editingUser ? (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl bg-background/80"
                    disabled={isSavingEmployee || isEditingCurrentUser}
                    onClick={() => openPasswordDialog(editingUser)}
                  >
                    <KeyRoundIcon />
                    Сменить пароль
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    className="rounded-xl"
                    disabled={isSavingEmployee || isEditingCurrentUser}
                    onClick={() => openDeleteDialog(editingUser)}
                  >
                    <Trash2Icon />
                    Удалить
                  </Button>
                </div>
              ) : null}
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl bg-background/80"
                  disabled={isSavingEmployee}
                  onClick={() => setIsEditorOpen(false)}
                >
                  Отмена
                </Button>
                <Button type="submit" className="rounded-xl" disabled={isSavingEmployee}>
                  {isSavingEmployee ? 'Сохранение...' : editorMode === 'create' ? 'Добавить сотрудника' : 'Сохранить'}
                </Button>
              </div>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <Dialog
        open={Boolean(deleteCandidate)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && !isDeleting) {
            setDeleteCandidate(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Удалить сотрудника?</DialogTitle>
            <DialogDescription>
              {deleteCandidate
                ? `Сотрудник ${deleteCandidate.login} будет отключен, а его активные сессии будут отозваны.`
                : 'Сотрудник будет отключен.'}
            </DialogDescription>
          </DialogHeader>

          {deleteError ? (
            <AdminNotice tone="destructive" role="alert">
              {deleteError}
            </AdminNotice>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isDeleting}
              onClick={() => setDeleteCandidate(null)}
            >
              Отмена
            </Button>
            <Button type="button" variant="destructive" disabled={isDeleting} onClick={handleDeleteConfirm}>
              {isDeleting ? 'Удаление...' : 'Удалить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(passwordCandidate)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && !isResettingPassword) {
            setPasswordCandidate(null);
          }
        }}
      >
        <DialogContent>
          <form className="grid gap-4" onSubmit={handleResetPasswordSubmit} noValidate>
            <DialogHeader>
              <DialogTitle>Сменить пароль</DialogTitle>
              <DialogDescription>
                {passwordCandidate
                  ? `Задайте новый пароль для ${passwordCandidate.login}. После сохранения активные сессии сотрудника будут отозваны.`
                  : 'Задайте новый пароль сотрудника.'}
              </DialogDescription>
            </DialogHeader>

            <FormField error={passwordErrors.password} htmlFor="employee-reset-password" label="Новый пароль">
              <Input
                id="employee-reset-password"
                type="password"
                className="h-11 rounded-xl bg-background/80 shadow-sm"
                value={passwordValues.password}
                disabled={isResettingPassword}
                autoComplete="new-password"
                onChange={(event) => handlePasswordValueChange('password', event.target.value)}
                aria-invalid={Boolean(passwordErrors.password)}
                aria-describedby={passwordErrors.password ? 'employee-reset-password-error' : undefined}
              />
            </FormField>

            <FormField error={passwordErrors.passwordConfirm} htmlFor="employee-reset-password-confirm" label="Повтор пароля">
              <Input
                id="employee-reset-password-confirm"
                type="password"
                className="h-11 rounded-xl bg-background/80 shadow-sm"
                value={passwordValues.passwordConfirm}
                disabled={isResettingPassword}
                autoComplete="new-password"
                onChange={(event) => handlePasswordValueChange('passwordConfirm', event.target.value)}
                aria-invalid={Boolean(passwordErrors.passwordConfirm)}
                aria-describedby={passwordErrors.passwordConfirm ? 'employee-reset-password-confirm-error' : undefined}
              />
            </FormField>

            {passwordError ? (
              <AdminNotice tone="destructive" role="alert">
                {passwordError}
              </AdminNotice>
            ) : null}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={isResettingPassword}
                onClick={() => setPasswordCandidate(null)}
              >
                Отмена
              </Button>
              <Button type="submit" disabled={isResettingPassword}>
                {isResettingPassword ? 'Сохранение...' : 'Сменить пароль'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AdminPage>
  );
}
