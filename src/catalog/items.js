import { MM, TE } from "../units.js";
import { UV } from "../layout.js";

/**
 * Betriebsmittel-Katalog mit Maßangaben (mm / TE).
 * mount: 'lochblech' | 'din' | 'both'
 */
export const CATALOG_ITEMS = [
  {
    id: "uv-3reihen",
    group: "verteiler",
    label: "Unterverteilung 3-reihig",
    short: "UV 3R",
    description: "Offenes Verteilergehäuse, 3 Hutschienen, N-/PE-Schienen",
    mount: "lochblech",
    te: UV.te,
    widthMm: Math.round(UV.outerW / MM),
    heightMm: Math.round(UV.outerH / MM),
    depthMm: Math.round(UV.outerD / MM),
    factory: "distributionBoard",
    placeable: true,
  },
  {
    id: "ls-1p",
    group: "schutzorgane",
    label: "Leitungsschutzschalter 1P",
    short: "LS 1P",
    description: "Sicherungsautomat 1-polig · B16",
    mount: "din",
    te: 1,
    widthMm: 18,
    heightMm: 90,
    depthMm: 70,
    factory: "mcb1p",
    placeable: true,
  },
  {
    id: "ls-3p",
    group: "schutzorgane",
    label: "Leitungsschutzschalter 3P",
    short: "LS 3P",
    description: "Sicherungsautomat 3-polig · B16",
    mount: "din",
    te: 3,
    widthMm: 54,
    heightMm: 90,
    depthMm: 70,
    factory: "mcb3p",
    placeable: true,
  },
  {
    id: "fi-4p",
    group: "schutzorgane",
    label: "FI-Schutzschalter 4P",
    short: "RCD 4P",
    description: "Fehlerstrom-Schutzschalter 40 A / 30 mA",
    mount: "din",
    te: 4,
    widthMm: 72,
    heightMm: 90,
    depthMm: 70,
    factory: "rcd4p",
    placeable: true,
  },
  {
    id: "reihenklemme-l",
    group: "klemmen",
    label: "Reihenklemme Durchgang",
    short: "RK 2,5",
    description: "Durchgangsklemme 2,5 mm² · grau",
    mount: "din",
    te: 1,
    widthMm: 6.2,
    heightMm: 48,
    depthMm: 42,
    factory: "terminalL",
    placeable: true,
  },
  {
    id: "reihenklemme-n",
    group: "klemmen",
    label: "Reihenklemme N",
    short: "RK N",
    description: "N-Klemme 2,5 mm² · blau",
    mount: "din",
    te: 1,
    widthMm: 6.2,
    heightMm: 48,
    depthMm: 42,
    factory: "terminalN",
    placeable: true,
  },
  {
    id: "reihenklemme-pe",
    group: "klemmen",
    label: "Reihenklemme PE",
    short: "RK PE",
    description: "PE-Klemme 2,5 mm² · grün-gelb",
    mount: "din",
    te: 1,
    widthMm: 8,
    heightMm: 48,
    depthMm: 42,
    factory: "terminalPe",
    placeable: true,
  },
  {
    id: "steckdose",
    group: "installationsgeraete",
    label: "Schutzkontakt-Steckdose",
    short: "SSD",
    description: "AP-Steckdose 16 A · Lochblech-Montage",
    mount: "lochblech",
    te: null,
    widthMm: 80,
    heightMm: 80,
    depthMm: 45,
    factory: "outlet",
    placeable: true,
  },
  {
    id: "schalter",
    group: "installationsgeraete",
    label: "Wechselschalter",
    short: "WS",
    description: "AP-Wechselschalter · Lochblech-Montage",
    mount: "lochblech",
    te: null,
    widthMm: 80,
    heightMm: 80,
    depthMm: 40,
    factory: "switch",
    placeable: true,
  },
  {
    id: "leitungsschelle",
    group: "befestigung",
    label: "Leitungsschelle (Greif-Iso)",
    short: "Schelle",
    description: "Kunststoff-Greifschelle lichtgrau · Ø 6–16 mm · Rastermontage",
    mount: "lochblech",
    te: null,
    widthMm: 22,
    heightMm: 32,
    depthMm: 28,
    factory: "cableClamp",
    placeable: true,
    reference: "OBO 2105012 Greif-Iso-Schelle 3040 LGR",
  },
  // Stubs — Katalogstruktur vorhanden, Platzierung folgt
  {
    id: "schuetz",
    group: "schutzorgane",
    label: "Schütz 3P (folgt)",
    short: "Schütz",
    description: "Platzhalter — nächster Schritt",
    mount: "din",
    te: 3,
    widthMm: 54,
    heightMm: 90,
    depthMm: 70,
    factory: null,
    placeable: false,
  },
  {
    id: "abzweigdose",
    group: "installationsgeraete",
    label: "Abzweigdose (folgt)",
    short: "AD",
    description: "Platzhalter — nächster Schritt",
    mount: "lochblech",
    te: null,
    widthMm: 85,
    heightMm: 85,
    depthMm: 40,
    factory: null,
    placeable: false,
  },
];

export const CATALOG_GROUPS = [
  { id: "verteiler", label: "Verteiler" },
  { id: "schutzorgane", label: "Schutzorgane" },
  { id: "klemmen", label: "Klemmen" },
  { id: "installationsgeraete", label: "Installationsgeräte" },
  { id: "befestigung", label: "Befestigung" },
];

export function formatItemDims(item) {
  if (item.te != null && item.mount === "din") {
    return `${item.te} TE · ${item.widthMm} × ${item.heightMm} × ${item.depthMm} mm`;
  }
  return `${item.widthMm} × ${item.heightMm} × ${item.depthMm} mm`;
}

/** Width in metres for snap / ghost sizing. */
export function itemWidthM(item) {
  if (item.te != null && item.mount === "din") return item.te * TE;
  return item.widthMm * MM;
}

export function itemHeightM(item) {
  return item.heightMm * MM;
}

export function itemDepthM(item) {
  return item.depthMm * MM;
}
