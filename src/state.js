import { DEFAULT_STATION_SLOTS } from "./models/controlStation.js";
import { DEFAULT_RCBO_SPEC } from "./models/rcboSpec.js";
import { defaultCableSpec } from "./wiring/cableTypes.js";

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
  /** @type {{ typeId: string, mm2: number, cores: number }} */
  cableSpec: defaultCableSpec(),
  /** Bestückung des Tasterblocks vor dem Platzieren */
  stationSlots: [...DEFAULT_STATION_SLOTS],
  selectedStationSlots: null,
  /** Charakteristik des FI/LS vor dem Platzieren */
  rcboSpec: { ...DEFAULT_RCBO_SPEC },
  selectedRcboSpec: null,
  selectedObjectId: null,
  selectedLabel: null,
  selectedPositionText: null,
  /** @type {null | 'move' | 'replace'} */
  selectionAction: null,
  activePlanId: null,
  /** @type {'aufbau' | 'stromlauf' | 'klemmen'} */
  planDocView: "aufbau",
};

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function setState(patch) {
  Object.assign(state, patch);
  for (const fn of listeners) fn(state);
}
