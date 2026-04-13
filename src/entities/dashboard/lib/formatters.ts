const DASHBOARD_COUNT_FORMATTER = new Intl.NumberFormat('ru-RU');

const DASHBOARD_DATE_TIME_OPTIONS: Intl.DateTimeFormatOptions = {
  day: '2-digit',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
};

export function formatDashboardCount(value: number): string {
  return DASHBOARD_COUNT_FORMATTER.format(value);
}

export function formatDashboardGeneratedAt(value: string, timeZone?: string | null): string {
  const timestamp = Date.parse(value);

  if (Number.isNaN(timestamp)) {
    return 'Неизвестно';
  }

  const normalizedTimeZone = timeZone?.trim() ?? '';

  try {
    return new Intl.DateTimeFormat('ru-RU', {
      ...DASHBOARD_DATE_TIME_OPTIONS,
      ...(normalizedTimeZone ? { timeZone: normalizedTimeZone } : {}),
    }).format(new Date(timestamp));
  } catch {
    return new Intl.DateTimeFormat('ru-RU', DASHBOARD_DATE_TIME_OPTIONS).format(new Date(timestamp));
  }
}
