import * as THREE from "three";
import { materials } from "../materials.js";
import { MM, toMm } from "../units.js";
import { makeTextPlate } from "./labels.js";

/**
 * AP-Wippen mit Schaltzeichen (markenneutral, keine Herstellerzeichen).
 * Einzelwippe 80×80, Serie (2-fach) 151×80 — auch gemischt Taster/Schalter.
 */

export const ROCKER_SYMBOLS = ["aus", "wechsel", "kreuz", "taster"];

const SYMBOL_LABEL = {
  aus: "Aus",
  wechsel: "Wechsel",
  kreuz: "Kreuz",
  taster: "Taster",
};

function mesh(geo, mat) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function drawSymbol(ctx, kind) {
  ctx.strokeStyle = "#1c1c1c";
  ctx.fillStyle = "#1c1c1c";
  ctx.lineWidth = 14;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (kind === "taster") {
    ctx.beginPath();
    ctx.arc(128, 148, 46, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(128, 102);
    ctx.lineTo(128, 40);
    ctx.moveTo(108, 62);
    ctx.lineTo(128, 40);
    ctx.lineTo(148, 62);
    ctx.stroke();
  } else if (kind === "kreuz") {
    ctx.beginPath();
    ctx.moveTo(58, 58);
    ctx.lineTo(198, 198);
    ctx.moveTo(198, 58);
    ctx.lineTo(58, 198);
    ctx.stroke();
  } else if (kind === "wechsel") {
    ctx.beginPath();
    ctx.moveTo(40, 128);
    ctx.lineTo(108, 128);
    ctx.moveTo(108, 128);
    ctx.lineTo(188, 62);
    ctx.moveTo(150, 128);
    ctx.lineTo(196, 196);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(196, 58, 11, 0, Math.PI * 2);
    ctx.arc(204, 200, 11, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(44, 168);
    ctx.lineTo(112, 168);
    ctx.lineTo(188, 72);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(200, 60, 14, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function symbolMaterial(kind) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#f6f3ea";
  ctx.fillRect(0, 0, 256, 256);
  drawSymbol(ctx, kind);
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

function addRocker(root, { kind, x, zFace, ghost }) {
  const bodyMat = ghost
    ? materials.ghost.clone()
    : new THREE.MeshStandardMaterial({ color: 0xfaf8f2, roughness: 0.42, metalness: 0.04 });
  const rocker = mesh(new THREE.BoxGeometry(30 * MM, 46 * MM, 6 * MM), bodyMat);
  rocker.position.set(x, 0, zFace + 2 * MM);
  rocker.rotation.x = -0.1;
  root.add(rocker);
  const seam = mesh(new THREE.BoxGeometry(30 * MM, 1.1 * MM, 1 * MM), materials.plasticBlack);
  seam.position.set(x, 0, zFace + 4.6 * MM);
  root.add(seam);
  if (!ghost) {
    const plate = mesh(new THREE.PlaneGeometry(22 * MM, 22 * MM), symbolMaterial(kind));
    plate.position.set(x, 2 * MM, zFace + 5.2 * MM);
    plate.rotation.x = -0.1;
    root.add(plate);
  }
}

/**
 * @param {{ id: string, name: string, meta: string, rockers: string[], ghost?: boolean }} opts
 */
export function createRockerDevice({ id, name, meta, rockers, ghost = false } = {}) {
  const kinds = (rockers?.length ? rockers : ["wechsel"]).map((k) =>
    ROCKER_SYMBOLS.includes(k) ? k : "wechsel",
  );
  const gangs = kinds.length;
  const W = (gangs > 1 ? 151 : 80) * MM;
  const H = 80 * MM;
  const D = 42 * MM;
  const mat = ghost ? materials.ghost.clone() : materials.apWhite;
  const coverMat = ghost
    ? materials.ghost.clone()
    : new THREE.MeshStandardMaterial({ color: 0xf4f1e8, roughness: 0.48, metalness: 0.03 });

  const root = new THREE.Group();
  root.name = name;

  const body = mesh(new THREE.BoxGeometry(W * 0.94, H * 0.92, D * 0.65), mat);
  body.position.z = (D * 0.65) / 2;
  root.add(body);
  const cover = mesh(new THREE.BoxGeometry(W, H, D * 0.22), coverMat);
  cover.position.z = D * 0.65 + (D * 0.22) / 2;
  root.add(cover);

  const zFace = D * 0.65 + D * 0.22 + 2 * MM;
  const span = W - 36 * MM;
  kinds.forEach((kind, i) => {
    const x = gangs === 1 ? 0 : -span / 2 + (span / (gangs - 1)) * i;
    addRocker(root, { kind, x, zFace, ghost });
  });

  if (!ghost && gangs > 1) {
    const caption = kinds.map((k) => SYMBOL_LABEL[k]).join(" + ");
    const plate = makeTextPlate(caption, Math.min(toMm(W) - 8, 120), 8, {
      bg: "#2a2c30",
      fg: "#f2f0ea",
      size: 36,
    });
    plate.position.set(0, -H / 2 + 10 * MM, zFace + 0.4 * MM);
    root.add(plate);
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
      widthMm: toMm(W),
      heightMm: 80,
      depthMm: 42,
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

export function createSeries(id, name, rockers, opts = {}) {
  const label = rockers
    .map((k) => SYMBOL_LABEL[k] || k)
    .join(" + ");
  return createRockerDevice({
    id,
    name,
    meta: `151 × 80 × 42 mm · Serie · ${label}`,
    rockers,
    ...opts,
  });
}
