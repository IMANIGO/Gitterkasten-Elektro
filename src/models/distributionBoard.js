import * as THREE from "three";
import { UV, UV_POSITION } from "../layout.js";
import { materials } from "../materials.js";
import { MM, toMm } from "../units.js";
import { makeTextPlate } from "./labels.js";

function mesh(geo, mat) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/**
 * TH35-7.5 hat profile, extruded along X.
 * Shape lives in XY: back of the rail at x = 0, hat protrusion in −X.
 * After rotateY(+π/2) that protrusion becomes +Z (open front of the UV).
 */
function createDinRail(length) {
  const shape = new THREE.Shape();
  const hat = 17.5 * MM;
  const stem = 13.5 * MM;
  const h = 7.5 * MM;
  const brim = 2.4 * MM;

  shape.moveTo(0, -stem);
  shape.lineTo(-(h - brim), -stem);
  shape.lineTo(-(h - brim), -hat);
  shape.lineTo(-h, -hat);
  shape.lineTo(-h, hat);
  shape.lineTo(-(h - brim), hat);
  shape.lineTo(-(h - brim), stem);
  shape.lineTo(0, stem);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: length,
    bevelEnabled: false,
    curveSegments: 1,
  });
  geo.rotateY(Math.PI / 2);
  geo.translate(-length / 2, 0, 0);
  geo.computeVertexNormals();
  const rail = mesh(geo, materials.din);
  rail.name = "Hutschiene";
  return rail;
}

function createScrew(radius = 2.2 * MM) {
  const g = new THREE.Group();
  const head = mesh(new THREE.CylinderGeometry(radius, radius, 1.6 * MM, 12), materials.screw);
  const slot = mesh(new THREE.BoxGeometry(radius * 1.6, 1.8 * MM, 0.5 * MM), materials.plasticBlack);
  slot.position.y = 0.1 * MM;
  g.add(head, slot);
  return g;
}

function createTerminalBlock(bodyMat, width = 16 * MM) {
  const g = new THREE.Group();
  const body = mesh(new THREE.BoxGeometry(width, 12 * MM, 14 * MM), bodyMat);
  const plate = mesh(new THREE.BoxGeometry(width - 3 * MM, 1.2 * MM, 10 * MM), materials.brass);
  plate.position.y = 6.6 * MM;
  const screw = createScrew();
  screw.position.set(0, 8.2 * MM, 0);
  g.add(body, plate, screw);
  return g;
}

function createBusbar(kind, length, count) {
  const isPe = kind === "pe";
  const group = new THREE.Group();
  group.name = isPe ? "PE-Sammelschiene" : "N-Sammelschiene";
  group.userData = {
    pickable: true,
    id: isPe ? "pe-sammelschiene" : "n-sammelschiene",
    name: isPe ? "PE-Sammelschiene" : "N-Sammelschiene",
    meta: isPe
      ? `${count} Schraubklemmen · gelb-grün · Schutzleiter`
      : `${count} Schraubklemmen · blau · Neutralleiter`,
  };

  const bodyMat = isPe ? materials.pe : materials.n;
  const carrier = mesh(new THREE.BoxGeometry(length, 14 * MM, 16 * MM), bodyMat);
  group.add(carrier);

  if (isPe) {
    for (const x of [-length * 0.28, 0, length * 0.28]) {
      const stripe = mesh(new THREE.BoxGeometry(28 * MM, 14.4 * MM, 16.4 * MM), materials.peStripe);
      stripe.position.x = x;
      group.add(stripe);
    }
  }

  const span = length - 28 * MM;
  const start = -span / 2;
  const step = span / (count - 1);
  for (let i = 0; i < count; i++) {
    const term = createTerminalBlock(bodyMat, 14 * MM);
    term.position.set(start + i * step, 4 * MM, 2 * MM);
    group.add(term);
  }

  const tag = makeTextPlate(isPe ? "PE" : "N", 22, 12, {
    bg: isPe ? "#c7a81a" : "#1f6fb2",
    fg: isPe ? "#1a1a12" : "#f4f7fb",
    size: 72,
  });
  tag.position.set(-length / 2 + 14 * MM, 0, 8.2 * MM);
  group.add(tag);

  return group;
}

function createReihenklemme(kind) {
  const mat =
    kind === "n" ? materials.terminalBlue : kind === "pe" ? materials.terminalPe : materials.terminalGray;
  const g = new THREE.Group();
  const width = kind === "pe" ? 8 * MM : 6.2 * MM;
  const body = mesh(new THREE.BoxGeometry(width, 48 * MM, 42 * MM), mat);
  body.position.y = 24 * MM;
  const foot = mesh(new THREE.BoxGeometry(width, 10 * MM, 12 * MM), materials.plasticBlack);
  foot.position.set(0, 0, -18 * MM);
  const clip = mesh(new THREE.BoxGeometry(width, 4 * MM, 8 * MM), materials.din);
  clip.position.set(0, -2 * MM, -22 * MM);
  const topScrew = createScrew(1.8 * MM);
  topScrew.position.set(0, 46 * MM, 8 * MM);
  const botScrew = createScrew(1.8 * MM);
  botScrew.position.set(0, 46 * MM, -8 * MM);
  g.add(body, foot, clip, topScrew, botScrew);
  return g;
}

function createHousing() {
  const g = new THREE.Group();
  g.name = "Gehaeuse";
  g.userData = {
    pickable: true,
    id: "uv-gehaeuse",
    name: "Unterverteilung, 3-reihig",
    meta: `${UV.te} TE · ${UV.rows} Reihen · ${toMm(UV.outerW)} × ${toMm(UV.outerH)} × ${toMm(UV.outerD)} mm · offen`,
  };

  const w = UV.outerW;
  const h = UV.outerH;
  const d = UV.outerD;
  const t = UV.wall;
  const hw = w / 2;
  const hh = h / 2;
  const hd = d / 2;

  // Modular consumer-unit class: cool light-grey shell, warm interior backplane
  const shell = new THREE.MeshStandardMaterial({
    color: 0xd8dce0,
    metalness: 0.12,
    roughness: 0.48,
  });
  const shellDark = new THREE.MeshStandardMaterial({
    color: 0xb8bec4,
    metalness: 0.15,
    roughness: 0.5,
  });

  const back = mesh(new THREE.BoxGeometry(w, h, t), shellDark);
  back.position.z = -hd + t / 2;
  const left = mesh(new THREE.BoxGeometry(t, h, d), shell);
  left.position.x = -hw + t / 2;
  const right = mesh(new THREE.BoxGeometry(t, h, d), shell);
  right.position.x = hw - t / 2;
  const top = mesh(new THREE.BoxGeometry(w - 2 * t, t, d), shell);
  top.position.y = hh - t / 2;
  const bottom = mesh(new THREE.BoxGeometry(w - 2 * t, t, d), shell);
  bottom.position.y = -hh + t / 2;
  g.add(back, left, right, top, bottom);

  const plate = mesh(
    new THREE.BoxGeometry(w - 2 * t - 4 * MM, h - 2 * t - 4 * MM, 2.5 * MM),
    new THREE.MeshStandardMaterial({ color: 0xece8dc, metalness: 0.04, roughness: 0.68 }),
  );
  plate.position.z = -hd + t + 3 * MM;
  g.add(plate);

  // Front frame (door rebate) — thicker lip like open modular boards
  const lip = 5 * MM;
  const openingZ = hd - lip / 2;
  const frameMat = new THREE.MeshStandardMaterial({
    color: 0xeef1f4,
    metalness: 0.08,
    roughness: 0.42,
  });
  const frontTop = mesh(new THREE.BoxGeometry(w, lip, lip), frameMat);
  frontTop.position.set(0, hh - lip / 2, openingZ);
  const frontBottom = mesh(new THREE.BoxGeometry(w, lip, lip), frameMat);
  frontBottom.position.set(0, -hh + lip / 2, openingZ);
  const frontLeft = mesh(new THREE.BoxGeometry(lip, h - 2 * lip, lip), frameMat);
  frontLeft.position.set(-hw + lip / 2, 0, openingZ);
  const frontRight = mesh(new THREE.BoxGeometry(lip, h - 2 * lip, lip), frameMat);
  frontRight.position.set(hw - lip / 2, 0, openingZ);
  g.add(frontTop, frontBottom, frontLeft, frontRight);

  // Corner hinges (visual only — open board)
  for (const sy of [-1, 1]) {
    const hinge = mesh(
      new THREE.CylinderGeometry(3 * MM, 3 * MM, 14 * MM, 10),
      materials.plasticBlack,
    );
    hinge.position.set(-hw + 3 * MM, sy * (hh - 28 * MM), hd - 2 * MM);
    g.add(hinge);
  }

  return g;
}

function createDuct(height) {
  const g = new THREE.Group();
  const w = 25 * MM;
  const d = 40 * MM;
  const back = mesh(new THREE.BoxGeometry(w, height, 2 * MM), materials.duct);
  back.position.z = -d / 2;
  const left = mesh(new THREE.BoxGeometry(2 * MM, height, d), materials.duct);
  left.position.x = -w / 2;
  const right = mesh(new THREE.BoxGeometry(2 * MM, height, d), materials.duct);
  right.position.x = w / 2;
  g.add(back, left, right);
  const slots = 18;
  for (let i = 0; i < slots; i++) {
    const y = -height / 2 + 10 * MM + i * ((height - 20 * MM) / (slots - 1));
    const slot = mesh(new THREE.BoxGeometry(w - 4 * MM, 1.2 * MM, 1 * MM), materials.plasticBlack);
    slot.position.set(0, y, -d / 2 + 1.6 * MM);
    g.add(slot);
  }
  return g;
}

/**
 * @param {{ includeSampleTerminals?: boolean, ghost?: boolean, positioned?: boolean }} [opts]
 * positioned=true keeps legacy UV_POSITION (demos); placeable UV leaves origin at 0.
 */
export function createDistributionBoard({
  includeSampleTerminals = false,
  ghost = false,
  positioned = false,
} = {}) {
  const root = new THREE.Group();
  root.name = "Unterverteilung";
  if (positioned) {
    root.position.set(UV_POSITION.x, UV_POSITION.y, UV_POSITION.z);
  }

  root.add(createHousing());

  const innerW = UV.outerW - 2 * UV.wall;
  const innerH = UV.outerH - 2 * UV.wall;
  const innerBack = -UV.outerD / 2 + UV.wall + 6 * MM;
  const railZ = innerBack + UV.dinHeight / 2 + 4 * MM;

  if (!ghost) {
    const ductH = innerH - 20 * MM;
    const ductX = innerW / 2 - 28 * MM;
    const leftDuct = createDuct(ductH);
    leftDuct.position.set(-ductX, 0, innerBack + 22 * MM);
    leftDuct.userData = {
      pickable: true,
      id: "kabelkanal-links",
      name: "Verdrahtungskanal links",
      meta: "25 × 40 mm · geschlitzt",
    };
    const rightDuct = createDuct(ductH);
    rightDuct.position.set(ductX, 0, innerBack + 22 * MM);
    rightDuct.userData = {
      pickable: true,
      id: "kabelkanal-rechts",
      name: "Verdrahtungskanal rechts",
      meta: "25 × 40 mm · geschlitzt",
    };
    root.add(leftDuct, rightDuct);

    const pe = createBusbar("pe", UV.railLength, 12);
    pe.position.set(0, innerH / 2 - 28 * MM, innerBack + 14 * MM);
    const nBar = createBusbar("n", UV.railLength, 12);
    nBar.position.set(0, innerH / 2 - 52 * MM, innerBack + 14 * MM);
    root.add(pe, nBar);
  }

  const firstRailY = innerH / 2 - 95 * MM;
  const rows = [];
  for (let row = 0; row < UV.rows; row++) {
    const railGroup = new THREE.Group();
    railGroup.name = `Reihe ${row + 1}`;
    railGroup.userData = {
      pickable: true,
      id: `hutschiene-${row + 1}`,
      name: `Hutschiene Reihe ${row + 1}`,
      meta: `TH35-7,5 · ${UV.te} TE · ${toMm(UV.railLength)} mm · Raster 18 mm`,
      mount: "din",
      teCapacity: UV.te,
      railLength: UV.railLength,
      rowIndex: row,
    };
    const rail = createDinRail(UV.railLength);
    railGroup.add(rail);
    if (!ghost) {
      const label = makeTextPlate(`Reihe ${row + 1}`, 42, 9, { bg: "#2c3034", fg: "#f2f0ea", size: 52 });
      label.position.set(-UV.railLength / 2 + 28 * MM, 24 * MM, 12 * MM);
      railGroup.add(label);
    }
    railGroup.position.set(0, firstRailY - row * UV.railPitch, railZ);
    rows.push(railGroup);
    root.add(railGroup);
  }

  if (includeSampleTerminals && !ghost) {
    const klemmen = new THREE.Group();
    klemmen.name = "Reihenklemmen";
    klemmen.userData = {
      pickable: true,
      id: "reihenklemmen",
      name: "Reihenklemmen",
      meta: "Durchgangsklemmen 2,5 mm² · N- und PE-Klemme am Reihenende",
    };
    const kinds = [...Array(8).fill("l"), "n", "pe"];
    const pitch = 6.5 * MM;
    const startX = -UV.railLength / 2 + 8 * MM;
    kinds.forEach((kind, i) => {
      const k = createReihenklemme(kind);
      k.position.set(startX + i * pitch, 6 * MM, 22 * MM);
      klemmen.add(k);
    });
    rows[2].add(klemmen);
  }

  if (!ghost) {
    const teMark = makeTextPlate(`${UV.te} TE  ·  3 Reihen  ·  TH35`, 90, 10, {
      bg: "#c5c7c4",
      fg: "#2a2c2e",
      size: 44,
    });
    teMark.position.set(0, -UV.outerH / 2 + 14 * MM, UV.outerD / 2 - 1 * MM);
    root.add(teMark);

    root.userData = {
      pickable: true,
      selectable: true,
      container: true,
      id: "unterverteilung",
      catalogId: "uv-3reihen",
      name: "Unterverteilung, 3-reihig",
      meta: `${UV.te} TE · ${UV.rows} Reihen · ${toMm(UV.outerW)} × ${toMm(UV.outerH)} × ${toMm(UV.outerD)} mm · offen`,
      kind: "distributionBoard",
      mountSlots: rows.map((r) => r.userData),
    };
  }

  // Local attachment: back face sits against Lochblech (+local Z is open front)
  root.userData.footprint = {
    width: UV.outerW,
    height: UV.outerH,
    depth: UV.outerD,
  };

  return root;
}
