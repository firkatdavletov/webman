import type { PickupPoint } from '@/entities/delivery';
import type { YandexMapCoordinate } from '@/shared/lib/yandex-maps/api';

export type PickupPointEditorValues = {
  id: string;
  code: string;
  name: string;
  country: string;
  region: string;
  city: string;
  street: string;
  house: string;
  apartment: string;
  postalCode: string;
  entrance: string;
  floor: string;
  intercom: string;
  comment: string;
  latitude: string;
  longitude: string;
  isActive: boolean;
};

export const EMPTY_PICKUP_POINT_EDITOR_VALUES: PickupPointEditorValues = {
  id: '',
  code: '',
  name: '',
  country: '',
  region: '',
  city: '',
  street: '',
  house: '',
  apartment: '',
  postalCode: '',
  entrance: '',
  floor: '',
  intercom: '',
  comment: '',
  latitude: '',
  longitude: '',
  isActive: true,
};

export function buildEmptyPickupPointEditorValues(): PickupPointEditorValues {
  return {
    ...EMPTY_PICKUP_POINT_EDITOR_VALUES,
  };
}

export function buildPickupPointEditorValues(pickupPoint: PickupPoint): PickupPointEditorValues {
  return {
    id: pickupPoint.id,
    code: pickupPoint.code,
    name: pickupPoint.name,
    country: pickupPoint.address.country ?? '',
    region: pickupPoint.address.region ?? '',
    city: pickupPoint.address.city ?? '',
    street: pickupPoint.address.street ?? '',
    house: pickupPoint.address.house ?? '',
    apartment: pickupPoint.address.apartment ?? '',
    postalCode: pickupPoint.address.postalCode ?? '',
    entrance: pickupPoint.address.entrance ?? '',
    floor: pickupPoint.address.floor ?? '',
    intercom: pickupPoint.address.intercom ?? '',
    comment: pickupPoint.address.comment ?? '',
    latitude:
      pickupPoint.address.latitude === null || pickupPoint.address.latitude === undefined ? '' : String(pickupPoint.address.latitude),
    longitude:
      pickupPoint.address.longitude === null || pickupPoint.address.longitude === undefined ? '' : String(pickupPoint.address.longitude),
    isActive: pickupPoint.isActive,
  };
}

export function clonePickupPointEditorValues(values: PickupPointEditorValues): PickupPointEditorValues {
  return {
    ...values,
  };
}

export function parsePickupPointCoordinateValues(values: Pick<PickupPointEditorValues, 'latitude' | 'longitude'>): YandexMapCoordinate | null {
  const latitude = Number(values.latitude.trim());
  const longitude = Number(values.longitude.trim());

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return [longitude, latitude];
}

export function applyPickupPointCoordinateValues(
  values: PickupPointEditorValues,
  coordinates: YandexMapCoordinate | null,
): PickupPointEditorValues {
  if (!coordinates) {
    return {
      ...values,
      latitude: '',
      longitude: '',
    };
  }

  return {
    ...values,
    latitude: coordinates[1].toFixed(6),
    longitude: coordinates[0].toFixed(6),
  };
}

export function getPickupPointCoordinateSummary(values: Pick<PickupPointEditorValues, 'latitude' | 'longitude'>): string {
  const coordinates = parsePickupPointCoordinateValues(values);

  if (!coordinates) {
    return 'Координаты не заданы';
  }

  return `Широта ${coordinates[1].toFixed(6)} • Долгота ${coordinates[0].toFixed(6)}`;
}

export function getPickupPointAddressSummary(values: PickupPointEditorValues): string {
  const parts = [
    values.city.trim(),
    [values.street.trim(), values.house.trim()].filter(Boolean).join(' ').trim(),
    values.postalCode.trim(),
  ].filter(Boolean);

  return parts.length ? parts.join(', ') : 'Адрес можно уточнить на основной форме';
}
