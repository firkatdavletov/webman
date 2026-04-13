import type { ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { ArrowRightIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/shared/lib/cn';
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui';

export const nativeFieldClassName =
  'h-11 w-full rounded-xl border border-input bg-background/80 px-3 text-sm text-foreground shadow-sm outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-60';

export const nativeTextareaClassName = cn(nativeFieldClassName, 'min-h-28 py-3');

export const checkboxInputClassName =
  'size-4 rounded border border-input text-primary outline-none transition focus-visible:ring-3 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-60';

type DeliverySectionLinkCardProps = {
  to: string;
  title: string;
  description: string;
  meta: ReactNode;
};

function DeliverySectionLinkCard({ to, title, description, meta }: DeliverySectionLinkCardProps) {
  return (
    <Link className="group block" to={to}>
      <Card className="h-full rounded-[1.5rem] border border-border/70 bg-card/90 py-0 shadow-[0_18px_50px_rgba(12,35,39,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_60px_rgba(12,35,39,0.12)]">
        <CardHeader className="border-b border-border/70 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="text-lg font-semibold tracking-tight">{title}</CardTitle>
              <CardDescription className="max-w-xl text-sm leading-6">{description}</CardDescription>
            </div>
            <ArrowRightIcon className="mt-1 size-4 text-muted-foreground transition group-hover:text-foreground" />
          </div>
        </CardHeader>
        <CardContent className="py-5">
          <div className="text-sm leading-6 text-muted-foreground">{meta}</div>
        </CardContent>
      </Card>
    </Link>
  );
}

type DeliveryListItemLinkProps = {
  to: string;
  title: string;
  description?: string;
  eyebrow?: string;
  status?: ReactNode;
  badges?: ReactNode;
  meta?: Array<{
    label: string;
    value: ReactNode;
  }>;
};

function DeliveryListItemLink({ to, title, description, eyebrow, status, badges, meta = [] }: DeliveryListItemLinkProps) {
  return (
    <Link className="group block" to={to}>
      <Card className="rounded-[1.5rem] border border-border/70 bg-card/90 py-0 shadow-[0_16px_40px_rgba(12,35,39,0.06)] transition hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-[0_22px_56px_rgba(12,35,39,0.12)]">
        <CardContent className="space-y-4 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 space-y-2">
              {eyebrow ? <p className="text-[0.72rem] font-semibold tracking-[0.18em] text-primary uppercase">{eyebrow}</p> : null}
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-semibold tracking-tight text-foreground">{title}</h3>
                {status}
              </div>
              {description ? <p className="text-sm leading-6 text-muted-foreground">{description}</p> : null}
            </div>
            <ArrowRightIcon className="mt-1 size-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground" />
          </div>

          {badges ? <div className="flex flex-wrap gap-2">{badges}</div> : null}

          {meta.length ? (
            <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {meta.map((item) => (
                <div key={item.label} className="rounded-[1.1rem] border border-border/70 bg-muted/25 px-4 py-3">
                  <dt className="text-[0.72rem] font-semibold tracking-[0.18em] text-muted-foreground uppercase">{item.label}</dt>
                  <dd className="mt-1 text-sm font-medium text-foreground">{item.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </CardContent>
      </Card>
    </Link>
  );
}

type DeliveryDetailStatProps = {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
};

function DeliveryDetailStat({ label, value, hint }: DeliveryDetailStatProps) {
  return (
    <div className="rounded-[1.25rem] border border-border/70 bg-muted/20 px-4 py-4">
      <p className="text-[0.72rem] font-semibold tracking-[0.18em] text-muted-foreground uppercase">{label}</p>
      <p className="mt-1 text-sm font-medium text-foreground">{value}</p>
      {hint ? <p className="mt-1 text-xs leading-5 text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function DeliveryStatusBadge({ active, activeLabel, inactiveLabel }: { active: boolean; activeLabel: string; inactiveLabel: string }) {
  return (
    <Badge variant={active ? 'secondary' : 'outline'} className="h-auto rounded-full px-3 py-1 text-[0.72rem] font-medium">
      {active ? activeLabel : inactiveLabel}
    </Badge>
  );
}

function DeliveryNativeSelect(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn(nativeFieldClassName, props.className)} />;
}

function DeliveryTextarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(nativeTextareaClassName, props.className)} />;
}

export {
  DeliveryDetailStat,
  DeliveryListItemLink,
  DeliveryNativeSelect,
  DeliverySectionLinkCard,
  DeliveryStatusBadge,
  DeliveryTextarea,
};
