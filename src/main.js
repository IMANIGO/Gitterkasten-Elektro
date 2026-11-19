import * as THREE from "three";
import { getCatalog } from "./catalog/index.js";
import { createEBox } from "./models/eBox.js";
import { createEnvironment } from "./models/environment.js";
import { createWorkbench } from "./models/workbench.js";
import { createPlacementController } from "./placement/controller.js";
import { createCamera } from "./scene/cameras.js";
import { createInteraction } from "./scene/interaction.js";
import { addLighting } from "./scene/lighting.js";
import { createRenderer } from "./scene/renderer.js";
import { createTakeoff } from "./takeoff/index.js";
import { bindUi } from "./ui/bindUi.js";
import { createWiringLayer } from "./wiring/index.js";
import { state } from "./state.js";

const canvas = document.getElementById("viewport");
const { renderer } = createRenderer(canvas);
const { camera, controls, applyPreset, update: updateCamera } = createCamera(canvas);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x141618, 6, 14);
addLighting(scene);

scene.add(createEnvironment());
scene.add(createWorkbench());
scene.add(createEBox());

/** User-placed Betriebsmittel live here (empty at start). */
const placedRoot = new THREE.Group();
placedRoot.name = "Betriebsmittel";
scene.add(placedRoot);

const wiring = createWiringLayer({ canvas, camera, scene, controls });
scene.add(wiring.group);

const takeoff = createTakeoff({
  wiring,
  getPlacedItems() {
    const items = [];
    placedRoot.traverse((o) => {
      if (o.userData?.placed) items.push(o);
    });
    // Also count auto Schellen via wiring summary
    return items;
  },
});

getCatalog();

createInteraction(canvas, camera, scene);
createPlacementController({ canvas, camera, scene, placedRoot, controls });
bindUi({ applyPreset, takeoff });

/** Distinguish orbit drag from click-to-place. */
let pointerDown = null;
canvas.addEventListener("pointerdown", (event) => {
  canvas.classList.add("is-dragging");
  pointerDown = { x: event.clientX, y: event.clientY, t: performance.now() };
  controls._didOrbit = false;
});
window.addEventListener("pointerup", (event) => {
  canvas.classList.remove("is-dragging");
  if (pointerDown) {
    const dx = event.clientX - pointerDown.x;
    const dy = event.clientY - pointerDown.y;
    controls._didOrbit = Math.hypot(dx, dy) > 6;
  }
  pointerDown = null;
});

const clock = new THREE.Clock();
function tick() {
  const dt = clock.getDelta();
  updateCamera(dt);
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

tick();

window.__pruefwand = {
  scene,
  camera,
  controls,
  applyPreset,
  takeoff,
  wiring,
  placedRoot,
  state,
  /** Dev helper: place UV at default back-wall spot for quick tests */
  placeUvDemo() {
    import("./models/distributionBoard.js").then(({ createDistributionBoard }) => {
      import("./layout.js").then(({ UV_POSITION }) => {
        const uv = createDistributionBoard({ includeSampleTerminals: false });
        uv.position.set(UV_POSITION.x, UV_POSITION.y, UV_POSITION.z);
        uv.userData.placed = true;
        uv.userData.catalogId = "uv-3reihen";
        placedRoot.add(uv);
      });
    });
  },
};
