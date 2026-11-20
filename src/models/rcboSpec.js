import * as THREE from "three";
import { MM } from "../units.js";

/** Auslösecharakteristik, Bemessungsstrom, Fehlerstrom und FI-Typ. Markenneutral. */
export const RCBO_CURVES = ["B", "C", "D"];
export const RCBO_AMPS = [6, 10, 13, 16, 20, 25, 32];
export const RCBO_MA = [10, 30, 100, 300];
export const RCBO_TYPES = ["A", "AC"];

export const DEFAULT_RCBO_SPEC = { curve: "C", amps: 16, ma: 30, fiType: "A" };

export const RCBO_FIELDS = [
  {
    key: "curve",
    label: "Charakteristik",
    options: RCBO_CURVES.map((id) => ({ id, label: id })),
  },
  {
    key: "amps",
    label: "Bemessungsstrom",
    options: RCBO_AMPS.map((id) => ({ id: String(id), label: `${id} A` })),
  },
  {
    key: "ma",
    label: "Fehlerstrom",
    options: RCBO_MA.map((id) => ({ id: String(id), label: `${id} mA` })),
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

export function normalizeRcboSpec(spec) {
  const src = spec || {};
  const amps = Number(src.amps);
  const ma = Number(src.ma);
  return {
    curve: RCBO_CURVES.includes(src.curve) ? src.curve : DEFAULT_RCBO_SPEC.curve,
    amps: RCBO_AMPS.includes(amps) ? amps : DEFAULT_RCBO_SPEC.amps,
    ma: RCBO_MA.includes(ma) ? ma : DEFAULT_RCBO_SPEC.ma,
    fiType: RCBO_TYPES.includes(src.fiType) ? src.fiType : DEFAULT_RCBO_SPEC.fiType,
  };
}

export function rcboSpecKey(spec) {
  const s = normalizeRcboSpec(spec);
  return `${s.curve}|${s.amps}|${s.ma}|${s.fiType}`;
}

export function formatRcboPrint(spec) {
  const s = normalizeRcboSpec(spec);
  return `${s.curve}${s.amps} · ${s.ma} mA · Typ ${s.fiType}`;
}

export function formatRcboMeta(spec) {
  return `2 TE · 36 × 90 × 70 mm · ${formatRcboPrint(spec)}`;
}

export function specFromFields(values) {
  return normalizeRcboSpec({
    curve: values.curve,
    amps: values.amps,
    ma: values.ma,
    fiType: values.fiType,
  });
}

export function makeRcboPlate(spec, widthMm = 28, heightMm = 18) {
  const s = normalizeRcboSpec(spec);
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 320;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#d5dbe2";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#9aa3ad";
  for (let y = 12; y < canvas.height; y += 22) {
    for (let x = 12; x < canvas.width; x += 22) {
      ctx.beginPath();
      ctx.arc(x, y, 1.7, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.fillStyle = "#f4f6f8";
  ctx.fillRect(36, 18, 440, 284);
  ctx.strokeStyle = "#8b949e";
  ctx.lineWidth = 6;
  ctx.strokeRect(36, 18, 440, 284);
  ctx.fillStyle = "#14181c";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `700 118px "IBM Plex Sans", system-ui, sans-serif`;
  ctx.fillText(`${s.curve}${s.amps}`, 256, 108);
  ctx.font = `700 72px "IBM Plex Sans", system-ui, sans-serif`;
  ctx.fillText(`${s.ma} mA`, 256, 190);
  ctx.font = `600 48px "IBM Plex Sans", system-ui, sans-serif`;
  ctx.fillText(`Typ ${s.fiType}`, 256, 258);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  const plate = new THREE.Mesh(
    new THREE.PlaneGeometry(widthMm * MM, heightMm * MM),
    new THREE.MeshBasicMaterial({ map: texture }),
  );
  plate.name = "rcbo-print";
  plate.userData.print = formatRcboPrint(s);
  return plate;
}

function disposeMesh(mesh) {
  mesh.geometry?.dispose?.();
  const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  for (const mat of mats) {
    mat?.map?.dispose?.();
    mat?.dispose?.();
  }
}

export function applyRcboSpec(root, spec) {
  const next = normalizeRcboSpec(spec);
  const old = root.getObjectByName("rcbo-print");
  if (old) {
    const parent = old.parent;
    const position = old.position.clone();
    const rotation = old.rotation.clone();
    old.removeFromParent();
    disposeMesh(old);
    const plate = makeRcboPlate(next);
    plate.position.copy(position);
    plate.rotation.copy(rotation);
    parent.add(plate);
  }
  root.userData.rcboSpec = next;
  root.userData.meta = formatRcboMeta(next);
  root.userData.name = `FI/LS ${formatRcboPrint(next)}`;
  return next;
}
