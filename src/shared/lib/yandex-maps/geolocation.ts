import type { YandexMapCoordinate } from './api';

const GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 0,
};

function buildGeolocationErrorMessage(error: GeolocationPositionError): string {
  switch (error.code) {
    case 1:
      return 'Доступ к местоположению заблокирован. Разрешите геолокацию в браузере и откройте карту повторно.';
    case 2:
      return 'Не удалось определить текущее местоположение.';
    case 3:
      return 'Превышено время ожидания ответа от сервиса геолокации.';
    default:
      return 'Не удалось получить текущее местоположение.';
  }
}

export function isBrowserGeolocationSupported(): boolean {
  return typeof navigator !== 'undefined' && 'geolocation' in navigator;
}

export function requestCurrentBrowserLocation(): Promise<YandexMapCoordinate> {
  if (!isBrowserGeolocationSupported()) {
    return Promise.reject(new Error('Браузер не поддерживает определение местоположения для этой карты.'));
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve([position.coords.longitude, position.coords.latitude]);
      },
      (error) => {
        reject(new Error(buildGeolocationErrorMessage(error)));
      },
      GEOLOCATION_OPTIONS,
    );
  });
}
