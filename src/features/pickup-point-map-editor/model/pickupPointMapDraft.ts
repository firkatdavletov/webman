import {
  buildEmptyPickupPointEditorValues,
  clonePickupPointEditorValues,
  type PickupPointEditorValues,
} from './pickupPointEditor';

const PICKUP_POINT_MAP_DRAFT_STORAGE_KEY = 'pickup-point-map-draft';

function canUseSessionStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';
}

function isPickupPointMapDraft(value: unknown): value is PickupPointEditorValues {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const draft = value as Partial<PickupPointEditorValues>;

  return (
    typeof draft.id === 'string' &&
    typeof draft.code === 'string' &&
    typeof draft.name === 'string' &&
    typeof draft.latitude === 'string' &&
    typeof draft.longitude === 'string' &&
    typeof draft.isActive === 'boolean'
  );
}

export function readPickupPointMapDraft(): PickupPointEditorValues | null {
  if (!canUseSessionStorage()) {
    return null;
  }

  try {
    const rawValue = window.sessionStorage.getItem(PICKUP_POINT_MAP_DRAFT_STORAGE_KEY);

    if (!rawValue) {
      return null;
    }

    const parsedValue = JSON.parse(rawValue) as unknown;

    if (!isPickupPointMapDraft(parsedValue)) {
      window.sessionStorage.removeItem(PICKUP_POINT_MAP_DRAFT_STORAGE_KEY);
      return null;
    }

    return {
      ...buildEmptyPickupPointEditorValues(),
      ...clonePickupPointEditorValues(parsedValue),
    };
  } catch {
    return null;
  }
}

export function writePickupPointMapDraft(values: PickupPointEditorValues): void {
  if (!canUseSessionStorage()) {
    return;
  }

  window.sessionStorage.setItem(PICKUP_POINT_MAP_DRAFT_STORAGE_KEY, JSON.stringify(clonePickupPointEditorValues(values)));
}

export function clearPickupPointMapDraft(): void {
  if (!canUseSessionStorage()) {
    return;
  }

  window.sessionStorage.removeItem(PICKUP_POINT_MAP_DRAFT_STORAGE_KEY);
}

export function consumePickupPointMapDraft(): PickupPointEditorValues | null {
  const draft = readPickupPointMapDraft();

  clearPickupPointMapDraft();

  return draft;
}
