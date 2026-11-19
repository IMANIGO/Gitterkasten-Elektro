import * as THREE from "three";

/**
 * Verdrahtung layer — empty group this increment.
 * Later: Adern, Aderfarben, Klemmenbelegung.
 */
export function createWiringLayer() {
  const group = new THREE.Group();
  group.name = "Verdrahtung";
  return {
    group,
    wires: [],
    addWire() {
      return null;
    },
  };
}
