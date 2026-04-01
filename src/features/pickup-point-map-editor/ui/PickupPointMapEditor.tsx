import { useEffect, useMemo, useState } from 'react';
import { loadYandexMapsReactApi, type YandexMapCoordinate, type YandexMapLocation, type YandexMapsReactApi } from '@/shared/lib/yandex-maps/api';

type PickupPointMapEditorProps = {
  coordinates: YandexMapCoordinate | null;
  title: string;
  addressSummary: string;
  onCoordinatesChange: (coordinates: YandexMapCoordinate | null) => void;
};

const DEFAULT_MAP_CENTER: YandexMapCoordinate = [37.617635, 55.755814];
const DEFAULT_MAP_ZOOM = 10;

function formatCoordinateValue(value: number): string {
  return value.toFixed(6);
}

function buildMapLocation(coordinates: YandexMapCoordinate | null): YandexMapLocation {
  if (!coordinates) {
    return {
      center: DEFAULT_MAP_CENTER,
      zoom: DEFAULT_MAP_ZOOM,
    };
  }

  return {
    center: coordinates,
    zoom: 16,
    duration: 250,
  };
}

function extractCoordinateFromDragEvent(event: unknown): YandexMapCoordinate | null {
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

export function PickupPointMapEditor({ coordinates, title, addressSummary, onCoordinatesChange }: PickupPointMapEditorProps) {
  const [mapApi, setMapApi] = useState<YandexMapsReactApi | null>(null);
  const [mapError, setMapError] = useState('');
  const [isMapLoading, setIsMapLoading] = useState(true);
  const [mapLocation, setMapLocation] = useState<YandexMapLocation>(() => buildMapLocation(coordinates));

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

  const serializedCoordinates = useMemo(() => JSON.stringify(coordinates), [coordinates]);

  useEffect(() => {
    setMapLocation(buildMapLocation(coordinates));
  }, [serializedCoordinates]);

  const handleMapClick = (_object: unknown, event: { coordinates?: YandexMapCoordinate } | undefined) => {
    if (!event?.coordinates) {
      return;
    }

    onCoordinatesChange(event.coordinates);
  };

  const handleMarkerDrag = (event: unknown) => {
    const nextCoordinates = extractCoordinateFromDragEvent(event);

    if (!nextCoordinates) {
      return;
    }

    onCoordinatesChange(nextCoordinates);
  };

  const handleFit = () => {
    setMapLocation(buildMapLocation(coordinates));
  };

  const handleClear = () => {
    onCoordinatesChange(null);
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
          <span className="status-chip">{coordinates ? 'Точка выбрана' : 'Точка не выбрана'}</span>
          <div className="delivery-zone-map-toolbar-actions">
            <button type="button" className="secondary-button" onClick={handleFit}>
              Показать точку
            </button>
            <button type="button" className="secondary-button secondary-button-danger" onClick={handleClear}>
              Очистить координаты
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
              const { YMap, YMapDefaultFeaturesLayer, YMapDefaultSchemeLayer, YMapListener, YMapMarker } = mapApi;

              return (
                <YMap location={mapLocation} mode="vector" className="delivery-zone-map-instance">
                  <YMapDefaultSchemeLayer />
                  <YMapDefaultFeaturesLayer />
                  <YMapListener layer="any" onClick={handleMapClick} />

                  {coordinates ? (
                    <YMapMarker coordinates={coordinates} draggable onDragMove={handleMarkerDrag} onDragEnd={handleMarkerDrag}>
                      <div className="delivery-zone-map-marker delivery-point-map-marker">ПВ</div>
                    </YMapMarker>
                  ) : null}
                </YMap>
              );
            })()
          )}
        </div>
      </div>

      <aside className="delivery-zone-map-sidebar">
        <div className="catalog-card-copy">
          <h4 className="delivery-subtitle">{title}</h4>
          <p className="catalog-meta">{addressSummary}</p>
        </div>

        <div className="delivery-zone-preview-item">
          <h5 className="delivery-zone-preview-title">Как работать с картой</h5>
          <p className="catalog-meta">Кликните по карте, чтобы поставить точку пункта самовывоза. Маркер можно перетащить мышью.</p>
        </div>

        <div className="delivery-zone-preview-item">
          <h5 className="delivery-zone-preview-title">Текущие координаты</h5>
          <p className="catalog-meta">
            {coordinates
              ? `Широта ${formatCoordinateValue(coordinates[1])}, долгота ${formatCoordinateValue(coordinates[0])}`
              : 'Координаты пока не выбраны.'}
          </p>
        </div>
      </aside>
    </div>
  );
}
