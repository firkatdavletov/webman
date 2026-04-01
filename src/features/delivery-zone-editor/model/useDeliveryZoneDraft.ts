import { useEffect, useMemo, useState } from 'react';
import { cloneDeliveryZoneEditorValues } from './zoneFormMappers';
import type { DeliveryZoneEditorValues } from './types';

type DeliveryZoneDraftState = {
  baseline: DeliveryZoneEditorValues;
  current: DeliveryZoneEditorValues;
  sourceFingerprint: string;
};

type UseDeliveryZoneDraftOptions = {
  draftKey: string;
  sourceValues: DeliveryZoneEditorValues;
  sourceFingerprint: string;
  ready?: boolean;
};

const STORAGE_PREFIX = 'delivery-zone-draft:';

function getStorageKey(draftKey: string): string {
  return `${STORAGE_PREFIX}${draftKey}`;
}

function canUseSessionStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';
}

function serializeDraftValues(values: DeliveryZoneEditorValues): string {
  return JSON.stringify(values);
}

function isValidDraftShape(value: unknown): value is DeliveryZoneDraftState {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const draftState = value as Partial<DeliveryZoneDraftState>;

  return typeof draftState.sourceFingerprint === 'string' && !!draftState.baseline && !!draftState.current;
}

function readStoredDraftState(draftKey: string): DeliveryZoneDraftState | null {
  if (!canUseSessionStorage()) {
    return null;
  }

  try {
    const rawValue = window.sessionStorage.getItem(getStorageKey(draftKey));

    if (!rawValue) {
      return null;
    }

    const parsedValue = JSON.parse(rawValue) as unknown;

    if (!isValidDraftShape(parsedValue)) {
      window.sessionStorage.removeItem(getStorageKey(draftKey));
      return null;
    }

    return {
      baseline: cloneDeliveryZoneEditorValues(parsedValue.baseline),
      current: cloneDeliveryZoneEditorValues(parsedValue.current),
      sourceFingerprint: parsedValue.sourceFingerprint,
    };
  } catch {
    return null;
  }
}

function writeStoredDraftState(draftKey: string, state: DeliveryZoneDraftState): void {
  if (!canUseSessionStorage()) {
    return;
  }

  window.sessionStorage.setItem(
    getStorageKey(draftKey),
    JSON.stringify({
      baseline: state.baseline,
      current: state.current,
      sourceFingerprint: state.sourceFingerprint,
    }),
  );
}

export function getDeliveryZoneDraftKey(zoneId?: string | null): string {
  const normalizedZoneId = zoneId?.trim() ?? '';

  return normalizedZoneId || 'new';
}

export function clearStoredDeliveryZoneDraft(draftKey: string): void {
  if (!canUseSessionStorage()) {
    return;
  }

  window.sessionStorage.removeItem(getStorageKey(draftKey));
}

export function useDeliveryZoneDraft({
  draftKey,
  sourceValues,
  sourceFingerprint,
  ready = true,
}: UseDeliveryZoneDraftOptions) {
  const [draftState, setDraftState] = useState<DeliveryZoneDraftState | null>(() => readStoredDraftState(draftKey));

  useEffect(() => {
    if (!ready) {
      return;
    }

    const storedState = readStoredDraftState(draftKey);

    if (storedState?.sourceFingerprint === sourceFingerprint) {
      setDraftState(storedState);
      return;
    }

    setDraftState((currentState) => {
      if (currentState?.sourceFingerprint === sourceFingerprint) {
        return currentState;
      }

      const nextState: DeliveryZoneDraftState = {
        baseline: cloneDeliveryZoneEditorValues(sourceValues),
        current: cloneDeliveryZoneEditorValues(sourceValues),
        sourceFingerprint,
      };

      writeStoredDraftState(draftKey, nextState);

      return nextState;
    });
  }, [draftKey, ready, sourceFingerprint, sourceValues]);

  const effectiveState = useMemo<DeliveryZoneDraftState>(
    () =>
      draftState ?? {
        baseline: cloneDeliveryZoneEditorValues(sourceValues),
        current: cloneDeliveryZoneEditorValues(sourceValues),
        sourceFingerprint,
      },
    [draftState, sourceFingerprint, sourceValues],
  );

  const isDirty = useMemo(
    () => serializeDraftValues(effectiveState.current) !== serializeDraftValues(effectiveState.baseline),
    [effectiveState.baseline, effectiveState.current],
  );

  const updateCurrentValues = (updater: (currentValues: DeliveryZoneEditorValues) => DeliveryZoneEditorValues) => {
    setDraftState((currentState) => {
      const nextBaseState = currentState ?? {
        baseline: cloneDeliveryZoneEditorValues(sourceValues),
        current: cloneDeliveryZoneEditorValues(sourceValues),
        sourceFingerprint,
      };
      const nextState: DeliveryZoneDraftState = {
        ...nextBaseState,
        current: cloneDeliveryZoneEditorValues(updater(cloneDeliveryZoneEditorValues(nextBaseState.current))),
      };

      writeStoredDraftState(draftKey, nextState);

      return nextState;
    });
  };

  const replaceDraft = (nextValues: DeliveryZoneEditorValues, nextFingerprint: string = sourceFingerprint) => {
    const nextState: DeliveryZoneDraftState = {
      baseline: cloneDeliveryZoneEditorValues(nextValues),
      current: cloneDeliveryZoneEditorValues(nextValues),
      sourceFingerprint: nextFingerprint,
    };

    writeStoredDraftState(draftKey, nextState);
    setDraftState(nextState);
  };

  const resetDraft = () => {
    setDraftState((currentState) => {
      const nextBaseState = currentState ?? {
        baseline: cloneDeliveryZoneEditorValues(sourceValues),
        current: cloneDeliveryZoneEditorValues(sourceValues),
        sourceFingerprint,
      };
      const nextState: DeliveryZoneDraftState = {
        ...nextBaseState,
        current: cloneDeliveryZoneEditorValues(nextBaseState.baseline),
      };

      writeStoredDraftState(draftKey, nextState);

      return nextState;
    });
  };

  const clearDraft = () => {
    clearStoredDeliveryZoneDraft(draftKey);
    setDraftState(null);
  };

  return {
    currentValues: effectiveState.current,
    baselineValues: effectiveState.baseline,
    isDirty,
    isReady: ready ? draftState !== null || sourceFingerprint.length > 0 : false,
    updateCurrentValues,
    replaceDraft,
    resetDraft,
    clearDraft,
  };
}
