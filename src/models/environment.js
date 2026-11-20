import * as THREE from "three";
import { materials } from "../materials.js";

export function createEnvironment() {
  const group = new THREE.Group();
  group.name = "Umgebung";

  const floor = new THREE.Mesh(new THREE.CircleGeometry(6, 64), materials.concrete);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  floor.userData = {
    pickable: true,
    id: "boden",
    name: "Werkstattboden",
    meta: "Standfläche der Werkbank",
  };
  group.add(floor);

  const backdrop = new THREE.Mesh(
    new THREE.PlaneGeometry(8, 4),
    new THREE.MeshStandardMaterial({ color: 0x2a2d31, roughness: 0.95, metalness: 0 }),
  );
  backdrop.position.set(0, 1.6, -0.35);
  backdrop.receiveShadow = true;
  group.add(backdrop);

  return group;
}
