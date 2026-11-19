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
  applyRcboSpec,
  formatRcboMeta,
  formatRcboPrint,
  makeRcboPlate,
  normalizeRcboSpec,
} from "./rcboSpec.js";

export { applyRcboSpec, applyMcbSpec };

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

  if (ghost && variant !== "rcbo" && variant !== "mcb") {
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
    buildRcdBody(root, { width, height, depth, levers, label });
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
  root.userData = {
    pickable: true,
    selectable: true,
    id,
    catalogId: id,
    name: fitted
      ? `FI/LS ${formatRcboPrint(fitted)}`
      : fittedMcb
        ? `LS ${levers}P ${formatMcbPrint(fittedMcb)}`
        : name,
    meta: fitted ? formatRcboMeta(fitted) : fittedMcb ? formatMcbMeta(fittedMcb, levers) : meta,
    kind: "dinDevice",
    te,
    widthMm: toMm(width),
    ...(fitted ? { rcboSpec: fitted } : {}),
    ...(fittedMcb ? { mcbSpec: fittedMcb, poles: levers } : {}),
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

/** FI: cooler grey-blue body, wide dual paddle, prominent test button, N-blue stripe. */
function buildRcdBody(root, { width, height, depth, levers, label }) {
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0xd2e0ec,
    roughness: 0.4,
    metalness: 0.06,
  });
  const body = mesh(new THREE.BoxGeometry(width - 0.2 * MM, height, depth * 0.95), bodyMat);
  body.position.set(0, height / 2, depth / 2 - 23 * MM);
  root.add(body);

  // Blue N marker band on side
  const band = mesh(
    new THREE.BoxGeometry(2.5 * MM, height * 0.7, depth * 0.5),
    materials.terminalBlue,
  );
  band.position.set(-width / 2 + 1.5 * MM, height * 0.45, depth / 2 - 28 * MM);
  root.add(band);

  // Dual / linked paddle
  const paddleW = width - 8 * MM;
  const paddle = mesh(
    new THREE.BoxGeometry(paddleW, 16 * MM, 11 * MM),
    materials.lever,
  );
  paddle.position.set(0, height - 14 * MM, depth / 2 - 13 * MM);
  root.add(paddle);
  for (let i = 0; i < Math.min(levers, 2); i++) {
    const knob = mesh(
      new THREE.BoxGeometry(paddleW * 0.35, 8 * MM, 4 * MM),
      new THREE.MeshStandardMaterial({ color: 0xf0f0f0, roughness: 0.4, metalness: 0.05 }),
    );
    knob.position.set((i === 0 ? -1 : 1) * paddleW * 0.22, height - 14 * MM, depth / 2 - 7 * MM);
    root.add(knob);
  }

  // Test button (T) — recessed yellow/red
  const testWell = mesh(
    new THREE.CylinderGeometry(6 * MM, 6 * MM, 2 * MM, 16),
    materials.plasticBlack,
  );
  testWell.rotation.x = Math.PI / 2;
  testWell.position.set(width / 2 - 12 * MM, height * 0.38, depth / 2 - 20 * MM);
  root.add(testWell);
  const testBtn = mesh(
    new THREE.CylinderGeometry(4.5 * MM, 4.5 * MM, 3.5 * MM, 16),
    new THREE.MeshStandardMaterial({ color: 0xe6b800, roughness: 0.35, metalness: 0.08 }),
  );
  testBtn.rotation.x = Math.PI / 2;
  testBtn.position.set(width / 2 - 12 * MM, height * 0.38, depth / 2 - 18.5 * MM);
  root.add(testBtn);

  const plate = makeTextPlate(label, Math.min(toMm(width) - 4, 56), 9, {
    bg: "#1a3a55",
    fg: "#e8f2fa",
    size: 42,
  });
  plate.position.set(-4 * MM, height * 0.55, depth / 2 - 19.5 * MM);
  root.add(plate);
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
  return createDinDevice({
    te: 4,
    label: "FI 30mA",
    id: "fi-4p",
    name: "FI-Schutzschalter 4P",
    meta: "4 TE · 72 × 90 × 70 mm · 40 A / 30 mA",
    levers: 2,
    variant: "rcd",
    ...opts,
  });
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
