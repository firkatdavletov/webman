import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from 'react';
import { KeyRoundIcon, LogOutIcon, PanelLeftIcon } from 'lucide-react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { changeOwnPassword, getCurrentAdminRole, logout } from '@/entities/session';
import { cn } from '@/shared/lib/cn';
import { AdminNotice } from '@/shared/ui/admin-page';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { FormField } from '@/shared/ui/form-field';
import { Input } from '@/shared/ui/input';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/shared/ui/sheet';
import { appNavigationItems } from '@/shared/ui/app-shell/navigation';

type AppShellProps = {
  children: ReactNode;
};

type PasswordFormValues = {
  currentPassword: string;
  newPassword: string;
  newPasswordConfirm: string;
};

type PasswordFormErrors = Partial<Record<keyof PasswordFormValues, string>>;

const emptyPasswordFormValues: PasswordFormValues = {
  currentPassword: '',
  newPassword: '',
  newPasswordConfirm: '',
};

const ADMIN_ROLE_LABELS: Record<string, string> = {
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

function getRoleLabel(role: string | null): string {
  if (!role) {
    return 'Аккаунт';
  }

  return ADMIN_ROLE_LABELS[role] ?? role;
}

function validatePasswordForm(values: PasswordFormValues): PasswordFormErrors {
  const errors: PasswordFormErrors = {};

  if (!values.currentPassword) {
    errors.currentPassword = 'Укажите текущий пароль.';
  }

  if (!values.newPassword) {
    errors.newPassword = 'Укажите новый пароль.';
  } else if (values.newPassword.length < 8) {
    errors.newPassword = 'Пароль должен быть не короче 8 символов.';
  } else if (values.currentPassword && values.currentPassword === values.newPassword) {
    errors.newPassword = 'Новый пароль должен отличаться от текущего.';
  }

  if (values.newPassword !== values.newPasswordConfirm) {
    errors.newPasswordConfirm = 'Пароли не совпадают.';
  }

  return errors;
}

type AppNavigationProps = {
  onNavigate?: () => void;
};

function AppNavigation({ onNavigate }: AppNavigationProps) {
  const currentRole = getCurrentAdminRole();
  const navigationGroups = useMemo(() => {
    const groups = new Map<string, typeof appNavigationItems>();

    appNavigationItems
      .filter((item) => !item.requiredRole || item.requiredRole === currentRole)
      .forEach((item) => {
        const items = groups.get(item.group);

        if (items) {
          items.push(item);
          return;
        }

        groups.set(item.group, [item]);
      });

    return Array.from(groups.entries());
  }, [currentRole]);

  return (
    <div className="space-y-5">
      {navigationGroups.map(([groupLabel, items]) => (
        <section key={groupLabel} className="space-y-2.5" aria-label={groupLabel}>
          <p className="px-3 text-[0.68rem] font-semibold tracking-[0.22em] text-sidebar-foreground/45 uppercase">{groupLabel}</p>
          <nav className="grid gap-1.5" aria-label={`${groupLabel} navigation`}>
            {items.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(
                      'group flex items-center gap-3 rounded-2xl border border-transparent px-3 py-2.5 text-sm font-medium text-sidebar-foreground/72 transition-all hover:border-sidebar-border hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground',
                      isActive && 'border-sidebar-border bg-sidebar-primary/16 text-sidebar-foreground shadow-[0_10px_24px_rgba(0,0,0,0.18)]',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span
                        className={cn(
                          'flex size-9 items-center justify-center rounded-xl border border-sidebar-border bg-sidebar-accent/65 text-sidebar-foreground/65 transition-all',
                          isActive && 'border-sidebar-border bg-sidebar-primary/22 text-sidebar-foreground',
                        )}
                      >
                        <Icon className="size-4" />
                      </span>
                      <span className="flex-1">{item.label}</span>
                      <span
                        className={cn(
                          'size-2 rounded-full bg-current/20 transition-all',
                          isActive && 'scale-110 bg-sidebar-foreground/80',
                        )}
                        aria-hidden="true"
                      />
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </section>
      ))}
    </div>
  );
}

type ShellSidebarProps = {
  onChangePassword: () => void;
  onLogout: () => void;
  onNavigate?: () => void;
};

function ShellSidebar({ onChangePassword, onLogout, onNavigate }: ShellSidebarProps) {
  const currentRole = getCurrentAdminRole();

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="border-b border-sidebar-border px-5 py-5">
        <Badge className="mb-4 rounded-full bg-sidebar-primary px-3 py-1 text-sidebar-primary-foreground hover:bg-sidebar-primary">
          Storeva Панель управления
        </Badge>
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">Панель управления</h1>
          <p className="text-sm leading-6 text-sidebar-foreground/70">Каталог, заказы и контент интернет-магазина.</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        <AppNavigation onNavigate={onNavigate} />
      </div>

      <div className="space-y-3 border-t border-sidebar-border p-3">
        <div className="rounded-2xl border border-sidebar-border bg-sidebar-accent/70 p-3">
          <p className="text-[0.68rem] font-semibold tracking-[0.2em] text-sidebar-foreground/45 uppercase">Storeva</p>
          <p className="mt-1 text-sm font-medium text-sidebar-foreground">{getRoleLabel(currentRole)}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="h-10 w-full justify-center rounded-xl border-sidebar-border bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent/85"
          onClick={onChangePassword}
        >
          <KeyRoundIcon />
          Сменить пароль
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="h-10 w-full justify-center rounded-xl bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent/85"
          onClick={onLogout}
        >
          <LogOutIcon />
          Выйти
        </Button>
      </div>
    </div>
  );
}

type ChangePasswordDialogProps = {
  open: boolean;
  onChanged: () => void;
  onOpenChange: (open: boolean) => void;
};

function ChangePasswordDialog({ open, onChanged, onOpenChange }: ChangePasswordDialogProps) {
  const [values, setValues] = useState<PasswordFormValues>(emptyPasswordFormValues);
  const [errors, setErrors] = useState<PasswordFormErrors>({});
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    setValues(emptyPasswordFormValues);
    setErrors({});
    setSubmitError('');
    setIsSubmitting(false);
  }, [open]);

  const handleValueChange = <TKey extends keyof PasswordFormValues>(key: TKey, value: PasswordFormValues[TKey]) => {
    setValues((currentValues) => ({
      ...currentValues,
      [key]: value,
    }));
    setErrors((currentErrors) => ({
      ...currentErrors,
      [key]: undefined,
    }));
    setSubmitError('');
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors = validatePasswordForm(values);

    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');

    const result = await changeOwnPassword(values.currentPassword, values.newPassword);

    setIsSubmitting(false);

    if (!result.changed || result.error) {
      setSubmitError(result.error ?? 'Не удалось изменить пароль.');
      return;
    }

    onChanged();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (isSubmitting) {
          return;
        }

        onOpenChange(nextOpen);
      }}
    >
      <DialogContent>
        <form className="grid gap-4" onSubmit={handleSubmit} noValidate>
          <DialogHeader>
            <DialogTitle>Сменить пароль</DialogTitle>
            <DialogDescription>После смены пароля активные сессии будут отозваны, и потребуется войти заново.</DialogDescription>
          </DialogHeader>

          <FormField error={errors.currentPassword} htmlFor="own-current-password" label="Текущий пароль">
            <Input
              id="own-current-password"
              type="password"
              className="h-11 rounded-xl bg-background/80 shadow-sm"
              value={values.currentPassword}
              disabled={isSubmitting}
              autoComplete="current-password"
              onChange={(event) => handleValueChange('currentPassword', event.target.value)}
              aria-invalid={Boolean(errors.currentPassword)}
              aria-describedby={errors.currentPassword ? 'own-current-password-error' : undefined}
            />
          </FormField>

          <FormField error={errors.newPassword} htmlFor="own-new-password" label="Новый пароль">
            <Input
              id="own-new-password"
              type="password"
              className="h-11 rounded-xl bg-background/80 shadow-sm"
              value={values.newPassword}
              disabled={isSubmitting}
              autoComplete="new-password"
              onChange={(event) => handleValueChange('newPassword', event.target.value)}
              aria-invalid={Boolean(errors.newPassword)}
              aria-describedby={errors.newPassword ? 'own-new-password-error' : undefined}
            />
          </FormField>

          <FormField error={errors.newPasswordConfirm} htmlFor="own-new-password-confirm" label="Повтор нового пароля">
            <Input
              id="own-new-password-confirm"
              type="password"
              className="h-11 rounded-xl bg-background/80 shadow-sm"
              value={values.newPasswordConfirm}
              disabled={isSubmitting}
              autoComplete="new-password"
              onChange={(event) => handleValueChange('newPasswordConfirm', event.target.value)}
              aria-invalid={Boolean(errors.newPasswordConfirm)}
              aria-describedby={errors.newPasswordConfirm ? 'own-new-password-confirm-error' : undefined}
            />
          </FormField>

          {submitError ? (
            <AdminNotice tone="destructive" role="alert">
              {submitError}
            </AdminNotice>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Сохранение...' : 'Сменить пароль'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AppShell({ children }: AppShellProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isNavigationOpen, setIsNavigationOpen] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const currentSection = useMemo(
    () =>
      appNavigationItems.find(({ to }) => location.pathname === to || location.pathname.startsWith(`${to}/`))?.label ?? 'Панель управления',
    [location.pathname],
  );

  useEffect(() => {
    setIsNavigationOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      <Sheet open={isNavigationOpen} onOpenChange={setIsNavigationOpen}>
        <div className="grid min-h-screen md:grid-cols-[18rem_minmax(0,1fr)]">
          <aside className="hidden border-r border-sidebar-border md:block">
            <div className="sticky top-0 h-screen">
              <ShellSidebar onChangePassword={() => setIsPasswordDialogOpen(true)} onLogout={handleLogout} />
            </div>
          </aside>

          <div className="min-w-0">
            <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border/70 bg-background/92 px-4 py-3 backdrop-blur md:hidden">
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="rounded-xl bg-card/80 shadow-sm"
                onClick={() => setIsNavigationOpen(true)}
              >
                <PanelLeftIcon />
                Меню
              </Button>
              <div className="text-right">
                <p className="text-[0.68rem] font-semibold tracking-[0.18em] text-primary uppercase">Webman CMS</p>
                <p className="text-sm font-medium text-foreground">{currentSection}</p>
              </div>
            </header>

            <div className="min-w-0">{children}</div>
          </div>
        </div>

        <SheetContent
          side="left"
          className="w-[320px] max-w-[85vw] border-r border-sidebar-border bg-sidebar p-0 text-sidebar-foreground"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Навигация</SheetTitle>
            <SheetDescription>Основные разделы административной панели.</SheetDescription>
          </SheetHeader>
          <ShellSidebar
            onChangePassword={() => setIsPasswordDialogOpen(true)}
            onLogout={handleLogout}
            onNavigate={() => setIsNavigationOpen(false)}
          />
        </SheetContent>
      </Sheet>

      <ChangePasswordDialog
        open={isPasswordDialogOpen}
        onOpenChange={setIsPasswordDialogOpen}
        onChanged={() => {
          setIsPasswordDialogOpen(false);
          navigate('/login', {
            replace: true,
            state: {
              notice: 'Пароль изменен. Войдите заново с новым паролем.',
            },
          });
        }}
      />
    </div>
  );
}
