import type { ComponentType, ReactNode } from 'react';
import * as React from 'react';
import * as ReactDOM from 'react-dom';

export type YandexMapCoordinate = [number, number];
export type YandexMapBounds = [YandexMapCoordinate, YandexMapCoordinate];

export type YandexMapLocation = {
  center?: YandexMapCoordinate;
  zoom?: number;
  duration?: number;
  bounds?: YandexMapBounds;
  padding?: [number, number, number, number];
};

type YandexMapGeometry = {
  type: 'Polygon' | 'MultiPolygon';
  coordinates: unknown[];
};

type YMapProps = {
  location: YandexMapLocation;
  mode?: 'vector' | 'raster' | 'auto';
  className?: string;
  children?: ReactNode;
};

type YMapFeatureProps = {
  geometry: YandexMapGeometry;
  style?: {
    fill?: string;
    stroke?: Array<{
      color: string;
      width: number;
    }>;
  };
};

type YMapMarkerProps = {
  coordinates: YandexMapCoordinate;
  draggable?: boolean;
  onDragMove?: (event: unknown) => void;
  onDragEnd?: (event: unknown) => void;
  children?: ReactNode;
};

type YMapListenerProps = {
  layer?: string;
  onClick?: (object: unknown, event: { coordinates?: YandexMapCoordinate } | undefined) => void;
};

export type YandexMapsReactApi = {
  YMap: ComponentType<YMapProps>;
  YMapDefaultSchemeLayer: ComponentType<Record<string, never>>;
  YMapDefaultFeaturesLayer: ComponentType<Record<string, never>>;
  YMapFeature: ComponentType<YMapFeatureProps>;
  YMapMarker: ComponentType<YMapMarkerProps>;
  YMapListener: ComponentType<YMapListenerProps>;
};

type YandexMapsReactifyModule = {
  reactify: {
    bindTo: (react: typeof React, reactDom: typeof ReactDOM) => {
      module: (module: unknown) => unknown;
    };
  };
};

type YandexMapsGlobal = {
  ready: Promise<void>;
  import: (moduleName: string) => Promise<unknown>;
};

declare global {
  interface Window {
    ymaps3?: YandexMapsGlobal;
  }
}

const YANDEX_MAPS_SCRIPT_ID = 'yandex-maps-js-api-v3';
let yandexMapsReactApiPromise: Promise<YandexMapsReactApi> | null = null;

function getYandexMapsApiKey(): string {
  const apiKey = import.meta.env.VITE_YANDEX_MAPS_API_KEY?.trim() ?? '';

  if (!apiKey) {
    throw new Error('Для работы редактора карты укажите VITE_YANDEX_MAPS_API_KEY.');
  }

  return apiKey;
}

function getYandexMapsLang(): string {
  const lang = import.meta.env.VITE_YANDEX_MAPS_LANG?.trim() ?? 'ru_RU';

  return lang || 'ru_RU';
}

function buildYandexMapsScriptUrl(): string {
  const apiKey = encodeURIComponent(getYandexMapsApiKey());
  const lang = encodeURIComponent(getYandexMapsLang());

  return `https://api-maps.yandex.ru/v3/?apikey=${apiKey}&lang=${lang}`;
}

function getCurrentOriginLabel(): string {
  if (typeof window === 'undefined' || !window.location.origin) {
    return 'текущий origin приложения';
  }

  return window.location.origin;
}

function buildYandexMapsLoadErrorMessage(): string {
  return `Yandex Maps JS API v3 вернул 403. Проверьте, что ключ активен, создан для JavaScript API, и в Developer Dashboard заполнено Restriction by HTTP Referer для origin ${getCurrentOriginLabel()}. Для локальной разработки обычно нужны http://localhost и/или http://127.0.0.1 без порта.`;
}

function loadScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    const existingScript = document.getElementById(YANDEX_MAPS_SCRIPT_ID) as HTMLScriptElement | null;

    if (existingScript) {
      if (window.ymaps3) {
        resolve();
        return;
      }

      existingScript.addEventListener('load', () => resolve(), { once: true });
      existingScript.addEventListener('error', () => reject(new Error(buildYandexMapsLoadErrorMessage())), {
        once: true,
      });
      return;
    }

    const script = document.createElement('script');
    script.id = YANDEX_MAPS_SCRIPT_ID;
    script.src = buildYandexMapsScriptUrl();
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(buildYandexMapsLoadErrorMessage()));

    document.head.appendChild(script);
  });
}

export async function loadYandexMapsReactApi(): Promise<YandexMapsReactApi> {
  if (!yandexMapsReactApiPromise) {
    yandexMapsReactApiPromise = (async () => {
      await loadScript();

      const ymaps3 = window.ymaps3;

      if (!ymaps3) {
        throw new Error('Yandex Maps JS API v3 не инициализировался.');
      }

      await ymaps3.ready;

      const reactifyModule = (await ymaps3.import('@yandex/ymaps3-reactify')) as YandexMapsReactifyModule;
      const reactify = reactifyModule.reactify.bindTo(React, ReactDOM);

      return reactify.module(ymaps3) as YandexMapsReactApi;
    })().catch((error) => {
      yandexMapsReactApiPromise = null;
      throw error;
    });
  }

  return yandexMapsReactApiPromise;
}
