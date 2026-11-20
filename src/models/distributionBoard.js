import * as THREE from "three";
import { UV, UV_POSITION } from "../layout.js";
import { materials } from "../materials.js";
import { DIN_RAIL_MOUNT_Y, DIN_RAIL_MOUNT_Z } from "../placement/snap.js";
import { railLabel, railLetter } from "../placement/uvRails.js";
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

function noRay(object) {
  object.raycast = () => {};
  object.traverse((child) => {
    child.raycast = () => {};
  });
  return object;
}

function createHousing() {
  const g = new THREE.Group();
  g.name = "Gehaeuse";
  g.userData = {
    pickable: true,
    id: "uv-gehaeuse",
    name: "Unterverteilung, 3-reihig",
    meta: `${UV.rows}×${UV.te} TE · ${toMm(UV.outerW)} × ${toMm(UV.outerH)} × ${toMm(UV.outerD)} mm · Aufputz`,
  };

  const w = UV.outerW;
  const h = UV.outerH;
  const d = UV.outerD;
  const t = UV.wall;
  const hw = w / 2;
  const hh = h / 2;
  const hd = d / 2;
  const shell = new THREE.MeshStandardMaterial({ color: 0xf4f1ea, roughness: 0.52, metalness: 0.02 });
  const shellDark = new THREE.MeshStandardMaterial({ color: 0xe4e0d6, roughness: 0.6, metalness: 0.03 });

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
    new THREE.BoxGeometry(w - 2 * t - 4 * MM, h - 2 * t - 4 * MM, 2 * MM),
    new THREE.MeshStandardMaterial({ color: 0xe7e1d4, roughness: 0.72, metalness: 0.02 }),
  );
  plate.position.z = -hd + t + 2.5 * MM;
  g.add(plate);

  const knockout = new THREE.MeshStandardMaterial({ color: 0xc8c2b6, roughness: 0.7, metalness: 0.04 });
  for (const x of [-70, -25, 25, 70]) {
    for (const y of [150, -170]) {
      const oval = mesh(new THREE.CylinderGeometry(7 * MM, 7 * MM, 1.2 * MM, 16), knockout);
      oval.rotation.x = Math.PI / 2;
      oval.position.set(x * MM, y * MM, -hd + t + 0.8 * MM);
      g.add(oval);
    }
  }

  return noRay(g);
}

function createCover(rowCenters) {
  const g = new THREE.Group();
  g.name = "Geraeteabdeckung";
  const w = UV.outerW - 10 * MM;
  const h = UV.outerH - 10 * MM;
  const thick = 3.2 * MM;
  const slotW = UV.railLength + 16 * MM;
  const side = (w - slotW) / 2;
  const mat = new THREE.MeshStandardMaterial({ color: 0xfbfaf6, roughness: 0.46, metalness: 0.03 });
  const left = mesh(new THREE.BoxGeometry(side, h, thick), mat);
  left.position.x = -w / 2 + side / 2;
  const right = mesh(new THREE.BoxGeometry(side, h, thick), mat);
  right.position.x = w / 2 - side / 2;
  g.add(left, right);

  const slots = [...rowCenters].sort((a, b) => b - a);
  let cursor = h / 2;
  for (const y of slots) {
    const top = y + UV.slotH / 2;
    const band = cursor - top;
    if (band > 1 * MM) {
      const strip = mesh(new THREE.BoxGeometry(slotW, band, thick), mat);
      strip.position.set(0, top + band / 2, 0);
      g.add(strip);
    }
    cursor = y - UV.slotH / 2;
  }
  const bottomBand = cursor + h / 2;
  if (bottomBand > 1 * MM) {
    const strip = mesh(new THREE.BoxGeometry(slotW, bottomBand, thick), mat);
    strip.position.set(0, -h / 2 + bottomBand / 2, 0);
    g.add(strip);
  }
  g.position.z = UV.outerD / 2 - 8 * MM;
  g.visible = false;
  return noRay(g);
}

/** Geräteabdeckung ein- oder ausblenden. Das Netz bleibt erhalten, Strahlprüfung bleibt aus. */
export function setDistributionCoverVisible(root, visible) {
  if (!root?.userData) return false;
  const on = visible === true;
  const cover = root.getObjectByName("Geraeteabdeckung");
  if (cover) cover.visible = on;
  root.userData.coverVisible = on;
  return on;
}

function createDoor() {
  const door = new THREE.Group();
  door.name = "Tuer";
  const leafW = UV.outerW - 8 * MM;
  const leafH = UV.outerH - 8 * MM;
  const mat = new THREE.MeshStandardMaterial({ color: 0xf7f4ee, roughness: 0.5, metalness: 0.04 });
  const leaf = mesh(new THREE.BoxGeometry(leafW, leafH, 8 * MM), mat);
  leaf.position.set(leafW / 2, 0, 5 * MM);
  const grip = mesh(new THREE.BoxGeometry(8 * MM, 46 * MM, 6 * MM), materials.plasticBlack);
  grip.position.set(leafW - 18 * MM, 0, 12 * MM);
  door.add(leaf, grip);
  door.position.set(-UV.outerW / 2 + 4 * MM, 0, UV.outerD / 2);
  door.rotation.y = 1.15;
  return noRay(door);
}

function createQcField(length) {
  const g = new THREE.Group();
  g.name = "Klemmenfeld";
  const blocks = [
    { id: "pe", name: "PE-Klemmenfeld", color: 0xc7a81a, fg: "#1a1a12", label: "PE", screws: 5, plugs: 8 },
    { id: "n", name: "N-Klemmenfeld", color: 0x1f6fb2, fg: "#f4f7fb", label: "N", screws: 6, plugs: 10 },
  ];
  blocks.forEach((block, index) => {
    const bw = length * 0.46;
    const carrier = new THREE.Group();
    const body = mesh(
      new THREE.BoxGeometry(bw, 28 * MM, 18 * MM),
      new THREE.MeshStandardMaterial({ color: block.color, roughness: 0.48, metalness: 0.06 }),
    );
    carrier.add(body);
    for (let i = 0; i < block.screws; i += 1) {
      const screw = createScrew(2.4 * MM);
      screw.rotation.x = Math.PI / 2;
      screw.position.set(-bw / 2 + 12 * MM + i * ((bw - 24 * MM) / (block.screws - 1)), 6 * MM, 8 * MM);
      carrier.add(screw);
    }
    for (let i = 0; i < block.plugs; i += 1) {
      const hole = mesh(
        new THREE.CylinderGeometry(1.5 * MM, 1.5 * MM, 2 * MM, 8),
        materials.plasticBlack,
      );
      hole.rotation.x = Math.PI / 2;
      hole.position.set(-bw / 2 + 10 * MM + i * ((bw - 20 * MM) / (block.plugs - 1)), -6 * MM, 9 * MM);
      carrier.add(hole);
    }
    const tag = makeTextPlate(block.label, 16, 8, { bg: block.fg === "#1a1a12" ? "#c7a81a" : "#1f6fb2", fg: block.fg, size: 72 });
    tag.position.set(-bw / 2 + 2 * MM, 0, 10 * MM);
    carrier.add(tag);
    carrier.position.x = (index === 0 ? -1 : 1) * (length * 0.25);
    carrier.userData = {
      pickable: true,
      id: `${block.id}-klemmenfeld`,
      name: block.name,
      meta: "Steckklemmen und Zugbügelklemmen · fest im Gehäuse",
    };
    g.add(carrier);
  });
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

  const firstRailY = innerH / 2 - 168 * MM;
  const rowCenters = [];
  for (let row = 0; row < UV.rows; row += 1) {
    rowCenters.push(firstRailY - row * UV.railPitch + 50 * MM);
  }

  if (!ghost) {
    const ductH = UV.railPitch * 2 + 70 * MM;
    const ductX = innerW / 2 - 22 * MM;
    const ductY = firstRailY - UV.railPitch;
    const rightDuct = createDuct(ductH);
    rightDuct.position.set(ductX, ductY, innerBack + 18 * MM);
    rightDuct.userData = {
      pickable: true,
      id: "kabelkanal-rechts",
      name: "Verdrahtungskanal rechts",
      meta: "Steuerkreis · rechter Rand",
    };
    root.add(rightDuct);

    const field = createQcField(UV.railLength + 20 * MM);
    field.position.set(0, innerH / 2 - 42 * MM, innerBack + 16 * MM);
    root.add(field);
    root.add(createDoor());
  }

  const cover = createCover(rowCenters);
  root.add(cover);

  const rows = [];
  for (let row = 0; row < UV.rows; row++) {
    const letter = railLetter(row);
    const railGroup = new THREE.Group();
    railGroup.name = railLabel(row);
    railGroup.userData = {
      pickable: true,
      id: `hutschiene-${letter.toLowerCase()}`,
      name: railLabel(row),
      meta: `TH35-7,5 · ${UV.te} TE · ${toMm(UV.railLength)} mm · frei belegbar`,
      mount: "din",
      teCapacity: UV.te,
      railLength: UV.railLength,
      rowIndex: row,
      railLetter: letter,
    };
    const rail = createDinRail(UV.railLength);
    railGroup.add(rail);
    const slot = new THREE.Mesh(
      new THREE.PlaneGeometry(UV.railLength + 10 * MM, UV.slotH + 18 * MM),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
    );
    slot.name = "Schienenfeld";
    slot.position.set(0, 50 * MM, 18 * MM);
    railGroup.add(slot);
    if (!ghost) {
      const label = makeTextPlate(railLabel(row), 36, 8, { bg: "#2c3034", fg: "#f2f0ea", size: 52 });
      label.position.set(-UV.railLength / 2 + 22 * MM, 28 * MM, 14 * MM);
      noRay(label);
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
      k.position.set(startX + i * pitch, DIN_RAIL_MOUNT_Y, DIN_RAIL_MOUNT_Z);
      klemmen.add(k);
    });
    rows[2].add(klemmen);
  }

  if (!ghost) {
    const teMark = makeTextPlate(`3 × ${UV.te} TE`, 48, 9, {
      bg: "#f4f1ea",
      fg: "#2a2c2e",
      size: 56,
    });
    teMark.position.set(0, -UV.outerH / 2 + 16 * MM, UV.outerD / 2 - 12 * MM);
    noRay(teMark);
    root.add(teMark);

    root.userData = {
      pickable: true,
      selectable: true,
      container: true,
      id: "unterverteilung",
      catalogId: "uv-3reihen",
      name: "Unterverteilung, 3-reihig",
      meta: `${UV.rows}×${UV.te} TE · ${toMm(UV.outerW)} × ${toMm(UV.outerH)} × ${toMm(UV.outerD)} mm · N/PE-Klemmenfeld`,
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
  root.userData.coverVisible = false;
  cover.visible = root.userData.coverVisible === true;

  return root;
}
