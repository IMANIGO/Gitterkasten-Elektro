import * as THREE from "three";
import { materials } from "../materials.js";
import { MM, toMm } from "../units.js";
import { makeTextPlate } from "./labels.js";

export {
  createDinDevice,
  createMcb1p,
  createMcb3p,
  createRcd4p,
  createRcbo1p,
} from "./dinDevices.js";

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

/**
 * Push-in spring terminal — cage-clamp class (≈5,2 mm), flush abutting sides.
 * Grey / blue / green-yellow bodies with orange actuator — no logos.
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
  peStripes = false,
  ghost = false,
}) {
  const width = widthMm * MM;
  const height = heightMm * MM;
  const depth = depthMm * MM;
  const bodyMat = ghost ? materials.ghost.clone() : colorMat;

  const g = new THREE.Group();
  g.name = name;

  const body = mesh(new THREE.BoxGeometry(width, height, depth), bodyMat);
  body.position.set(0, height / 2, depth / 2 - 22 * MM);
  g.add(body);

  // Slightly taller shoulder at top (spring-cage silhouette)
  if (!ghost) {
    const shoulder = mesh(
      new THREE.BoxGeometry(width, 6 * MM, depth * 0.55),
      bodyMat,
    );
    shoulder.position.set(0, height - 2 * MM, depth / 2 - 18 * MM);
    g.add(shoulder);
  }

  const foot = mesh(new THREE.BoxGeometry(width, 9 * MM, 11 * MM), ghost ? bodyMat : materials.plasticBlack);
  foot.position.set(0, 0, -18 * MM);
  const clip = mesh(new THREE.BoxGeometry(width * 0.95, 3.5 * MM, 7 * MM), ghost ? bodyMat : materials.din);
  clip.position.set(0, -2 * MM, -22 * MM);
  g.add(foot, clip);

  if (!ghost) {
    if (peStripes) {
      for (let i = 0; i < 3; i++) {
        const stripe = mesh(
          new THREE.BoxGeometry(width + 0.2 * MM, 4 * MM, depth * 0.7),
          materials.pe,
        );
        stripe.position.set(0, 14 * MM + i * 14 * MM, depth / 2 - 22 * MM);
        g.add(stripe);
      }
    }

    const deckH = (height - 18 * MM) / decks;
    for (let d = 0; d < decks; d++) {
      const y = 12 * MM + deckH * (d + 0.45);
      // Wire entry funnel
      const port = mesh(new THREE.BoxGeometry(width * 0.7, 6 * MM, 4 * MM), materials.plasticBlack);
      port.position.set(0, y, depth / 2 - 20 * MM);
      g.add(port);
      // Orange pusher (spring actuator)
      const act = mesh(
        new THREE.BoxGeometry(width * 0.92, 4.5 * MM, 2.5 * MM),
        materials.actuatorOrange,
      );
      act.position.set(0, y + 6 * MM, depth / 2 - 20.5 * MM);
      g.add(act);
      // Side jumper slot hint
      const slot = mesh(
        new THREE.BoxGeometry(1.2 * MM, 3 * MM, 8 * MM),
        materials.plasticBlack,
      );
      slot.position.set(width / 2 - 0.4 * MM, y + 1 * MM, depth / 2 - 28 * MM);
      g.add(slot);
    }

    if (decks > 1) {
      const divider = mesh(
        new THREE.BoxGeometry(width * 0.95, 2 * MM, depth * 0.78),
        materials.plasticBlack,
      );
      divider.position.set(0, height * 0.5, depth / 2 - 22 * MM);
      g.add(divider);
      const midLabel = makeTextPlate("2×", Math.min(widthMm - 0.5, 4.5), 4, {
        bg: "#2a2c30",
        fg: "#f2f0ea",
        size: 48,
      });
      midLabel.position.set(0, height * 0.5 + 4 * MM, depth / 2 - 19 * MM);
      g.add(midLabel);
    }

    g.userData = {
      pickable: true,
      selectable: true,
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
    peStripes: true,
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
 * Surface-mount AP housing — square 80×80 class with distinct face types.
 * Soft ivory cover, recessed insert — no brand marks.
 */
function createApDevice({ id, name, meta, face, depthMm = 42, ghost = false, accent = null }) {
  const W = 80 * MM;
  const H = 80 * MM;
  const D = depthMm * MM;
  const mat = ghost ? materials.ghost.clone() : materials.apWhite;
  const coverMat = ghost
    ? materials.ghost.clone()
    : new THREE.MeshStandardMaterial({ color: 0xf4f1e8, roughness: 0.48, metalness: 0.03 });

  const root = new THREE.Group();
  root.name = name;

  const body = mesh(new THREE.BoxGeometry(W * 0.92, H * 0.92, D * 0.65), mat);
  body.position.z = (D * 0.65) / 2;
  root.add(body);

  // Frame / cover plate with slight lip
  const cover = mesh(new THREE.BoxGeometry(W, H, D * 0.22), coverMat);
  cover.position.z = D * 0.65 + (D * 0.22) / 2;
  root.add(cover);
  const recess = mesh(
    new THREE.BoxGeometry(W - 10 * MM, H - 10 * MM, 2 * MM),
    ghost
      ? coverMat
      : new THREE.MeshStandardMaterial({ color: 0xe8e4d6, roughness: 0.55, metalness: 0.02 }),
  );
  recess.position.z = D * 0.65 + D * 0.22 + 0.5 * MM;
  root.add(recess);

  for (const [sx, sy] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ]) {
    const ear = mesh(new THREE.BoxGeometry(8 * MM, 8 * MM, 2.5 * MM), mat);
    ear.position.set(sx * (W / 2 - 4 * MM), sy * (H / 2 - 4 * MM), 1.2 * MM);
    root.add(ear);
  }

  if (!ghost) {
    const zFace = D * 0.65 + D * 0.22 + 2 * MM;
    if (face === "outlet") {
      // SCHUKO-class: round recess + earth clips
      const plate = mesh(
        new THREE.BoxGeometry(52 * MM, 52 * MM, 2 * MM),
        new THREE.MeshStandardMaterial({ color: 0xf7f4ec, roughness: 0.45, metalness: 0.04 }),
      );
      plate.position.z = zFace;
      root.add(plate);
      const bowl = mesh(
        new THREE.CylinderGeometry(18 * MM, 20 * MM, 4 * MM, 28),
        new THREE.MeshStandardMaterial({ color: 0xe0dcd0, roughness: 0.5, metalness: 0.04 }),
      );
      bowl.rotation.x = Math.PI / 2;
      bowl.position.z = zFace + 2 * MM;
      root.add(bowl);
      for (const dx of [-9.5 * MM, 9.5 * MM]) {
        const pin = mesh(new THREE.CylinderGeometry(2.5 * MM, 2.5 * MM, 6 * MM, 12), materials.plasticBlack);
        pin.rotation.x = Math.PI / 2;
        pin.position.set(dx, 1 * MM, zFace + 3 * MM);
        root.add(pin);
      }
      // Earth side clips
      for (const dy of [14 * MM, -14 * MM]) {
        const clip = mesh(new THREE.BoxGeometry(10 * MM, 3 * MM, 2 * MM), materials.brass);
        clip.position.set(0, dy, zFace + 2.5 * MM);
        root.add(clip);
      }
    } else if (face === "switch") {
      const rocker = mesh(
        new THREE.BoxGeometry(32 * MM, 48 * MM, 6 * MM),
        new THREE.MeshStandardMaterial({ color: 0xfaf8f2, roughness: 0.4, metalness: 0.04 }),
      );
      rocker.position.set(0, 0, zFace + 2 * MM);
      rocker.rotation.x = -0.12;
      root.add(rocker);
      const seam = mesh(new THREE.BoxGeometry(32 * MM, 1.2 * MM, 1 * MM), materials.plasticBlack);
      seam.position.set(0, 0, zFace + 4.5 * MM);
      root.add(seam);
      const tip = mesh(
        new THREE.BoxGeometry(8 * MM, 3 * MM, 1 * MM),
        new THREE.MeshStandardMaterial({ color: 0xb71c1c, roughness: 0.4, metalness: 0.1 }),
      );
      tip.position.set(0, 18 * MM, zFace + 5 * MM);
      root.add(tip);
    } else if (face === "pushbutton") {
      const bezel = mesh(new THREE.CylinderGeometry(16 * MM, 16 * MM, 3 * MM, 24), materials.plasticBlack);
      bezel.rotation.x = Math.PI / 2;
      bezel.position.z = zFace + 1 * MM;
      root.add(bezel);
      const btnColor = accent || 0xe6b800;
      const btn = mesh(
        new THREE.CylinderGeometry(12 * MM, 12 * MM, 5 * MM, 24),
        new THREE.MeshStandardMaterial({ color: btnColor, roughness: 0.35, metalness: 0.08 }),
      );
      btn.rotation.x = Math.PI / 2;
      btn.position.z = zFace + 3.5 * MM;
      btn.name = "actuator";
      root.add(btn);
      const label = makeTextPlate(accent ? "STOP" : "START", 36, 8, {
        bg: "#2a2c30",
        fg: "#f2f0ea",
        size: 44,
      });
      label.position.set(0, -28 * MM, zFace + 0.5 * MM);
      root.add(label);
    }

    root.userData = {
      pickable: true,
      selectable: true,
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
    accent: null,
    ...opts,
  });
}

export function createPushbuttonStop(opts = {}) {
  return createApDevice({
    id: "taster-stop",
    name: "AP-Taster STOP",
    meta: "80 × 80 × 42 mm · Aufputz · Öffner",
    face: "pushbutton",
    depthMm: 42,
    accent: 0xc0392b,
    ...opts,
  });
}

/** CEE 16 A surface socket — industrial red housing, 5-pin face (generic). */
export function createCeeOutlet({ ghost = false } = {}) {
  const W = 100 * MM;
  const H = 100 * MM;
  const D = 70 * MM;
  const mat = ghost ? materials.ghost.clone() : materials.ceeRed;
  const root = new THREE.Group();
  root.name = "CEE-Steckdose 16 A";

  const body = mesh(new THREE.BoxGeometry(W, H, D * 0.5), mat);
  body.position.z = (D * 0.5) / 2;
  root.add(body);

  // Flange
  const flange = mesh(new THREE.BoxGeometry(W + 6 * MM, H + 6 * MM, 4 * MM), mat);
  flange.position.z = D * 0.5 + 2 * MM;
  root.add(flange);

  const collar = mesh(new THREE.CylinderGeometry(36 * MM, 38 * MM, 18 * MM, 32), mat);
  collar.rotation.x = Math.PI / 2;
  collar.position.z = D * 0.5 + 12 * MM;
  root.add(collar);

  if (!ghost) {
    const faceDisk = mesh(
      new THREE.CylinderGeometry(30 * MM, 30 * MM, 3 * MM, 32),
      new THREE.MeshStandardMaterial({ color: 0x8b1a1a, roughness: 0.45, metalness: 0.08 }),
    );
    faceDisk.rotation.x = Math.PI / 2;
    faceDisk.position.z = D * 0.5 + 20 * MM;
    root.add(faceDisk);

    for (const [ang, r] of [
      [0, 12],
      [72, 12],
      [144, 12],
      [216, 12],
      [288, 8],
    ]) {
      const rad = (ang * Math.PI) / 180;
      const pin = mesh(
        new THREE.CylinderGeometry(r === 8 ? 3.8 * MM : 2.8 * MM, r === 8 ? 3.8 * MM : 2.8 * MM, 10 * MM, 10),
        materials.plasticBlack,
      );
      pin.rotation.x = Math.PI / 2;
      pin.position.set(Math.cos(rad) * 15 * MM, Math.sin(rad) * 15 * MM, D * 0.5 + 22 * MM);
      root.add(pin);
    }
    const plate = makeTextPlate("16A 5p", 36, 10, { bg: "#6b1212", fg: "#f2f0ea", size: 44 });
    plate.position.set(0, -42 * MM, D * 0.5 + 5 * MM);
    root.add(plate);
    root.userData = {
      pickable: true,
      selectable: true,
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

export function createLuminaire({ ghost = false } = {}) {
  const W = 120 * MM;
  const H = 60 * MM;
  const D = 50 * MM;
  const mat = ghost ? materials.ghost.clone() : materials.apWhite;
  const root = new THREE.Group();
  root.name = "Leuchte";

  const body = mesh(new THREE.BoxGeometry(W, H, D * 0.35), mat);
  body.position.z = (D * 0.35) / 2;
  root.add(body);
  // Diffuser dome-ish box
  const glass = mesh(
    new THREE.BoxGeometry(W - 8 * MM, H - 8 * MM, D * 0.4),
    ghost
      ? materials.ghost.clone()
      : new THREE.MeshStandardMaterial({
          color: 0xf8f2c8,
          roughness: 0.22,
          metalness: 0.04,
          emissive: 0x887722,
          emissiveIntensity: 0.35,
        }),
  );
  glass.position.z = D * 0.35 + (D * 0.4) / 2;
  root.add(glass);

  if (!ghost) {
    const plate = makeTextPlate("LED", 28, 8, { bg: "#2a2c30", fg: "#f2f0ea", size: 44 });
    plate.position.set(0, -H / 2 + 8 * MM, D * 0.35 + 1 * MM);
    root.add(plate);
    root.userData = {
      pickable: true,
      selectable: true,
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
 * Junction / Abzweigdose — halogen-free square enclosure with knockouts & lid screws.
 */
export function createJunctionBox({ ghost = false } = {}) {
  const W = 85 * MM;
  const H = 85 * MM;
  const D = 40 * MM;
  const wall = 2.8 * MM;
  const mat = ghost
    ? materials.ghost.clone()
    : new THREE.MeshStandardMaterial({ color: 0xd6d0c0, roughness: 0.55, metalness: 0.03 });
  const root = new THREE.Group();
  root.name = "Abzweigdose";

  const outer = mesh(new THREE.BoxGeometry(W, H, D), mat);
  outer.position.z = D / 2;
  root.add(outer);

  if (!ghost) {
    const inner = mesh(
      new THREE.BoxGeometry(W - 2 * wall, H - 2 * wall, D - wall),
      materials.junctionInner,
    );
    inner.position.z = D / 2 + 0.8 * MM;
    root.add(inner);

    const lid = mesh(
      new THREE.BoxGeometry(W - 2 * MM, H - 2 * MM, 3.5 * MM),
      new THREE.MeshStandardMaterial({ color: 0xcfc8b6, roughness: 0.5, metalness: 0.03 }),
    );
    lid.position.z = D + 1.8 * MM;
    root.add(lid);

    // Raised center emboss
    const emboss = mesh(
      new THREE.BoxGeometry(W * 0.45, H * 0.45, 1.5 * MM),
      new THREE.MeshStandardMaterial({ color: 0xc4bba8, roughness: 0.55, metalness: 0.03 }),
    );
    emboss.position.z = D + 4 * MM;
    root.add(emboss);

    for (const [sx, sy] of [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ]) {
      const screw = createScrew(2.2 * MM);
      screw.position.set(sx * (W / 2 - 10 * MM), sy * (H / 2 - 10 * MM), D + 4 * MM);
      root.add(screw);
    }

    for (const [x, y, rot] of [
      [0, H / 2, 0],
      [0, -H / 2, 0],
      [W / 2, 0, Math.PI / 2],
      [-W / 2, 0, Math.PI / 2],
    ]) {
      const ko = mesh(new THREE.TorusGeometry(9 * MM, 1.4 * MM, 6, 18), materials.plasticBlack);
      ko.position.set(x * 0.9, y * 0.9, D * 0.4);
      if (rot) ko.rotation.y = rot;
      else ko.rotation.x = Math.PI / 2;
      root.add(ko);
    }

    const plate = makeTextPlate("IP65", 28, 8, { bg: "#4a463c", fg: "#f2f0ea", size: 44 });
    plate.position.set(0, 0, D + 5 * MM);
    root.add(plate);

    root.userData = {
      pickable: true,
      selectable: true,
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
