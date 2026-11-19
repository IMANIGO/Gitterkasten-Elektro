import * as THREE from "three";
import { EBOX, WORKBENCH } from "../layout.js";
import { materials } from "../materials.js";
import { toMm } from "../units.js";

function box(w, h, d, mat) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/** Simple workbench the E-Box sits on (centered, box depth along +Z). */
export function createWorkbench() {
  const group = new THREE.Group();
  group.name = "Werkbank";
  group.userData = {
    pickable: true,
    id: "werkbank",
    name: "Werkbank",
    meta: `Auflage für E-Box · Platte ${toMm(WORKBENCH.width)} × ${toMm(WORKBENCH.depth)} mm`,
  };

  // Table top centered under E-Box: E-Box spans z=0…depth, so center table at depth/2
  const topZ = EBOX.depth / 2;
  const top = box(WORKBENCH.width, WORKBENCH.thickness, WORKBENCH.depth, materials.wood);
  top.position.set(0, WORKBENCH.height - WORKBENCH.thickness / 2, topZ);
  group.add(top);

  const insetX = WORKBENCH.width / 2 - WORKBENCH.overhang - WORKBENCH.leg / 2;
  const insetZ = WORKBENCH.depth / 2 - WORKBENCH.overhang - WORKBENCH.leg / 2;
  const legH = WORKBENCH.height - WORKBENCH.thickness;
  for (const [x, z] of [
    [-insetX, topZ - insetZ],
    [insetX, topZ - insetZ],
    [-insetX, topZ + insetZ],
    [insetX, topZ + insetZ],
  ]) {
    const leg = box(WORKBENCH.leg, legH, WORKBENCH.leg, materials.frame);
    leg.position.set(x, legH / 2, z);
    group.add(leg);
  }

  return group;
}
