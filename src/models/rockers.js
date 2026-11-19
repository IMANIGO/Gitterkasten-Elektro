import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { materials } from "../materials.js";
import { MM } from "../units.js";
import { paintSymbol } from "../catalog/symbols.js";

/**
 * AP-Wippen mit Schaltzeichen (markenneutral, keine Herstellerzeichen).
 * Aufputz-Dose: eine große Wippe 80×80×42, zwei Wippen nebeneinander 151×81×42.
 * Kurzer Leitungsstutzen oben mittig, runde Einführung an der rechten Seite.
 * Taster zusätzlich mit kleinem Querbalken in der unteren Wippenhälfte.
 * Schaltzeichen bleibt auf der Wippe, aufrecht und parallel zur Front.
 */

/** Gehäuse ohne Stutzen und Einführung. Die ragen bewusst darüber hinaus. */
const AP_SINGLE = { w: 80, h: 80, d: 42 };
const AP_SERIES = { w: 151, h: 81, d: 42 };

export const ROCKER_SYMBOLS = [
  "aus",
  "aus2",
  "wechsel",
  "kreuz",
  "serieV",
  "dimmer",
  "taster",
  "taster-licht",
  "stromstoss",
  "daemmerung",
];

const SYMBOL_LABEL = {
  aus: "Aus",
  aus2: "Aus 2p",
  wechsel: "Wechsel",
  kreuz: "Kreuz",
  serieV: "Serie",
  dimmer: "Dimmer",
  taster: "Taster",
  "taster-licht": "Taster Licht",
  stromstoss: "Stromstoß",
  daemmerung: "Dämmerung",
};

function mesh(geo, mat) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function symbolMaterial(kind, bg = "#f6f3ea") {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  paintSymbol(ctx, kind, 256, bg);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return new THREE.MeshStandardMaterial({
    map: texture,
    color: 0xffffff,
    roughness: 0.45,
    metalness: 0.04,
  });
}

function plastic(ghost, color, roughness, metalness = 0.04) {
  if (ghost) return materials.ghost.clone();
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

/**
 * Kompakte Aufputz-Dose. Rückseite bei lokal z = 0, Front bei z = D.
 * Stutzen und Einführung sitzen auf der Dose und dürfen das Katalogmaß überragen.
 */
function addHousing(root, { W, H, D, ghost }) {
  const shell = plastic(ghost, 0xe4e1d8, 0.5, 0.04);
  const radius = Math.min(7.2 * MM, D / 2 - 0.5 * MM);
  const body = mesh(new RoundedBoxGeometry(W, H, D, 3, radius), shell);
  body.name = "gehaeuse";
  body.position.z = D / 2;
  root.add(body);

  const grey = plastic(ghost, 0x8d9398, 0.42, 0.16);
  const tipMat = plastic(ghost, 0xb7bcc1, 0.36, 0.1);
  const zEntry = D * 0.46;

  const stubR = 3.6 * MM;
  const stubVis = 20 * MM;
  const collar = mesh(new THREE.CylinderGeometry(stubR * 1.4, stubR * 1.55, 3.4 * MM, 16), shell);
  collar.name = "leitungsbund";
  collar.position.set(0, H / 2 - 0.4 * MM, zEntry);
  root.add(collar);
  const stub = mesh(new THREE.CylinderGeometry(stubR, stubR * 1.04, stubVis + 4 * MM, 16), grey);
  stub.name = "leitung";
  stub.position.set(0, H / 2 + stubVis / 2 - 1.4 * MM, zEntry);
  root.add(stub);
  const tip = mesh(new THREE.CylinderGeometry(stubR * 0.9, stubR, 2.6 * MM, 12), tipMat);
  tip.position.set(0, H / 2 + stubVis - 1.5 * MM, zEntry);
  root.add(tip);

  const glandR = 5.4 * MM;
  const glandLen = 14 * MM;
  const gland = mesh(new THREE.CylinderGeometry(glandR * 0.82, glandR, glandLen, 18), grey);
  gland.name = "einfuehrung";
  gland.rotation.z = Math.PI / 2;
  gland.position.set(W / 2 + glandLen / 2 - 2.2 * MM, 0, zEntry);
  root.add(gland);
  const cap = mesh(new THREE.CylinderGeometry(glandR * 0.72, glandR * 0.82, 2.4 * MM, 14), tipMat);
  cap.rotation.z = Math.PI / 2;
  cap.position.set(W / 2 + glandLen - 2.6 * MM, 0, zEntry);
  root.add(cap);

  return D;
}

/**
 * Eine große Wippe. Taster und Taster mit Leuchte tragen den Querbalken
 * in der unteren Hälfte. Schaltzeichen bleibt flach auf der Wippe, ohne
 * zusätzliche Drehung, damit es aufrecht lesbar bleibt.
 */
function addRocker(root, { kind, x, w, h, zFront, ghost }) {
  const bodyMat = plastic(ghost, 0xfbfaf6, 0.36, 0.03);
  const gapMat = plastic(ghost, 0xb7b2a8, 0.62, 0.02);
  const depth = 4.8 * MM;
  const proud = 2.6 * MM;

  const gap = mesh(new RoundedBoxGeometry(w + 3.2 * MM, h + 3.2 * MM, 1.2 * MM, 2, 1.2 * MM), gapMat);
  gap.position.set(x, 0, zFront + 0.7 * MM);
  root.add(gap);

  const rocker = mesh(new RoundedBoxGeometry(w, h, depth, 2, 2.2 * MM), bodyMat);
  rocker.name = "wippe";
  const rockerZ = zFront + proud - depth / 2;
  rocker.position.set(x, 0, rockerZ);
  root.add(rocker);
  const faceZ = rockerZ + depth / 2;

  if (kind === "taster" || kind === "taster-licht") {
    const barMat = plastic(ghost, 0x3e4449, 0.42, 0.08);
    const bar = mesh(new THREE.CapsuleGeometry(1.55 * MM, 20 * MM, 4, 12), barMat);
    bar.name = "tastermarke";
    bar.rotation.z = Math.PI / 2;
    bar.position.set(x, -h * 0.22, faceZ + 0.85 * MM);
    root.add(bar);
  }

  if (!ghost) {
    const plateSize = Math.min(17 * MM, w * 0.3, h * 0.3);
    const plate = mesh(new THREE.PlaneGeometry(plateSize, plateSize), symbolMaterial(kind, "#fbfaf6"));
    plate.name = "schaltzeichen";
    plate.position.set(x, h * 0.06, faceZ + 0.35 * MM);
    plate.material.polygonOffset = true;
    plate.material.polygonOffsetFactor = -2;
    plate.material.polygonOffsetUnits = -2;
    root.add(plate);
  }
}

function rockerSlots(W, H, count) {
  const margin = 6 * MM;
  const h = H - margin * 2;
  if (count <= 1) return [{ x: 0, w: W - margin * 2, h }];
  const gap = 4.4 * MM;
  const w = (W - margin * 2 - gap) / 2;
  const x = w / 2 + gap / 2;
  return [
    { x: -x, w, h },
    { x, w, h },
  ];
}

/**
 * Dieselbe Aufputz-Dose, breiter, mit zwei großen Wippen nebeneinander.
 */
function buildSeriesFrame(root, { kinds, ghost }) {
  const W = AP_SERIES.w * MM;
  const H = AP_SERIES.h * MM;
  const D = AP_SERIES.d * MM;
  const zFront = addHousing(root, { W, H, D, ghost });
  const slots = rockerSlots(W, H, 2);
  kinds.forEach((kind, i) => {
    const slot = slots[i] || slots[slots.length - 1];
    addRocker(root, { kind, x: slot.x, w: slot.w, h: slot.h, zFront, ghost });
  });
}

/**
 * @param {{ id: string, name: string, meta: string, rockers: string[], ghost?: boolean }} opts
 */
export function createRockerDevice({ id, name, meta, rockers, ghost = false } = {}) {
  const kinds = (rockers?.length ? rockers : ["wechsel"]).map((k) =>
    ROCKER_SYMBOLS.includes(k) ? k : "wechsel",
  );
  const gangs = kinds.length;
  const spec = gangs > 1 ? AP_SERIES : AP_SINGLE;
  const W = spec.w * MM;
  const H = spec.h * MM;
  const D = spec.d * MM;

  const root = new THREE.Group();
  root.name = name;

  if (gangs > 1) {
    buildSeriesFrame(root, { kinds, ghost });
  } else {
    const zFront = addHousing(root, { W, H, D, ghost });
    const slot = rockerSlots(W, H, 1)[0];
    addRocker(root, { kind: kinds[0], x: slot.x, w: slot.w, h: slot.h, zFront, ghost });
  }

  if (!ghost) {
    root.userData = {
      pickable: true,
      selectable: true,
      id,
      catalogId: id,
      name,
      meta,
      kind: "surfaceDevice",
      rockers: kinds,
      widthMm: spec.w,
      heightMm: spec.h,
      depthMm: spec.d,
    };
  }
  return root;
}

export function createSwitch(opts = {}) {
  return createRockerDevice({
    id: "schalter",
    name: "AP-Wechselschalter",
    meta: "80 × 80 × 42 mm · Wippe · Wechselsymbol",
    rockers: ["wechsel"],
    ...opts,
  });
}

export function createSwitchOff(opts = {}) {
  return createRockerDevice({
    id: "schalter-aus",
    name: "AP-Ausschalter",
    meta: "80 × 80 × 42 mm · Wippe · Ausschalter",
    rockers: ["aus"],
    ...opts,
  });
}

export function createSwitchCross(opts = {}) {
  return createRockerDevice({
    id: "schalter-kreuz",
    name: "AP-Kreuzschalter",
    meta: "80 × 80 × 42 mm · Wippe · Kreuzsymbol",
    rockers: ["kreuz"],
    ...opts,
  });
}

export function createPushbutton(opts = {}) {
  return createRockerDevice({
    id: "taster",
    name: "AP-Taster",
    meta: "80 × 80 × 42 mm · Wippe · Tastersymbol",
    rockers: ["taster"],
    ...opts,
  });
}

export function createSwitchOff2(opts = {}) {
  return createRockerDevice({
    id: "schalter-aus-2p",
    name: "AP-Ausschalter 2-polig",
    meta: "80 × 80 × 42 mm · Wippe · Ausschalter zweipolig",
    rockers: ["aus2"],
    ...opts,
  });
}

export function createSeriesSwitch(opts = {}) {
  return createRockerDevice({
    id: "schalter-serie",
    name: "AP-Serienschalter",
    meta: "80 × 80 × 42 mm · Wippe · Serienschalter",
    rockers: ["serieV"],
    ...opts,
  });
}

export function createDimmer(opts = {}) {
  return createRockerDevice({
    id: "dimmer",
    name: "AP-Dimmer",
    meta: "80 × 80 × 42 mm · Wippe · Dimmer",
    rockers: ["dimmer"],
    ...opts,
  });
}

export function createPushbuttonLamp(opts = {}) {
  return createRockerDevice({
    id: "taster-leucht",
    name: "AP-Taster mit Leuchte",
    meta: "80 × 80 × 42 mm · Wippe · Taster mit Leuchte",
    rockers: ["taster-licht"],
    ...opts,
  });
}

export function createImpulseSwitch(opts = {}) {
  return createRockerDevice({
    id: "stromstoss",
    name: "AP-Stromstoßschalter",
    meta: "80 × 80 × 42 mm · Wippe · Stromstoßschalter",
    rockers: ["stromstoss"],
    ...opts,
  });
}

export function createTwilightSwitch(opts = {}) {
  return createRockerDevice({
    id: "daemmerung",
    name: "AP-Dämmerungsschalter",
    meta: "80 × 80 × 42 mm · Wippe · Dämmerungsschalter",
    rockers: ["daemmerung"],
    ...opts,
  });
}

export function createSeries(id, name, rockers, opts = {}) {
  const label = rockers
    .map((k) => SYMBOL_LABEL[k] || k)
    .join(" + ");
  return createRockerDevice({
    id,
    name,
    meta: `151 × 81 × 42 mm · Aufputz-Kombination · ${label}`,
    rockers,
    ...opts,
  });
}
