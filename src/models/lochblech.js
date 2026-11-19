import * as THREE from "three";
import { MM } from "../units.js";

/**
 * Procedural Lochblech matching E-Box / Wandlochrasterplatte:
 * light galvanized sheet with dense vertical oblong slots.
 * Painted slots (opaque) so the plate reads light-grey like the product photos.
 */
export function createLochblechMaps({
  slotW = 5,
  slotH = 16,
  pitchX = 12.5,
  pitchY = 25,
  cellsX = 16,
  cellsY = 8,
  metal = "#cfd3d7",
  slot = "#5c6268",
} = {}) {
  const pxPerMm = 4;
  const w = Math.round(cellsX * pitchX * pxPerMm);
  const h = Math.round(cellsY * pitchY * pxPerMm);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = metal;
  ctx.fillRect(0, 0, w, h);

  // Soft panel sheen
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, "rgba(255,255,255,0.12)");
  grad.addColorStop(0.5, "rgba(255,255,255,0)");
  grad.addColorStop(1, "rgba(0,0,0,0.08)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  const sw = slotW * pxPerMm;
  const sh = slotH * pxPerMm;
  const rx = sw / 2;

  for (let iy = 0; iy < cellsY; iy++) {
    for (let ix = 0; ix < cellsX; ix++) {
      const cx = (ix + 0.5) * pitchX * pxPerMm;
      const cy = (iy + 0.5) * pitchY * pxPerMm;
      roundRect(ctx, cx - sw / 2, cy - sh / 2, sw, sh, rx, slot);
      // inner highlight edge on slots
      roundRect(ctx, cx - sw / 2 + 1, cy - sh / 2 + 1, sw - 2, 2, 1, "rgba(255,255,255,0.18)");
    }
  }

  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;

  return { map, pitchX: pitchX * MM, pitchY: pitchY * MM };
}

function roundRect(ctx, x, y, w, h, r, fill) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

export function createLochblechMaterial(maps) {
  return new THREE.MeshStandardMaterial({
    map: maps.map,
    color: 0xffffff,
    metalness: 0.42,
    roughness: 0.48,
    side: THREE.DoubleSide,
  });
}
