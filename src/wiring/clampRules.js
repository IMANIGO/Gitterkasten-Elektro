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
 * Gleichmäßige Schellen auf Geraden.
 * 90°-Kurven: letzte Schelle der Geraden = Kurvenanfang, Radius 80 mm (Kastenecke 90 mm),
 * danach wieder eine Schelle — die Kurve wird immer mit einer Schelle abgeschlossen.
 * @param {number} pathLengthM Gesamtlänge der Leitung (m)
 * @param {{ fromEquipment?: number, maxSpacing?: number, bends?: { enterDist: number, leaveDist: number }[] }} [opts]
 * @returns {number[]} Abstände vom Start entlang der Bahn (m)
 */
export function computeClampDistancesAlongPath(pathLengthM, opts = {}) {
  return computeClampLayout(pathLengthM, opts).map((c) => c.distanceM);
}

/**
 * @returns {{ distanceM: number, role: 'straight' | 'bend-start' | 'bend-end' }[]}
 */
export function computeClampLayout(pathLengthM, opts = {}) {
  const fromEq = opts.fromEquipment ?? CLAMP_RULES.fromEquipment;
  const maxSp = opts.maxSpacing ?? CLAMP_RULES.maxSpacing;
  const bends = (opts.bends || [])
    .filter((b) => b && b.leaveDist > b.enterDist + 1 * MM)
    .slice()
    .sort((a, b) => a.enterDist - b.enterDist);

  if (!(pathLengthM > 0)) return [];

  if (!bends.length) {
    if (pathLengthM <= 2 * fromEq) return [];
    const usable = pathLengthM - 2 * fromEq;
    const gaps = Math.max(1, Math.ceil(usable / maxSp));
    const spacing = usable / gaps;
    const out = [];
    for (let i = 0; i <= gaps; i++) {
      out.push({ distanceM: fromEq + i * spacing, role: "straight" });
    }
    return out;
  }

  /** @type {{ distanceM: number, role: string }[]} */
  const raw = [];

  function fillStraight(a, b) {
    if (!(b > a + 0.5 * MM)) {
      raw.push({ distanceM: a, role: "straight" });
      return;
    }
    const span = b - a;
    const gaps = Math.max(1, Math.ceil(span / maxSp - 1e-9));
    const spacing = span / gaps;
    for (let i = 0; i <= gaps; i++) {
      raw.push({ distanceM: a + i * spacing, role: "straight" });
    }
  }

  const first = bends[0];
  if (first.enterDist > fromEq + 1 * MM) {
    fillStraight(fromEq, first.enterDist);
  }

  for (let i = 0; i < bends.length; i++) {
    const bend = bends[i];
    raw.push({ distanceM: bend.enterDist, role: "bend-start" });
    raw.push({ distanceM: bend.leaveDist, role: "bend-end" });
    const next = bends[i + 1];
    if (next && next.enterDist > bend.leaveDist + 1 * MM) {
      fillStraight(bend.leaveDist, next.enterDist);
    }
  }

  const last = bends[bends.length - 1];
  const endClamp = pathLengthM - fromEq;
  if (endClamp > last.leaveDist + 1 * MM) {
    fillStraight(last.leaveDist, endClamp);
  }

  raw.sort((a, b) => a.distanceM - b.distanceM);
  const merged = [];
  for (const item of raw) {
    if (item.distanceM < -1 * MM || item.distanceM > pathLengthM + 1 * MM) continue;
    const prev = merged[merged.length - 1];
    if (prev && Math.abs(item.distanceM - prev.distanceM) < 3 * MM) {
      if (item.role !== "straight") prev.role = item.role;
      continue;
    }
    merged.push({ ...item });
  }
  return merged;
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
