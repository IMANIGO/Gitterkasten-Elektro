/** One Three.js world unit = 1 metre. Electrical dimensions stay in millimetres. */
export const MM = 0.001;

/** Metres → millimetres, rounded for labels (avoids 488.00000000000006). */
export function toMm(metres) {
  return Math.round(metres / MM);
}

/** Teilungseinheit on a DIN rail (IEC 60715 / DIN 43880). */
export const TE = 18 * MM;

/** Prüfwand hole / wire pitch. */
export const GRID_PITCH = 50 * MM;
