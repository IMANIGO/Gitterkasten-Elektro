import * as THREE from "three";
import { materials } from "../materials.js";
import { MM, TE, toMm } from "../units.js";
import { makeTextPlate } from "./labels.js";
import {
  applyMcbSpec,
  formatMcbMeta,
  formatMcbPrint,
  makeMcbPlate,
  makeOnMark,
  normalizeMcbSpec,
} from "./mcbSpec.js";
import {
  applyRcdSpec,
  formatRcdMeta,
  formatRcdPrint,
  makeRcdPlate,
  makeTestButton,
  normalizeRcdSpec,
} from "./rcdSpec.js";
import {
  applyRcboSpec,
  formatRcboMeta,
  formatRcboPrint,
  makeRcboPlate,
  normalizeRcboSpec,
} from "./rcboSpec.js";

export { applyRcboSpec, applyMcbSpec, applyRcdSpec };

function mesh(geo, mat) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function dinFoot(width) {
  const g = new THREE.Group();
  const foot = mesh(new THREE.BoxGeometry(width, 8 * MM, 10 * MM), materials.plasticBlack);
  foot.position.set(0, 0, -18 * MM);
  const clip = mesh(new THREE.BoxGeometry(width * 0.9, 3 * MM, 6 * MM), materials.din);
  clip.position.set(0, -2 * MM, -22 * MM);
  g.add(foot, clip);
  return g;
}

/**
 * Distinct modular DIN protective devices (MCB / RCD / RCBO silhouettes).
 * Brand-inspired class look without logos or type trade names.
 */
export function createDinDevice({
  te,
  label,
  id,
  name,
  meta,
  variant = "mcb",
  levers = 1,
  ghost = false,
  spec = null,
}) {
  const width = te * TE;
  const height = 90 * MM;
  const depth = 70 * MM;
  const root = new THREE.Group();
  root.name = name;

  if (ghost && variant !== "rcbo" && variant !== "mcb" && variant !== "rcd") {
    const body = mesh(
      new THREE.BoxGeometry(width - 0.2 * MM, height, depth),
      materials.ghost.clone(),
    );
    body.position.set(0, height / 2, depth / 2 - 22 * MM);
    root.add(body, dinFoot(width - 1 * MM));
    root.userData.ghost = true;
    return root;
  }

  if (variant === "rcd") {
    buildRcdBody(root, { width, height, depth, spec, ghost });
  } else if (variant === "rcbo") {
    buildRcboBody(root, { width, height, depth, spec, ghost });
  } else {
    buildMcbBody(root, { width, height, depth, levers, spec, ghost });
  }

  root.add(dinFoot(width - 1 * MM));
  if (ghost) {
    root.userData = { ghost: true };
    return root;
  }
  const fitted = variant === "rcbo" ? normalizeRcboSpec(spec) : null;
  const fittedMcb = variant === "mcb" ? normalizeMcbSpec(spec) : null;
  const fittedRcd = variant === "rcd" ? normalizeRcdSpec(spec) : null;
  root.userData = {
    pickable: true,
    selectable: true,
    id,
    catalogId: id,
    name: fitted
      ? `FI/LS ${formatRcboPrint(fitted)}`
      : fittedMcb
        ? `LS ${levers}P ${formatMcbPrint(fittedMcb)}`
        : fittedRcd
          ? `FI 4P ${formatRcdPrint(fittedRcd)}`
          : name,
    meta: fitted
      ? formatRcboMeta(fitted)
      : fittedMcb
        ? formatMcbMeta(fittedMcb, levers)
        : fittedRcd
          ? formatRcdMeta(fittedRcd)
          : meta,
    kind: "dinDevice",
    te,
    widthMm: toMm(width),
    ...(fitted ? { rcboSpec: fitted } : {}),
    ...(fittedMcb ? { mcbSpec: fittedMcb, poles: levers } : {}),
    ...(fittedRcd ? { rcdSpec: fittedRcd, poles: 4 } : {}),
  };
  return root;
}

/**
 * Reiner LS, 1P oder mehrpolig. Helles Gehäuse, eine Klemme je Pol,
 * durchgehende dunkle Schaltwippe, rotes I je Pol, Aufdruck der Charakteristik.
 * Ohne Herstellerzeichen.
 */
function buildMcbBody(root, { width, height, depth, levers, spec, ghost }) {
  const poles = Math.max(1, levers || 1);
  const shell = ghost
    ? materials.ghost.clone()
    : new THREE.MeshStandardMaterial({ color: 0xf3f4f6, roughness: 0.45, metalness: 0.06 });
  const cheekMat = ghost
    ? shell
    : new THREE.MeshStandardMaterial({ color: 0xd5dae0, roughness: 0.5, metalness: 0.08 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2a2e32, roughness: 0.5, metalness: 0.28 });
  const seamMat = new THREE.MeshStandardMaterial({ color: 0xc5ccd3, roughness: 0.45, metalness: 0.05 });
  const toggleMat = new THREE.MeshStandardMaterial({ color: 0x3c4046, roughness: 0.4, metalness: 0.16 });
  const glass = new THREE.MeshStandardMaterial({
    color: 0xd7e6f0,
    roughness: 0.12,
    metalness: 0.04,
    transparent: true,
    opacity: ghost ? 0.28 : 0.55,
  });

  const bodyD = depth * 0.78;
  const bodyZ = depth / 2 - 26 * MM;
  const body = mesh(new THREE.BoxGeometry(width - 0.3 * MM, height - 1.5 * MM, bodyD), shell);
  body.position.set(0, height / 2, bodyZ);
  root.add(body);
  const frontZ = bodyZ + bodyD / 2;

  const cheek = mesh(new THREE.BoxGeometry(1.3 * MM, height * 0.78, bodyD * 0.72), cheekMat);
  cheek.position.set(width / 2 - 0.2 * MM, height * 0.4, bodyZ);
  root.add(cheek);

  const hood = mesh(new THREE.BoxGeometry(width - 0.8 * MM, 14 * MM, 16 * MM), shell);
  hood.position.set(0, height - 9 * MM, frontZ - 5 * MM);
  root.add(hood);

  if (poles > 1) {
    for (let i = 1; i < poles; i++) {
      const x = -width / 2 + (width / poles) * i;
      const seam = mesh(new THREE.BoxGeometry(0.45 * MM, height * 0.9, 1.1 * MM), seamMat);
      seam.position.set(x, height * 0.48, frontZ + 0.4 * MM);
      root.add(seam);
    }
  }

  for (let i = 0; i < poles; i++) {
    const x = -width / 2 + (width / poles) * (i + 0.5);
    const topHole = mesh(new THREE.CylinderGeometry(2.5 * MM, 2.5 * MM, 2.6 * MM, 18), dark);
    topHole.position.set(x, height - 1.2 * MM, frontZ - 8 * MM);
    root.add(topHole);
    const bottomHole = mesh(new THREE.CylinderGeometry(2.2 * MM, 2.2 * MM, 2.4 * MM, 16), dark);
    bottomHole.position.set(x, 2 * MM, frontZ - 10 * MM);
    root.add(bottomHole);
  }

  const rim = mesh(new THREE.BoxGeometry(width - 1.8 * MM, 13 * MM, 1.2 * MM), dark);
  rim.position.set(0, height * 0.67, frontZ + 0.3 * MM);
  root.add(rim);
  const win = mesh(new THREE.BoxGeometry(width - 3.2 * MM, 11 * MM, 1.8 * MM), glass);
  win.position.set(0, height * 0.67, frontZ + 1.2 * MM);
  root.add(win);

  const lever = mesh(new THREE.BoxGeometry(width + 3 * MM, 6.4 * MM, 6.2 * MM), toggleMat);
  lever.position.set(0, height * 0.52, frontZ + 2.8 * MM);
  root.add(lever);
  for (const side of [-1, 1]) {
    const cap = mesh(new THREE.CylinderGeometry(3.1 * MM, 3.1 * MM, 6.4 * MM, 16), toggleMat);
    cap.rotation.z = Math.PI / 2;
    cap.position.set(side * (width / 2 + 0.6 * MM), height * 0.52, frontZ + 2.8 * MM);
    root.add(cap);
  }

  for (let i = 0; i < poles; i++) {
    const x = -width / 2 + (width / poles) * (i + 0.5);
    const mark = makeOnMark(Math.min(6, (toMm(width) / poles) * 0.55), 3.2);
    mark.position.set(x, height * 0.43, frontZ + 1.3 * MM);
    root.add(mark);
  }

  const plateW = poles === 1 ? 15 : 26;
  const plate = makeMcbPlate(spec, poles, plateW, poles === 1 ? 18 : 16);
  plate.position.set(0, height * 0.26, frontZ + 1.2 * MM);
  root.add(plate);
}

/**
 * FI 4P. Kühles Graugehäuse, eine Klemme je Pol, blaue Schaltwippe innerhalb
 * der Breite, runde Prüftaste T, Aufdruck von Strom, Fehlerstrom und Typ.
 * Bewusst ohne die roten Kennzeichen und den überstehenden schwarzen Griff
 * der gezeigten Leitungsschutz-Form, damit keine Marke mitschwingt.
 */
function buildRcdBody(root, { width, height, depth, spec, ghost }) {
  const poles = 4;
  const shell = ghost
    ? materials.ghost.clone()
    : new THREE.MeshStandardMaterial({ color: 0xcfd6de, roughness: 0.5, metalness: 0.08 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2c3338, roughness: 0.5, metalness: 0.22 });
  const seamMat = new THREE.MeshStandardMaterial({ color: 0xb7c0c8, roughness: 0.48, metalness: 0.05 });
  const blue = new THREE.MeshStandardMaterial({ color: 0x2a6cb0, roughness: 0.38, metalness: 0.1 });
  const glass = new THREE.MeshStandardMaterial({
    color: 0xc5d7e6,
    roughness: 0.2,
    metalness: 0.04,
    transparent: true,
    opacity: ghost ? 0.25 : 0.7,
  });

  const bodyD = depth * 0.78;
  const bodyZ = depth / 2 - 26 * MM;
  const body = mesh(new THREE.BoxGeometry(width - 0.3 * MM, height - 1.5 * MM, bodyD), shell);
  body.position.set(0, height / 2, bodyZ);
  root.add(body);
  const frontZ = bodyZ + bodyD / 2;

  const hood = mesh(new THREE.BoxGeometry(width - 0.8 * MM, 14 * MM, 16 * MM), shell);
  hood.position.set(0, height - 9 * MM, frontZ - 5 * MM);
  root.add(hood);

  for (let i = 1; i < poles; i++) {
    const x = -width / 2 + (width / poles) * i;
    const seam = mesh(new THREE.BoxGeometry(0.4 * MM, height * 0.88, 1 * MM), seamMat);
    seam.position.set(x, height * 0.48, frontZ + 0.35 * MM);
    root.add(seam);
  }

  for (let i = 0; i < poles; i++) {
    const x = -width / 2 + (width / poles) * (i + 0.5);
    const topHole = mesh(new THREE.CylinderGeometry(2.4 * MM, 2.4 * MM, 2.4 * MM, 16), dark);
    topHole.position.set(x, height - 1.2 * MM, frontZ - 8 * MM);
    root.add(topHole);
    const bottomHole = mesh(new THREE.CylinderGeometry(2.1 * MM, 2.1 * MM, 2.2 * MM, 16), dark);
    bottomHole.position.set(x, 2 * MM, frontZ - 10 * MM);
    root.add(bottomHole);
  }

  const rim = mesh(new THREE.BoxGeometry(width - 8 * MM, 8 * MM, 1 * MM), dark);
  rim.position.set(0, height * 0.72, frontZ + 0.2 * MM);
  root.add(rim);
  const win = mesh(new THREE.BoxGeometry(width - 10 * MM, 6 * MM, 1.4 * MM), glass);
  win.position.set(0, height * 0.72, frontZ + 0.9 * MM);
  root.add(win);

  const lever = mesh(new THREE.BoxGeometry(width - 10 * MM, 6 * MM, 5.5 * MM), blue);
  lever.position.set(0, height * 0.58, frontZ + 2.2 * MM);
  root.add(lever);

  const plate = makeRcdPlate(spec);
  plate.position.set(-8 * MM, height * 0.32, frontZ + 1.2 * MM);
  root.add(plate);

  const test = makeTestButton();
  test.position.set(width / 2 - 12 * MM, height * 0.34, frontZ + 1.6 * MM);
  root.add(test);

  const nMark = makeTextPlate("N", 6, 4, { bg: "#2a6cb0", fg: "#f4f8fb", size: 72 });
  nMark.position.set(width / 2 - 8 * MM, height * 0.5, frontZ + 1.1 * MM);
  root.add(nMark);
}

/**
 * FI/LS 1P+N, 2 TE. Graues Gehäuse, zwei Klemmenöffnungen, blaue Schaltwippe,
 * Aufdruckfenster mit Charakteristik. Ohne Herstellerzeichen.
 */
function buildRcboBody(root, { width, height, depth, spec, ghost }) {
  const shell = ghost
    ? materials.ghost.clone()
    : new THREE.MeshStandardMaterial({ color: 0x8b9198, roughness: 0.5, metalness: 0.14 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2a2e32, roughness: 0.55, metalness: 0.25 });
  const orange = new THREE.MeshStandardMaterial({ color: 0xc56a22, roughness: 0.42, metalness: 0.16 });
  const blue = new THREE.MeshStandardMaterial({ color: 0x1d4e9c, roughness: 0.36, metalness: 0.1 });
  const knobMat = new THREE.MeshStandardMaterial({ color: 0xb7bcc2, roughness: 0.38, metalness: 0.22 });

  const bodyD = depth * 0.78;
  const bodyZ = depth / 2 - 26 * MM;
  const body = mesh(new THREE.BoxGeometry(width - 0.4 * MM, height - 1.5 * MM, bodyD), shell);
  body.position.set(0, height / 2, bodyZ);
  root.add(body);
  const frontZ = bodyZ + bodyD / 2;

  const hood = mesh(new THREE.BoxGeometry(width - 1.2 * MM, 16 * MM, 14 * MM), shell);
  hood.position.set(0, height - 11 * MM, frontZ - 4 * MM);
  root.add(hood);

  const seam = mesh(new THREE.BoxGeometry(0.7 * MM, height * 0.42, 1.4 * MM), dark);
  seam.position.set(0, height - 18 * MM, frontZ + 0.2 * MM);
  root.add(seam);

  for (const x of [-7.4, 7.4]) {
    const topHole = mesh(new THREE.CylinderGeometry(3.15 * MM, 3.15 * MM, 3 * MM, 20), dark);
    topHole.position.set(x * MM, height - 1.4 * MM, frontZ - 9 * MM);
    root.add(topHole);
    const bottomHole = mesh(new THREE.CylinderGeometry(3.15 * MM, 3.15 * MM, 3 * MM, 20), dark);
    bottomHole.position.set(x * MM, 2.4 * MM, frontZ - 11 * MM);
    root.add(bottomHole);
  }

  const clipTop = mesh(new THREE.BoxGeometry(8 * MM, 12 * MM, 8 * MM), orange);
  clipTop.position.set(-width / 2 - 1.2 * MM, height - 16 * MM, bodyZ - bodyD / 2 + 8 * MM);
  root.add(clipTop);
  const clipBot = mesh(new THREE.BoxGeometry(6 * MM, 9 * MM, 7 * MM), orange);
  clipBot.position.set(-width / 2 + 0.4 * MM, 7 * MM, bodyZ - bodyD / 2 + 5 * MM);
  root.add(clipBot);

  const well = mesh(new THREE.BoxGeometry(width - 4 * MM, 22 * MM, 1.6 * MM), dark);
  well.position.set(0, height * 0.64, frontZ + 0.2 * MM);
  root.add(well);

  const plate = makeRcboPlate(spec, 30, 20);
  plate.position.set(0, height * 0.645, frontZ + 1.8 * MM);
  root.add(plate);

  for (let i = 0; i < 3; i++) {
    const x = (i - 1) * 8.4 * MM;
    const boss = mesh(new THREE.CylinderGeometry(2.5 * MM, 2.5 * MM, 4.2 * MM, 18), knobMat);
    boss.rotation.x = Math.PI / 2;
    boss.position.set(x, height * 0.46, frontZ + 2.2 * MM);
    root.add(boss);
    const pip = mesh(new THREE.BoxGeometry(2.4 * MM, 2 * MM, 1.6 * MM), blue);
    pip.position.set(x, height * 0.415, frontZ + 1.2 * MM);
    root.add(pip);
  }

  const lever = mesh(new THREE.BoxGeometry(width - 6 * MM, 8 * MM, 7 * MM), blue);
  lever.position.set(0, height * 0.32, frontZ + 2.4 * MM);
  root.add(lever);
  const leverLip = mesh(new THREE.BoxGeometry(width - 8 * MM, 2.2 * MM, 3 * MM), blue);
  leverLip.position.set(0, height * 0.35, frontZ + 5 * MM);
  root.add(leverLip);
}

export function createMcb1p(opts = {}) {
  const spec = normalizeMcbSpec(opts.spec || opts);
  return createDinDevice({
    te: 1,
    label: formatMcbPrint(spec),
    id: "ls-1p",
    name: `LS 1P ${formatMcbPrint(spec)}`,
    meta: formatMcbMeta(spec, 1),
    levers: 1,
    variant: "mcb",
    spec,
    ghost: !!opts.ghost,
  });
}

export function createMcb3p(opts = {}) {
  const spec = normalizeMcbSpec(opts.spec || opts);
  return createDinDevice({
    te: 3,
    label: formatMcbPrint(spec),
    id: "ls-3p",
    name: `LS 3P ${formatMcbPrint(spec)}`,
    meta: formatMcbMeta(spec, 3),
    levers: 3,
    variant: "mcb",
    spec,
    ghost: !!opts.ghost,
  });
}

export function createRcd4p(opts = {}) {
  const spec = normalizeRcdSpec(opts.spec || opts);
  return createDinDevice({
    te: 4,
    label: formatRcdPrint(spec),
    id: "fi-4p",
    name: `FI 4P ${formatRcdPrint(spec)}`,
    meta: formatRcdMeta(spec),
    levers: 4,
    variant: "rcd",
    spec,
    ghost: !!opts.ghost,
  });
}

/**
 * Elektronischer Stromstoßschalter, 1 TE, zwei potentialfreie Schließer.
 * Schmale Klemmenkappen, Drehwahl und Meldeleuchte — ohne Herstellerzeichen
 * und ohne die typische Blau-Weiß-Teilung der bekannten Baureihen.
 */
export function createImpulseRelay({ ghost = false } = {}) {
  const width = TE;
  const height = 90 * MM;
  const depth = 70 * MM;
  const root = new THREE.Group();
  root.name = "Stromstoßschalter";

  const shell = ghost
    ? materials.ghost.clone()
    : new THREE.MeshStandardMaterial({ color: 0xd7d3ca, roughness: 0.5, metalness: 0.04 });
  const capMat = ghost
    ? materials.ghost.clone()
    : new THREE.MeshStandardMaterial({ color: 0x3c433c, roughness: 0.46, metalness: 0.1 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1a1c1e, roughness: 0.4, metalness: 0.35 });
  const dialMat = new THREE.MeshStandardMaterial({ color: 0x2a2e32, roughness: 0.38, metalness: 0.18 });
  const pointerMat = new THREE.MeshStandardMaterial({ color: 0xf4f1e8, roughness: 0.42, metalness: 0.04 });
  const ledMat = new THREE.MeshStandardMaterial({
    color: 0xe2a24a,
    roughness: 0.32,
    metalness: 0.06,
    emissive: 0x8a5414,
    emissiveIntensity: ghost ? 0 : 0.45,
  });

  const bodyD = 44 * MM;
  const bodyZ = depth / 2 - 26 * MM;
  const body = mesh(new THREE.BoxGeometry(width - 0.4 * MM, height - 1.2 * MM, bodyD), shell);
  body.position.set(0, height / 2, bodyZ);
  root.add(body);
  const frontZ = bodyZ + bodyD / 2;

  const capH = 15 * MM;
  const capD = 12 * MM;
  for (const top of [true, false]) {
    const y = top ? height - capH / 2 - 0.5 * MM : capH / 2 + 0.5 * MM;
    const cap = mesh(new THREE.BoxGeometry(width - 0.5 * MM, capH, capD), capMat);
    cap.position.set(0, y, frontZ + capD / 2 - 1.5 * MM);
    root.add(cap);
    for (let i = 0; i < 3; i++) {
      const hole = mesh(new THREE.CylinderGeometry(1.15 * MM, 1.15 * MM, 1.4 * MM, 12), dark);
      hole.position.set((i - 1) * 4.3 * MM, top ? y + capH / 2 : y - capH / 2, frontZ + 4 * MM);
      root.add(hole);
      const slot = mesh(new THREE.BoxGeometry(1.7 * MM, 0.35 * MM, 0.4 * MM), pointerMat);
      slot.position.set((i - 1) * 4.3 * MM, top ? y + capH / 2 + 0.15 * MM : y - capH / 2 - 0.15 * MM, frontZ + 4 * MM);
      root.add(slot);
    }
  }

  const dial = mesh(new THREE.CylinderGeometry(4.4 * MM, 4.4 * MM, 3.4 * MM, 24), dialMat);
  dial.rotation.x = Math.PI / 2;
  dial.position.set(0, height * 0.48, frontZ + 1.5 * MM);
  root.add(dial);
  const pointer = mesh(new THREE.BoxGeometry(1.15 * MM, 3.4 * MM, 0.7 * MM), pointerMat);
  pointer.position.set(0, height * 0.48 + 1.5 * MM, frontZ + 3.2 * MM);
  root.add(pointer);
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const tick = mesh(new THREE.BoxGeometry(0.55 * MM, 1.15 * MM, 0.35 * MM), dark);
    tick.position.set(Math.cos(angle) * 5.7 * MM, height * 0.48 + Math.sin(angle) * 5.7 * MM, frontZ + 0.25 * MM);
    tick.rotation.z = angle + Math.PI / 2;
    root.add(tick);
  }

  const led = mesh(new THREE.SphereGeometry(0.95 * MM, 14, 10), ledMat);
  led.position.set(0, height * 0.66, frontZ + 0.7 * MM);
  root.add(led);

  root.add(dinFoot(width - 1 * MM));

  if (ghost) {
    root.userData = { ghost: true };
    return root;
  }

  const rating = makeTextPlate("2S  16A", 15, 5.5, { bg: "#d7d3ca", fg: "#2a2c28", size: 78 });
  rating.position.set(0, height * 0.3, frontZ + 0.2 * MM);
  root.add(rating);
  const volts = makeTextPlate("250 V", 13, 4.2, { bg: "#d7d3ca", fg: "#2a2c28", size: 72 });
  volts.position.set(0, height * 0.22, frontZ + 0.2 * MM);
  root.add(volts);

  root.userData = {
    pickable: true,
    selectable: true,
    id: "stromstoss-1te",
    catalogId: "stromstoss-1te",
    name: "Stromstoßschalter 2S",
    meta: "1 TE · 2 Schließer potentialfrei · 16 A 250 V · Steuer 12–230 V",
    kind: "dinDevice",
    te: 1,
    widthMm: toMm(width),
    symbol: "stromstoss",
  };
  return root;
}

export function createRcbo1p(opts = {}) {
  const spec = normalizeRcboSpec(opts.spec || opts);
  return createDinDevice({
    te: 2,
    label: formatRcboPrint(spec),
    id: "fils-1p",
    name: `FI/LS ${formatRcboPrint(spec)}`,
    meta: formatRcboMeta(spec),
    levers: 1,
    variant: "rcbo",
    spec,
    ghost: !!opts.ghost,
  });
}
