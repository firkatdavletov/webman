import { type ReactNode, useEffect, useState } from 'react';
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
  return (
    <nav className="grid gap-1.5" aria-label="Основная навигация">
      {appNavigationItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground/72 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
              isActive && 'bg-sidebar-accent text-sidebar-accent-foreground shadow-sm',
            )
          }
        >
          <span>{item.label}</span>
          <span className="size-2 rounded-full bg-current/30" aria-hidden="true" />
        </NavLink>
      ))}
    </nav>
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
        <Badge className="mb-4 bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary">
          Webman CMS
        </Badge>
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">Панель управления</h1>
          <p className="text-sm text-sidebar-foreground/70">Каталог, заказы и контент интернет-магазина.</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        <AppNavigation onNavigate={onNavigate} />
      </div>

      <div className="border-t border-sidebar-border p-3">
        <Button
          type="button"
          variant="secondary"
          className="w-full justify-center bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent/85"
          onClick={onLogout}
        >
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
              <Button type="button" variant="outline" size="sm" onClick={() => setIsNavigationOpen(true)}>
                Меню
              </Button>
              <Badge variant="secondary">Webman CMS</Badge>
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
