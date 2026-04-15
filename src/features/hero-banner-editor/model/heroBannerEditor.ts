import type {
  BannerPlacement,
  BannerStatus,
  BannerTextAlignment,
  BannerThemeVariant,
  HeroBanner,
} from '@/entities/hero-banner';

export type HeroBannerTranslationValues = {
  locale: string;
  title: string;
  subtitle: string;
  description: string;
  desktopImageAlt: string;
  mobileImageAlt: string;
  primaryActionLabel: string;
  secondaryActionLabel: string;
};

export type HeroBannerEditorValues = {
  code: string;
  storefrontCode: string;
  placement: BannerPlacement;
  status: BannerStatus;
  sortOrder: string;
  desktopImageUrl: string;
  mobileImageUrl: string;
  primaryActionUrl: string;
  secondaryActionUrl: string;
  themeVariant: BannerThemeVariant;
  textAlignment: BannerTextAlignment;
  startsAt: string;
  endsAt: string;
  translations: HeroBannerTranslationValues[];
};

export const EMPTY_TRANSLATION_VALUES: HeroBannerTranslationValues = {
  locale: 'ru',
  title: '',
  subtitle: '',
  description: '',
  desktopImageAlt: '',
  mobileImageAlt: '',
  primaryActionLabel: '',
  secondaryActionLabel: '',
};

export const EMPTY_HERO_BANNER_EDITOR_VALUES: HeroBannerEditorValues = {
  code: '',
  storefrontCode: 'default',
  placement: 'HOME_HERO',
  status: 'DRAFT',
  sortOrder: '0',
  desktopImageUrl: '',
  mobileImageUrl: '',
  primaryActionUrl: '',
  secondaryActionUrl: '',
  themeVariant: 'LIGHT',
  textAlignment: 'LEFT',
  startsAt: '',
  endsAt: '',
  translations: [{ ...EMPTY_TRANSLATION_VALUES }],
};

function formatDateTimeLocal(isoDate: string | null): string {
  if (!isoDate) {
    return '';
  }

  try {
    const date = new Date(isoDate);
    const pad = (n: number) => String(n).padStart(2, '0');

    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  } catch {
    return '';
  }
}

export function buildHeroBannerEditorValues(banner: HeroBanner): HeroBannerEditorValues {
  return {
    code: banner.code,
    storefrontCode: banner.storefrontCode,
    placement: banner.placement,
    status: banner.status,
    sortOrder: String(banner.sortOrder),
    desktopImageUrl: banner.desktopImageUrl,
    mobileImageUrl: banner.mobileImageUrl ?? '',
    primaryActionUrl: banner.primaryActionUrl ?? '',
    secondaryActionUrl: banner.secondaryActionUrl ?? '',
    themeVariant: banner.themeVariant,
    textAlignment: banner.textAlignment,
    startsAt: formatDateTimeLocal(banner.startsAt),
    endsAt: formatDateTimeLocal(banner.endsAt),
    translations: banner.translations.length
      ? banner.translations.map((t) => ({
          locale: t.locale,
          title: t.title,
          subtitle: t.subtitle ?? '',
          description: t.description ?? '',
          desktopImageAlt: t.desktopImageAlt,
          mobileImageAlt: t.mobileImageAlt ?? '',
          primaryActionLabel: t.primaryActionLabel ?? '',
          secondaryActionLabel: t.secondaryActionLabel ?? '',
        }))
      : [{ ...EMPTY_TRANSLATION_VALUES }],
  };
}

export function buildHeroBannerFromEditorValues(
  values: HeroBannerEditorValues,
  existingBanner?: HeroBanner | null,
): HeroBanner {
  return {
    id: existingBanner?.id ?? '',
    code: values.code.trim(),
    storefrontCode: values.storefrontCode.trim(),
    placement: values.placement,
    status: values.status,
    sortOrder: parseInt(values.sortOrder, 10) || 0,
    desktopImageUrl: values.desktopImageUrl.trim(),
    mobileImageUrl: values.mobileImageUrl.trim() || null,
    primaryActionUrl: values.primaryActionUrl.trim() || null,
    secondaryActionUrl: values.secondaryActionUrl.trim() || null,
    themeVariant: values.themeVariant,
    textAlignment: values.textAlignment,
    startsAt: values.startsAt ? new Date(values.startsAt).toISOString() : null,
    endsAt: values.endsAt ? new Date(values.endsAt).toISOString() : null,
    images: existingBanner?.images ?? [],
    publishedAt: existingBanner?.publishedAt ?? null,
    version: existingBanner?.version ?? 0,
    createdAt: existingBanner?.createdAt ?? '',
    updatedAt: existingBanner?.updatedAt ?? '',
    translations: values.translations.map((t) => ({
      id: '',
      locale: t.locale.trim(),
      title: t.title.trim(),
      subtitle: t.subtitle.trim() || null,
      description: t.description.trim() || null,
      desktopImageAlt: t.desktopImageAlt.trim(),
      mobileImageAlt: t.mobileImageAlt.trim() || null,
      primaryActionLabel: t.primaryActionLabel.trim() || null,
      secondaryActionLabel: t.secondaryActionLabel.trim() || null,
    })),
  };
}
