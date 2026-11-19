import { MM } from "../units.js";

/**
 * Leitungstypen / Querschnitte / Adern — DIN-VDE-Farbfolge (markenneutral).
 * Einzeladern (H07V-U) nur innerhalb von Betriebsmitteln, ohne Schellen.
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
    id: "h07rn-f",
    label: "H07RN-F",
    description: "Gummischlauchleitung, schwarzer Mantel, mit PE",
    hasPe: true,
    sheath: 0x121212,
  },
  {
    id: "h07v-u",
    label: "H07V-U",
    description: "Einzelader starr · nur in Betriebsmitteln · ohne Schellen",
    hasPe: false,
    singleCore: true,
    sheath: 0x8b5a2b,
  },
];

export const CROSS_SECTIONS_MM2 = [1.5, 2.5, 4, 6];

export const CORE_COUNTS = [1, 2, 3, 4, 5];

/** Aderfarben für Einzeladern (Abfrage in der Verdrahtung). */
export const CORE_COLOR_OPTIONS = [
  { id: "braun", label: "braun", color: 0x8b5a2b },
  { id: "schwarz", label: "schwarz", color: 0x1a1a1a },
  { id: "grau", label: "grau", color: 0x808080 },
  { id: "blau", label: "blau", color: 0x1f6fb2 },
  { id: "gnge", label: "grün-gelb", color: 0xc7a81a },
];

export const CIRCUIT_KINDS = [
  { id: "last", label: "Laststrom (UV links)" },
  { id: "steuer", label: "Steuerkreis (UV rechts)" },
];

export function coreColorOption(id) {
  return CORE_COLOR_OPTIONS.find((c) => c.id === id) || CORE_COLOR_OPTIONS[0];
}

export function isSingleCoreType(typeId) {
  return !!CABLE_TYPES.find((t) => t.id === typeId)?.singleCore;
}

/** Outer sheath diameter in metres (approx. practice values). */
export function sheathDiameterM(cores, mm2, typeId = "nym-j") {
  if (typeId === "h07v-u" || cores === 1) {
    const table = { 1.5: 3.4, 2.5: 4.0, 4: 4.8, 6: 5.6 };
    return (table[mm2] || 4) * MM;
  }
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
  let mm = base[key] || 8 + cores * 1.2 + mm2 * 0.6;
  if (typeId === "h07rn-f") mm += 1.2;
  return mm * MM;
}

/**
 * Core colors for stripped ends (brown/black/grey/blue/gn-ye).
 * Einzelader: gewählte Farbe.
 * @returns {{ id: string, label: string, color: number }[]}
 */
export function coreColorsFor({ typeId, cores, coreColor }) {
  const type = CABLE_TYPES.find((t) => t.id === typeId) || CABLE_TYPES[0];
  if (type.singleCore || cores === 1) {
    const opt = coreColorOption(coreColor);
    return [{ id: opt.id, label: opt.label, color: opt.color }];
  }

  const L = [
    { id: "l1", label: "L1", color: 0x8b5a2b },
    { id: "l2", label: "L2", color: 0x1a1a1a },
    { id: "l3", label: "L3", color: 0x808080 },
  ];
  const N = { id: "n", label: "N", color: 0x1f6fb2 };
  const PE = { id: "pe", label: "PE", color: 0xc7a81a };

  if (!type.hasPe) {
    if (cores === 2) return [L[0], N];
    if (cores === 3) return [L[0], L[1], N];
    if (cores === 4) return [L[0], L[1], L[2], N];
    return [...L, N, { id: "l4", label: "L4", color: 0x6b4423 }];
  }

  if (cores === 2) return [L[0], PE];
  if (cores === 3) return [L[0], N, PE];
  if (cores === 4) return [L[0], L[1], N, PE];
  return [L[0], L[1], L[2], N, PE];
}

/** Mantelfarbe für die 3D-Leitung. Einzelader folgt der gewählten Aderfarbe. */
export function sheathColor(spec) {
  const type = CABLE_TYPES.find((t) => t.id === spec?.typeId);
  if (type?.singleCore) return coreColorsFor(spec)[0]?.color ?? 0x3a3a3a;
  return type?.sheath ?? 0xb8b0a0;
}

export function formatCableSpec(spec) {
  if (!spec) return "";
  const type = CABLE_TYPES.find((t) => t.id === spec.typeId);
  const base = `${type?.label || spec.typeId} ${spec.cores}×${spec.mm2} mm²`;
  if (type?.singleCore) {
    const color = coreColorOption(spec.coreColor).label;
    const kind = spec.circuitKind === "steuer" ? "Steuer" : "Last";
    return `${base} ${color} · ${kind}`;
  }
  if (spec.typeId === "h07rn-f") return `${base} · schwarzer Mantel`;
  return base;
}

export function defaultCableSpec() {
  return { typeId: "nym-j", mm2: 1.5, cores: 3, coreColor: "braun", circuitKind: "last" };
}

export function normalizeCableSpec(raw) {
  const base = defaultCableSpec();
  let typeId = CABLE_TYPES.some((t) => t.id === raw?.typeId) ? raw.typeId : base.typeId;
  if (typeId === "nym-o") typeId = "h07rn-f";
  const mm2 = CROSS_SECTIONS_MM2.includes(Number(raw?.mm2)) ? Number(raw.mm2) : base.mm2;
  let cores = CORE_COUNTS.includes(Number(raw?.cores)) ? Number(raw.cores) : base.cores;
  const type = CABLE_TYPES.find((t) => t.id === typeId);
  if (type?.singleCore) cores = 1;
  if ((typeId === "nym-j" || typeId === "h07rn-f") && cores < 2) cores = 3;
  const coreColor = CORE_COLOR_OPTIONS.some((c) => c.id === raw?.coreColor)
    ? raw.coreColor
    : base.coreColor;
  const circuitKind = raw?.circuitKind === "steuer" ? "steuer" : "last";
  return { typeId, mm2, cores, coreColor, circuitKind };
}
