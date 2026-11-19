import * as THREE from "three";
import { materials } from "../materials.js";
import { MM, TE, toMm } from "../units.js";
import { makeTextPlate } from "./labels.js";

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
}) {
  const width = te * TE;
  const height = 90 * MM;
  const depth = 70 * MM;
  const root = new THREE.Group();
  root.name = name;

  if (ghost) {
    const body = mesh(
      new THREE.BoxGeometry(width - 0.2 * MM, height, depth),
      materials.ghost.clone(),
    );
    body.position.set(0, height / 2, depth / 2 - 22 * MM);
    root.add(body, dinFoot(width - 1 * MM));
    return root;
  }

  if (variant === "rcd") {
    buildRcdBody(root, { width, height, depth, levers, label });
  } else if (variant === "rcbo") {
    buildRcboBody(root, { width, height, depth, levers, label });
  } else {
    buildMcbBody(root, { width, height, depth, levers, label });
  }

  root.add(dinFoot(width - 1 * MM));
  root.userData = {
    pickable: true,
    selectable: true,
    id,
    catalogId: id,
    name,
    meta,
    kind: "dinDevice",
    te,
    widthMm: toMm(width),
  };
  return root;
}

/** LS: light housing, tall black rocker levers with colored tip, rating window. */
function buildMcbBody(root, { width, height, depth, levers, label }) {
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0xf7f5ef,
    roughness: 0.42,
    metalness: 0.04,
  });
  const body = mesh(new THREE.BoxGeometry(width - 0.2 * MM, height, depth * 0.92), bodyMat);
  body.position.set(0, height / 2, depth / 2 - 24 * MM);
  root.add(body);

  // Front step / face plate
  const face = mesh(
    new THREE.BoxGeometry(width - 1.2 * MM, height * 0.72, 4 * MM),
    new THREE.MeshStandardMaterial({ color: 0xefede6, roughness: 0.48, metalness: 0.05 }),
  );
  face.position.set(0, height * 0.42, depth / 2 - 20 * MM);
  root.add(face);

  // Cooling slots
  for (let i = 0; i < 3; i++) {
    const slot = mesh(
      new THREE.BoxGeometry(width * 0.55, 1.2 * MM, 1 * MM),
      materials.plasticBlack,
    );
    slot.position.set(0, 12 * MM + i * 5 * MM, depth / 2 - 19.2 * MM);
    root.add(slot);
  }

  const leverW = (width - 3 * MM) / levers;
  for (let i = 0; i < levers; i++) {
    const x = -width / 2 + 1.5 * MM + leverW * (i + 0.5);
    // Tall toggle (I/O style)
    const lever = mesh(
      new THREE.BoxGeometry(Math.max(leverW * 0.5, 5 * MM), 28 * MM, 9 * MM),
      materials.lever,
    );
    lever.position.set(x, height - 18 * MM, depth / 2 - 14 * MM);
    lever.rotation.x = -0.35;
    root.add(lever);
    const tip = mesh(
      new THREE.BoxGeometry(Math.max(leverW * 0.5, 5 * MM), 5 * MM, 9.2 * MM),
      new THREE.MeshStandardMaterial({ color: 0xb71c1c, roughness: 0.4, metalness: 0.1 }),
    );
    tip.position.set(x, height - 6 * MM, depth / 2 - 11 * MM);
    tip.rotation.x = -0.35;
    root.add(tip);
  }

  // Amp window
  const win = mesh(
    new THREE.BoxGeometry(Math.min(width - 4 * MM, 14 * MM), 10 * MM, 1.5 * MM),
    new THREE.MeshStandardMaterial({ color: 0xd8e8f5, roughness: 0.25, metalness: 0.1, transparent: true, opacity: 0.85 }),
  );
  win.position.set(0, height * 0.28, depth / 2 - 19 * MM);
  root.add(win);

  const plate = makeTextPlate(label, Math.min(toMm(width) - 2, 40), 8, {
    bg: "#1e2226",
    fg: "#f2f0ea",
    size: 44,
  });
  plate.position.set(0, height * 0.55, depth / 2 - 19.5 * MM);
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

/** FI/LS: split face (white + blue), single MCB lever + small test button. */
function buildRcboBody(root, { width, height, depth, levers, label }) {
  const leftW = width * 0.55;
  const rightW = width * 0.45;
  const left = mesh(
    new THREE.BoxGeometry(leftW - 0.3 * MM, height, depth * 0.92),
    new THREE.MeshStandardMaterial({ color: 0xf6f4ee, roughness: 0.42, metalness: 0.04 }),
  );
  left.position.set(-width / 2 + leftW / 2, height / 2, depth / 2 - 24 * MM);
  root.add(left);
  const right = mesh(
    new THREE.BoxGeometry(rightW - 0.3 * MM, height, depth * 0.92),
    new THREE.MeshStandardMaterial({ color: 0xc8d8e8, roughness: 0.4, metalness: 0.06 }),
  );
  right.position.set(width / 2 - rightW / 2, height / 2, depth / 2 - 24 * MM);
  root.add(right);

  const lever = mesh(
    new THREE.BoxGeometry(Math.max(leftW * 0.4, 6 * MM), 26 * MM, 9 * MM),
    materials.lever,
  );
  lever.position.set(-width / 2 + leftW * 0.5, height - 16 * MM, depth / 2 - 14 * MM);
  lever.rotation.x = -0.3;
  root.add(lever);
  const tip = mesh(
    new THREE.BoxGeometry(Math.max(leftW * 0.4, 6 * MM), 4 * MM, 9.2 * MM),
    new THREE.MeshStandardMaterial({ color: 0xb71c1c, roughness: 0.4, metalness: 0.1 }),
  );
  tip.position.set(-width / 2 + leftW * 0.5, height - 5 * MM, depth / 2 - 11 * MM);
  tip.rotation.x = -0.3;
  root.add(tip);

  const testBtn = mesh(
    new THREE.CylinderGeometry(3.8 * MM, 3.8 * MM, 3 * MM, 14),
    new THREE.MeshStandardMaterial({ color: 0xe6b800, roughness: 0.35, metalness: 0.08 }),
  );
  testBtn.rotation.x = Math.PI / 2;
  testBtn.position.set(width / 2 - rightW * 0.45, height * 0.4, depth / 2 - 19 * MM);
  root.add(testBtn);

  void levers;
  const plate = makeTextPlate(label, Math.min(toMm(width) - 2, 44), 8, {
    bg: "#2a2c30",
    fg: "#f2f0ea",
    size: 40,
  });
  plate.position.set(0, height * 0.58, depth / 2 - 19.5 * MM);
  root.add(plate);
}

export function createMcb1p(opts = {}) {
  return createDinDevice({
    te: 1,
    label: "B16",
    id: "ls-1p",
    name: "LS-Schalter 1P",
    meta: "1 TE · 18 × 90 × 70 mm · B16",
    levers: 1,
    variant: "mcb",
    ...opts,
  });
}

export function createMcb3p(opts = {}) {
  return createDinDevice({
    te: 3,
    label: "3P B16",
    id: "ls-3p",
    name: "LS-Schalter 3P",
    meta: "3 TE · 54 × 90 × 70 mm · B16",
    levers: 3,
    variant: "mcb",
    ...opts,
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
  return createDinDevice({
    te: 2,
    label: "FI/LS",
    id: "fils-1p",
    name: "FI/LS-Schalter 1P+N",
    meta: "2 TE · 36 × 90 × 70 mm · 16 A / 30 mA",
    levers: 1,
    variant: "rcbo",
    ...opts,
  });
}
