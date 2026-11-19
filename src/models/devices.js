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

function createScrew(radius = 1.8 * MM) {
  const g = new THREE.Group();
  const head = mesh(new THREE.CylinderGeometry(radius, radius, 1.4 * MM, 10), materials.screw);
  const slot = mesh(new THREE.BoxGeometry(radius * 1.5, 1.5 * MM, 0.4 * MM), materials.plasticBlack);
  slot.position.y = 0.1 * MM;
  g.add(head, slot);
  return g;
}

/** DIN-rail foot clip under a modular device. */
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
 * Modular DIN device body. Origin at rail seat (y=0), front +Z, width along X.
 * @param {{ te: number, label: string, color?: number, levers?: number, ghost?: boolean }} opts
 */
export function createDinDevice({
  te,
  label,
  id,
  name,
  meta,
  color = 0xd8d6cf,
  levers = 1,
  ghost = false,
}) {
  const width = te * TE;
  const height = 90 * MM;
  const depth = 70 * MM;
  const mat = ghost ? materials.ghost.clone() : new THREE.MeshStandardMaterial({
    color,
    metalness: 0.08,
    roughness: 0.48,
  });

  const root = new THREE.Group();
  root.name = name;

  const body = mesh(new THREE.BoxGeometry(width - 0.4 * MM, height, depth), mat);
  body.position.set(0, height / 2, depth / 2 - 22 * MM);
  root.add(body);
  root.add(dinFoot(width - 2 * MM));

  if (!ghost) {
    const leverW = (width - 4 * MM) / levers;
    for (let i = 0; i < levers; i++) {
      const lever = mesh(
        new THREE.BoxGeometry(leverW * 0.7, 18 * MM, 8 * MM),
        materials.lever,
      );
      const x = -width / 2 + 2 * MM + leverW * (i + 0.5);
      lever.position.set(x, height - 8 * MM, depth / 2 - 18 * MM);
      root.add(lever);
    }

    const plate = makeTextPlate(label, Math.min(toMm(width) - 2, 48), 10, {
      bg: "#2c3034",
      fg: "#f2f0ea",
      size: 48,
    });
    plate.position.set(0, height * 0.45, depth / 2 - 21.5 * MM);
    root.add(plate);

    root.userData = {
      pickable: true,
      id,
      catalogId: id,
      name,
      meta,
      kind: "dinDevice",
      te,
    };
  }

  return root;
}

export function createMcb1p(opts = {}) {
  return createDinDevice({
    te: 1,
    label: "B16",
    id: "ls-1p",
    name: "LS-Schalter 1P",
    meta: "1 TE · 18 × 90 × 70 mm · B16",
    levers: 1,
    color: 0xe8e6e0,
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
    color: 0xe8e6e0,
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
    color: 0xd4e4f2,
    ...opts,
  });
}

function createTerminal(kind, opts = {}) {
  const mat =
    kind === "n"
      ? materials.terminalBlue
      : kind === "pe"
        ? materials.terminalPe
        : materials.terminalGray;
  const width = kind === "pe" ? 8 * MM : 6.2 * MM;
  const ghost = opts.ghost;
  const bodyMat = ghost ? materials.ghost.clone() : mat;

  const g = new THREE.Group();
  const name =
    kind === "n" ? "Reihenklemme N" : kind === "pe" ? "Reihenklemme PE" : "Reihenklemme";
  g.name = name;

  const body = mesh(new THREE.BoxGeometry(width, 48 * MM, 42 * MM), bodyMat);
  body.position.y = 24 * MM;
  const foot = mesh(new THREE.BoxGeometry(width, 10 * MM, 12 * MM), ghost ? bodyMat : materials.plasticBlack);
  foot.position.set(0, 0, -18 * MM);
  const clip = mesh(new THREE.BoxGeometry(width, 4 * MM, 8 * MM), ghost ? bodyMat : materials.din);
  clip.position.set(0, -2 * MM, -22 * MM);
  g.add(body, foot, clip);

  if (!ghost) {
    const topScrew = createScrew(1.8 * MM);
    topScrew.position.set(0, 46 * MM, 8 * MM);
    const botScrew = createScrew(1.8 * MM);
    botScrew.position.set(0, 46 * MM, -8 * MM);
    g.add(topScrew, botScrew);
    g.userData = {
      pickable: true,
      id: `reihenklemme-${kind}`,
      catalogId: `reihenklemme-${kind === "l" ? "l" : kind}`,
      name,
      meta: `${toMm(width)} mm · 2,5 mm²`,
      kind: "terminal",
      te: 1,
    };
  }
  return g;
}

export function createTerminalL(opts = {}) {
  return createTerminal("l", opts);
}
export function createTerminalN(opts = {}) {
  return createTerminal("n", opts);
}
export function createTerminalPe(opts = {}) {
  return createTerminal("pe", opts);
}

function createApDevice({ id, name, meta, face, ghost = false }) {
  const W = 80 * MM;
  const H = 80 * MM;
  const D = face === "outlet" ? 45 * MM : 40 * MM;
  const mat = ghost ? materials.ghost.clone() : materials.apWhite;

  const root = new THREE.Group();
  root.name = name;

  const body = mesh(new THREE.BoxGeometry(W, H, D), mat);
  body.position.z = D / 2;
  root.add(body);

  if (!ghost) {
    if (face === "outlet") {
      const plate = mesh(new THREE.BoxGeometry(62 * MM, 62 * MM, 2 * MM), materials.apIvory);
      plate.position.z = D + 1 * MM;
      root.add(plate);
      const hole = mesh(new THREE.CylinderGeometry(12 * MM, 12 * MM, 3 * MM, 24), materials.plasticBlack);
      hole.rotation.x = Math.PI / 2;
      hole.position.z = D + 2.5 * MM;
      root.add(hole);
      for (const dx of [-7.5 * MM, 7.5 * MM]) {
        const pin = mesh(new THREE.CylinderGeometry(2.2 * MM, 2.2 * MM, 4 * MM, 10), materials.plasticBlack);
        pin.rotation.x = Math.PI / 2;
        pin.position.set(dx, 0, D + 3 * MM);
        root.add(pin);
      }
    } else {
      const rocker = mesh(new THREE.BoxGeometry(36 * MM, 48 * MM, 4 * MM), materials.apIvory);
      rocker.position.z = D + 2 * MM;
      root.add(rocker);
    }

    root.userData = {
      pickable: true,
      id,
      catalogId: id,
      name,
      meta,
      kind: "surfaceDevice",
    };
  }

  return root;
}

export function createOutlet(opts = {}) {
  return createApDevice({
    id: "steckdose",
    name: "Schutzkontakt-Steckdose",
    meta: "80 × 80 × 45 mm · AP · 16 A",
    face: "outlet",
    ...opts,
  });
}

export function createSwitch(opts = {}) {
  return createApDevice({
    id: "schalter",
    name: "Wechselschalter",
    meta: "80 × 80 × 40 mm · AP",
    face: "switch",
    ...opts,
  });
}
