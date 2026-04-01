import type { DeliveryZone, UpsertDeliveryZonePayload } from '@/entities/delivery';
import {
  mapDeliveryZoneGeometryDraftToDto,
  mapDeliveryZoneGeometryDtoToDraft,
  cloneDeliveryZoneGeometry,
} from './geometryMappers';
import {
  type DeliveryZoneEditorValues,
  EMPTY_DELIVERY_ZONE_EDITOR_VALUES,
} from './types';

function normalizeOptionalText(value: string): string | null {
  const normalizedValue = value.trim();

  return normalizedValue || null;
}

function parsePriority(value: string): number {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return 0;
  }

  const numericValue = Number(normalizedValue);

  return Number.isInteger(numericValue) ? numericValue : 0;
}

export function cloneDeliveryZoneEditorValues(values: DeliveryZoneEditorValues): DeliveryZoneEditorValues {
  return {
    ...values,
    geometry: cloneDeliveryZoneGeometry(values.geometry),
  };
}

export function buildEmptyDeliveryZoneEditorValues(): DeliveryZoneEditorValues {
  return cloneDeliveryZoneEditorValues(EMPTY_DELIVERY_ZONE_EDITOR_VALUES);
}

export function buildDeliveryZoneEditorValues(zone: DeliveryZone): DeliveryZoneEditorValues {
  return {
    id: zone.id,
    code: zone.code,
    name: zone.name,
    type: zone.type,
    city: zone.city ?? '',
    postalCode: zone.postalCode ?? '',
    priority: String(zone.priority),
    isActive: zone.isActive,
    geometry: mapDeliveryZoneGeometryDtoToDraft(zone.geometry),
  };
}

export function mapDeliveryZoneEditorValuesToPayload(values: DeliveryZoneEditorValues): UpsertDeliveryZonePayload {
  return {
    id: normalizeOptionalText(values.id),
    code: values.code.trim(),
    name: values.name.trim(),
    type: values.type,
    city: values.type === 'CITY' ? normalizeOptionalText(values.city) : null,
    postalCode: values.type === 'POSTAL_CODE' ? normalizeOptionalText(values.postalCode) : null,
    geometry: values.type === 'POLYGON' ? mapDeliveryZoneGeometryDraftToDto(values.geometry) : null,
    priority: parsePriority(values.priority),
    isActive: values.isActive,
  };
}

export function getDeliveryZoneSourceFingerprint(values: DeliveryZoneEditorValues): string {
  return JSON.stringify(values);
}
