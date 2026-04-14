import { useEffect, useMemo, useRef, useState } from 'react';
import {
  addDeliveryZonePolygon,
  appendDeliveryZonePolygonPoint,
  clearDeliveryZoneGeometry,
  getDeliveryZoneGeometryBounds,
  getDeliveryZoneGeometrySummary,
  removeDeliveryZonePolygon,
  removeDeliveryZonePolygonPoint,
  updateDeliveryZonePolygonPoint,
} from '@/features/delivery-zone-editor/model/geometryMappers';
import {
  loadYandexMapsReactApi,
  type YandexMapCoordinate,
  type YandexMapLocation,
  type YandexMapsReactApi,
} from '@/features/delivery-zone-editor/model/yandexMaps';
import type {
  DeliveryZoneEditorCoordinate,
  DeliveryZoneEditorGeometry,
} from '@/features/delivery-zone-editor/model/types';
import { cn } from '@/shared/lib/cn';
import { requestCurrentBrowserLocation } from '@/shared/lib/yandex-maps/geolocation';
import { AdminNotice, Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@/shared/ui';

type DeliveryZoneMapEditorProps = {
  geometry: DeliveryZoneEditorGeometry | null;
  activePolygonIndex: number;
  onActivePolygonIndexChange: (polygonIndex: number) => void;
  onGeometryChange: (geometry: DeliveryZoneEditorGeometry | null) => void;
};

const DEFAULT_MAP_CENTER: DeliveryZoneEditorCoordinate = [37.617635, 55.755814];
const DEFAULT_MAP_ZOOM = 10;
const CURRENT_LOCATION_ZOOM = 15;
const MAP_SURFACE_CLASS_NAME =
  'min-h-[560px] overflow-hidden rounded-[1.5rem] border border-border/70 bg-[radial-gradient(circle_at_top_right,rgba(17,117,108,0.08),transparent_34%),linear-gradient(180deg,rgba(248,252,251,0.96),rgba(240,247,246,0.94))]';
const MARKER_CLASS_NAME =
  'grid size-8 place-items-center rounded-full border-2 border-white bg-primary text-[0.78rem] font-bold text-primary-foreground shadow-[0_10px_24px_rgba(12,35,39,0.24)]';
const INFO_CARD_CLASS_NAME = 'rounded-[1.5rem] border border-border/70 bg-card/90 py-0 shadow-[0_18px_50px_rgba(12,35,39,0.08)]';

function formatCoordinateValue(value: number): string {
  return value.toFixed(6);
}

function getFeatureStyle(isActive: boolean) {
  return {
    fill: isActive ? 'rgba(17, 117, 108, 0.22)' : 'rgba(90, 109, 113, 0.12)',
    stroke: [
      {
        color: isActive ? '#11756c' : '#5a6d71',
        width: isActive ? 3 : 2,
      },
    ],
  };
}

function buildMapLocation(bounds: [[number, number], [number, number]] | null): YandexMapLocation {
  if (!bounds) {
    return {
      center: DEFAULT_MAP_CENTER,
      zoom: DEFAULT_MAP_ZOOM,
    };
  }

  const [[minLongitude, minLatitude], [maxLongitude, maxLatitude]] = bounds;

  if (minLongitude === maxLongitude && minLatitude === maxLatitude) {
    return {
      center: [minLongitude, minLatitude],
      zoom: 15,
    };
  }

  return {
    bounds,
    padding: [48, 48, 48, 48],
    duration: 250,
  };
}

function extractCoordinateFromDragEvent(event: unknown): DeliveryZoneEditorCoordinate | null {
  if (Array.isArray(event) && event.length >= 2) {
    const [longitude, latitude] = event;

    if (typeof longitude === 'number' && Number.isFinite(longitude) && typeof latitude === 'number' && Number.isFinite(latitude)) {
      return [longitude, latitude];
    }
  }

  if (event && typeof event === 'object' && 'coordinates' in event) {
    return extractCoordinateFromDragEvent((event as { coordinates: unknown }).coordinates);
  }

  return null;
}

export function DeliveryZoneMapEditor({
  geometry,
  activePolygonIndex,
  onActivePolygonIndexChange,
  onGeometryChange,
}: DeliveryZoneMapEditorProps) {
  const [mapApi, setMapApi] = useState<YandexMapsReactApi | null>(null);
  const [mapError, setMapError] = useState('');
  const [isMapLoading, setIsMapLoading] = useState(true);
  const [mapLocation, setMapLocation] = useState<YandexMapLocation>(() => buildMapLocation(getDeliveryZoneGeometryBounds(geometry)));
  const [userLocation, setUserLocation] = useState<YandexMapCoordinate | null>(null);
  const [isUserLocationLoading, setIsUserLocationLoading] = useState(false);
  const [userLocationError, setUserLocationError] = useState('');
  const skipNextViewportSyncRef = useRef(false);

  useEffect(() => {
    let isMounted = true;

    setIsMapLoading(true);
    setMapError('');

    void loadYandexMapsReactApi()
      .then((nextMapApi) => {
        if (!isMounted) {
          return;
        }

        setMapApi(nextMapApi);
        setIsMapLoading(false);
      })
      .catch((error: unknown) => {
        if (!isMounted) {
          return;
        }

        setMapError(error instanceof Error ? error.message : 'Не удалось инициализировать карту.');
        setIsMapLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const serializedGeometry = useMemo(() => JSON.stringify(geometry), [geometry]);

  useEffect(() => {
    if (skipNextViewportSyncRef.current) {
      skipNextViewportSyncRef.current = false;
      return;
    }

    setMapLocation(buildMapLocation(getDeliveryZoneGeometryBounds(geometry)));
  }, [serializedGeometry]);

  useEffect(() => {
    let isMounted = true;

    setIsUserLocationLoading(true);
    setUserLocationError('');

    void requestCurrentBrowserLocation()
      .then((nextLocation) => {
        if (!isMounted) {
          return;
        }

        setUserLocation(nextLocation);
        setMapLocation({
          center: nextLocation,
          zoom: CURRENT_LOCATION_ZOOM,
          duration: 300,
        });
        setIsUserLocationLoading(false);
      })
      .catch((error: unknown) => {
        if (!isMounted) {
          return;
        }

        setUserLocationError(error instanceof Error ? error.message : 'Не удалось получить текущее местоположение.');
        setIsUserLocationLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const polygons = geometry?.polygons ?? [];
  const safeActivePolygonIndex =
    polygons.length === 0 ? 0 : Math.min(Math.max(activePolygonIndex, 0), Math.max(polygons.length - 1, 0));
  const activePolygon = polygons[safeActivePolygonIndex] ?? null;

  const updateGeometryWithoutMovingMap = (nextGeometry: DeliveryZoneEditorGeometry | null) => {
    skipNextViewportSyncRef.current = true;
    onGeometryChange(nextGeometry);
  };

  const handleMapClick = (object: unknown, event: { coordinates?: DeliveryZoneEditorCoordinate } | undefined) => {
    if (object) {
      return;
    }

    if (!event?.coordinates) {
      return;
    }

    const nextGeometry = appendDeliveryZonePolygonPoint(
      geometry,
      polygons.length === 0 ? 0 : safeActivePolygonIndex,
      event.coordinates,
    );

    if (polygons.length === 0) {
      onActivePolygonIndexChange(0);
    }

    updateGeometryWithoutMovingMap(nextGeometry);
  };

  const handleAddPolygon = () => {
    const nextGeometry = addDeliveryZonePolygon(geometry);

    updateGeometryWithoutMovingMap(nextGeometry);
    onActivePolygonIndexChange(Math.max(nextGeometry.polygons.length - 1, 0));
  };

  const handleDeletePolygon = (polygonIndex: number) => {
    const nextGeometry = removeDeliveryZonePolygon(geometry, polygonIndex);

    updateGeometryWithoutMovingMap(nextGeometry);
    onActivePolygonIndexChange(Math.max(0, polygonIndex - 1));
  };

  const handleVertexDrag = (pointIndex: number, event: unknown) => {
    const coordinate = extractCoordinateFromDragEvent(event);

    if (!coordinate) {
      return;
    }

    updateGeometryWithoutMovingMap(updateDeliveryZonePolygonPoint(geometry, safeActivePolygonIndex, pointIndex, coordinate));
  };

  const handleDeleteVertex = (pointIndex: number) => {
    updateGeometryWithoutMovingMap(removeDeliveryZonePolygonPoint(geometry, safeActivePolygonIndex, pointIndex));
  };

  const handleFitToGeometry = () => {
    setMapLocation(buildMapLocation(getDeliveryZoneGeometryBounds(geometry)));
  };

  const handleFocusUserLocation = () => {
    setIsUserLocationLoading(true);
    setUserLocationError('');

    void requestCurrentBrowserLocation()
      .then((nextLocation) => {
        setUserLocation(nextLocation);
        setMapLocation({
          center: nextLocation,
          zoom: CURRENT_LOCATION_ZOOM,
          duration: 300,
        });
        setIsUserLocationLoading(false);
      })
      .catch((error: unknown) => {
        setUserLocationError(error instanceof Error ? error.message : 'Не удалось получить текущее местоположение.');
        setIsUserLocationLoading(false);
      });
  };

  const handleClearGeometry = () => {
    updateGeometryWithoutMovingMap(clearDeliveryZoneGeometry());
    onActivePolygonIndexChange(0);
  };

  if (mapError) {
    return (
      <AdminNotice tone="destructive" role="alert" className="rounded-[1.5rem] border-destructive/20 bg-destructive/5">
        {mapError}
      </AdminNotice>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(19rem,0.8fr)]">
      <Card className="rounded-[1.75rem] border border-border/70 bg-card/90 py-0 shadow-[0_24px_70px_rgba(12,35,39,0.08)]">
        <CardHeader className="gap-4 border-b border-border/70 py-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-[0.72rem] font-semibold tracking-[0.18em] text-primary uppercase">Map canvas</p>
              <CardTitle className="text-xl font-semibold tracking-tight">Карта зоны</CardTitle>
            </div>
            <Badge
              variant="secondary"
              className="h-auto rounded-full border border-border/70 bg-card/80 px-3 py-1 text-[0.72rem] font-medium shadow-sm"
            >
              {getDeliveryZoneGeometrySummary(geometry)}
            </Badge>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="lg" className="rounded-full bg-background/80 px-4 shadow-sm" onClick={handleAddPolygon}>
              Новый контур
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="rounded-full bg-background/80 px-4 shadow-sm"
              onClick={handleFocusUserLocation}
              disabled={isUserLocationLoading}
            >
              {isUserLocationLoading ? 'Определяем местоположение...' : 'Мое местоположение'}
            </Button>
            <Button type="button" variant="outline" size="lg" className="rounded-full bg-background/80 px-4 shadow-sm" onClick={handleFitToGeometry}>
              Вписать в экран
            </Button>
            <Button type="button" variant="destructive" size="lg" className="rounded-full px-4 shadow-sm" onClick={handleClearGeometry}>
              Очистить
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-5">
          <div className={MAP_SURFACE_CLASS_NAME}>
            {isMapLoading || !mapApi ? (
              <div className="flex min-h-[560px] items-center justify-center px-6 py-8">
                <p className="text-sm font-medium text-muted-foreground">Загрузка карты...</p>
              </div>
            ) : (
              (() => {
                const { YMap, YMapDefaultFeaturesLayer, YMapDefaultSchemeLayer, YMapFeature, YMapListener, YMapMarker } = mapApi;

                return (
                  <YMap location={mapLocation} mode="vector" className="h-full min-h-[560px] w-full">
                    <YMapDefaultSchemeLayer />
                    <YMapDefaultFeaturesLayer />
                    <YMapListener layer="any" onClick={handleMapClick} />

                    {polygons.map((polygon, polygonIndex) => {
                      if (polygon.outer.length < 3) {
                        return null;
                      }

                      return (
                        <YMapFeature
                          key={`polygon-feature-${polygonIndex}`}
                          geometry={{
                            type: 'Polygon',
                            coordinates: [
                              [...polygon.outer, polygon.outer[0]].filter(Boolean),
                              ...polygon.holes.map((ring) => [...ring, ring[0]].filter(Boolean)),
                            ],
                          }}
                          style={getFeatureStyle(polygonIndex === safeActivePolygonIndex)}
                        />
                      );
                    })}

                    {userLocation ? (
                      <YMapMarker coordinates={userLocation}>
                        <div className={cn(MARKER_CLASS_NAME, 'min-w-10 bg-sky-700 px-2 text-[0.72rem]')}>Вы</div>
                      </YMapMarker>
                    ) : null}

                    {activePolygon?.outer.map((point, pointIndex) => (
                      <YMapMarker
                        key={`polygon-point-${safeActivePolygonIndex}-${pointIndex}`}
                        coordinates={point}
                        draggable
                        onDragMove={(event) => handleVertexDrag(pointIndex, event)}
                        onDragEnd={(event) => handleVertexDrag(pointIndex, event)}
                      >
                        <div className={cn(MARKER_CLASS_NAME, pointIndex === 0 ? 'bg-destructive text-destructive-foreground' : '')}>
                          {pointIndex + 1}
                        </div>
                      </YMapMarker>
                    ))}
                  </YMap>
                );
              })()
            )}
          </div>
        </CardContent>
      </Card>

      <aside className="grid gap-4">
        <Card className={INFO_CARD_CLASS_NAME}>
          <CardHeader className="gap-1 border-b border-border/70 py-5">
            <p className="text-[0.72rem] font-semibold tracking-[0.18em] text-primary uppercase">Guide</p>
            <CardTitle className="text-lg font-semibold tracking-tight">Как редактировать</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-4">
            <p className="text-sm leading-6 text-muted-foreground">
              Клик по карте добавляет вершину в активный контур. Перетаскивайте маркеры, чтобы править форму, и удаляйте лишние
              точки или контуры в списке ниже.
            </p>
            <div className="rounded-[1.1rem] border border-border/70 bg-muted/25 px-4 py-3 text-sm leading-6 text-muted-foreground">
              Первая вершина выделена красным. Кнопка «Вписать в экран» вручную возвращает камеру к текущей геометрии.
            </div>
          </CardContent>
        </Card>

        <Card className={INFO_CARD_CLASS_NAME}>
          <CardHeader className="gap-1 border-b border-border/70 py-5">
            <p className="text-[0.72rem] font-semibold tracking-[0.18em] text-primary uppercase">Geolocation</p>
            <CardTitle className="text-lg font-semibold tracking-tight">Местоположение</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-4">
            <p className="text-sm leading-6 text-muted-foreground">
              {isUserLocationLoading
                ? 'Запрашиваем доступ к местоположению браузера и переводим карту к текущей точке.'
                : userLocation
                  ? `Карта переведена к вашей точке: широта ${formatCoordinateValue(userLocation[1])}, долгота ${formatCoordinateValue(userLocation[0])}.`
                  : userLocationError || 'Текущее местоположение пока не определено.'}
            </p>
            {userLocation ? (
              <div className="rounded-[1.1rem] border border-border/70 bg-muted/25 px-4 py-3 font-mono text-xs text-foreground">
                {formatCoordinateValue(userLocation[1])}, {formatCoordinateValue(userLocation[0])}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className={INFO_CARD_CLASS_NAME}>
          <CardHeader className="gap-3 border-b border-border/70 py-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-[0.72rem] font-semibold tracking-[0.18em] text-primary uppercase">Contours</p>
                <CardTitle className="text-lg font-semibold tracking-tight">Контуры</CardTitle>
              </div>
              <Badge variant="outline" className="h-auto rounded-full px-3 py-1 text-[0.72rem] font-medium">
                {polygons.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-4">
            {polygons.length ? (
              polygons.map((polygon, polygonIndex) => (
                <article
                  key={`polygon-card-${polygonIndex}`}
                  className={cn(
                    'rounded-[1.25rem] border border-border/70 bg-background/70 p-4 transition',
                    polygonIndex === safeActivePolygonIndex && 'border-primary/35 ring-1 ring-primary/10',
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          variant={polygonIndex === safeActivePolygonIndex ? 'secondary' : 'outline'}
                          size="sm"
                          className="rounded-full px-3"
                          onClick={() => onActivePolygonIndexChange(polygonIndex)}
                        >
                          Контур {polygonIndex + 1}
                        </Button>
                        {polygonIndex === safeActivePolygonIndex ? (
                          <Badge variant="secondary" className="h-auto rounded-full px-2.5 py-1 text-[0.72rem] font-medium">
                            Активный
                          </Badge>
                        ) : null}
                      </div>
                      <p className="text-sm leading-6 text-muted-foreground">
                        {polygon.outer.length} вершин{polygon.holes.length ? ` • ${polygon.holes.length} внутренних колец сохранено` : ''}
                      </p>
                    </div>

                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="rounded-full px-3"
                      onClick={() => handleDeletePolygon(polygonIndex)}
                    >
                      Удалить
                    </Button>
                  </div>

                  {polygonIndex === safeActivePolygonIndex ? (
                    <div className="mt-4 space-y-2 border-t border-border/70 pt-4">
                      {polygon.outer.length ? (
                        polygon.outer.map((point, pointIndex) => (
                          <div
                            key={`vertex-${polygonIndex}-${pointIndex}`}
                            className="flex items-center justify-between gap-3 rounded-[1rem] bg-muted/25 px-3 py-3"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground">Точка {pointIndex + 1}</p>
                              <p className="mt-1 font-mono text-xs text-muted-foreground">
                                {formatCoordinateValue(point[1])}, {formatCoordinateValue(point[0])}
                              </p>
                            </div>

                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="rounded-full px-3"
                              onClick={() => handleDeleteVertex(pointIndex)}
                            >
                              Удалить
                            </Button>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-[1rem] border border-dashed border-border/80 bg-muted/25 px-4 py-5 text-sm leading-6 text-muted-foreground">
                          Добавьте точки кликом по карте.
                        </div>
                      )}
                    </div>
                  ) : null}
                </article>
              ))
            ) : (
              <div className="rounded-[1.1rem] border border-dashed border-border/80 bg-muted/25 px-4 py-6 text-sm leading-6 text-muted-foreground">
                Контуры еще не добавлены. Нажмите на карту, чтобы начать рисовать.
              </div>
            )}
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
