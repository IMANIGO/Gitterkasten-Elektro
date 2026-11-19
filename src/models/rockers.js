import * as THREE from "three";
import { materials } from "../materials.js";
import { MM, toMm } from "../units.js";

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

function symbolMaterial(kind, bg = "#f6f3ea") {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = bg;
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
 * Zwei große Wippen in einem Aufputz-Kombinationsrahmen.
 * Form einer üblichen 2-fach-Abdeckung, ohne Herstellerzeichen.
 */
function buildSeriesFrame(root, { kinds, ghost }) {
  const W = 151 * MM;
  const H = 81 * MM;
  const D = 40 * MM;
  const shell = ghost
    ? materials.ghost.clone()
    : new THREE.MeshStandardMaterial({ color: 0xf3f1ea, roughness: 0.46, metalness: 0.03 });
  const wellMat = ghost
    ? materials.ghost.clone()
    : new THREE.MeshStandardMaterial({ color: 0xd9d6cc, roughness: 0.6, metalness: 0.02 });
  const rockerMat = ghost
    ? materials.ghost.clone()
    : new THREE.MeshStandardMaterial({ color: 0xfbfaf6, roughness: 0.36, metalness: 0.03 });

  const body = mesh(new THREE.BoxGeometry(W * 0.96, H * 0.9, D * 0.72), shell);
  body.position.z = (D * 0.72) / 2;
  root.add(body);

  const bezel = mesh(new THREE.BoxGeometry(W, H, 3.2 * MM), shell);
  const bezelZ = D * 0.72 + 1.6 * MM;
  bezel.position.z = bezelZ;
  root.add(bezel);

  const rockerW = 64 * MM;
  const rockerH = 66 * MM;
  const centers = [-36 * MM, 36 * MM];
  const zWell = bezelZ + 1.2 * MM;

  centers.forEach((x, i) => {
    const well = mesh(new THREE.BoxGeometry(rockerW + 2.4 * MM, rockerH + 2.2 * MM, 1.4 * MM), wellMat);
    well.position.set(x, 0, zWell);
    root.add(well);

    const rocker = mesh(new THREE.BoxGeometry(rockerW, rockerH, 5 * MM), rockerMat);
    rocker.position.set(x, 0.4 * MM, zWell + 2.6 * MM);
    rocker.rotation.x = -0.05;
    root.add(rocker);

    const groove = mesh(
      new THREE.BoxGeometry(rockerW * 0.9, 0.6 * MM, 0.7 * MM),
      ghost ? rockerMat : new THREE.MeshStandardMaterial({ color: 0xc9c5bb, roughness: 0.55 }),
    );
    groove.position.set(x, 0, zWell + 4.6 * MM);
    groove.rotation.x = -0.05;
    root.add(groove);

    if (!ghost) {
      const plate = mesh(new THREE.PlaneGeometry(20 * MM, 20 * MM), symbolMaterial(kinds[i], "#fbfaf6"));
      plate.position.set(x, 2 * MM, zWell + 5.2 * MM);
      plate.rotation.x = -0.05;
      root.add(plate);
    }
  });

  const bridge = mesh(new THREE.BoxGeometry(5 * MM, H - 8 * MM, 2.2 * MM), shell);
  bridge.position.set(0, 0, bezelZ + 1.4 * MM);
  root.add(bridge);

  const screwMat = ghost ? shell : materials.screw;
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      const screw = mesh(new THREE.CylinderGeometry(1.7 * MM, 1.7 * MM, 1.1 * MM, 12), screwMat);
      screw.rotation.x = Math.PI / 2;
      screw.position.set(sx * (W / 2 - 6 * MM), sy * (H / 2 - 6 * MM), bezelZ + 1.8 * MM);
      root.add(screw);
    }
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
  const H = (gangs > 1 ? 81 : 80) * MM;
  const D = (gangs > 1 ? 40 : 42) * MM;

  const root = new THREE.Group();
  root.name = name;

  if (gangs > 1) {
    buildSeriesFrame(root, { kinds, ghost });
  } else {
    const mat = ghost ? materials.ghost.clone() : materials.apWhite;
    const coverMat = ghost
      ? materials.ghost.clone()
      : new THREE.MeshStandardMaterial({ color: 0xf4f1e8, roughness: 0.48, metalness: 0.03 });
    const body = mesh(new THREE.BoxGeometry(W * 0.94, H * 0.92, D * 0.65), mat);
    body.position.z = (D * 0.65) / 2;
    root.add(body);
    const cover = mesh(new THREE.BoxGeometry(W, H, D * 0.22), coverMat);
    cover.position.z = D * 0.65 + (D * 0.22) / 2;
    root.add(cover);
    const zFace = D * 0.65 + D * 0.22 + 2 * MM;
    addRocker(root, { kind: kinds[0], x: 0, zFace, ghost });
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
      heightMm: gangs > 1 ? 81 : 80,
      depthMm: gangs > 1 ? 40 : 42,
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
    meta: `151 × 81 × 40 mm · Aufputz-Kombination · ${label}`,
    rockers,
    ...opts,
  });
}
