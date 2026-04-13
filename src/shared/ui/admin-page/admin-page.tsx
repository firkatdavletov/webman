import type { ComponentProps, ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/shared/lib/cn';
import { Badge } from '@/shared/ui/badge';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';

function AdminPage({ className, ...props }: ComponentProps<'main'>) {
  return <main className={cn('flex flex-col gap-6 px-4 py-5 md:px-6 md:py-6 lg:px-8 lg:py-8', className)} {...props} />;
}

type AdminPageHeaderProps = ComponentProps<'header'> & {
  kicker: string;
  title: string;
  description?: string;
  actions?: ReactNode;
};

function AdminPageHeader({ kicker, title, description, actions, className, ...props }: AdminPageHeaderProps) {
  return (
    <header
      className={cn('flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between lg:gap-6', className)}
      {...props}
    >
      <div className="space-y-2">
        <p className="text-xs font-semibold tracking-[0.22em] text-primary uppercase">{kicker}</p>
        <div className="space-y-1">
          <h1 className="font-heading text-3xl leading-tight font-semibold tracking-tight text-foreground md:text-4xl">
            {title}
          </h1>
          {description ? <p className="max-w-3xl text-sm text-muted-foreground md:text-base">{description}</p> : null}
        </div>
      </div>

      {actions ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center lg:justify-end">{actions}</div>
      ) : null}
    </header>
  );
}

function AdminPageStatus({ className, ...props }: ComponentProps<typeof Badge>) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        'h-auto min-h-10 rounded-full border border-border/70 bg-card/80 px-4 py-2 text-left text-[0.78rem] leading-5 text-foreground shadow-sm',
        className,
      )}
      {...props}
    />
  );
}

type AdminSectionCardProps = ComponentProps<'section'> & {
  eyebrow?: string;
  title?: string;
  description?: string;
  action?: ReactNode;
  contentClassName?: string;
};

function AdminSectionCard({
  eyebrow,
  title,
  description,
  action,
  className,
  contentClassName,
  children,
  ...props
}: AdminSectionCardProps) {
  const hasHeader = eyebrow || title || description || action;

  return (
    <section className={cn('min-w-0', className)} {...props}>
      <Card className="rounded-[1.75rem] border border-border/70 bg-card/90 shadow-[0_24px_70px_rgba(12,35,39,0.08)] backdrop-blur-sm">
        {hasHeader ? (
          <CardHeader className="gap-2 border-b border-border/70 pb-5">
            <div className="space-y-1.5">
              {eyebrow ? <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">{eyebrow}</p> : null}
              {title ? <CardTitle className="text-xl font-semibold tracking-tight md:text-2xl">{title}</CardTitle> : null}
              {description ? <CardDescription className="max-w-3xl text-sm leading-6">{description}</CardDescription> : null}
            </div>
            {action ? <CardAction className="mt-1">{action}</CardAction> : null}
          </CardHeader>
        ) : null}
        <CardContent className={cn('space-y-5 pt-5', hasHeader ? '' : 'pt-0', contentClassName)}>{children}</CardContent>
      </Card>
    </section>
  );
}

const emptyStateVariants = cva(
  'flex min-h-40 flex-col items-center justify-center rounded-[1.5rem] border border-dashed px-6 py-10 text-center',
  {
    variants: {
      tone: {
        default: 'border-border/80 bg-muted/40 text-foreground',
        destructive: 'border-destructive/25 bg-destructive/5 text-destructive',
      },
    },
    defaultVariants: {
      tone: 'default',
    },
  },
);

type AdminEmptyStateProps = ComponentProps<'div'> &
  VariantProps<typeof emptyStateVariants> & {
    title?: string;
    description: string;
  };

function AdminEmptyState({ title, description, tone, className, ...props }: AdminEmptyStateProps) {
  return (
    <div className={cn(emptyStateVariants({ tone }), className)} {...props}>
      {title ? <p className="font-medium text-current">{title}</p> : null}
      <p className={cn('max-w-2xl text-sm leading-6', title ? 'mt-2 text-current/80' : 'text-current')}>{description}</p>
    </div>
  );
}

const noticeVariants = cva('rounded-2xl border px-4 py-3 text-sm leading-6', {
  variants: {
    tone: {
      default: 'border-border/80 bg-muted/40 text-foreground',
      destructive: 'border-destructive/20 bg-destructive/5 text-destructive',
    },
  },
  defaultVariants: {
    tone: 'default',
  },
});

type AdminNoticeProps = ComponentProps<'div'> & VariantProps<typeof noticeVariants>;

function AdminNotice({ tone, className, ...props }: AdminNoticeProps) {
  return <div className={cn(noticeVariants({ tone }), className)} {...props} />;
}

export { AdminEmptyState, AdminNotice, AdminPage, AdminPageHeader, AdminPageStatus, AdminSectionCard };
