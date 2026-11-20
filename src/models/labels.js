import * as THREE from "three";
import { MM } from "../units.js";

export function makeTextPlate(text, widthMm, heightMm, { bg = "#1b1d20", fg = "#f2f0ea", size = 64 } = {}) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = fg;
  ctx.font = `600 ${size}px "IBM Plex Sans", system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 4);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;

  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(widthMm * MM, heightMm * MM),
    new THREE.MeshBasicMaterial({ map: texture, transparent: false }),
  );
  mesh.name = `label:${text}`;
  return mesh;
}
