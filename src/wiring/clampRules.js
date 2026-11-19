import { MM } from "../units.js";

/**
 * Verbindliche Schellen-Bemaßung (Prüfungssimulator).
 * Alle Werte in Metern (Three.js); mm-Konstanten parallel für UI/Aufmaß.
 */
export const CLAMP_RULES_MM = {
  /** Abstand Schelle ↔ Betriebsmittel / Leitungsende */
  fromEquipmentMm: 70,
  /** Maximaler Abstand zwischen zwei Schellen */
  maxSpacingMm: 220,
  /** Biegeradius 90°-Kurve (frei) */
  bendRadiusMm: 80,
  /** Biegeradius 90°-Kurve in Ecke des Kastens */
  cornerBendRadiusMm: 90,
};

export const CLAMP_RULES = {
  fromEquipment: CLAMP_RULES_MM.fromEquipmentMm * MM,
  maxSpacing: CLAMP_RULES_MM.maxSpacingMm * MM,
  bendRadius: CLAMP_RULES_MM.bendRadiusMm * MM,
  cornerBendRadius: CLAMP_RULES_MM.cornerBendRadiusMm * MM,
};

/**
 * Gleichmäßige Schellen-Positionen entlang einer polylinierten Leitungsachse.
 * @param {number} pathLengthM Gesamtlänge der Leitung (m)
 * @param {{ fromEquipment?: number, maxSpacing?: number }} [opts]
 * @returns {number[]} Abstände vom Start entlang der Bahn (m)
 */
export function computeClampDistancesAlongPath(pathLengthM, opts = {}) {
  const fromEq = opts.fromEquipment ?? CLAMP_RULES.fromEquipment;
  const maxSp = opts.maxSpacing ?? CLAMP_RULES.maxSpacing;

  if (!(pathLengthM > 0) || pathLengthM <= 2 * fromEq) {
    return [];
  }

  const usable = pathLengthM - 2 * fromEq;
  const gaps = Math.max(1, Math.ceil(usable / maxSp));
  const spacing = usable / gaps;
  const distances = [];
  for (let i = 0; i <= gaps; i++) {
    distances.push(fromEq + i * spacing);
  }
  return distances;
}

/**
 * @param {'free' | 'boxCorner'} kind
 */
export function bendRadiusFor(kind) {
  return kind === "boxCorner" ? CLAMP_RULES.cornerBendRadius : CLAMP_RULES.bendRadius;
}

export function bendRadiusMmFor(kind) {
  return kind === "boxCorner" ? CLAMP_RULES_MM.cornerBendRadiusMm : CLAMP_RULES_MM.bendRadiusMm;
}
