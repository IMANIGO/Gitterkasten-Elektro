import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EBOX, EBOX_CENTER_Y, EBOX_FLOOR_Y } from "../layout.js";
import { setState, state } from "../state.js";
import { UV_STAGE_CAMERA } from "./uvIsolate.js";

const cx = 0;
const cy = EBOX_CENTER_Y;
const cz = EBOX.depth / 2;

const PRESETS = {
  gesamt: {
    position: new THREE.Vector3(1.15, 1.55, 1.55),
    target: new THREE.Vector3(cx, cy - 0.05, cz),
  },
  uv: {
    position: UV_STAGE_CAMERA.position.clone(),
    target: UV_STAGE_CAMERA.target.clone(),
  },
  draufsicht: {
    position: new THREE.Vector3(0.0, EBOX_FLOOR_Y + 1.35, cz + 0.05),
    target: new THREE.Vector3(0.0, EBOX_FLOOR_Y + 0.02, cz),
  },
};

export const cameraPresets = PRESETS;

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

export function createCamera(canvas) {
  const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.02, 40);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 0.2;
  controls.maxDistance = 5;
  controls.maxPolarAngle = Math.PI * 0.495;
  controls.target.copy(PRESETS.gesamt.target);
  camera.position.copy(PRESETS.gesamt.position);
  controls.update();

  const anim = {
    active: false,
    t: 0,
    duration: 0.85,
    fromPos: new THREE.Vector3(),
    toPos: new THREE.Vector3(),
    fromTarget: new THREE.Vector3(),
    toTarget: new THREE.Vector3(),
  };

  function applyPreset(id, { animate = true } = {}) {
    const preset = PRESETS[id];
    if (!preset) return;
    setState({ cameraPreset: id });
    if (!animate) {
      camera.position.copy(preset.position);
      controls.target.copy(preset.target);
      controls.update();
      return;
    }
    anim.fromPos.copy(camera.position);
    anim.toPos.copy(preset.position);
    anim.fromTarget.copy(controls.target);
    anim.toTarget.copy(preset.target);
    anim.t = 0;
    anim.active = true;
  }

  function update(dt) {
    if (anim.active) {
      anim.t += dt / anim.duration;
      const k = easeInOutCubic(Math.min(1, anim.t));
      camera.position.lerpVectors(anim.fromPos, anim.toPos, k);
      controls.target.lerpVectors(anim.fromTarget, anim.toTarget, k);
      if (anim.t >= 1) anim.active = false;
    }
    controls.update();
  }

  function resize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  }

  window.addEventListener("resize", resize);

  return { camera, controls, applyPreset, update, resize, getPreset: () => state.cameraPreset };
}
