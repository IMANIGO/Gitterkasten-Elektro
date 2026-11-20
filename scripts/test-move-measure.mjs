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
const appUrl = process.env.APP_URL || "http://127.0.0.1:5173/";
await page.goto(appUrl, { waitUntil: "networkidle" });
await page.keyboard.press("b");
await page.waitForSelector("#library-body .catalog-item");
const buttonIdle = await readMoveButton();

async function readMoveButton() {
  return page.evaluate(() => {
    const card = document.getElementById("selection-card");
    const btn = document.getElementById("btn-move");
    return {
      shown: !!btn && !card.hidden && btn.offsetParent !== null,
      label: btn?.textContent?.trim() || "",
      pressed: btn?.getAttribute("aria-pressed") || "",
      catalog: window.__pruefwand.state.selectedCatalogId,
      selected: window.__pruefwand.state.selectedObjectId,
      action: window.__pruefwand.state.selectionAction,
    };
  });
}

async function pick(id) {
  await page.evaluate((catalogId) => {
    document.querySelector(`[data-catalog-id="${catalogId}"]`)?.click();
  }, id);
  await page.waitForFunction(() => document.getElementById("measure-place") && !document.getElementById("measure-place").hidden);
}

async function dragOutlet() {
  return page.evaluate(() => {
    const { THREE, camera, placedRoot, state, controls, scene } = window.__pruefwand;
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
    const controlsDuring = controls.enabled;
    fire("pointermove", end);
    fire("pointerup", end);
    let ghosts = 0;
    scene.traverse((node) => {
      if (node.userData?.ghost) ghosts += 1;
    });
    return {
      beforeX: Math.round(before.x * 1000),
      afterX: Math.round(object.position.x * 1000),
      beforeY: Math.round((before.y - 0.802) * 1000),
      afterY: Math.round((object.position.y - 0.802) * 1000),
      count: placedRoot.children.filter((child) => child.userData?.catalogId === "schalter-aus").length,
      feedback: state.placementFeedback,
      action: state.selectionAction,
      catalog: state.selectedCatalogId,
      onScreen:
        start.clientX > rect.left &&
        start.clientX < rect.right &&
        start.clientY > rect.top &&
        start.clientY < rect.bottom,
      controlsDuring,
      controlsAfter: controls.enabled,
      ghosts,
    };
  });
}

const keptLeft = poseFromPanelMeasures("left", 190, 120, depth);
const shiftedLeft = poseFromPanelMeasures("left", 160, 70, depth);

await pick("ls-1p");
const dinOffer = await page.evaluate(() => {
  const form = document.getElementById("measure-place");
  return {
    text: form?.innerText || "",
    selects: form?.querySelectorAll("select").length || 0,
    a: document.getElementById("place-a-label")?.textContent,
    bHidden: document.getElementById("place-b-wrap")?.hidden,
  };
});
await page.fill("#place-a", "47");
await page.click("#btn-place-measure");
await page.waitForTimeout(40);
const noRail = await page.evaluate(() => {
  let placed = false;
  window.__pruefwand.scene.traverse((object) => {
    if (object.userData?.catalogId === "ls-1p" && object.userData.placed) placed = true;
  });
  return { feedback: window.__pruefwand.state.placementFeedback, placed };
});

await pick("schalter-aus");
const buttonGhost = await readMoveButton();
const placeOffer = await page.evaluate(() => {
  const form = document.getElementById("measure-place");
  return {
    text: form?.innerText || "",
    selects: form?.querySelectorAll("select").length || 0,
    a: document.getElementById("place-a-label")?.textContent,
    b: document.getElementById("place-b-label")?.textContent,
    bHidden: document.getElementById("place-b-wrap")?.hidden,
  };
});
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
    face: object.userData.placement?.face,
  };
});

const buttonPlaced = await readMoveButton();
const blocked = await dragOutlet();

await page.click("#btn-move");
const armed = await readMoveButton();

const dragged = await dragOutlet();
const blockedAgain = await dragOutlet();

await page.click("#btn-move");
const emptyPoint = await page.evaluate(() => {
  const { THREE, camera, scene } = window.__pruefwand;
  const canvas = document.querySelector("canvas");
  const rect = canvas.getBoundingClientRect();
  const raycaster = new THREE.Raycaster();
  for (let y = 170; y < rect.height - 40; y += 24) {
    for (let x = 360; x < rect.width - 340; x += 24) {
      if (document.elementFromPoint(x, y) !== canvas) continue;
      raycaster.setFromCamera(
        new THREE.Vector2(
          ((x - rect.left) / rect.width) * 2 - 1,
          -((y - rect.top) / rect.height) * 2 + 1,
        ),
        camera,
      );
      const hits = raycaster.intersectObjects(scene.children, true);
      const blockedHit = hits.some((hit) => {
        let node = hit.object;
        while (node) {
          if (node.userData?.mount || node.userData?.placed || node.userData?.catalogId) return true;
          node = node.parent;
        }
        return false;
      });
      if (!blockedHit) return { x, y };
    }
  }
  return null;
});
if (emptyPoint) await page.mouse.click(emptyPoint.x, emptyPoint.y);
await page.evaluate(() => {
  const controls = window.__pruefwand.controls;
  const damp = controls.enableDamping;
  controls.enableDamping = false;
  controls.update();
  controls.enableDamping = damp;
  window.__pruefwand.applyPreset("gesamt", { animate: false });
});
const cancelled = await page.evaluate(() => {
  const object = window.__pruefwand.placedRoot.children.find((child) => child.userData?.catalogId === "schalter-aus");
  return {
    point: true,
    x: Math.round(object.position.x * 1000),
    y: Math.round((object.position.y - 0.802) * 1000),
    action: window.__pruefwand.state.selectionAction,
    selected: window.__pruefwand.state.selectedObjectId,
    feedback: window.__pruefwand.state.placementFeedback,
  };
});
cancelled.point = !!emptyPoint;
const afterCancel = await dragOutlet();

const moveOffer = await page.evaluate(() => {
  const form = document.getElementById("measure-move");
  return {
    text: form?.innerText || "",
    selects: form?.querySelectorAll("select").length || 0,
    verschieben: document.getElementById("btn-move")?.textContent?.trim() || "",
  };
});

await page.evaluate((pose) => {
  document.activeElement?.blur?.();
  window.__pruefwand.selection.moveToPose(pose);
}, {
  position: keptLeft.position,
  rotation: keptLeft.rotation,
  mount: "lochblech",
  face: "left",
  feedback: keptLeft.feedback,
});
const leftLabels = await page.evaluate(() => ({
  a: document.getElementById("move-a-label")?.textContent,
  b: document.getElementById("move-b-label")?.textContent,
  face: window.__pruefwand.placedRoot.children.find((child) => child.userData?.catalogId === "schalter-aus")?.userData?.placement?.face,
}));
await page.fill("#move-a", "160");
await page.fill("#move-b", "70");
await page.click("#btn-move-measure");
await page.waitForTimeout(40);
const keptFace = await page.evaluate(() => {
  const object = window.__pruefwand.placedRoot.children.find((child) => child.userData?.catalogId === "schalter-aus");
  return {
    face: object?.userData?.placement?.face,
    x: Math.round(object.position.x * 1000),
    y: Math.round(object.position.y * 1000),
    z: Math.round(object.position.z * 1000),
  };
});

await pick("uv-3reihen");
await page.fill("#place-a", "400");
await page.fill("#place-b", "280");
await page.click("#btn-place-measure");
await page.waitForFunction(() => document.getElementById("measure-place").hidden);
await pick("ls-1p");
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
    rowIndex: railObject.userData?.rowIndex,
    id: railObject.userData?.id,
    fromLeft,
    feedback: window.__pruefwand.state.placementFeedback,
    moveLabel: document.getElementById("move-a-label")?.textContent,
  };
});

const rowShift = await page.evaluate(() => {
  const rails = [];
  window.__pruefwand.scene.traverse((object) => {
    if (object.userData?.mount === "din" && object.userData.railLength) rails.push(object);
  });
  let device = null;
  window.__pruefwand.scene.traverse((object) => {
    if (object.userData?.catalogId === "ls-1p" && object.userData.placed) device = object;
  });
  const rail = rails[2];
  const localX = device.position.x;
  rail.add(device);
  device.position.x = localX;
  document.activeElement?.blur?.();
  window.__pruefwand.setState({ placementFeedback: "reihe" });
  return { id: rail.userData.id, rowIndex: rail.userData.rowIndex };
});
await page.fill("#move-a", "90");
await page.click("#btn-move-measure");
await page.waitForTimeout(40);
const keptRow = await page.evaluate(() => {
  let device = null;
  window.__pruefwand.scene.traverse((object) => {
    if (object.userData?.catalogId === "ls-1p" && object.userData.placed) device = object;
  });
  const rail = device?.parent;
  return {
    id: rail?.userData?.id,
    rowIndex: rail?.userData?.rowIndex,
    fromLeft: Math.round((device.position.x + rail.userData.railLength / 2) * 1000),
    face: device?.userData?.placement?.face,
  };
});

await page.evaluate(() => document.querySelector('[data-catalog-id="taster"]')?.click());
await page.waitForFunction(() => window.__pruefwand.state.selectedCatalogId === "taster");
const clickSpot = await page.evaluate(() => {
  const { THREE, camera, scene } = window.__pruefwand;
  const canvas = document.querySelector("canvas");
  const rect = canvas.getBoundingClientRect();
  const raycaster = new THREE.Raycaster();
  for (let y = 180; y < rect.height - 80; y += 18) {
    for (let x = 420; x < rect.width - 360; x += 18) {
      if (document.elementFromPoint(x, y) !== canvas) continue;
      raycaster.setFromCamera(
        new THREE.Vector2(
          ((x - rect.left) / rect.width) * 2 - 1,
          -((y - rect.top) / rect.height) * 2 + 1,
        ),
        camera,
      );
      const hits = raycaster.intersectObjects(scene.children, true);
      const occupied = hits.some((hit) => {
        let node = hit.object;
        while (node) {
          if (node.userData?.placed || node.userData?.catalogId) return true;
          node = node.parent;
        }
        return false;
      });
      if (occupied) continue;
      const onBack = hits.some((hit) => {
        let node = hit.object;
        while (node) {
          if (node.userData?.mount === "lochblech" && node.userData?.face === "back") return true;
          node = node.parent;
        }
        return false;
      });
      if (onBack) return { x, y };
    }
  }
  return null;
});
if (clickSpot) await page.mouse.click(clickSpot.x, clickSpot.y);
const clickedPlace = await page.evaluate(() => {
  const count = window.__pruefwand.placedRoot.children.filter((child) => child.userData?.catalogId === "taster").length;
  return {
    spot: true,
    count,
    catalog: window.__pruefwand.state.selectedCatalogId,
    action: window.__pruefwand.state.selectionAction,
    feedback: window.__pruefwand.state.placementFeedback,
  };
});
clickedPlace.spot = !!clickSpot;

console.log(JSON.stringify({
  buttonIdle,
  buttonGhost,
  buttonPlaced,
  dinOffer,
  noRail,
  placeOffer,
  placed,
  moved,
  blocked,
  armed,
  dragged,
  blockedAgain,
  emptyPoint,
  cancelled,
  afterCancel,
  moveOffer,
  leftLabels,
  keptFace,
  dinPlaced,
  rowShift,
  keptRow,
  clickedPlace,
}, null, 2));

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
  moved.face === "back" &&
  moved.action == null &&
  buttonIdle.shown === false &&
  buttonIdle.label === "Verschieben" &&
  buttonGhost.shown === false &&
  buttonGhost.catalog === "schalter-aus" &&
  buttonPlaced.shown === true &&
  buttonPlaced.label === "Verschieben" &&
  buttonPlaced.action == null &&
  buttonPlaced.pressed === "false" &&
  blocked.onScreen &&
  blocked.count === 1 &&
  blocked.beforeX === moved.x &&
  blocked.afterX === moved.x &&
  blocked.afterY === moved.yFromBottom &&
  blocked.action == null &&
  blocked.controlsDuring === true &&
  blocked.controlsAfter === true &&
  armed.shown === true &&
  armed.catalog == null &&
  armed.action === "move" &&
  armed.label === "Verschieben" &&
  armed.pressed === "true" &&
  dragged.count === 1 &&
  dragged.ghosts === 0 &&
  dragged.onScreen &&
  dragged.beforeX === moved.x &&
  dragged.afterX !== dragged.beforeX &&
  dragged.action == null &&
  dragged.catalog == null &&
  dragged.controlsDuring === false &&
  dragged.controlsAfter === true &&
  !String(dragged.feedback).includes("Raster 50 mm") &&
  blockedAgain.count === 1 &&
  blockedAgain.afterX === dragged.afterX &&
  blockedAgain.afterY === dragged.afterY &&
  blockedAgain.action == null &&
  blockedAgain.controlsDuring === true &&
  cancelled.point === true &&
  cancelled.selected != null &&
  cancelled.action == null &&
  cancelled.x === dragged.afterX &&
  cancelled.y === dragged.afterY &&
  String(cancelled.feedback).includes("Verschieben abgebrochen") &&
  afterCancel.afterX === dragged.afterX &&
  afterCancel.afterY === dragged.afterY &&
  afterCancel.action == null &&
  clickedPlace.spot === true &&
  clickedPlace.count === 1 &&
  clickedPlace.catalog == null &&
  clickedPlace.action == null &&
  dinOffer.selects === 0 &&
  dinOffer.a === "Mitte von links auf der Schiene" &&
  dinOffer.bHidden === true &&
  !dinOffer.text.includes("Fläche") &&
  !dinOffer.text.includes("Reihe") &&
  noRail.feedback === "Keine Hutschiene im Aufbau" &&
  noRail.placed === false &&
  placeOffer.selects === 0 &&
  placeOffer.a === "Von links" &&
  placeOffer.b === "Von unten" &&
  placeOffer.bHidden === false &&
  !placeOffer.text.includes("Fläche") &&
  !placeOffer.text.includes("Reihe") &&
  moveOffer.selects === 0 &&
  !moveOffer.text.includes("Fläche") &&
  !moveOffer.text.includes("Reihe") &&
  moveOffer.verschieben === "Verschieben" &&
  leftLabels.face === "left" &&
  leftLabels.a === "Von der Rückwand" &&
  leftLabels.b === "Von unten" &&
  keptFace.face === "left" &&
  keptFace.x === Math.round(shiftedLeft.position.x * 1000) &&
  keptFace.y === Math.round(shiftedLeft.position.y * 1000) &&
  keptFace.z === Math.round(shiftedLeft.position.z * 1000) &&
  dinPlaced.mount === "din" &&
  dinPlaced.rowIndex === 0 &&
  dinPlaced.fromLeft === 47 &&
  dinPlaced.moveLabel === "Mitte von links auf der Schiene" &&
  keptRow.id === rowShift.id &&
  keptRow.rowIndex === 2 &&
  keptRow.fromLeft === 90 &&
  keptRow.face === "din";

console.log(JSON.stringify({ pass }));
await browser.close();
process.exit(pass ? 0 : 1);
