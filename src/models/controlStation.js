import * as THREE from "three";
import { materials } from "../materials.js";
import { MM, toMm } from "../units.js";

/**
 * Aufputz-Steuerstelle, 4 × Ø22 mm, modular bestückbar.
 * Form angelehnt an übliche Polycarbonat-Gehäuse (ca. 80 × 200 mm), ohne Marken.
 */

export const STATION_COLORS = {
  rot: 0xc0392b,
  gruen: 0x2e7d32,
  gelb: 0xf0c400,
  blau: 0x1f6fb2,
  weiss: 0xf4f1ea,
  schwarz: 0x2a2c30,
  orange: 0xe67e22,
};

export const STATION_SLOT_OPTIONS = [
  { id: "leer", label: "Leer (Bohrung)" },
  { id: "zu", label: "Zu (Blindstopfen)" },
  { id: "taster:rot", label: "Taster rot" },
  { id: "taster:gruen", label: "Taster grün" },
  { id: "taster:gelb", label: "Taster gelb" },
  { id: "taster:blau", label: "Taster blau" },
  { id: "taster:weiss", label: "Taster weiß" },
  { id: "taster:schwarz", label: "Taster schwarz" },
  { id: "lampe:rot", label: "Lampe rot" },
  { id: "lampe:gruen", label: "Lampe grün" },
  { id: "lampe:gelb", label: "Lampe gelb" },
  { id: "lampe:blau", label: "Lampe blau" },
  { id: "lampe:weiss", label: "Lampe weiß" },
  { id: "lampe:orange", label: "Lampe orange" },
];

export const DEFAULT_STATION_SLOTS = ["taster:gruen", "taster:rot", "lampe:gruen", "zu"];

const SLOT_Y = [75, 25, -25, -75].map((v) => v * MM);

export function normalizeStationSlots(slots) {
  const allowed = new Set(STATION_SLOT_OPTIONS.map((o) => o.id));
  const src = Array.isArray(slots) ? slots : [];
  return [0, 1, 2, 3].map((i) => (allowed.has(src[i]) ? src[i] : DEFAULT_STATION_SLOTS[i]));
}

export function describeStationSlots(slots) {
  return normalizeStationSlots(slots)
    .map((id, i) => `${i + 1} ${STATION_SLOT_OPTIONS.find((o) => o.id === id)?.label || id}`)
    .join(" · ");
}

function mesh(geo, mat) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function colorMat(hex, { emissive = 0, roughness = 0.4 } = {}) {
  return new THREE.MeshStandardMaterial({
    color: hex,
    roughness,
    metalness: 0.08,
    emissive: emissive || 0x000000,
    emissiveIntensity: emissive ? 0.35 : 0,
  });
}

function parseSlot(id) {
  if (id === "leer" || id === "zu") return { kind: id, color: null };
  const [kind, color] = String(id).split(":");
  return { kind, color: STATION_COLORS[color] || STATION_COLORS.weiss };
}

function buildInserts(slots) {
  const g = new THREE.Group();
  g.name = "station-inserts";
  const z = 56 * MM;
  normalizeStationSlots(slots).forEach((id, i) => {
    const y = SLOT_Y[i];
    const spec = parseSlot(id);
    const bezel = mesh(
      new THREE.CylinderGeometry(13 * MM, 13 * MM, 3 * MM, 24),
      materials.plasticBlack,
    );
    bezel.rotation.x = Math.PI / 2;
    bezel.position.set(0, y, z);
    g.add(bezel);

    if (spec.kind === "leer") {
      const hole = mesh(
        new THREE.CylinderGeometry(9 * MM, 9 * MM, 4 * MM, 20),
        new THREE.MeshStandardMaterial({ color: 0x1a1c1e, roughness: 0.6 }),
      );
      hole.rotation.x = Math.PI / 2;
      hole.position.set(0, y, z - 1 * MM);
      g.add(hole);
      return;
    }

    if (spec.kind === "zu") {
      const cap = mesh(
        new THREE.CylinderGeometry(10 * MM, 10 * MM, 3.5 * MM, 20),
        new THREE.MeshStandardMaterial({ color: 0xb7b3a8, roughness: 0.5, metalness: 0.05 }),
      );
      cap.rotation.x = Math.PI / 2;
      cap.position.set(0, y, z + 1.2 * MM);
      g.add(cap);
      return;
    }

    if (spec.kind === "lampe") {
      const lens = mesh(
        new THREE.SphereGeometry(8 * MM, 20, 16, 0, Math.PI * 2, 0, Math.PI / 2),
        colorMat(spec.color, { emissive: spec.color, roughness: 0.25 }),
      );
      lens.rotation.x = Math.PI / 2;
      lens.position.set(0, y, z + 1 * MM);
      g.add(lens);
      return;
    }

    const btn = mesh(
      new THREE.CylinderGeometry(8.5 * MM, 9 * MM, 5 * MM, 22),
      colorMat(spec.color, { roughness: 0.38 }),
    );
    btn.rotation.x = Math.PI / 2;
    btn.position.set(0, y, z + 2.2 * MM);
    g.add(btn);
  });
  return g;
}

export function applyStationSlots(root, slots) {
  const next = normalizeStationSlots(slots);
  const old = root.getObjectByName("station-inserts");
  if (old) old.removeFromParent();
  root.add(buildInserts(next));
  root.userData.slots = next;
  root.userData.meta = `80 × 200 × 60 mm · ${describeStationSlots(next)}`;
  return next;
}

export function createControlStation({ ghost = false, slots = DEFAULT_STATION_SLOTS } = {}) {
  const W = 80 * MM;
  const H = 200 * MM;
  const D = 60 * MM;
  const shell = ghost
    ? materials.ghost.clone()
    : new THREE.MeshStandardMaterial({ color: 0xc5c2b8, roughness: 0.48, metalness: 0.06 });
  const root = new THREE.Group();
  root.name = "Tasterblock";

  const body = mesh(new THREE.BoxGeometry(W, H, D * 0.82), shell);
  body.position.z = (D * 0.82) / 2;
  root.add(body);
  const lid = mesh(new THREE.BoxGeometry(W - 4 * MM, H - 4 * MM, 4 * MM), shell);
  lid.position.z = D * 0.82 + 2 * MM;
  root.add(lid);

  for (const [sx, sy] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ]) {
    const screw = mesh(
      new THREE.CylinderGeometry(2.2 * MM, 2.2 * MM, 1.6 * MM, 10),
      ghost ? shell : materials.screw,
    );
    screw.rotation.x = Math.PI / 2;
    screw.position.set(sx * (W / 2 - 8 * MM), sy * (H / 2 - 8 * MM), D * 0.82 + 4.5 * MM);
    root.add(screw);
  }

  const gland = mesh(
    new THREE.CylinderGeometry(8 * MM, 8 * MM, 10 * MM, 16),
    ghost ? shell : materials.plasticBlack,
  );
  gland.position.set(0, -H / 2 - 2 * MM, D * 0.35);
  root.add(gland);

  root.userData.ghost = !!ghost;
  root.add(buildInserts(slots));

  if (!ghost) {
    const fitted = normalizeStationSlots(slots);
    root.userData = {
      pickable: true,
      selectable: true,
      id: "tasterblock-4",
      catalogId: "tasterblock-4",
      name: "Tasterblock 4×22",
      meta: `80 × 200 × 60 mm · ${describeStationSlots(fitted)}`,
      kind: "surfaceDevice",
      symbol: "tasterblock",
      slots: fitted,
      widthMm: toMm(W),
      heightMm: toMm(H),
      depthMm: toMm(D),
    };
  }
  return root;
}
