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
  createImpulseRelay,
  createContactor,
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

const deckGrey = new THREE.MeshStandardMaterial({
  color: 0xd5d8dc,
  roughness: 0.48,
  metalness: 0.04,
});
const deckBlue = new THREE.MeshStandardMaterial({
  color: 0x1f74c4,
  roughness: 0.46,
  metalness: 0.05,
});
const deckYellow = new THREE.MeshStandardMaterial({
  color: 0xd6b423,
  roughness: 0.46,
  metalness: 0.05,
});
const deckGreen = new THREE.MeshStandardMaterial({
  color: 0x3c8c32,
  roughness: 0.46,
  metalness: 0.05,
});
const deckMarker = new THREE.MeshStandardMaterial({
  color: 0xf7f5ef,
  roughness: 0.62,
  metalness: 0.02,
});
const deckOrange = new THREE.MeshStandardMaterial({
  color: 0xf07816,
  roughness: 0.4,
  metalness: 0.08,
});
const deckHole = new THREE.MeshStandardMaterial({
  color: 0x121416,
  roughness: 0.55,
  metalness: 0.15,
});

function paint(mat, ghost) {
  return ghost ? materials.ghost.clone() : mat;
}

/** Housing block. PE is the housing itself in green-yellow bands. */
function addHousingBox(group, width, height, depth, x, y, z, mat, { pe = false, ghost = false } = {}) {
  if (!pe) {
    const body = mesh(new THREE.BoxGeometry(width, height, depth), paint(mat, ghost));
    body.position.set(x, y, z);
    group.add(body);
    return;
  }
  const bands = Math.max(3, Math.round(height / (6.2 * MM)));
  const bandH = height / bands;
  for (let i = 0; i < bands; i++) {
    const band = mesh(
      new THREE.BoxGeometry(width, bandH + 0.06 * MM, depth),
      paint(i % 2 === 0 ? deckYellow : deckGreen, ghost),
    );
    band.position.set(x, y - height / 2 + bandH * (i + 0.5), z);
    group.add(band);
  }
}

/** One deck: round push-in opening with the orange actuator directly above it. */
function addConductorEntry(group, { yHole, yPush, zFront, ghost }) {
  const hole = mesh(new THREE.CylinderGeometry(1.62 * MM, 1.62 * MM, 1.15 * MM, 20), paint(deckHole, ghost));
  hole.rotation.x = Math.PI / 2;
  hole.position.set(0, yHole, zFront + 0.15 * MM);
  const well = mesh(new THREE.CylinderGeometry(1.15 * MM, 1.15 * MM, 1.35 * MM, 16), paint(deckHole, ghost));
  well.rotation.x = Math.PI / 2;
  well.position.set(0, yHole, zFront + 0.55 * MM);
  const rim = mesh(new THREE.TorusGeometry(1.62 * MM, 0.26 * MM, 8, 20), paint(deckHole, ghost));
  rim.position.set(0, yHole, zFront + 0.72 * MM);
  const slot = mesh(new THREE.BoxGeometry(3.35 * MM, 2.15 * MM, 0.7 * MM), paint(deckHole, ghost));
  slot.position.set(0, yPush, zFront + 0.2 * MM);
  const pusher = mesh(new THREE.BoxGeometry(2.85 * MM, 1.45 * MM, 1.35 * MM), paint(deckOrange, ghost));
  pusher.position.set(0, yPush, zFront + 0.85 * MM);
  group.add(hole, well, rim, slot, pusher);
}

/**
 * Double-deck push-in terminal, 5,2 mm, abutting on the DIN rail.
 * Two conductor levels, round entries, orange pushers, blank marker.
 * No manufacturer mark and no type name on the mesh.
 * Foot and clip stay on the same rail grip as the other DIN devices.
 */
function createDoubleDeckTerminal({ id, name, meta, colorMat, pe = false, ghost = false }) {
  const widthMm = 5.2;
  const width = widthMm * MM;
  const height = 66 * MM;
  const g = new THREE.Group();
  g.name = name;

  addHousingBox(g, width, 60 * MM, 30 * MM, 0, 33 * MM, 0, colorMat, { pe, ghost });
  addHousingBox(g, width - 0.04 * MM, 24 * MM, 6.2 * MM, 0, 15 * MM, 16.4 * MM, colorMat, { pe, ghost });

  addConductorEntry(g, { yHole: 12.4 * MM, yPush: 17.6 * MM, zFront: 19.5 * MM, ghost });
  addConductorEntry(g, { yHole: 42.6 * MM, yPush: 47.8 * MM, zFront: 15 * MM, ghost });

  const markerTop = mesh(new THREE.BoxGeometry(width * 0.92, 2.3 * MM, 12 * MM), paint(deckMarker, ghost));
  markerTop.position.set(0, 64.2 * MM, 4.5 * MM);
  const markerFace = mesh(new THREE.BoxGeometry(width * 0.92, 4.4 * MM, 0.85 * MM), paint(deckMarker, ghost));
  markerFace.position.set(0, 60.4 * MM, 15.35 * MM);
  g.add(markerTop, markerFace);

  const footGroup = new THREE.Group();
  footGroup.name = "din-foot";
  addHousingBox(footGroup, width * 0.98, 9 * MM, 11 * MM, 0, 0, -18 * MM, colorMat, { pe, ghost });
  const clip = mesh(
    new THREE.BoxGeometry(width * 0.92, 3.5 * MM, 7 * MM),
    paint(materials.din, ghost),
  );
  clip.position.set(0, -2 * MM, -22 * MM);
  footGroup.add(clip);
  g.add(footGroup);

  // Centre the body on the Hutschiene; keep foot/clip on the rail.
  const offset = -height / 2;
  for (const child of g.children) {
    if (child.name === "din-foot") continue;
    child.position.y += offset;
  }

  if (!ghost) {
    g.userData = {
      pickable: true,
      selectable: true,
      id,
      catalogId: id,
      name,
      meta,
      kind: "terminal",
      widthMm,
      heightMm: 66,
      depthMm: 46,
      te: null,
      abutting: true,
    };
  }

  return g;
}

export function createTerminalL(opts = {}) {
  return createDoubleDeckTerminal({
    id: "reihenklemme-l",
    name: "Doppelstockklemme L",
    meta: "5,2 × 66 × 46 mm · 2,5 mm² · 2 Ebenen · grau · bündig",
    colorMat: deckGrey,
    ...opts,
  });
}

export function createTerminalN(opts = {}) {
  return createDoubleDeckTerminal({
    id: "reihenklemme-n",
    name: "Doppelstockklemme N",
    meta: "5,2 × 66 × 46 mm · 2,5 mm² · 2 Ebenen · blau · bündig",
    colorMat: deckBlue,
    ...opts,
  });
}

export function createTerminalPe(opts = {}) {
  return createDoubleDeckTerminal({
    id: "reihenklemme-pe",
    name: "Doppelstockklemme PE",
    meta: "5,2 × 66 × 46 mm · 2,5 mm² · 2 Ebenen · grün-gelb · bündig",
    colorMat: deckYellow,
    pe: true,
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

/**
 * CEE 16 A 5p 400 V wall socket, 6h, IP44.
 * Grey flange, round red housing, socket face inclined 15° with the
 * bottom rim further from the wall, closed hinged lid, top cable entry.
 * Generic IEC 60309 form, no maker name.
 */
export function createCeeOutlet({ ghost = false } = {}) {
  const shell = ghost ? materials.ghost.clone() : null;
  const red = ghost
    ? shell
    : new THREE.MeshStandardMaterial({ color: 0xb4232a, roughness: 0.52, metalness: 0.04 });
  const grey = ghost
    ? shell
    : new THREE.MeshStandardMaterial({ color: 0xd4d0c8, roughness: 0.62, metalness: 0.05 });
  const dark = ghost
    ? shell
    : new THREE.MeshStandardMaterial({ color: 0x1c1918, roughness: 0.62, metalness: 0.06 });
  const silver = ghost
    ? shell
    : new THREE.MeshStandardMaterial({ color: 0xc5c9ce, roughness: 0.32, metalness: 0.74 });

  const root = new THREE.Group();
  root.name = "CEE-Steckdose 16 A";

  // Grey mounting flange. The shift below puts its back face on local z = 0.
  const flangeT = 8;
  const flange = mesh(new THREE.BoxGeometry(87.5 * MM, 118 * MM, flangeT * MM), grey);
  flange.position.set(0, 8 * MM, (flangeT / 2) * MM);
  root.add(flange);

  // External fixing holes, Ø5.3, 76 mm apart.
  for (const sx of [-1, 1]) {
    const hole = mesh(
      new THREE.CylinderGeometry(2.65 * MM, 2.65 * MM, (flangeT + 1.2) * MM, 14),
      dark,
    );
    hole.rotation.x = Math.PI / 2;
    hole.position.set(sx * 38 * MM, 18 * MM, (flangeT / 2) * MM);
    root.add(hole);
  }

  // Round housing, slightly wider toward the bottom, back against the flange.
  const bodyH = 124;
  const bodyTop = 70;
  const bodyR = 33;
  const bodyZ = flangeT + bodyR - 2;
  const body = mesh(
    new THREE.CylinderGeometry(30 * MM, bodyR * MM, bodyH * MM, 42),
    red,
  );
  body.position.set(0, (bodyTop - bodyH / 2) * MM, bodyZ * MM);
  root.add(body);

  const dome = mesh(
    new THREE.SphereGeometry(30 * MM, 32, 14, 0, Math.PI * 2, 0, Math.PI / 2),
    red,
  );
  dome.scale.y = 0.42;
  dome.position.set(0, bodyTop * MM, bodyZ * MM);
  root.add(dome);

  // Cable entry on the top, toward the rear.
  const glandY = bodyTop + 4;
  const glandZ = bodyZ - 16;
  const boss = mesh(new THREE.CylinderGeometry(7.5 * MM, 8.5 * MM, 7 * MM, 20), red);
  boss.position.set(0, glandY * MM, glandZ * MM);
  root.add(boss);
  const nut = mesh(new THREE.CylinderGeometry(11.5 * MM, 11.5 * MM, 4 * MM, 6), grey);
  nut.position.set(0, (glandY - 1.5) * MM, glandZ * MM);
  root.add(nut);
  const glandHole = mesh(new THREE.CylinderGeometry(4 * MM, 4 * MM, 2 * MM, 14), dark);
  glandHole.position.set(0, (glandY + 3.2) * MM, glandZ * MM);
  root.add(glandHole);

  // 15° snout of the same diameter, half buried in the housing so the lid is the front face.
  const face = new THREE.Group();
  face.position.set(0, (bodyTop - bodyH + 34) * MM, (bodyZ + bodyR + 4) * MM);
  face.rotation.x = (-15 * Math.PI) / 180;

  const neck = mesh(new THREE.CylinderGeometry(bodyR * MM, 31.5 * MM, 28 * MM, 42), red);
  neck.rotation.x = Math.PI / 2;
  neck.position.z = 2 * MM;
  face.add(neck);

  const rim = mesh(new THREE.CylinderGeometry(34.6 * MM, 32.4 * MM, 6 * MM, 42), red);
  rim.rotation.x = Math.PI / 2;
  rim.position.z = 16 * MM;
  face.add(rim);

  const seal = mesh(new THREE.CylinderGeometry(28.2 * MM, 28.2 * MM, 1.4 * MM, 32), dark);
  seal.rotation.x = Math.PI / 2;
  seal.position.z = 18.4 * MM;
  face.add(seal);

  const lid = mesh(new THREE.CylinderGeometry(33.8 * MM, 33.8 * MM, 6 * MM, 42), red);
  lid.rotation.x = Math.PI / 2;
  lid.position.z = 22 * MM;
  face.add(lid);

  // Ribbed latch across the upper rim, spring arm back along the right side.
  const latch = mesh(new THREE.BoxGeometry(16 * MM, 14 * MM, 8 * MM), red);
  latch.position.set(0, 26 * MM, 26 * MM);
  face.add(latch);
  for (let i = -2; i <= 2; i++) {
    const rib = mesh(new THREE.BoxGeometry(1.7 * MM, 10 * MM, 1.6 * MM), red);
    rib.position.set(i * 2.6 * MM, 26 * MM, 30.5 * MM);
    face.add(rib);
  }
  const pin = mesh(new THREE.CylinderGeometry(2.1 * MM, 2.1 * MM, 24 * MM, 12), red);
  pin.rotation.z = Math.PI / 2;
  pin.position.set(0, 32 * MM, 20 * MM);
  face.add(pin);
  const arm = mesh(new THREE.BoxGeometry(3.2 * MM, 3.6 * MM, 34 * MM), red);
  arm.position.set(22 * MM, 18 * MM, 2 * MM);
  arm.rotation.y = -0.35;
  arm.rotation.x = 0.15;
  face.add(arm);

  const screw = mesh(new THREE.CylinderGeometry(2.15 * MM, 2.15 * MM, 2.4 * MM, 12), silver);
  screw.rotation.z = Math.PI / 2;
  screw.position.set(34.2 * MM, 1 * MM, 12 * MM);
  const slot = mesh(new THREE.BoxGeometry(2.8 * MM, 0.5 * MM, 0.45 * MM), dark);
  slot.position.set(35.3 * MM, 1 * MM, 12 * MM);
  face.add(screw, slot);

  root.add(face);

  root.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(root);
  const shiftX = (bounds.min.x + bounds.max.x) / 2;
  const shiftY = (bounds.min.y + bounds.max.y) / 2;
  const shiftZ = bounds.min.z;
  for (const child of root.children) {
    child.position.x -= shiftX;
    child.position.y -= shiftY;
    child.position.z -= shiftZ;
  }

  if (!ghost) {
    root.userData = {
      pickable: true,
      selectable: true,
      id: "cee-16a",
      catalogId: "cee-16a",
      name: "CEE-Steckdose 16 A",
      meta: "87,5 × 136,5 × 110 mm · Neigung 15° · Klappdeckel · 5p 400 V 6h · IP44",
      kind: "surfaceDevice",
      widthMm: 87.5,
      heightMm: 136.5,
      depthMm: 110,
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
