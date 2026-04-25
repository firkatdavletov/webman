type PublicRuntimeEnv = {
  VITE_API_BASE_URL?: string;
  VITE_YANDEX_MAPS_API_KEY?: string;
  VITE_YANDEX_GEOCODER_API_KEY?: string;
  VITE_YANDEX_MAPS_LANG?: string;
};

declare global {
  interface Window {
    __WEBMAN_ADMIN_ENV__?: PublicRuntimeEnv;
  }
}

function readRuntimeEnvValue(key: keyof PublicRuntimeEnv): string | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  return window.__WEBMAN_ADMIN_ENV__?.[key];
}

function readEnvValue(runtimeValue: string | undefined, buildValue: string | undefined): string {
  return (runtimeValue ?? buildValue)?.trim() ?? '';
}

export const env = {
  apiBaseUrl: readEnvValue(readRuntimeEnvValue('VITE_API_BASE_URL'), import.meta.env.VITE_API_BASE_URL),
  yandexMapsApiKey: readEnvValue(
    readRuntimeEnvValue('VITE_YANDEX_MAPS_API_KEY'),
    import.meta.env.VITE_YANDEX_MAPS_API_KEY,
  ),
  yandexGeocoderApiKey: readEnvValue(
    readRuntimeEnvValue('VITE_YANDEX_GEOCODER_API_KEY'),
    import.meta.env.VITE_YANDEX_GEOCODER_API_KEY,
  ),
  yandexMapsLang:
    readEnvValue(readRuntimeEnvValue('VITE_YANDEX_MAPS_LANG'), import.meta.env.VITE_YANDEX_MAPS_LANG) || 'ru_RU',
};
