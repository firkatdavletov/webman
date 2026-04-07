import { Link } from 'react-router-dom';
import type { HeroBanner } from '@/entities/hero-banner';
import { formatBannerDate, formatBannerStatus, formatBannerTheme } from '@/entities/hero-banner';

type HeroBannerListProps = {
  items: HeroBanner[];
};

function getStatusBadgeClass(status: string): string {
  switch (status) {
    case 'PUBLISHED':
      return 'nav-badge nav-badge-live';
    case 'DRAFT':
      return 'nav-badge';
    case 'ARCHIVED':
      return 'nav-badge';
    default:
      return 'nav-badge';
  }
}

export function HeroBannerList({ items }: HeroBannerListProps) {
  return (
    <div className="catalog-list">
      {items.map((banner) => (
        <Link key={banner.id} className="catalog-list-item" to={`/hero-banners/${banner.id}`}>
          <div className="catalog-list-item-media">
            {banner.desktopImageUrl ? (
              <img
                className="catalog-list-item-image"
                src={banner.desktopImageUrl}
                alt={banner.code}
                style={{ width: '120px', height: '68px', objectFit: 'cover', borderRadius: '6px' }}
              />
            ) : (
              <div
                className="product-image-placeholder"
                style={{ width: '120px', height: '68px', borderRadius: '6px', fontSize: '0.75rem' }}
              >
                Нет фото
              </div>
            )}
          </div>

          <div className="catalog-list-item-content">
            <div className="catalog-list-item-header">
              <span className="catalog-list-item-title">{banner.code}</span>
              <span className={getStatusBadgeClass(banner.status)}>{formatBannerStatus(banner.status)}</span>
            </div>

            <div className="catalog-meta">
              {banner.translations.length > 0 ? banner.translations[0].title : '—'}
              {' · '}
              Тема: {formatBannerTheme(banner.themeVariant)}
              {' · '}
              Порядок: {banner.sortOrder}
            </div>

            <div className="catalog-meta">
              Создан: {formatBannerDate(banner.createdAt)}
              {banner.startsAt ? ` · Начало: ${formatBannerDate(banner.startsAt)}` : ''}
              {banner.endsAt ? ` · Конец: ${formatBannerDate(banner.endsAt)}` : ''}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
