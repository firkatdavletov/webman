export function sanitizePriceInput(value: string): string {
  const compactValue = value.replace(/\s/g, '').replace(/[^\d.,]/g, '');
  let result = '';
  let hasDecimalSeparator = false;
  let fractionDigits = 0;

  for (const char of compactValue) {
    if (char >= '0' && char <= '9') {
      if (hasDecimalSeparator) {
        if (fractionDigits >= 2) {
          continue;
        }

        fractionDigits += 1;
      }

      result += char;
      continue;
    }

    if (hasDecimalSeparator) {
      continue;
    }

    hasDecimalSeparator = true;
    result = result ? `${result}${char}` : `0${char}`;
  }

  return result;
}

export function formatMinorToPriceInput(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isSafeInteger(value) || value < 0) {
    return '';
  }

  const major = Math.trunc(value / 100);
  const minor = value % 100;

  if (!minor) {
    return String(major);
  }

  const fraction = String(minor).padStart(2, '0').replace(/0$/, '');

  return `${major}.${fraction}`;
}

export function parsePriceInputToMinor(value: string): number | null {
  const normalizedValue = sanitizePriceInput(value).replace(',', '.');

  if (!normalizedValue) {
    return null;
  }

  const match = normalizedValue.match(/^(\d+)(?:\.(\d{0,2}))?$/);

  if (!match) {
    return null;
  }

  const major = Number(match[1]);
  const fraction = (match[2] ?? '').padEnd(2, '0');
  const minor = major * 100 + Number(fraction || '0');

  return Number.isSafeInteger(minor) ? minor : null;
}

export function parseOptionalPriceInputToMinor(value: string): number | null | undefined {
  if (!value.trim()) {
    return null;
  }

  return parsePriceInputToMinor(value) ?? undefined;
}
