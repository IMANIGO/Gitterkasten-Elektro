import * as THREE from "three";

export function addLighting(scene) {
  const hemi = new THREE.HemisphereLight(0xe8eef5, 0x6a645c, 0.55);
  scene.add(hemi);

  const key = new THREE.DirectionalLight(0xfff4e5, 1.7);
  key.position.set(2.2, 3.4, 2.8);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 12;
  key.shadow.camera.left = -3;
  key.shadow.camera.right = 3;
  key.shadow.camera.top = 3;
  key.shadow.camera.bottom = -3;
  key.shadow.bias = -0.00025;
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xdde7f2, 0.45);
  fill.position.set(-2.4, 1.8, 1.6);
  scene.add(fill);

  const rim = new THREE.DirectionalLight(0xc9d4e0, 0.28);
  rim.position.set(0.2, 2.2, -2.4);
  scene.add(rim);

  return { key, fill, rim, hemi };
}
