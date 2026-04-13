import { useEffect, useMemo, useRef, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowRightIcon,
  Clock3Icon,
  ImageOffIcon,
  LayoutDashboardIcon,
  RefreshCcwIcon,
  ShoppingBasketIcon,
  ShoppingCartIcon,
  TriangleAlertIcon,
  WalletIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  formatDashboardCount,
  formatDashboardGeneratedAt,
  getAdminDashboard,
  type AdminDashboard,
} from '@/entities/dashboard';
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  buttonVariants,
} from '@/shared/ui';

type LoadDashboardOptions = {
  showInitialLoader?: boolean;
};

type MetricTone = 'default' | 'success' | 'warning' | 'destructive';

type DashboardMetricCardProps = {
  title: string;
  value: string;
  description: string;
  icon: LucideIcon;
  href?: string;
  ctaLabel?: string;
  tone?: MetricTone;
  children?: React.ReactNode;
};

const metricToneStyles: Record<MetricTone, { card: string; icon: string; cta: string }> = {
  default: {
    card: 'border-border/70 bg-card/95',
    icon: 'border-slate-200/80 bg-slate-100 text-slate-700',
    cta: 'text-foreground/75',
  },
  success: {
    card: 'border-emerald-200/70 bg-[linear-gradient(180deg,rgba(236,253,245,0.88),rgba(255,255,255,0.97))]',
    icon: 'border-emerald-200 bg-emerald-100 text-emerald-700',
    cta: 'text-emerald-900/80',
  },
  warning: {
    card: 'border-amber-200/75 bg-[linear-gradient(180deg,rgba(255,251,235,0.9),rgba(255,255,255,0.97))]',
    icon: 'border-amber-200 bg-amber-100 text-amber-700',
    cta: 'text-amber-900/80',
  },
  destructive: {
    card: 'border-rose-200/75 bg-[linear-gradient(180deg,rgba(255,241,242,0.9),rgba(255,255,255,0.97))]',
    icon: 'border-rose-200 bg-rose-100 text-rose-700',
    cta: 'text-rose-900/80',
  },
};

function DashboardMetricCard({
  title,
  value,
  description,
  icon: Icon,
  href,
  ctaLabel = 'Открыть раздел',
  tone = 'default',
  children,
}: DashboardMetricCardProps) {
  const styles = metricToneStyles[tone];

  const content = (
    <Card
      className={cn(
        'h-full rounded-[1.5rem] py-0 shadow-[0_18px_48px_rgba(12,35,39,0.06)] ring-0 transition-transform duration-200',
        href && 'hover:-translate-y-0.5',
        styles.card,
      )}
    >
      <CardHeader className="gap-3 border-b border-black/5 px-5 py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <CardDescription className="text-[0.72rem] font-semibold tracking-[0.18em] uppercase text-muted-foreground">
              {title}
            </CardDescription>
            <CardTitle className="text-4xl font-semibold tracking-tight text-foreground">{value}</CardTitle>
          </div>
          <span className={cn('flex size-11 shrink-0 items-center justify-center rounded-2xl border', styles.icon)}>
            <Icon className="size-5" />
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 px-5 py-4">
        <p className="text-sm leading-6 text-muted-foreground">{description}</p>
        {children}
        {href ? (
          <div className={cn('inline-flex items-center gap-1 text-sm font-medium', styles.cta)}>
            {ctaLabel}
            <ArrowRightIcon className="size-4" />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );

  if (!href) {
    return content;
  }

  return (
    <Link className="block h-full" to={href}>
      {content}
    </Link>
  );
}

function DashboardMetricSkeleton() {
  return (
    <Card className="h-full rounded-[1.5rem] border border-border/70 bg-card/95 py-0 shadow-[0_18px_48px_rgba(12,35,39,0.06)] ring-0">
      <CardHeader className="gap-3 border-b border-border/60 px-5 py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3">
            <div className="h-3 w-28 animate-pulse rounded-full bg-muted" />
            <div className="h-10 w-24 animate-pulse rounded-2xl bg-muted" />
          </div>
          <div className="size-11 animate-pulse rounded-2xl bg-muted" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3 px-5 py-4">
        <div className="h-3 w-full animate-pulse rounded-full bg-muted" />
        <div className="h-3 w-4/5 animate-pulse rounded-full bg-muted" />
      </CardContent>
    </Card>
  );
}

function buildFocusItems(dashboard: AdminDashboard) {
  return [
    {
      key: 'new-orders',
      label: `Новые заказы: ${formatDashboardCount(dashboard.newOrders)}`,
      variant: dashboard.newOrders > 0 ? 'secondary' : 'outline',
    },
    {
      key: 'problematic-orders',
      label: `Проблемные: ${formatDashboardCount(dashboard.problematicOrders)}`,
      variant: dashboard.problematicOrders > 0 ? 'destructive' : 'outline',
    },
    {
      key: 'awaiting-payment',
      label: `Ждут оплаты: ${formatDashboardCount(dashboard.awaitingPayment)}`,
      variant: dashboard.awaitingPayment > 0 ? 'secondary' : 'outline',
    },
    {
      key: 'without-photos',
      label: `Без фото: ${formatDashboardCount(dashboard.itemsWithoutPhotos)}`,
      variant: dashboard.itemsWithoutPhotos > 0 ? 'secondary' : 'outline',
    },
    {
      key: 'abandoned-baskets',
      label: `Брошенные корзины: ${formatDashboardCount(dashboard.abandonedBaskets)}`,
      variant: dashboard.abandonedBaskets > 0 ? 'secondary' : 'outline',
    },
  ] as const;
}

export function DashboardPage() {
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const requestIdRef = useRef(0);

  const loadDashboard = async ({ showInitialLoader = false }: LoadDashboardOptions = {}) => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    if (showInitialLoader) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    setErrorMessage('');

    const result = await getAdminDashboard();

    if (requestId !== requestIdRef.current) {
      return;
    }

    if (result.dashboard) {
      setDashboard(result.dashboard);
    }

    setErrorMessage(result.error ?? '');
    setIsLoading(false);
    setIsRefreshing(false);
  };

  useEffect(() => {
    void loadDashboard({
      showInitialLoader: true,
    });
  }, []);

  const formattedGeneratedAt = dashboard ? formatDashboardGeneratedAt(dashboard.generatedAt, dashboard.timeZone) : 'Подготавливаем снимок';
  const statusText = isLoading
    ? 'Загрузка ключевых показателей...'
    : `Снимок обновлен ${formattedGeneratedAt}`;
  const focusItems = useMemo(() => (dashboard ? buildFocusItems(dashboard) : []), [dashboard]);

  return (
    <AdminPage>
      <AdminPageHeader
        kicker="Обзор"
        title="Дашборд"
        description="Ключевые показатели заказов, платежей, каталога и корзин."
        actions={
          <>
            <AdminPageStatus>{statusText}</AdminPageStatus>
            {dashboard ? <AdminPageStatus>Таймзона backend: {dashboard.timeZone}</AdminPageStatus> : null}
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="rounded-xl bg-card/80 shadow-sm"
              onClick={() => void loadDashboard()}
              disabled={isLoading || isRefreshing}
            >
              <RefreshCcwIcon className={cn(isRefreshing && 'animate-spin')} />
              {isRefreshing ? 'Обновление...' : 'Обновить'}
            </Button>
          </>
        }
      />

      <AdminSectionCard
        eyebrow="Сводка"
        title="Операционные метрики"
        description="Очередь заказов, платежи, качество карточек и восстановление спроса."
        contentClassName="space-y-6"
      >
        {errorMessage ? (
          <AdminNotice tone="destructive" role="alert">
            {errorMessage}
          </AdminNotice>
        ) : null}

        {isLoading && !dashboard ? (
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <DashboardMetricSkeleton key={index} />
            ))}
          </div>
        ) : dashboard ? (
          <>
            <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
              <DashboardMetricCard
                title="Заказы в работе"
                value={formatDashboardCount(dashboard.orders)}
                description="Активная очередь заказов в нефинальных состояниях. Карточка показывает реальную нагрузку на операционную команду."
                icon={LayoutDashboardIcon}
                href="/orders"
              />

              <DashboardMetricCard
                title="Платежи"
                value={formatDashboardCount(dashboard.paidToday)}
                description="Успешно оплаченные заказы сегодня. Отдельно вынесено количество заказов, которые все еще ждут оплаты."
                icon={WalletIcon}
                href="/orders"
                ctaLabel="Проверить оплату"
                tone="success"
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/60 bg-background/80 px-4 py-3 shadow-sm">
                    <p className="text-[0.72rem] font-semibold tracking-[0.16em] text-muted-foreground uppercase">Оплачено сегодня</p>
                    <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                      {formatDashboardCount(dashboard.paidToday)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/60 bg-background/80 px-4 py-3 shadow-sm">
                    <p className="text-[0.72rem] font-semibold tracking-[0.16em] text-muted-foreground uppercase">Ждут оплаты</p>
                    <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                      {formatDashboardCount(dashboard.awaitingPayment)}
                    </p>
                  </div>
                </div>
              </DashboardMetricCard>

              <DashboardMetricCard
                title="Новые заказы"
                value={formatDashboardCount(dashboard.newOrders)}
                description="Заказы в начальных состояниях, которые важно быстро подтвердить и распределить в дальнейший workflow."
                icon={Clock3Icon}
                href="/orders"
                ctaLabel="Открыть очередь"
                tone="warning"
              />

              <DashboardMetricCard
                title="Проблемные заказы"
                value={formatDashboardCount(dashboard.problematicOrders)}
                description="Паузы, ошибки и нестандартные кейсы, которые требуют ручной обработки или проверки сценария."
                icon={TriangleAlertIcon}
                href="/orders"
                ctaLabel="Разобрать проблемы"
                tone="destructive"
              />

              <DashboardMetricCard
                title="Товары без фото"
                value={formatDashboardCount(dashboard.itemsWithoutPhotos)}
                description="Активные карточки без изображений ни на уровне товара, ни на уровне вариантов. Это напрямую влияет на конверсию каталога."
                icon={ImageOffIcon}
                href="/products"
                ctaLabel="Открыть каталог"
                tone="warning"
              />

              <DashboardMetricCard
                title="Брошенные корзины"
                value={formatDashboardCount(dashboard.abandonedBaskets)}
                description="Корзины, которые уже помечены как abandoned. Метрика помогает оценить упущенный спрос и сценарии возврата."
                icon={ShoppingBasketIcon}
                tone="default"
              />
            </div>
          </>
        ) : (
          <AdminEmptyState
            title="Метрики недоступны"
            description="Сервис не вернул данные для дашборда. Попробуйте обновить страницу или выполнить повторный запрос."
          />
        )}
      </AdminSectionCard>
    </AdminPage>
  );
}
