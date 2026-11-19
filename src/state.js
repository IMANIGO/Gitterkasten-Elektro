const listeners = new Set();

export const state = {
  cameraPreset: "gesamt",
  hovered: null,
  mode: "ansicht",
  selectedCatalogId: null,
  placementFeedback: null,
  wiringFeedback: null,
  placedCount: 0,
  wireCount: 0,
  lastWireLengthMm: 0,
};

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function setState(patch) {
  Object.assign(state, patch);
  for (const fn of listeners) fn(state);
}
