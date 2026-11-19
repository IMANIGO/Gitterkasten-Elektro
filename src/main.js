import * as THREE from "three";
import { getCatalog } from "./catalog/index.js";
import { createDistributionBoard } from "./models/distributionBoard.js";
import { createEBox } from "./models/eBox.js";
import { createEnvironment } from "./models/environment.js";
import { createWorkbench } from "./models/workbench.js";
import { createCamera } from "./scene/cameras.js";
import { createInteraction } from "./scene/interaction.js";
import { addLighting } from "./scene/lighting.js";
import { createRenderer } from "./scene/renderer.js";
import { createTakeoff } from "./takeoff/index.js";
import { bindUi } from "./ui/bindUi.js";
import { createWiringLayer } from "./wiring/index.js";

const canvas = document.getElementById("viewport");
const { renderer } = createRenderer(canvas);
const { camera, controls, applyPreset, update: updateCamera } = createCamera(canvas);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x141618, 6, 14);
addLighting(scene);

scene.add(createEnvironment());
scene.add(createWorkbench());
scene.add(createEBox());
scene.add(createDistributionBoard());

const wiring = createWiringLayer();
scene.add(wiring.group);
const takeoff = createTakeoff();
getCatalog();

createInteraction(canvas, camera, scene);
bindUi({ applyPreset });

canvas.addEventListener("pointerdown", () => canvas.classList.add("is-dragging"));
window.addEventListener("pointerup", () => canvas.classList.remove("is-dragging"));

const clock = new THREE.Clock();
function tick() {
  const dt = clock.getDelta();
  updateCamera(dt);
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

tick();

window.__pruefwand = { scene, camera, controls, applyPreset, takeoff, wiring };
