import * as THREE from "three";
import { EBOX, EBOX_FLOOR_Y, PANEL_INNER } from "../layout.js";
import { materials } from "../materials.js";
import { MM, toMm } from "../units.js";
import { createLochblechMaps, createLochblechMaterial } from "./lochblech.js";
import { makeTextPlate } from "./labels.js";

function box(w, h, d, mat) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/** Rectangular frame in the XY plane (outer size outerW × outerH, extrusion along +Z). */
function createRectFrame(outerW, outerH, frame, depth, mat) {
  const g = new THREE.Group();
  const innerH = outerH - 2 * frame;
  g.add(placed(box(outerW, frame, depth, mat), 0, outerH / 2 - frame / 2, depth / 2));
  g.add(placed(box(outerW, frame, depth, mat), 0, -outerH / 2 + frame / 2, depth / 2));
  g.add(placed(box(frame, innerH, depth, mat), -outerW / 2 + frame / 2, 0, depth / 2));
  g.add(placed(box(frame, innerH, depth, mat), outerW / 2 - frame / 2, 0, depth / 2));
  return g;
}

function placed(mesh, x, y, z) {
  mesh.position.set(x, y, z);
  return mesh;
}

function sheetPlane(width, height, baseMat, widthM, heightM) {
  const mat = baseMat.clone();
  const rx = widthM / (12.5 * MM) / 16;
  const ry = heightM / (25 * MM) / 8;
  mat.map = baseMat.map.clone();
  mat.map.repeat.set(rx, ry);
  mat.map.needsUpdate = true;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/**
 * E-Box U-Kasten after https://ehandwerkshop.de/produkt/e-box/
 * 1020 × 510 × 540 mm, Lochblech walls, open front + top.
 */
export function createEBox() {
  const root = new THREE.Group();
  root.name = "E-Box";
  root.userData = {
    pickable: true,
    id: "e-box",
    name: "E-Box",
    meta: `${toMm(EBOX.width)} × ${toMm(EBOX.depth)} × ${toMm(EBOX.height)} mm · Lochblech · 3 Montageebenen`,
  };

  const maps = createLochblechMaps();
  const sheetMat = createLochblechMaterial(maps);
  const frameMat = materials.eboxFrame;

  const W = EBOX.width;
  const D = EBOX.depth;
  const H = EBOX.height;
  const T = EBOX.panelThickness;
  const F = EBOX.frame;
  const y0 = EBOX_FLOOR_Y;

  // ---- Floor (XZ) ----
  const floor = new THREE.Group();
  floor.name = "Bodenplatte";
  floor.userData = {
    pickable: true,
    id: "bodenplatte",
    name: "Bodenplatte",
    meta: `Lochblech ${toMm(PANEL_INNER.floorW)} × ${toMm(PANEL_INNER.floorD)} mm`,
    mount: "lochblech",
    face: "floor",
  };

  // Frame as shallow rim on the table
  floor.add(placed(box(W, T, F, frameMat), 0, y0 + T / 2, F / 2)); // back edge
  floor.add(placed(box(W, T, F, frameMat), 0, y0 + T / 2, D - F / 2)); // front edge
  floor.add(placed(box(F, T, D - 2 * F, frameMat), -W / 2 + F / 2, y0 + T / 2, D / 2));
  floor.add(placed(box(F, T, D - 2 * F, frameMat), W / 2 - F / 2, y0 + T / 2, D / 2));

  const floorSheet = sheetPlane(PANEL_INNER.floorW, PANEL_INNER.floorD, sheetMat, PANEL_INNER.floorW, PANEL_INNER.floorD);
  floorSheet.rotation.x = -Math.PI / 2;
  floorSheet.position.set(0, y0 + T - 0.5 * MM, D / 2);
  floor.add(floorSheet);

  const brand = makeTextPlate("E-Box", 52, 12, { bg: "#2c3034", fg: "#f2f0ea", size: 56 });
  brand.position.set(0, y0 + 14 * MM, D - 1 * MM);
  floor.add(brand);
  root.add(floor);

  // ---- Back wall (XY at z≈0) ----
  const back = new THREE.Group();
  back.name = "Rueckwand";
  back.userData = {
    pickable: true,
    id: "rueckwand",
    name: "Rückwand",
    meta: `Wandlochraster · ${toMm(PANEL_INNER.backW)} × ${toMm(PANEL_INNER.backH)} mm`,
    mount: "lochblech",
    face: "back",
  };
  const backFrame = createRectFrame(W, H, F, T, frameMat);
  backFrame.position.set(0, y0 + H / 2, 0);
  back.add(backFrame);

  const backSheet = sheetPlane(PANEL_INNER.backW, PANEL_INNER.backH, sheetMat, PANEL_INNER.backW, PANEL_INNER.backH);
  backSheet.position.set(0, y0 + H / 2, T - 0.5 * MM);
  back.add(backSheet);

  const stiff = box(8 * MM, PANEL_INNER.backH, T - 2 * MM, frameMat);
  stiff.position.set(0, y0 + H / 2, T / 2);
  back.add(stiff);
  root.add(back);

  // ---- Side walls ----
  addSideWall(root, {
    id: "links",
    name: "Seitenwand links",
    x: -W / 2,
    faceSign: 1, // inward +X
    W,
    D,
    H,
    T,
    F,
    y0,
    sheetMat,
    frameMat,
  });
  addSideWall(root, {
    id: "rechts",
    name: "Seitenwand rechts",
    x: W / 2,
    faceSign: -1, // inward -X
    W,
    D,
    H,
    T,
    F,
    y0,
    sheetMat,
    frameMat,
  });

  return root;
}

function addSideWall(root, p) {
  const wall = new THREE.Group();
  wall.name = p.name;
  wall.userData = {
    pickable: true,
    id: `seitenwand-${p.id}`,
    name: p.name,
    meta: `Lochblech ${toMm(PANEL_INNER.sideD)} × ${toMm(PANEL_INNER.sideH)} mm · stapelbar`,
    mount: "lochblech",
    face: p.id === "links" ? "left" : "right",
  };

  // Build as XY panel then rotate so local +Z faces inward
  const frame = createRectFrame(p.D, p.H, p.F, p.T, p.frameMat);
  frame.rotation.y = (Math.PI / 2) * p.faceSign;
  // After rotation: local X → ±world Z. Origin of frame is panel center.
  frame.position.set(p.x + (p.faceSign > 0 ? p.T / 2 : -p.T / 2), p.y0 + p.H / 2, p.D / 2);
  wall.add(frame);

  const sheet = sheetPlane(PANEL_INNER.sideD, PANEL_INNER.sideH, p.sheetMat, PANEL_INNER.sideD, PANEL_INNER.sideH);
  sheet.rotation.y = (Math.PI / 2) * p.faceSign;
  const sheetX = p.x + p.faceSign * (p.T - 0.5 * MM);
  sheet.position.set(sheetX, p.y0 + p.H / 2, p.D / 2);
  wall.add(sheet);

  root.add(wall);
}

/** Back-compat alias for main.js */
export function createGridWall() {
  return createEBox();
}
