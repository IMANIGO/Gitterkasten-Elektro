import * as THREE from "three";
import { MM } from "../units.js";

/** Auslösecharakteristik und Bemessungsstrom eines reinen LS. Markenneutral. */
export const MCB_CURVES = ["B", "C", "D"];
export const MCB_AMPS = [6, 10, 13, 16, 20, 25, 32, 40, 50, 63];

export const DEFAULT_MCB_SPEC = { curve: "B", amps: 16 };

export const MCB_FIELDS = [
  {
    key: "curve",
    label: "Charakteristik",
    options: MCB_CURVES.map((id) => ({ id, label: id })),
  },
  {
    key: "amps",
    label: "Bemessungsstrom",
    options: MCB_AMPS.map((id) => ({ id: String(id), label: `${id} A` })),
  },
];

export function normalizeMcbSpec(spec) {
  const src = spec || {};
  const amps = Number(src.amps);
  return {
    curve: MCB_CURVES.includes(src.curve) ? src.curve : DEFAULT_MCB_SPEC.curve,
    amps: MCB_AMPS.includes(amps) ? amps : DEFAULT_MCB_SPEC.amps,
  };
}

export function mcbSpecKey(spec) {
  const s = normalizeMcbSpec(spec);
  return `${s.curve}|${s.amps}`;
}

export function formatMcbPrint(spec) {
  const s = normalizeMcbSpec(spec);
  return `${s.curve}${s.amps}`;
}

export function formatMcbMeta(spec, poles = 1) {
  const te = poles;
  return `${te} TE · ${te * 18} × 90 × 70 mm · ${formatMcbPrint(spec)}`;
}

export function mcbSpecFromFields(values) {
  return normalizeMcbSpec({ curve: values.curve, amps: values.amps });
}

function plateTexture(spec, poles) {
  const s = normalizeMcbSpec(spec);
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 320;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#f4f6f8";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "#c5ccd3";
  ctx.lineWidth = 8;
  ctx.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);
  ctx.fillStyle = "#1a1e22";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `700 150px "IBM Plex Sans", system-ui, sans-serif`;
  ctx.fillText(`${s.curve}${s.amps}`, 256, 145);
  ctx.font = `600 64px "IBM Plex Sans", system-ui, sans-serif`;
  ctx.fillStyle = "#3a4148";
  ctx.fillText(`${poles}P`, 256, 250);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

export function makeMcbPlate(spec, poles = 1, widthMm = 14, heightMm = 16) {
  const plate = new THREE.Mesh(
    new THREE.PlaneGeometry(widthMm * MM, heightMm * MM),
    new THREE.MeshBasicMaterial({ map: plateTexture(spec, poles) }),
  );
  plate.name = "mcb-print";
  plate.userData.print = `${formatMcbPrint(spec)} · ${poles}P`;
  return plate;
}

export function makeOnMark(widthMm = 5, heightMm = 3.4) {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 80;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#c62828";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#fff";
  ctx.font = `700 64px "IBM Plex Sans", system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("I", canvas.width / 2, canvas.height / 2 + 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const mark = new THREE.Mesh(
    new THREE.PlaneGeometry(widthMm * MM, heightMm * MM),
    new THREE.MeshBasicMaterial({ map: texture }),
  );
  mark.name = "mcb-on";
  return mark;
}

function disposeMesh(mesh) {
  mesh.geometry?.dispose?.();
  const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  for (const mat of mats) {
    mat?.map?.dispose?.();
    mat?.dispose?.();
  }
}

export function applyMcbSpec(root, spec) {
  const next = normalizeMcbSpec(spec);
  const poles = root.userData?.poles || root.userData?.te || 1;
  const old = root.getObjectByName("mcb-print");
  if (old) {
    const parent = old.parent;
    const position = old.position.clone();
    const rotation = old.rotation.clone();
    const widthMm = old.geometry?.parameters?.width / MM;
    const heightMm = old.geometry?.parameters?.height / MM;
    old.removeFromParent();
    disposeMesh(old);
    const plate = makeMcbPlate(next, poles, widthMm || 14, heightMm || 16);
    plate.position.copy(position);
    plate.rotation.copy(rotation);
    parent.add(plate);
  }
  root.userData.mcbSpec = next;
  root.userData.meta = formatMcbMeta(next, poles);
  root.userData.name = `LS ${poles}P ${formatMcbPrint(next)}`;
  return next;
}
