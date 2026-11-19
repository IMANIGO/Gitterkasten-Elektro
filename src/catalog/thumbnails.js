import * as THREE from "three";
import { createFromFactory } from "../models/factories.js";

const cache = new Map();
const queue = [];
let pumping = false;
let renderer = null;
let scene = null;
let camera = null;
let hemi = null;
let key = null;

function ensureRenderer() {
  if (renderer) return;
  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: true,
  });
  renderer.setPixelRatio(1);
  renderer.setSize(168, 168, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(30, 1, 0.002, 20);
  hemi = new THREE.HemisphereLight(0xf7f4ee, 0x2c3036, 1.15);
  key = new THREE.DirectionalLight(0xffffff, 1.55);
  key.position.set(0.6, 1.1, 1.4);
  scene.add(hemi, key);
}

function frameObject(object) {
  object.rotation.set(-0.15, 0.65, 0);
  object.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const radius = Math.max(size.x, size.y, size.z, 0.02) * 0.62;
  const distance = radius / Math.tan((camera.fov * Math.PI) / 360);
  camera.position.set(center.x + distance * 0.15, center.y + distance * 0.08, center.z + distance * 1.15);
  camera.near = Math.max(0.001, distance / 80);
  camera.far = distance * 10;
  camera.lookAt(center);
  camera.updateProjectionMatrix();
}

function renderOne(item) {
  ensureRenderer();
  const object = createFromFactory(item.factory);
  if (!object) return "";
  scene.add(object);
  try {
    frameObject(object);
    renderer.render(scene, camera);
    return renderer.domElement.toDataURL("image/png");
  } finally {
    scene.remove(object);
    object.traverse((child) => {
      if (child.geometry) child.geometry.dispose();
    });
  }
}

function pump() {
  if (pumping) return;
  pumping = true;
  const step = () => {
    const job = queue.shift();
    if (!job) {
      pumping = false;
      return;
    }
    job();
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/** Cached PNG of the catalog mesh, one model per frame. */
export function catalogThumbUrl(item) {
  if (!item?.factory) return Promise.resolve("");
  if (cache.has(item.id)) return Promise.resolve(cache.get(item.id));
  return new Promise((resolve) => {
    queue.push(() => {
      let url = "";
      try {
        url = renderOne(item);
      } catch {
        url = "";
      }
      cache.set(item.id, url);
      resolve(url);
    });
    pump();
  });
}
