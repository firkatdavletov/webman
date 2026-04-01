import { useEffect, useMemo, useState } from 'react';
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
import { requestCurrentBrowserLocation } from '@/shared/lib/yandex-maps/geolocation';

type DeliveryZoneMapEditorProps = {
  geometry: DeliveryZoneEditorGeometry | null;
  activePolygonIndex: number;
  onActivePolygonIndexChange: (polygonIndex: number) => void;
  onGeometryChange: (geometry: DeliveryZoneEditorGeometry | null) => void;
};

const DEFAULT_MAP_CENTER: DeliveryZoneEditorCoordinate = [37.617635, 55.755814];
const DEFAULT_MAP_ZOOM = 10;
const CURRENT_LOCATION_ZOOM = 15;

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

    onGeometryChange(nextGeometry);
  };

  const handleAddPolygon = () => {
    const nextGeometry = addDeliveryZonePolygon(geometry);

    onGeometryChange(nextGeometry);
    onActivePolygonIndexChange(Math.max(nextGeometry.polygons.length - 1, 0));
  };

  const handleDeletePolygon = (polygonIndex: number) => {
    const nextGeometry = removeDeliveryZonePolygon(geometry, polygonIndex);

    onGeometryChange(nextGeometry);
    onActivePolygonIndexChange(Math.max(0, polygonIndex - 1));
  };

  const handleVertexDrag = (pointIndex: number, event: unknown) => {
    const coordinate = extractCoordinateFromDragEvent(event);

    if (!coordinate) {
      return;
    }

    onGeometryChange(updateDeliveryZonePolygonPoint(geometry, safeActivePolygonIndex, pointIndex, coordinate));
  };

  const handleDeleteVertex = (pointIndex: number) => {
    onGeometryChange(removeDeliveryZonePolygonPoint(geometry, safeActivePolygonIndex, pointIndex));
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
    onGeometryChange(clearDeliveryZoneGeometry());
    onActivePolygonIndexChange(0);
  };

  if (mapError) {
    return (
      <div className="delivery-zone-map-shell">
        <div className="delivery-zone-map-canvas delivery-zone-map-fallback">
          <p className="form-error" role="alert">
            {mapError}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="delivery-zone-map-shell">
      <div className="delivery-zone-map-stage">
        <div className="delivery-zone-map-toolbar">
          <span className="status-chip">{getDeliveryZoneGeometrySummary(geometry)}</span>
          <div className="delivery-zone-map-toolbar-actions">
            <button type="button" className="secondary-button" onClick={handleAddPolygon}>
              Новый контур
            </button>
            <button type="button" className="secondary-button" onClick={handleFocusUserLocation} disabled={isUserLocationLoading}>
              {isUserLocationLoading ? 'Определяем местоположение...' : 'Мое местоположение'}
            </button>
            <button type="button" className="secondary-button" onClick={handleFitToGeometry}>
              Вписать в экран
            </button>
            <button type="button" className="secondary-button secondary-button-danger" onClick={handleClearGeometry}>
              Очистить
            </button>
          </div>
        </div>

        <div className="delivery-zone-map-canvas">
          {isMapLoading || !mapApi ? (
            <div className="delivery-zone-map-placeholder">
              <p className="catalog-empty-state">Загрузка карты...</p>
            </div>
          ) : (
            (() => {
              const { YMap, YMapDefaultFeaturesLayer, YMapDefaultSchemeLayer, YMapFeature, YMapListener, YMapMarker } = mapApi;

              return (
                <YMap location={mapLocation} mode="vector" className="delivery-zone-map-instance">
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
                      <div className="delivery-zone-map-marker delivery-point-map-marker delivery-zone-map-marker-current">Вы</div>
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
                      <div className={`delivery-zone-map-marker${pointIndex === 0 ? ' delivery-zone-map-marker-primary' : ''}`}>
                        {pointIndex + 1}
                      </div>
                    </YMapMarker>
                  ))}
                </YMap>
              );
            })()
          )}
        </div>
      </div>

      <aside className="delivery-zone-map-sidebar">
        <div className="catalog-card-copy">
          <h4 className="delivery-subtitle">Как редактировать</h4>
          <p className="catalog-meta">
            Клик по карте добавляет вершину в активный контур. Перетаскивайте маркеры, чтобы править форму, и удаляйте лишние точки
            или контуры в списке справа.
          </p>
        </div>

        <div className="delivery-zone-preview-item">
          <h5 className="delivery-zone-preview-title">Местоположение</h5>
          <p className="catalog-meta">
            {isUserLocationLoading
              ? 'Запрашиваем доступ к местоположению браузера и переводим карту к текущей точке.'
              : userLocation
                ? `Карта переведена к вашей точке: широта ${formatCoordinateValue(userLocation[1])}, долгота ${formatCoordinateValue(userLocation[0])}.`
                : userLocationError || 'Текущее местоположение пока не определено.'}
          </p>
        </div>

        <div className="delivery-zone-contour-list">
          {polygons.length ? (
            polygons.map((polygon, polygonIndex) => (
              <article
                key={`polygon-card-${polygonIndex}`}
                className={`delivery-zone-contour-card${polygonIndex === safeActivePolygonIndex ? ' delivery-zone-contour-card-active' : ''}`}
              >
                <div className="delivery-zone-header-row">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => onActivePolygonIndexChange(polygonIndex)}
                  >
                    Контур {polygonIndex + 1}
                  </button>

                  <button
                    type="button"
                    className="secondary-button secondary-button-danger"
                    onClick={() => handleDeletePolygon(polygonIndex)}
                  >
                    Удалить
                  </button>
                </div>

                <p className="catalog-meta">
                  {polygon.outer.length} вершин{polygon.holes.length ? ` • ${polygon.holes.length} внутренних колец сохранено` : ''}
                </p>

                {polygonIndex === safeActivePolygonIndex ? (
                  <div className="delivery-zone-vertex-list">
                    {polygon.outer.length ? (
                      polygon.outer.map((point, pointIndex) => (
                        <div key={`vertex-${polygonIndex}-${pointIndex}`} className="delivery-zone-vertex-item">
                          <div>
                            <p className="delivery-zone-vertex-title">Точка {pointIndex + 1}</p>
                            <p className="catalog-meta">
                              {formatCoordinateValue(point[1])}, {formatCoordinateValue(point[0])}
                            </p>
                          </div>

                          <button
                            type="button"
                            className="secondary-button secondary-button-danger"
                            onClick={() => handleDeleteVertex(pointIndex)}
                          >
                            Удалить
                          </button>
                        </div>
                      ))
                    ) : (
                      <p className="catalog-empty-state">Добавьте точки кликом по карте.</p>
                    )}
                  </div>
                ) : null}
              </article>
            ))
          ) : (
            <p className="catalog-empty-state">Контуры еще не добавлены. Нажмите на карту, чтобы начать рисовать.</p>
          )}
        </div>
      </aside>
    </div>
  );
}
