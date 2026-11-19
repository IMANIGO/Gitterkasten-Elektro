import * as THREE from "three";
import { getCatalog } from "./catalog/index.js";
import { createEBox } from "./models/eBox.js";
import { createEnvironment } from "./models/environment.js";
import { createWorkbench } from "./models/workbench.js";
import { createPlacementController } from "./placement/controller.js";
import { createSelectionController } from "./selection/controller.js";
import { createCamera } from "./scene/cameras.js";
import { createInteraction } from "./scene/interaction.js";
import { addLighting } from "./scene/lighting.js";
import { createRenderer } from "./scene/renderer.js";
import { createTakeoff } from "./takeoff/index.js";
import { bindUi } from "./ui/bindUi.js";
import { createWiringLayer } from "./wiring/index.js";
import { state } from "./state.js";
import {
  BUILTIN_PLANS,
  buildPlanInScene,
  exportPlanJson,
  getPlan,
  parsePlanJson,
  renderAufbauplanSvg,
  renderKlemmenlisteHtml,
  renderStromlaufplanSvg,
} from "./plans/index.js";

const canvas = document.getElementById("viewport");
const { renderer } = createRenderer(canvas);
const { camera, controls, applyPreset, update: updateCamera } = createCamera(canvas);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x141618, 6, 14);
addLighting(scene);

scene.add(createEnvironment());
scene.add(createWorkbench());
scene.add(createEBox());

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
    return items;
  },
});

getCatalog();

createInteraction(canvas, camera, scene);

let selection = null;
const placement = createPlacementController({
  canvas,
  camera,
  scene,
  placedRoot,
  controls,
  getSelection: () => selection,
});

selection = createSelectionController({
  canvas,
  camera,
  scene,
  placedRoot,
  placement,
});

const importedPlans = [];
let activePlan = BUILTIN_PLANS[0];

const plansApi = {
  listPlans() {
    return [...BUILTIN_PLANS, ...importedPlans];
  },
  getPlan(id) {
    return [...BUILTIN_PLANS, ...importedPlans].find((p) => p.id === id) || getPlan(id);
  },
  getActivePlan() {
    return activePlan;
  },
  setActivePlan(plan) {
    activePlan = plan;
  },
  registerPlan(plan) {
    if (!importedPlans.some((p) => p.id === plan.id)) importedPlans.push(plan);
  },
  build(plan) {
    return buildPlanInScene(plan, placedRoot);
  },
  renderAufbau: renderAufbauplanSvg,
  renderStromlauf: renderStromlaufplanSvg,
  renderKlemmen: renderKlemmenlisteHtml,
  exportJson: exportPlanJson,
  importJson: parsePlanJson,
};

bindUi({ applyPreset, takeoff, selection, plansApi });

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
  selection,
  plansApi,
  state,
};
