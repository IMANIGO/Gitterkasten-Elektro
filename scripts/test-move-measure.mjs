import { chromium } from "playwright";
import { getCatalogItem } from "../src/catalog/index.js";
import {
  dinMeasureFromLocal,
  panelMeasuresFromWorld,
  poseFromDinMeasure,
  poseFromPanelMeasures,
} from "../src/placement/measures.js";
import { poseOnLochblech } from "../src/placement/snap.js";
import { UV } from "../src/layout.js";

const outlet = getCatalogItem("schalter-aus");
const depth = outlet.depthMm / 1000;
const back = poseFromPanelMeasures("back", 137, 213, depth);
const backRead = panelMeasuresFromWorld("back", back.position);
const left = poseFromPanelMeasures("left", 180, 90, depth);
const leftRead = panelMeasuresFromWorld("left", left.position);
const floor = poseFromPanelMeasures("floor", 220, 160, depth);
const floorRead = panelMeasuresFromWorld("floor", floor.position);
const grid = poseOnLochblech("back", { x: back.position.x, y: back.position.y, z: 0 }, depth);
const rail = { userData: { railLength: UV.railLength, mount: "din", name: "Reihe 1" } };
const din = poseFromDinMeasure(rail, 47, getCatalogItem("ls-1p"));
const dinRead = dinMeasureFromLocal(din.position.x, UV.railLength);

const unit = {
  backA: backRead.a,
  backB: backRead.b,
  backOffGrid: Math.abs(Math.round(back.position.x * 1000)) % 50 !== 0,
  leftA: leftRead.a,
  leftB: leftRead.b,
  floorA: floorRead.a,
  floorB: floorRead.b,
  gridSnaps: grid.feedback.includes("Raster 50 mm"),
  exactOmitsGrid: !back.feedback.includes("Raster"),
  dinFromLeft: dinRead,
};
console.log(JSON.stringify({ unit }, null, 2));

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("http://127.0.0.1:5173/", { waitUntil: "networkidle" });
await page.keyboard.press("b");
await page.waitForSelector("#library-body .catalog-item");

async function pick(id) {
  await page.evaluate((catalogId) => {
    document.querySelector(`[data-catalog-id="${catalogId}"]`)?.click();
  }, id);
  await page.waitForFunction(() => document.getElementById("measure-place") && !document.getElementById("measure-place").hidden);
}

await pick("schalter-aus");
await page.selectOption("#place-face", "back");
await page.fill("#place-a", "137");
await page.fill("#place-b", "213");
await page.click("#btn-place-measure");
await page.waitForFunction(() => document.getElementById("measure-place").hidden);

const placed = await page.evaluate(() => {
  const { placedRoot, state } = window.__pruefwand;
  const objects = placedRoot.children.filter((child) => child.userData?.catalogId === "schalter-aus");
  const object = objects[0];
  return {
    count: objects.length,
    x: Math.round(object.position.x * 1000),
    yFromBottom: Math.round((object.position.y - 0.802) * 1000),
    feedback: state.placementFeedback,
    face: object.userData.placement?.face,
    formA: document.getElementById("move-a").value,
    formB: document.getElementById("move-b").value,
  };
});

await page.fill("#move-a", "251");
await page.fill("#move-b", "88");
await page.click("#btn-move-measure");
await page.waitForTimeout(50);

const moved = await page.evaluate(() => {
  const { placedRoot, state } = window.__pruefwand;
  const objects = placedRoot.children.filter((child) => child.userData?.catalogId === "schalter-aus");
  const object = objects[0];
  return {
    count: objects.length,
    x: Math.round(object.position.x * 1000),
    yFromBottom: Math.round((object.position.y - 0.802) * 1000),
    feedback: state.placementFeedback,
    action: state.selectionAction,
  };
});

await page.click("#btn-move");
const armed = await page.evaluate(() => ({
  catalog: window.__pruefwand.state.selectedCatalogId,
  action: window.__pruefwand.state.selectionAction,
}));

const dragged = await page.evaluate(() => {
  const { THREE, camera, placedRoot, state } = window.__pruefwand;
  const canvas = document.querySelector("canvas");
  const object = placedRoot.children.find((child) => child.userData?.catalogId === "schalter-aus");
  const before = { x: object.position.x, y: object.position.y };
  const rect = canvas.getBoundingClientRect();
  const project = (x, y, z) => {
    const vector = new THREE.Vector3(x, y, z).project(camera);
    return {
      clientX: rect.left + (vector.x * 0.5 + 0.5) * rect.width,
      clientY: rect.top + (-vector.y * 0.5 + 0.5) * rect.height,
    };
  };
  const start = project(object.position.x, object.position.y, object.position.z);
  const end = project(object.position.x + 0.07, object.position.y + 0.05, object.position.z);
  const fire = (type, point) =>
    canvas.dispatchEvent(
      new PointerEvent(type, {
        clientX: point.clientX,
        clientY: point.clientY,
        button: 0,
        bubbles: true,
        pointerId: 1,
        pointerType: "mouse",
        isPrimary: true,
      }),
    );
  fire("pointerdown", start);
  fire("pointermove", end);
  fire("pointerup", end);
  return {
    beforeX: Math.round(before.x * 1000),
    afterX: Math.round(object.position.x * 1000),
    afterY: Math.round(object.position.y * 1000),
    count: placedRoot.children.filter((child) => child.userData?.catalogId === "schalter-aus").length,
    feedback: state.placementFeedback,
    onScreen: start.clientX > rect.left && start.clientX < rect.right && start.clientY > rect.top && start.clientY < rect.bottom,
  };
});

await pick("uv-3reihen");
await page.selectOption("#place-face", "back");
await page.fill("#place-a", "400");
await page.fill("#place-b", "280");
await page.click("#btn-place-measure");
await page.waitForFunction(() => document.getElementById("measure-place").hidden);
await pick("ls-1p");
await page.selectOption("#place-face", "din");
await page.fill("#place-a", "47");
await page.click("#btn-place-measure");
await page.waitForTimeout(80);

const dinPlaced = await page.evaluate(() => {
  let device = null;
  window.__pruefwand.scene.traverse((object) => {
    if (object.userData?.catalogId === "ls-1p" && object.userData.placed) device = object;
  });
  if (!device) return { missing: true };
  const railObject = device.parent;
  const fromLeft = Math.round((device.position.x + railObject.userData.railLength / 2) * 1000);
  return {
    mount: railObject.userData?.mount,
    fromLeft,
    feedback: window.__pruefwand.state.placementFeedback,
    rows: document.getElementById("place-row")?.options.length || 0,
  };
});

console.log(JSON.stringify({ placed, moved, armed, dragged, dinPlaced }, null, 2));

const pass =
  unit.backA === 137 &&
  unit.backB === 213 &&
  unit.backOffGrid &&
  unit.leftA === 180 &&
  unit.leftB === 90 &&
  unit.floorA === 220 &&
  unit.floorB === 160 &&
  unit.gridSnaps &&
  unit.exactOmitsGrid &&
  unit.dinFromLeft === 47 &&
  placed.count === 1 &&
  placed.x === -351 &&
  placed.yFromBottom === 213 &&
  moved.count === 1 &&
  moved.x === -237 &&
  moved.yFromBottom === 88 &&
  armed.catalog == null &&
  armed.action === "move" &&
  dragged.count === 1 &&
  dragged.onScreen &&
  dragged.afterX !== dragged.beforeX &&
  !String(dragged.feedback).includes("Raster 50 mm") &&
  dinPlaced.mount === "din" &&
  dinPlaced.fromLeft === 47;

console.log(JSON.stringify({ pass }));
await browser.close();
process.exit(pass ? 0 : 1);
