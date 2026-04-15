export type BannerPlacement = 'HOME_HERO';
export type BannerStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type BannerThemeVariant = 'LIGHT' | 'DARK' | 'ACCENT';
export type BannerTextAlignment = 'LEFT' | 'CENTER' | 'RIGHT';

export type HeroBannerImage = {
  id: string;
  url: string;
};

export type HeroBannerTranslation = {
  id: string;
  locale: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  desktopImageAlt: string;
  mobileImageAlt: string | null;
  primaryActionLabel: string | null;
  secondaryActionLabel: string | null;
};

export type HeroBanner = {
  id: string;
  code: string;
  storefrontCode: string;
  placement: BannerPlacement;
  status: BannerStatus;
  sortOrder: number;
  desktopImageUrl: string;
  mobileImageUrl: string | null;
  images: HeroBannerImage[];
  primaryActionUrl: string | null;
  secondaryActionUrl: string | null;
  themeVariant: BannerThemeVariant;
  textAlignment: BannerTextAlignment;
  startsAt: string | null;
  endsAt: string | null;
  publishedAt: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  translations: HeroBannerTranslation[];
};

export type HeroBannerPage = {
  items: HeroBanner[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};
