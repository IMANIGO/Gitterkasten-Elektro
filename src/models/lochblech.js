import * as THREE from "three";
import { MM } from "../units.js";

/**
 * Procedural Lochblech (vertical oblong slots) matching the E-Box / Wandlochrasterplatte look.
 * Slot geometry approx. 5×16 mm on a ~12.5 × 25 mm pitch; alpha for see-through density.
 */
export function createLochblechMaps({
  slotW = 5,
  slotH = 16,
  pitchX = 12.5,
  pitchY = 25,
  cellsX = 16,
  cellsY = 8,
  metal = "#b8bdc2",
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

  const alpha = document.createElement("canvas");
  alpha.width = w;
  alpha.height = h;
  const actx = alpha.getContext("2d");
  actx.fillStyle = "#ffffff";
  actx.fillRect(0, 0, w, h);
  actx.fillStyle = "#000000";

  const sw = slotW * pxPerMm;
  const sh = slotH * pxPerMm;
  const rx = sw / 2;

  for (let iy = 0; iy < cellsY; iy++) {
    for (let ix = 0; ix < cellsX; ix++) {
      const cx = (ix + 0.5) * pitchX * pxPerMm;
      const cy = (iy + 0.5) * pitchY * pxPerMm;
      roundRect(ctx, cx - sw / 2, cy - sh / 2, sw, sh, rx, "#1a1c1e");
      roundRect(actx, cx - sw / 2, cy - sh / 2, sw, sh, rx, "#000000");
    }
  }

  // Subtle horizontal highlight bands for sheet thickness feel
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 1;
  for (let iy = 0; iy <= cellsY; iy++) {
    const y = iy * pitchY * pxPerMm;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;

  const alphaMap = new THREE.CanvasTexture(alpha);
  alphaMap.anisotropy = 8;
  alphaMap.wrapS = alphaMap.wrapT = THREE.RepeatWrapping;

  return { map, alphaMap, pitchX: pitchX * MM, pitchY: pitchY * MM };
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

export function createLochblechMaterial(maps, { transparent = true } = {}) {
  return new THREE.MeshStandardMaterial({
    map: maps.map,
    alphaMap: maps.alphaMap,
    color: 0xffffff,
    metalness: 0.72,
    roughness: 0.38,
    transparent,
    alphaTest: transparent ? 0.35 : 0,
    side: THREE.DoubleSide,
    depthWrite: true,
  });
}
