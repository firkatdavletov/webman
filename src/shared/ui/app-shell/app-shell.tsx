import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { LogOutIcon, PanelLeftIcon } from 'lucide-react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { logout } from '@/entities/session';
import { cn } from '@/shared/lib/cn';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/shared/ui/sheet';
import { appNavigationItems } from '@/shared/ui/app-shell/navigation';

type AppShellProps = {
  children: ReactNode;
};

type AppNavigationProps = {
  onNavigate?: () => void;
};

function AppNavigation({ onNavigate }: AppNavigationProps) {
  const navigationGroups = useMemo(() => {
    const groups = new Map<string, typeof appNavigationItems>();

    appNavigationItems.forEach((item) => {
      const items = groups.get(item.group);

      if (items) {
        items.push(item);
        return;
      }

      groups.set(item.group, [item]);
    });

    return Array.from(groups.entries());
  }, []);

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
  onLogout: () => void;
  onNavigate?: () => void;
};

function ShellSidebar({ onLogout, onNavigate }: ShellSidebarProps) {
  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="border-b border-sidebar-border px-5 py-5">
        <Badge className="mb-4 rounded-full bg-sidebar-primary px-3 py-1 text-sidebar-primary-foreground hover:bg-sidebar-primary">
          Webman CMS
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
          <p className="text-[0.68rem] font-semibold tracking-[0.2em] text-sidebar-foreground/45 uppercase">Workspace</p>
          <p className="mt-1 text-sm font-medium text-sidebar-foreground">Admin web app</p>
        </div>
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

export function AppShell({ children }: AppShellProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isNavigationOpen, setIsNavigationOpen] = useState(false);
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
              <ShellSidebar onLogout={handleLogout} />
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
          <ShellSidebar onLogout={handleLogout} onNavigate={() => setIsNavigationOpen(false)} />
        </SheetContent>
      </Sheet>
    </div>
  );
}
