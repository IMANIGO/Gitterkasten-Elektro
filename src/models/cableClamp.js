import * as THREE from "three";
import { materials } from "../materials.js";
import { MM, toMm } from "../units.js";

function mesh(geo, mat) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/**
 * OBO-style Greif-Iso-Schelle (lichtgrau), after product 2105012 / 3040 LGR.
 * Cable Ø 6–16 mm; screw clamp with V-cradle; base for Lochblech / M6.
 * Nominal envelope ~22 × 32 × 28 mm (W × H × D along cable).
 * Back face at local z = 0, same convention as switches and sockets.
 */
export function createCableClamp({ ghost = false } = {}) {
  const mat = ghost
    ? materials.ghost.clone()
    : materials.clampPlastic;
  const metal = ghost ? mat : materials.screw;

  const root = new THREE.Group();
  root.name = "Leitungsschelle";

  const W = 22 * MM;
  const H = 32 * MM;
  const D = 28 * MM;

  // Base plate with slight overhang
  const base = mesh(new THREE.BoxGeometry(W + 4 * MM, 2.2 * MM, D + 2 * MM), mat);
  base.position.y = 1.1 * MM;
  root.add(base);

  // Alignment notch on front of base
  const notch = mesh(new THREE.BoxGeometry(3 * MM, 1.2 * MM, 2 * MM), mat);
  notch.position.set(0, 1.1 * MM, D / 2 + 1.5 * MM);
  root.add(notch);

  // Main housing (sides of arch)
  const bodyH = 22 * MM;
  const sideW = 5 * MM;
  const archInner = 12 * MM;
  const left = mesh(new THREE.BoxGeometry(sideW, bodyH, D), mat);
  left.position.set(-(archInner / 2 + sideW / 2), 2.2 * MM + bodyH / 2, 0);
  const right = mesh(new THREE.BoxGeometry(sideW, bodyH, D), mat);
  right.position.set(archInner / 2 + sideW / 2, 2.2 * MM + bodyH / 2, 0);
  const top = mesh(new THREE.BoxGeometry(W, 6 * MM, D), mat);
  top.position.set(0, 2.2 * MM + bodyH - 3 * MM, 0);
  root.add(left, right, top);

  // V-cradle under the cable
  const cradle = mesh(new THREE.BoxGeometry(10 * MM, 4 * MM, D - 4 * MM), mat);
  cradle.position.set(0, 8 * MM, 0);
  root.add(cradle);
  const vLeft = mesh(new THREE.BoxGeometry(3 * MM, 6 * MM, D - 6 * MM), mat);
  vLeft.position.set(-3.5 * MM, 11 * MM, 0);
  vLeft.rotation.z = 0.35;
  const vRight = mesh(new THREE.BoxGeometry(3 * MM, 6 * MM, D - 6 * MM), mat);
  vRight.position.set(3.5 * MM, 11 * MM, 0);
  vRight.rotation.z = -0.35;
  root.add(vLeft, vRight);

  // Clamp screw on top
  const screwHead = mesh(new THREE.CylinderGeometry(4.5 * MM, 4.5 * MM, 3.5 * MM, 16), metal);
  screwHead.position.set(0, H - 1 * MM, 0);
  const slot = mesh(new THREE.BoxGeometry(7 * MM, 1.2 * MM, 1.2 * MM), materials.plasticBlack);
  slot.position.set(0, H + 0.6 * MM, 0);
  root.add(screwHead, slot);

  // Base is the deepest part (D + 2 mm) and was centered, so its back sat
  // near z = -15 mm and the 1 mm Lochblech gap buried the clamp in the panel.
  const backOffset = (D + 2 * MM) / 2;
  for (const child of root.children) child.position.z += backOffset;

  if (!ghost) {
    root.userData = {
      pickable: true,
      selectable: true,
      id: "leitungsschelle",
      catalogId: "leitungsschelle",
      name: "Leitungsschelle",
      meta: `Greif-Iso lichtgrau · Ø 6–16 mm · ${toMm(W)} × ${toMm(H)} × ${toMm(D)} mm`,
      kind: "clamp",
    };
  }

  return root;
}
