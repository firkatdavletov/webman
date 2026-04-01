import type { DeliveryZoneType } from '@/entities/delivery';

export type DeliveryZoneEditorCoordinate = [number, number];

export type DeliveryZoneEditorPolygon = {
  outer: DeliveryZoneEditorCoordinate[];
  holes: DeliveryZoneEditorCoordinate[][];
};

export type DeliveryZoneEditorGeometry = {
  polygons: DeliveryZoneEditorPolygon[];
};

export type DeliveryZoneEditorValues = {
  id: string;
  code: string;
  name: string;
  type: DeliveryZoneType;
  city: string;
  postalCode: string;
  priority: string;
  isActive: boolean;
  geometry: DeliveryZoneEditorGeometry | null;
};

export const DELIVERY_ZONE_TYPE_LABELS: Record<DeliveryZoneType, string> = {
  CITY: 'Город',
  POSTAL_CODE: 'Почтовый индекс',
  POLYGON: 'Полигон',
};

export const DELIVERY_ZONE_TYPE_OPTIONS = [
  {
    value: 'CITY',
    label: DELIVERY_ZONE_TYPE_LABELS.CITY,
    description: 'Зона определяется по названию города.',
  },
  {
    value: 'POSTAL_CODE',
    label: DELIVERY_ZONE_TYPE_LABELS.POSTAL_CODE,
    description: 'Зона определяется по почтовому индексу.',
  },
  {
    value: 'POLYGON',
    label: DELIVERY_ZONE_TYPE_LABELS.POLYGON,
    description: 'Зона определяется по геометрии на карте.',
  },
] as const;

export const EMPTY_DELIVERY_ZONE_EDITOR_VALUES: DeliveryZoneEditorValues = {
  id: '',
  code: '',
  name: '',
  type: 'CITY',
  city: '',
  postalCode: '',
  priority: '0',
  isActive: true,
  geometry: null,
};

export function getDeliveryZoneTypeLabel(type: DeliveryZoneType): string {
  return DELIVERY_ZONE_TYPE_LABELS[type] ?? type;
}
