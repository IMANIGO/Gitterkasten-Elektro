import * as THREE from "three";
import { MM } from "../units.js";

/** Bemessungsstrom, Fehlerstrom und Typ eines reinen FI. Markenneutral. */
export const RCD_AMPS = [25, 40, 63];
export const RCD_MA = [10, 30, 100, 300];
export const RCD_TYPES = ["A", "AC"];

export const DEFAULT_RCD_SPEC = { amps: 40, ma: 30, fiType: "A" };

export const RCD_FIELDS = [
  {
    key: "amps",
    label: "Bemessungsstrom",
    options: RCD_AMPS.map((id) => ({ id: String(id), label: `${id} A` })),
  },
  {
    key: "ma",
    label: "Fehlerstrom",
    options: RCD_MA.map((id) => ({ id: String(id), label: `${id} mA` })),
  },
  {
    key: "fiType",
    label: "Typ",
    options: [
      { id: "A", label: "Typ A" },
      { id: "AC", label: "Typ AC" },
    ],
  },
];

export function normalizeRcdSpec(spec) {
  const src = spec || {};
  const amps = Number(src.amps);
  const ma = Number(src.ma);
  return {
    amps: RCD_AMPS.includes(amps) ? amps : DEFAULT_RCD_SPEC.amps,
    ma: RCD_MA.includes(ma) ? ma : DEFAULT_RCD_SPEC.ma,
    fiType: RCD_TYPES.includes(src.fiType) ? src.fiType : DEFAULT_RCD_SPEC.fiType,
  };
}

export function rcdSpecKey(spec) {
  const s = normalizeRcdSpec(spec);
  return `${s.amps}|${s.ma}|${s.fiType}`;
}

export function formatRcdPrint(spec) {
  const s = normalizeRcdSpec(spec);
  return `${s.amps} A · ${s.ma} mA · Typ ${s.fiType}`;
}

export function formatRcdMeta(spec) {
  return `4 TE · 72 × 90 × 70 mm · ${formatRcdPrint(spec)}`;
}

export function rcdSpecFromFields(values) {
  return normalizeRcdSpec({ amps: values.amps, ma: values.ma, fiType: values.fiType });
}

function plateTexture(spec) {
  const s = normalizeRcdSpec(spec);
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 320;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#e7eef4";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "#8aa4b8";
  ctx.lineWidth = 8;
  ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
  ctx.fillStyle = "#16324a";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `700 72px "IBM Plex Sans", system-ui, sans-serif`;
  ctx.fillText("FI  4P", 256, 78);
  ctx.font = `700 78px "IBM Plex Sans", system-ui, sans-serif`;
  ctx.fillText(`${s.amps} A`, 256, 155);
  ctx.fillText(`${s.ma} mA`, 256, 220);
  ctx.font = `600 48px "IBM Plex Sans", system-ui, sans-serif`;
  ctx.fillText(`Typ ${s.fiType}`, 256, 275);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

export function makeRcdPlate(spec, widthMm = 34, heightMm = 22) {
  const plate = new THREE.Mesh(
    new THREE.PlaneGeometry(widthMm * MM, heightMm * MM),
    new THREE.MeshBasicMaterial({ map: plateTexture(spec) }),
  );
  plate.name = "rcd-print";
  plate.userData.print = formatRcdPrint(spec);
  return plate;
}

export function makeTestButton() {
  const group = new THREE.Group();
  group.name = "rcd-test";
  const cap = new THREE.Mesh(
    new THREE.CylinderGeometry(4.2 * MM, 4.2 * MM, 3 * MM, 20),
    new THREE.MeshStandardMaterial({ color: 0x2a6cb0, roughness: 0.4, metalness: 0.08 }),
  );
  cap.rotation.x = Math.PI / 2;
  group.add(cap);

  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, 128, 128);
  ctx.fillStyle = "#f4f8fb";
  ctx.font = `700 92px "IBM Plex Sans", system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("T", 64, 70);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const mark = new THREE.Mesh(
    new THREE.PlaneGeometry(5 * MM, 5 * MM),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true }),
  );
  mark.position.z = 1.7 * MM;
  group.add(mark);
  return group;
}

function disposeMesh(mesh) {
  mesh.geometry?.dispose?.();
  const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  for (const mat of mats) {
    mat?.map?.dispose?.();
    mat?.dispose?.();
  }
}

export function applyRcdSpec(root, spec) {
  const next = normalizeRcdSpec(spec);
  const old = root.getObjectByName("rcd-print");
  if (old) {
    const parent = old.parent;
    const position = old.position.clone();
    const rotation = old.rotation.clone();
    const widthMm = old.geometry?.parameters?.width / MM;
    const heightMm = old.geometry?.parameters?.height / MM;
    old.removeFromParent();
    disposeMesh(old);
    const plate = makeRcdPlate(next, widthMm || 34, heightMm || 22);
    plate.position.copy(position);
    plate.rotation.copy(rotation);
    parent.add(plate);
  }
  root.userData.rcdSpec = next;
  root.userData.meta = formatRcdMeta(next);
  root.userData.name = `FI 4P ${formatRcdPrint(next)}`;
  return next;
}
