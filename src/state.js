const listeners = new Set();

export const state = {
  cameraPreset: "gesamt",
  hovered: null,
  mode: "ansicht",
};

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function setState(patch) {
  Object.assign(state, patch);
  for (const fn of listeners) fn(state);
}
