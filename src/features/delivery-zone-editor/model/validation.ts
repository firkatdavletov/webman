import { getDeliveryZoneGeometryValidationError } from './geometryMappers';
import type { DeliveryZoneEditorValues } from './types';

function isIntegerValue(value: string): boolean {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return true;
  }

  return Number.isInteger(Number(normalizedValue));
}

export function validateDeliveryZoneEditorValues(values: DeliveryZoneEditorValues): string | null {
  if (!values.code.trim()) {
    return 'Укажите код зоны.';
  }

  if (!values.name.trim()) {
    return 'Укажите название зоны.';
  }

  if (!isIntegerValue(values.priority)) {
    return 'Поле «Приоритет» должно быть целым числом.';
  }

  if (values.type === 'CITY' && !values.city.trim()) {
    return 'Для зоны типа «Город» укажите город.';
  }

  if (values.type === 'POSTAL_CODE' && !values.postalCode.trim()) {
    return 'Для зоны типа «Почтовый индекс» укажите индекс.';
  }

  if (values.type === 'POLYGON') {
    return getDeliveryZoneGeometryValidationError(values.geometry);
  }

  return null;
}
