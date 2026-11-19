import { MM } from "../units.js";

/**
 * Leitungstypen / Querschnitte / Adern — DIN-VDE-Farbfolge (markenneutral).
 * Optik: Manteldurchmesser + farbige Aderenden zum Verklemmen.
 */

export const CABLE_TYPES = [
  {
    id: "nym-j",
    label: "NYM-J",
    description: "Installationsleitung mit PE",
    hasPe: true,
    sheath: 0xb8a090,
  },
  {
    id: "nym-o",
    label: "NYM-O",
    description: "Installationsleitung ohne PE",
    hasPe: false,
    sheath: 0xb8a090,
  },
  {
    id: "h07v-u",
    label: "H07V-U",
    description: "Aderleitung starr (Einzelader)",
    hasPe: false,
    singleCore: true,
    sheath: 0x3a3a3a,
  },
];

export const CROSS_SECTIONS_MM2 = [1.5, 2.5, 4, 6];

export const CORE_COUNTS = [1, 2, 3, 4, 5];

/** Outer sheath diameter in metres (approx. practice values). */
export function sheathDiameterM(cores, mm2, typeId = "nym-j") {
  if (typeId === "h07v-u" || cores === 1) {
    const table = { 1.5: 3.4, 2.5: 4.0, 4: 4.8, 6: 5.6 };
    return (table[mm2] || 4) * MM;
  }
  // Rough NYM outer Ø
  const base = {
    "3x1.5": 9.5,
    "3x2.5": 11.2,
    "3x4": 13.0,
    "4x1.5": 10.5,
    "4x2.5": 12.5,
    "5x1.5": 11.8,
    "5x2.5": 14.0,
    "5x4": 16.0,
    "2x1.5": 8.5,
    "2x2.5": 10.0,
  };
  const key = `${cores}x${mm2}`;
  const mm = base[key] || 8 + cores * 1.2 + mm2 * 0.6;
  return mm * MM;
}

/**
 * Core colors for stripped ends (brown/black/grey/blue/gn-ye).
 * @returns {{ id: string, label: string, color: number }[]}
 */
export function coreColorsFor({ typeId, cores }) {
  const type = CABLE_TYPES.find((t) => t.id === typeId) || CABLE_TYPES[0];
  if (type.singleCore || cores === 1) {
    return [{ id: "l", label: "L", color: 0x8b5a2b }]; // brown default single
  }

  const L = [
    { id: "l1", label: "L1", color: 0x8b5a2b }, // brown
    { id: "l2", label: "L2", color: 0x1a1a1a }, // black
    { id: "l3", label: "L3", color: 0x808080 }, // grey
  ];
  const N = { id: "n", label: "N", color: 0x1f6fb2 };
  const PE = { id: "pe", label: "PE", color: 0xc7a81a }; // yellow base; stripe via second mesh if needed

  if (!type.hasPe) {
    if (cores === 2) return [L[0], N];
    if (cores === 3) return [L[0], L[1], N];
    if (cores === 4) return [L[0], L[1], L[2], N];
    return [...L, N, { id: "l4", label: "L4", color: 0x6b4423 }];
  }

  // with PE
  if (cores === 2) return [L[0], PE];
  if (cores === 3) return [L[0], N, PE];
  if (cores === 4) return [L[0], L[1], N, PE];
  return [L[0], L[1], L[2], N, PE];
}

export function formatCableSpec(spec) {
  if (!spec) return "";
  const type = CABLE_TYPES.find((t) => t.id === spec.typeId);
  return `${type?.label || spec.typeId} ${spec.cores}×${spec.mm2} mm²`;
}

export function defaultCableSpec() {
  return { typeId: "nym-j", mm2: 1.5, cores: 3 };
}

export function normalizeCableSpec(raw) {
  const base = defaultCableSpec();
  const typeId = CABLE_TYPES.some((t) => t.id === raw?.typeId) ? raw.typeId : base.typeId;
  const mm2 = CROSS_SECTIONS_MM2.includes(Number(raw?.mm2)) ? Number(raw.mm2) : base.mm2;
  let cores = CORE_COUNTS.includes(Number(raw?.cores)) ? Number(raw.cores) : base.cores;
  const type = CABLE_TYPES.find((t) => t.id === typeId);
  if (type?.singleCore) cores = 1;
  if (typeId === "nym-j" && cores < 2) cores = 3;
  if (typeId === "nym-o" && cores < 2) cores = 2;
  return { typeId, mm2, cores };
}
