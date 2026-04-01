import type { DeliveryZoneGeometry } from '@/entities/delivery';
import type {
  DeliveryZoneEditorCoordinate,
  DeliveryZoneEditorGeometry,
  DeliveryZoneEditorPolygon,
} from './types';

const MIN_POLYGON_POINTS = 3;

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function cloneCoordinate([longitude, latitude]: DeliveryZoneEditorCoordinate): DeliveryZoneEditorCoordinate {
  return [longitude, latitude];
}

function isSameCoordinate(
  [leftLongitude, leftLatitude]: DeliveryZoneEditorCoordinate,
  [rightLongitude, rightLatitude]: DeliveryZoneEditorCoordinate,
): boolean {
  return leftLongitude === rightLongitude && leftLatitude === rightLatitude;
}

function sanitizeRingCoordinate(value: unknown): DeliveryZoneEditorCoordinate | null {
  if (!Array.isArray(value) || value.length < 2) {
    return null;
  }

  const [longitude, latitude] = value;

  if (!isFiniteNumber(longitude) || !isFiniteNumber(latitude)) {
    return null;
  }

  return [longitude, latitude];
}

function stripClosedRing(points: DeliveryZoneEditorCoordinate[]): DeliveryZoneEditorCoordinate[] {
  if (points.length < 2) {
    return points.map(cloneCoordinate);
  }

  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];

  if (!firstPoint || !lastPoint || !isSameCoordinate(firstPoint, lastPoint)) {
    return points.map(cloneCoordinate);
  }

  return points.slice(0, -1).map(cloneCoordinate);
}

function closeRing(points: DeliveryZoneEditorCoordinate[]): DeliveryZoneEditorCoordinate[] {
  if (!points.length) {
    return [];
  }

  const normalizedPoints = stripClosedRing(points);
  const firstPoint = normalizedPoints[0];

  if (!firstPoint) {
    return [];
  }

  return [...normalizedPoints.map(cloneCoordinate), cloneCoordinate(firstPoint)];
}

function normalizeRing(value: unknown): DeliveryZoneEditorCoordinate[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return stripClosedRing(
    value
      .map((coordinate) => sanitizeRingCoordinate(coordinate))
      .filter((coordinate): coordinate is DeliveryZoneEditorCoordinate => coordinate !== null),
  );
}

function normalizePolygon(value: unknown): DeliveryZoneEditorPolygon | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const rings = value
    .map((ring) => normalizeRing(ring))
    .filter((ring) => ring.length > 0);

  if (!rings.length) {
    return null;
  }

  const [outer, ...holes] = rings;

  return {
    outer: outer.map(cloneCoordinate),
    holes: holes.map((ring) => ring.map(cloneCoordinate)),
  };
}

function clonePolygon(polygon: DeliveryZoneEditorPolygon): DeliveryZoneEditorPolygon {
  return {
    outer: polygon.outer.map(cloneCoordinate),
    holes: polygon.holes.map((ring) => ring.map(cloneCoordinate)),
  };
}

function getPolygonRingCountLabel(count: number): string {
  const lastDigit = count % 10;
  const lastTwoDigits = count % 100;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
    return 'контуров';
  }

  if (lastDigit === 1) {
    return 'контур';
  }

  if (lastDigit >= 2 && lastDigit <= 4) {
    return 'контура';
  }

  return 'контуров';
}

function getPolygonPointLabel(count: number): string {
  const lastDigit = count % 10;
  const lastTwoDigits = count % 100;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
    return 'вершин';
  }

  if (lastDigit === 1) {
    return 'вершина';
  }

  if (lastDigit >= 2 && lastDigit <= 4) {
    return 'вершины';
  }

  return 'вершин';
}

function getUniqueOuterPoints(points: DeliveryZoneEditorCoordinate[]): DeliveryZoneEditorCoordinate[] {
  const pointByKey = new Map<string, DeliveryZoneEditorCoordinate>();

  points.forEach((point) => {
    pointByKey.set(`${point[0]}:${point[1]}`, point);
  });

  return Array.from(pointByKey.values()).map(cloneCoordinate);
}

export function createEmptyDeliveryZonePolygon(): DeliveryZoneEditorPolygon {
  return {
    outer: [],
    holes: [],
  };
}

export function cloneDeliveryZoneGeometry(geometry: DeliveryZoneEditorGeometry | null): DeliveryZoneEditorGeometry | null {
  if (!geometry) {
    return null;
  }

  return {
    polygons: geometry.polygons.map((polygon) => clonePolygon(polygon)),
  };
}

export function mapDeliveryZoneGeometryDtoToDraft(geometry: DeliveryZoneGeometry | null | undefined): DeliveryZoneEditorGeometry | null {
  if (!geometry) {
    return null;
  }

  if (geometry.type === 'Polygon') {
    const polygon = normalizePolygon(geometry.coordinates);

    return polygon
      ? {
          polygons: [polygon],
        }
      : null;
  }

  if (geometry.type === 'MultiPolygon') {
    if (!Array.isArray(geometry.coordinates)) {
      return null;
    }

    const polygons = geometry.coordinates
      .map((polygon) => normalizePolygon(polygon))
      .filter((polygon): polygon is DeliveryZoneEditorPolygon => polygon !== null);

    return polygons.length
      ? {
          polygons,
        }
      : null;
  }

  return null;
}

export function mapDeliveryZoneGeometryDraftToDto(geometry: DeliveryZoneEditorGeometry | null): DeliveryZoneGeometry | null {
  if (!geometry?.polygons.length) {
    return null;
  }

  const polygons = geometry.polygons
    .filter((polygon) => polygon.outer.length > 0)
    .map((polygon) => ({
      outer: closeRing(polygon.outer),
      holes: polygon.holes.filter((ring) => ring.length > 0).map((ring) => closeRing(ring)),
    }));

  if (!polygons.length) {
    return null;
  }

  if (polygons.length === 1) {
    const [polygon] = polygons;

    if (!polygon) {
      return null;
    }

    return {
      type: 'Polygon',
      coordinates: [polygon.outer, ...polygon.holes],
    };
  }

  return {
    type: 'MultiPolygon',
    coordinates: polygons.map((polygon) => [polygon.outer, ...polygon.holes]),
  };
}

export function addDeliveryZonePolygon(geometry: DeliveryZoneEditorGeometry | null): DeliveryZoneEditorGeometry {
  const nextGeometry = cloneDeliveryZoneGeometry(geometry) ?? {
    polygons: [],
  };

  nextGeometry.polygons.push(createEmptyDeliveryZonePolygon());

  return nextGeometry;
}

export function appendDeliveryZonePolygonPoint(
  geometry: DeliveryZoneEditorGeometry | null,
  polygonIndex: number,
  coordinate: DeliveryZoneEditorCoordinate,
): DeliveryZoneEditorGeometry {
  const nextGeometry = cloneDeliveryZoneGeometry(geometry) ?? {
    polygons: [createEmptyDeliveryZonePolygon()],
  };

  if (!nextGeometry.polygons.length) {
    nextGeometry.polygons.push(createEmptyDeliveryZonePolygon());
  }

  const safePolygonIndex =
    polygonIndex >= 0 && polygonIndex < nextGeometry.polygons.length ? polygonIndex : nextGeometry.polygons.length - 1;
  const targetPolygon = nextGeometry.polygons[safePolygonIndex];

  if (!targetPolygon) {
    nextGeometry.polygons.push({
      ...createEmptyDeliveryZonePolygon(),
      outer: [cloneCoordinate(coordinate)],
    });

    return nextGeometry;
  }

  targetPolygon.outer = [...targetPolygon.outer.map(cloneCoordinate), cloneCoordinate(coordinate)];

  return nextGeometry;
}

export function updateDeliveryZonePolygonPoint(
  geometry: DeliveryZoneEditorGeometry | null,
  polygonIndex: number,
  pointIndex: number,
  coordinate: DeliveryZoneEditorCoordinate,
): DeliveryZoneEditorGeometry | null {
  if (!geometry) {
    return null;
  }

  const nextGeometry = cloneDeliveryZoneGeometry(geometry);

  if (!nextGeometry) {
    return null;
  }

  const targetPolygon = nextGeometry.polygons[polygonIndex];

  if (!targetPolygon || pointIndex < 0 || pointIndex >= targetPolygon.outer.length) {
    return nextGeometry;
  }

  targetPolygon.outer[pointIndex] = cloneCoordinate(coordinate);

  return nextGeometry;
}

export function removeDeliveryZonePolygonPoint(
  geometry: DeliveryZoneEditorGeometry | null,
  polygonIndex: number,
  pointIndex: number,
): DeliveryZoneEditorGeometry | null {
  if (!geometry) {
    return null;
  }

  const nextGeometry = cloneDeliveryZoneGeometry(geometry);

  if (!nextGeometry) {
    return null;
  }

  const targetPolygon = nextGeometry.polygons[polygonIndex];

  if (!targetPolygon || pointIndex < 0 || pointIndex >= targetPolygon.outer.length) {
    return nextGeometry;
  }

  targetPolygon.outer.splice(pointIndex, 1);

  return nextGeometry;
}

export function removeDeliveryZonePolygon(
  geometry: DeliveryZoneEditorGeometry | null,
  polygonIndex: number,
): DeliveryZoneEditorGeometry | null {
  if (!geometry) {
    return null;
  }

  const nextGeometry = cloneDeliveryZoneGeometry(geometry);

  if (!nextGeometry) {
    return null;
  }

  nextGeometry.polygons.splice(polygonIndex, 1);

  return nextGeometry.polygons.length ? nextGeometry : null;
}

export function clearDeliveryZoneGeometry(): null {
  return null;
}

export function getDeliveryZoneGeometrySummary(geometry: DeliveryZoneEditorGeometry | null): string {
  if (!geometry?.polygons.length) {
    return 'Геометрия не задана';
  }

  const polygonsCount = geometry.polygons.length;
  const outerPointsCount = geometry.polygons.reduce((total, polygon) => total + polygon.outer.length, 0);

  return `${polygonsCount} ${getPolygonRingCountLabel(polygonsCount)} • ${outerPointsCount} ${getPolygonPointLabel(outerPointsCount)}`;
}

export function getDeliveryZoneGeometryBounds(
  geometry: DeliveryZoneEditorGeometry | null,
): [[number, number], [number, number]] | null {
  if (!geometry?.polygons.length) {
    return null;
  }

  let minLongitude = Number.POSITIVE_INFINITY;
  let maxLongitude = Number.NEGATIVE_INFINITY;
  let minLatitude = Number.POSITIVE_INFINITY;
  let maxLatitude = Number.NEGATIVE_INFINITY;

  geometry.polygons.forEach((polygon) => {
    [polygon.outer, ...polygon.holes].forEach((ring) => {
      ring.forEach(([longitude, latitude]) => {
        minLongitude = Math.min(minLongitude, longitude);
        maxLongitude = Math.max(maxLongitude, longitude);
        minLatitude = Math.min(minLatitude, latitude);
        maxLatitude = Math.max(maxLatitude, latitude);
      });
    });
  });

  if (
    !Number.isFinite(minLongitude) ||
    !Number.isFinite(maxLongitude) ||
    !Number.isFinite(minLatitude) ||
    !Number.isFinite(maxLatitude)
  ) {
    return null;
  }

  return [
    [minLongitude, minLatitude],
    [maxLongitude, maxLatitude],
  ];
}

export function getDeliveryZoneGeometryValidationError(geometry: DeliveryZoneEditorGeometry | null): string | null {
  if (!geometry?.polygons.length) {
    return 'Для polygon-зоны нужно указать хотя бы один контур на карте.';
  }

  for (const [polygonIndex, polygon] of geometry.polygons.entries()) {
    const uniquePoints = getUniqueOuterPoints(polygon.outer);

    if (uniquePoints.length < MIN_POLYGON_POINTS) {
      return `Контур ${polygonIndex + 1} должен содержать минимум ${MIN_POLYGON_POINTS} разные точки.`;
    }
  }

  return null;
}
