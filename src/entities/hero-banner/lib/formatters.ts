import type { BannerStatus, BannerTextAlignment, BannerThemeVariant } from '@/entities/hero-banner/model/types';

const STATUS_LABELS: Record<BannerStatus, string> = {
  DRAFT: 'Черновик',
  PUBLISHED: 'Опубликован',
  ARCHIVED: 'В архиве',
};

const THEME_LABELS: Record<BannerThemeVariant, string> = {
  LIGHT: 'Светлая',
  DARK: 'Тёмная',
  ACCENT: 'Акцент',
};

const TEXT_ALIGNMENT_LABELS: Record<BannerTextAlignment, string> = {
  LEFT: 'Слева',
  CENTER: 'По центру',
  RIGHT: 'Справа',
};

export function formatBannerStatus(status: BannerStatus): string {
  return STATUS_LABELS[status] ?? status;
}

export function formatBannerTheme(theme: BannerThemeVariant): string {
  return THEME_LABELS[theme] ?? theme;
}

export function formatBannerTextAlignment(alignment: BannerTextAlignment): string {
  return TEXT_ALIGNMENT_LABELS[alignment] ?? alignment;
}

export function formatBannerDate(isoDate: string | null): string {
  if (!isoDate) {
    return '—';
  }

  try {
    return new Date(isoDate).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoDate;
  }
}
