import { Link } from 'react-router-dom';
import type { HeroBanner } from '@/entities/hero-banner';
import { formatBannerDate, formatBannerStatus, formatBannerTheme } from '@/entities/hero-banner';
import { Badge } from '@/shared/ui';

type HeroBannerListProps = {
  items: HeroBanner[];
};

function getStatusBadgeClassName(status: string): string {
  if (status === 'PUBLISHED') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }
  return 'border-border bg-muted/40 text-muted-foreground';
}

export function HeroBannerList({ items }: HeroBannerListProps) {
  return (
    <ul className="divide-y divide-border/60">
      {items.map((banner) => (
        <li key={banner.id}>
          <Link
            to={`/hero-banners/${banner.id}`}
            className="flex items-center gap-4 py-3 transition-colors hover:text-foreground first:pt-0 last:pb-0"
          >
            <div className="shrink-0">
              {banner.desktopImageUrl ? (
                <img
                  className="h-16 w-28 rounded-lg object-cover"
                  src={banner.desktopImageUrl}
                  alt={banner.code}
                />
              ) : (
                <div className="flex h-16 w-28 items-center justify-center rounded-lg border border-dashed border-border/70 bg-muted/40 text-xs text-muted-foreground">
                  Нет фото
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">{banner.code}</span>
                <Badge className={`border ${getStatusBadgeClassName(banner.status)}`}>
                  {formatBannerStatus(banner.status)}
                </Badge>
              </div>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {banner.translations.length > 0 ? banner.translations[0].title : '—'}
                {' · '}
                Тема: {formatBannerTheme(banner.themeVariant)}
                {' · '}
                Порядок: {banner.sortOrder}
              </p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                Создан: {formatBannerDate(banner.createdAt)}
                {banner.startsAt ? ` · Начало: ${formatBannerDate(banner.startsAt)}` : ''}
                {banner.endsAt ? ` · Конец: ${formatBannerDate(banner.endsAt)}` : ''}
              </p>
            </div>

            <span className="shrink-0 text-xs text-muted-foreground">Открыть →</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
