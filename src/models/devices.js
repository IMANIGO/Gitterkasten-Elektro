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
 * Modular DIN protective device — Volta-/MCB-class proportions (generic, no brand marks).
 * Origin at rail seat (y=0), front +Z, width along X. Bodies sit flush (te * 18 mm).
 */
export function createDinDevice({
  te,
  label,
  id,
  name,
  meta,
  color = 0xf2f0ea,
  levers = 1,
  accent = null,
  testButton = false,
  ghost = false,
}) {
  const width = te * TE;
  const height = 90 * MM;
  const depth = 70 * MM;
  const mat = ghost
    ? materials.ghost.clone()
    : new THREE.MeshStandardMaterial({ color, metalness: 0.06, roughness: 0.46 });

  const root = new THREE.Group();
  root.name = name;

  // Slightly under full TE so modules seat flush without z-fighting; visual gap ~0
  const body = mesh(new THREE.BoxGeometry(width - 0.15 * MM, height, depth), mat);
  body.position.set(0, height / 2, depth / 2 - 22 * MM);
  root.add(body);
  root.add(dinFoot(width - 1 * MM));

  if (!ghost) {
    // Top bezel strip (modular look)
    const bezel = mesh(
      new THREE.BoxGeometry(width - 1 * MM, 4 * MM, depth - 4 * MM),
      materials.deviceBezel,
    );
    bezel.position.set(0, height - 2 * MM, depth / 2 - 22 * MM);
    root.add(bezel);

    const leverW = (width - 4 * MM) / levers;
    for (let i = 0; i < levers; i++) {
      const lever = mesh(
        new THREE.BoxGeometry(Math.max(leverW * 0.55, 6 * MM), 20 * MM, 7 * MM),
        materials.lever,
      );
      const x = -width / 2 + 2 * MM + leverW * (i + 0.5);
      lever.position.set(x, height - 14 * MM, depth / 2 - 16 * MM);
      root.add(lever);
      // Pivot knuckle
      const knuckle = mesh(
        new THREE.CylinderGeometry(2.2 * MM, 2.2 * MM, leverW * 0.5, 10),
        materials.plasticBlack,
      );
      knuckle.rotation.z = Math.PI / 2;
      knuckle.position.set(x, height - 24 * MM, depth / 2 - 16 * MM);
      root.add(knuckle);
    }

    if (testButton) {
      const btn = mesh(new THREE.CylinderGeometry(4 * MM, 4 * MM, 3 * MM, 16), materials.testBtn);
      btn.rotation.x = Math.PI / 2;
      btn.position.set(width / 2 - 10 * MM, height * 0.35, depth / 2 - 21 * MM);
      root.add(btn);
    }

    if (accent) {
      const stripe = mesh(
        new THREE.BoxGeometry(3 * MM, height * 0.55, 1 * MM),
        new THREE.MeshStandardMaterial({ color: accent, roughness: 0.45, metalness: 0.05 }),
      );
      stripe.position.set(-width / 2 + 2.5 * MM, height * 0.45, depth / 2 - 21.4 * MM);
      root.add(stripe);
    }

    const plate = makeTextPlate(label, Math.min(toMm(width) - 2, 52), 9, {
      bg: "#2c3034",
      fg: "#f2f0ea",
      size: 44,
    });
    plate.position.set(0, height * 0.38, depth / 2 - 21.5 * MM);
    root.add(plate);

    root.userData = {
      pickable: true,
      id,
      catalogId: id,
      name,
      meta,
      kind: "dinDevice",
      te,
      widthMm: toMm(width),
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
    color: 0xf4f2ec,
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
    color: 0xf4f2ec,
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
    color: 0xdceaf5,
    accent: 0x2f6fad,
    testButton: true,
    ...opts,
  });
}

/** Combined RCD+MCB (FI/LS), 2 TE — common modular RCBO envelope. */
export function createRcbo1p(opts = {}) {
  return createDinDevice({
    te: 2,
    label: "FI/LS",
    id: "fils-1p",
    name: "FI/LS-Schalter 1P+N",
    meta: "2 TE · 36 × 90 × 70 mm · 16 A / 30 mA",
    levers: 1,
    color: 0xe4eef6,
    accent: 0xc0392b,
    testButton: true,
    ...opts,
  });
}

/**
 * Push-in spring terminal — TOPJOB-class proportions (5,2 mm), flush side walls.
 * Generic look: no logos; cage opening + orange actuator hint.
 */
function createSpringTerminal({
  id,
  name,
  meta,
  widthMm = 5.2,
  heightMm = 55,
  depthMm = 48,
  colorMat,
  decks = 1,
  ghost = false,
}) {
  const width = widthMm * MM;
  const height = heightMm * MM;
  const depth = depthMm * MM;
  const bodyMat = ghost ? materials.ghost.clone() : colorMat;

  const g = new THREE.Group();
  g.name = name;

  // Full width body — abutting neighbors share faces (no intentional gap)
  const body = mesh(new THREE.BoxGeometry(width, height, depth), bodyMat);
  body.position.set(0, height / 2, depth / 2 - 22 * MM);
  g.add(body);

  const foot = mesh(new THREE.BoxGeometry(width, 9 * MM, 11 * MM), ghost ? bodyMat : materials.plasticBlack);
  foot.position.set(0, 0, -18 * MM);
  const clip = mesh(new THREE.BoxGeometry(width * 0.95, 3.5 * MM, 7 * MM), ghost ? bodyMat : materials.din);
  clip.position.set(0, -2 * MM, -22 * MM);
  g.add(foot, clip);

  if (!ghost) {
    const deckH = (height - 18 * MM) / decks;
    for (let d = 0; d < decks; d++) {
      const y = 12 * MM + deckH * (d + 0.45);
      const port = mesh(new THREE.BoxGeometry(width * 0.72, 5 * MM, 3.5 * MM), materials.plasticBlack);
      port.position.set(0, y, depth / 2 - 20.5 * MM);
      g.add(port);
      const act = mesh(
        new THREE.BoxGeometry(width * 0.88, 3 * MM, 2 * MM),
        materials.actuatorOrange,
      );
      act.position.set(0, y + 5.5 * MM, depth / 2 - 21 * MM);
      g.add(act);
    }

    if (decks > 1) {
      const divider = mesh(
        new THREE.BoxGeometry(width * 0.92, 1.2 * MM, depth * 0.72),
        materials.plasticBlack,
      );
      divider.position.set(0, height * 0.5, depth / 2 - 22 * MM);
      g.add(divider);
    }

    g.userData = {
      pickable: true,
      id,
      catalogId: id,
      name,
      meta,
      kind: "terminal",
      widthMm,
      te: null,
      abutting: true,
    };
  }

  return g;
}

export function createTerminalL(opts = {}) {
  return createSpringTerminal({
    id: "reihenklemme-l",
    name: "Federkraftklemme L",
    meta: "5,2 × 55 × 48 mm · 2,5 mm² · grau · bündig",
    widthMm: 5.2,
    colorMat: materials.terminalGray,
    decks: 1,
    ...opts,
  });
}

export function createTerminalN(opts = {}) {
  return createSpringTerminal({
    id: "reihenklemme-n",
    name: "Federkraftklemme N",
    meta: "5,2 × 55 × 48 mm · 2,5 mm² · blau · bündig",
    widthMm: 5.2,
    colorMat: materials.terminalBlue,
    decks: 1,
    ...opts,
  });
}

export function createTerminalPe(opts = {}) {
  return createSpringTerminal({
    id: "reihenklemme-pe",
    name: "Federkraftklemme PE",
    meta: "5,2 × 55 × 48 mm · 2,5 mm² · grün-gelb · bündig",
    widthMm: 5.2,
    colorMat: materials.terminalPe,
    decks: 1,
    ...opts,
  });
}

export function createTerminalDouble(opts = {}) {
  return createSpringTerminal({
    id: "doppelstockklemme-l",
    name: "Doppelstockklemme L/L",
    meta: "5,2 × 70 × 52 mm · 2,5 mm² · 2 Ebenen · bündig",
    widthMm: 5.2,
    heightMm: 70,
    depthMm: 52,
    colorMat: materials.terminalGray,
    decks: 2,
    ...opts,
  });
}

export function createTerminalDoubleN(opts = {}) {
  return createSpringTerminal({
    id: "doppelstockklemme-n",
    name: "Doppelstockklemme N/N",
    meta: "5,2 × 70 × 52 mm · 2,5 mm² · 2 Ebenen · blau · bündig",
    widthMm: 5.2,
    heightMm: 70,
    depthMm: 52,
    colorMat: materials.terminalBlue,
    decks: 2,
    ...opts,
  });
}

/**
 * Surface-mount AP housing — DELTA-class square envelope (generic, no brand marks).
 * ~80×80 mm cover, recessed rocker / SCHUKO face.
 */
function createApDevice({ id, name, meta, face, depthMm = 42, ghost = false }) {
  const W = 80 * MM;
  const H = 80 * MM;
  const D = depthMm * MM;
  const mat = ghost ? materials.ghost.clone() : materials.apWhite;
  const coverMat = ghost ? materials.ghost.clone() : materials.apIvory;

  const root = new THREE.Group();
  root.name = name;

  // Housing with slight bevel lip
  const body = mesh(new THREE.BoxGeometry(W, H, D * 0.72), mat);
  body.position.z = (D * 0.72) / 2;
  root.add(body);
  const cover = mesh(new THREE.BoxGeometry(W - 2 * MM, H - 2 * MM, D * 0.28), coverMat);
  cover.position.z = D * 0.72 + (D * 0.28) / 2;
  root.add(cover);

  // Corner mounting ears (AP look)
  for (const [sx, sy] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ]) {
    const ear = mesh(new THREE.BoxGeometry(10 * MM, 10 * MM, 3 * MM), mat);
    ear.position.set(sx * (W / 2 - 5 * MM), sy * (H / 2 - 5 * MM), 1.5 * MM);
    root.add(ear);
  }

  if (!ghost) {
    const zFace = D + 0.5 * MM;
    if (face === "outlet") {
      const plate = mesh(new THREE.BoxGeometry(58 * MM, 58 * MM, 2.5 * MM), coverMat);
      plate.position.z = zFace;
      root.add(plate);
      const ring = mesh(new THREE.TorusGeometry(16 * MM, 2 * MM, 8, 24), materials.plasticBlack);
      ring.position.z = zFace + 1.5 * MM;
      root.add(ring);
      for (const dx of [-9.5 * MM, 9.5 * MM]) {
        const pin = mesh(new THREE.CylinderGeometry(2.4 * MM, 2.4 * MM, 5 * MM, 12), materials.plasticBlack);
        pin.rotation.x = Math.PI / 2;
        pin.position.set(dx, 2 * MM, zFace + 2 * MM);
        root.add(pin);
      }
      const peClip = mesh(new THREE.BoxGeometry(18 * MM, 3 * MM, 2 * MM), materials.brass);
      peClip.position.set(0, -12 * MM, zFace + 1.5 * MM);
      root.add(peClip);
    } else if (face === "switch") {
      const rocker = mesh(new THREE.BoxGeometry(34 * MM, 46 * MM, 5 * MM), coverMat);
      rocker.position.set(0, 0, zFace + 1 * MM);
      rocker.rotation.x = -0.08;
      root.add(rocker);
      const hinge = mesh(new THREE.BoxGeometry(34 * MM, 2 * MM, 2 * MM), materials.plasticBlack);
      hinge.position.set(0, 0, zFace);
      root.add(hinge);
    } else if (face === "pushbutton") {
      const bezel = mesh(new THREE.CylinderGeometry(14 * MM, 14 * MM, 3 * MM, 24), materials.plasticBlack);
      bezel.rotation.x = Math.PI / 2;
      bezel.position.z = zFace + 1 * MM;
      root.add(bezel);
      const btn = mesh(new THREE.CylinderGeometry(11 * MM, 11 * MM, 4 * MM, 24), materials.testBtn);
      btn.rotation.x = Math.PI / 2;
      btn.position.z = zFace + 3 * MM;
      root.add(btn);
    }

    root.userData = {
      pickable: true,
      id,
      catalogId: id,
      name,
      meta,
      kind: "surfaceDevice",
      widthMm: 80,
      heightMm: 80,
      depthMm,
    };
  }

  return root;
}

export function createOutlet(opts = {}) {
  return createApDevice({
    id: "steckdose",
    name: "AP-Schutzkontakt-Steckdose",
    meta: "80 × 80 × 45 mm · Aufputz · 16 A",
    face: "outlet",
    depthMm: 45,
    ...opts,
  });
}

export function createSwitch(opts = {}) {
  return createApDevice({
    id: "schalter",
    name: "AP-Wechselschalter",
    meta: "80 × 80 × 42 mm · Aufputz",
    face: "switch",
    depthMm: 42,
    ...opts,
  });
}

export function createPushbutton(opts = {}) {
  return createApDevice({
    id: "taster",
    name: "AP-Taster START",
    meta: "80 × 80 × 42 mm · Aufputz · Schließer",
    face: "pushbutton",
    depthMm: 42,
    ...opts,
  });
}

/** STOP / Öffner — red actuator, otherwise same AP envelope. */
export function createPushbuttonStop(opts = {}) {
  const root = createApDevice({
    id: "taster-stop",
    name: "AP-Taster STOP",
    meta: "80 × 80 × 42 mm · Aufputz · Öffner",
    face: "pushbutton",
    depthMm: 42,
    ...opts,
  });
  if (!opts.ghost) {
    root.traverse((c) => {
      if (c.isMesh && c.material?.color && c.geometry?.type === "CylinderGeometry") {
        const r = c.geometry.parameters?.radiusTop;
        if (r && r > 10 * MM) c.material = materials.testBtn;
      }
    });
    root.userData.catalogId = "taster-stop";
    root.userData.id = "taster-stop";
    root.userData.name = "AP-Taster STOP";
    root.userData.meta = "80 × 80 × 42 mm · Aufputz · Öffner";
  }
  return root;
}

/** CEE 16 A surface socket — red industrial look, generic (no brand marks). */
export function createCeeOutlet({ ghost = false } = {}) {
  const W = 100 * MM;
  const H = 100 * MM;
  const D = 70 * MM;
  const mat = ghost ? materials.ghost.clone() : materials.ceeRed;
  const root = new THREE.Group();
  root.name = "CEE-Steckdose 16 A";
  const body = mesh(new THREE.BoxGeometry(W, H, D * 0.55), mat);
  body.position.z = (D * 0.55) / 2;
  root.add(body);
  const face = mesh(new THREE.CylinderGeometry(32 * MM, 32 * MM, 12 * MM, 32), mat);
  face.rotation.x = Math.PI / 2;
  face.position.z = D * 0.55 + 6 * MM;
  root.add(face);
  if (!ghost) {
    for (const [ang, r] of [
      [0, 12],
      [72, 12],
      [144, 12],
      [216, 12],
      [288, 8],
    ]) {
      const rad = (ang * Math.PI) / 180;
      const pin = mesh(
        new THREE.CylinderGeometry(r === 8 ? 3.5 * MM : 2.8 * MM, r === 8 ? 3.5 * MM : 2.8 * MM, 8 * MM, 10),
        materials.plasticBlack,
      );
      pin.rotation.x = Math.PI / 2;
      pin.position.set(Math.cos(rad) * 14 * MM, Math.sin(rad) * 14 * MM, D * 0.55 + 10 * MM);
      root.add(pin);
    }
    const plate = makeTextPlate("16A", 28, 10, { bg: "#8b1a1a", fg: "#f2f0ea", size: 48 });
    plate.position.set(0, -38 * MM, D * 0.55 + 1 * MM);
    root.add(plate);
    root.userData = {
      pickable: true,
      id: "cee-16a",
      catalogId: "cee-16a",
      name: "CEE-Steckdose 16 A",
      meta: "100 × 100 × 70 mm · 5-polig · 400 V",
      kind: "surfaceDevice",
      widthMm: 100,
      heightMm: 100,
      depthMm: 70,
    };
  }
  return root;
}

/** Simple AP luminaire / Leuchte for training box. */
export function createLuminaire({ ghost = false } = {}) {
  const W = 120 * MM;
  const H = 60 * MM;
  const D = 50 * MM;
  const mat = ghost ? materials.ghost.clone() : materials.apWhite;
  const root = new THREE.Group();
  root.name = "Leuchte";
  const body = mesh(new THREE.BoxGeometry(W, H, D * 0.4), mat);
  body.position.z = (D * 0.4) / 2;
  root.add(body);
  const glass = mesh(
    new THREE.BoxGeometry(W - 10 * MM, H - 10 * MM, D * 0.35),
    ghost
      ? materials.ghost.clone()
      : new THREE.MeshStandardMaterial({
          color: 0xf5f0c8,
          roughness: 0.25,
          metalness: 0.05,
          emissive: 0x665522,
          emissiveIntensity: 0.25,
        }),
  );
  glass.position.z = D * 0.4 + (D * 0.35) / 2;
  root.add(glass);
  if (!ghost) {
    root.userData = {
      pickable: true,
      id: "leuchte",
      catalogId: "leuchte",
      name: "Leuchte",
      meta: "120 × 60 × 50 mm · Beleuchtung",
      kind: "surfaceDevice",
      widthMm: 120,
      heightMm: 60,
      depthMm: 50,
    };
  }
  return root;
}

/**
 * Junction / Abzweigdose — IP-class square enclosure (generic Spelsberg-class proportions).
 * Typical ~85×85×40 mm with knockouts and lid screws.
 */
export function createJunctionBox({ ghost = false } = {}) {
  const W = 85 * MM;
  const H = 85 * MM;
  const D = 40 * MM;
  const wall = 2.5 * MM;
  const mat = ghost ? materials.ghost.clone() : materials.junctionHalogen;
  const root = new THREE.Group();
  root.name = "Abzweigdose";

  const outer = mesh(new THREE.BoxGeometry(W, H, D), mat);
  outer.position.z = D / 2;
  root.add(outer);

  if (!ghost) {
    // Hollow feel: darker inner recess
    const inner = mesh(
      new THREE.BoxGeometry(W - 2 * wall, H - 2 * wall, D - wall),
      materials.junctionInner,
    );
    inner.position.z = D / 2 + 0.5 * MM;
    root.add(inner);

    // Lid
    const lid = mesh(new THREE.BoxGeometry(W - 1 * MM, H - 1 * MM, 3 * MM), mat);
    lid.position.z = D + 1.5 * MM;
    root.add(lid);

    for (const [sx, sy] of [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ]) {
      const screw = createScrew(2 * MM);
      screw.position.set(sx * (W / 2 - 8 * MM), sy * (H / 2 - 8 * MM), D + 3.5 * MM);
      root.add(screw);
    }

    // Side knockouts (rings)
    for (const [x, y, rot] of [
      [0, H / 2, 0],
      [0, -H / 2, 0],
      [W / 2, 0, Math.PI / 2],
      [-W / 2, 0, Math.PI / 2],
    ]) {
      const ko = mesh(new THREE.TorusGeometry(8 * MM, 1.2 * MM, 6, 16), materials.plasticBlack);
      ko.position.set(x * 0.92, y * 0.92, D * 0.45);
      if (rot) ko.rotation.y = rot;
      else ko.rotation.x = Math.PI / 2;
      root.add(ko);
    }

    root.userData = {
      pickable: true,
      id: "abzweigdose",
      catalogId: "abzweigdose",
      name: "Abzweigdose",
      meta: "85 × 85 × 40 mm · halogenfrei · mit Ausbrechungen",
      kind: "junctionBox",
      widthMm: 85,
      heightMm: 85,
      depthMm: 40,
    };
  }

  return root;
}
