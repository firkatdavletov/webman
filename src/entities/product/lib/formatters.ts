const UNIT_LABELS: Record<string, string> = {
  PIECE: 'шт',
  KILOGRAM: 'кг',
  GRAM: 'г',
  LITER: 'л',
  MILLILITER: 'мл',
};

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(price / 100);
}

export function formatUnitLabel(unit: string): string {
  return UNIT_LABELS[unit] ?? unit;
}
