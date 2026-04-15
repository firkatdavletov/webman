import { useEffect, useMemo, useState } from 'react';
import { loadYandexMapsReactApi, type YandexMapCoordinate, type YandexMapLocation, type YandexMapsReactApi } from '@/shared/lib/yandex-maps/api';
import { requestCurrentBrowserLocation } from '@/shared/lib/yandex-maps/geolocation';
import { AdminNotice, Badge, Button } from '@/shared/ui';

type PickupPointMapEditorProps = {
  coordinates: YandexMapCoordinate | null;
  title: string;
  addressSummary: string;
  onCoordinatesChange: (coordinates: YandexMapCoordinate | null) => void;
};

const DEFAULT_MAP_CENTER: YandexMapCoordinate = [37.617635, 55.755814];
const DEFAULT_MAP_ZOOM = 10;
const CURRENT_LOCATION_ZOOM = 15;

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

  const serializedCoordinates = useMemo(() => JSON.stringify(coordinates), [coordinates]);

  useEffect(() => {
    setMapLocation(buildMapLocation(coordinates));
  }, [serializedCoordinates]);

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

  const handleClear = () => {
    onCoordinatesChange(null);
  };

  if (mapError) {
    return (
      <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-border/70 bg-muted/30 p-4">
        <AdminNotice tone="destructive" role="alert">{mapError}</AdminNotice>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 md:flex-row">
      <div className="flex min-h-[440px] flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            className={`border ${coordinates ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-border bg-muted/40 text-muted-foreground'}`}
          >
            {coordinates ? 'Точка выбрана' : 'Точка не выбрана'}
          </Badge>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleFocusUserLocation} disabled={isUserLocationLoading}>
              {isUserLocationLoading ? 'Определяем...' : 'Моё местоположение'}
            </Button>
            <Button variant="outline" size="sm" onClick={handleFit}>
              Показать точку
            </Button>
            <Button variant="outline" size="sm" onClick={handleClear}>
              Очистить координаты
            </Button>
          </div>
        </div>

        <div className="relative flex-1 overflow-hidden rounded-xl bg-muted/30">
          {isMapLoading || !mapApi ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-muted-foreground">Загрузка карты...</p>
            </div>
          ) : (
            (() => {
              const { YMap, YMapDefaultFeaturesLayer, YMapDefaultSchemeLayer, YMapListener, YMapMarker } = mapApi;

              return (
                <YMap location={mapLocation} mode="vector" className="absolute inset-0">
                  <YMapDefaultSchemeLayer />
                  <YMapDefaultFeaturesLayer />
                  <YMapListener layer="any" onClick={handleMapClick} />

                  {userLocation ? (
                    <YMapMarker coordinates={userLocation}>
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white shadow">
                        Вы
                      </div>
                    </YMapMarker>
                  ) : null}

                  {coordinates ? (
                    <YMapMarker coordinates={coordinates} draggable onDragMove={handleMarkerDrag} onDragEnd={handleMarkerDrag}>
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white shadow">
                        ПВ
                      </div>
                    </YMapMarker>
                  ) : null}
                </YMap>
              );
            })()
          )}
        </div>
      </div>

      <aside className="shrink-0 space-y-4 md:w-64">
        <div className="space-y-0.5">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="text-sm text-muted-foreground">{addressSummary}</p>
        </div>

        <div className="space-y-1">
          <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">Как работать с картой</p>
          <p className="text-sm text-muted-foreground">
            Кликните по карте, чтобы поставить точку пункта самовывоза. Маркер можно перетащить мышью.
          </p>
        </div>

        <div className="space-y-1">
          <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">Местоположение</p>
          <p className="text-sm text-muted-foreground">
            {isUserLocationLoading
              ? 'Запрашиваем доступ к местоположению браузера и переводим карту к текущей точке.'
              : userLocation
                ? `Карта переведена к вашей точке: широта ${formatCoordinateValue(userLocation[1])}, долгота ${formatCoordinateValue(userLocation[0])}.`
                : userLocationError || 'Текущее местоположение пока не определено.'}
          </p>
        </div>

        <div className="space-y-1">
          <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">Текущие координаты</p>
          <p className="text-sm text-muted-foreground">
            {coordinates
              ? `Широта ${formatCoordinateValue(coordinates[1])}, долгота ${formatCoordinateValue(coordinates[0])}`
              : 'Координаты пока не выбраны.'}
          </p>
        </div>
      </aside>
    </div>
  );
}
