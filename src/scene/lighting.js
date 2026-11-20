import * as THREE from "three";

export function addLighting(scene) {
  const ambient = new THREE.AmbientLight(0xeff2f5, 0.55);
  scene.add(ambient);

  const hemi = new THREE.HemisphereLight(0xf4f7fb, 0x8a847c, 0.85);
  scene.add(hemi);

  const key = new THREE.DirectionalLight(0xfff6ea, 1.55);
  key.position.set(1.6, 2.8, 2.2);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 12;
  key.shadow.camera.left = -2.5;
  key.shadow.camera.right = 2.5;
  key.shadow.camera.top = 2.5;
  key.shadow.camera.bottom = -2.5;
  key.shadow.bias = -0.0002;
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xe8eef8, 0.85);
  fill.position.set(-2.0, 1.6, 1.4);
  scene.add(fill);

  const front = new THREE.DirectionalLight(0xffffff, 0.55);
  front.position.set(0.1, 1.4, 2.6);
  scene.add(front);

  const rim = new THREE.DirectionalLight(0xd5dde8, 0.4);
  rim.position.set(0.2, 2.0, -1.8);
  scene.add(rim);

  return { ambient, key, fill, front, rim, hemi };
}
