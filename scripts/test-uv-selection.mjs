import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";

const OUT = "/tmp/uv-selection-test";
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
page.on("console", (msg) => {
  if (msg.type() === "error") console.log("PAGE ERR:", msg.text());
});

await page.goto("http://127.0.0.1:5173/", { waitUntil: "networkidle" });
await page.waitForFunction(() => window.__pruefwand?.plansApi && window.__pruefwand?.THREE);

const result = await page.evaluate(async () => {
  const pw = window.__pruefwand;
  const THREE = pw.THREE;
  pw.setState({ mode: "plaene" });
  const plan = pw.plansApi.listPlans().find((p) => p.id === "m6-p01") || pw.plansApi.listPlans()[1];
  const built = pw.plansApi.build(plan);
  pw.applyPreset("uv");
  await new Promise((r) => setTimeout(r, 500));
  if (!plan) return { error: "no-plan" };

  const din = [];
  const terms = [];
  pw.placedRoot.traverse((o) => {
    if (!o.userData?.placed) return;
    if (o.userData.kind === "dinDevice") din.push(o.userData.name);
    if (o.userData.kind === "terminal") terms.push(o.userData.name);
  });

  let firstDin = null;
  pw.placedRoot.traverse((o) => {
    if (!firstDin && o.userData?.kind === "dinDevice" && o.userData?.placed) firstDin = o;
  });

  pw.setState({ mode: "ansicht" });
  pw.selection.selectObject(firstDin);
  const afterSelect = {
    selectedLabel: pw.state.selectedLabel,
    matchesDin: pw.state.selectedObjectId === firstDin.uuid,
  };

  const canvas = document.getElementById("viewport");
  const rect = canvas.getBoundingClientRect();
  // Click the UV-Ansicht display copy (real board is hidden off-camera).
  let displayDevice = null;
  const displayRoot = pw.uvView?.getDisplay?.();
  displayRoot?.traverse((o) => {
    if (!displayDevice && o.userData?.kind === "dinDevice" && o.userData?.uvViewDisplay) {
      displayDevice = o;
    }
  });
  const target = displayDevice || firstDin;
  const v = new THREE.Vector3();
  target.getWorldPosition(v);
  v.z += 0.04;
  v.project(pw.camera);
  const cx = (v.x * 0.5 + 0.5) * rect.width + rect.left;
  const cy = (-v.y * 0.5 + 0.5) * rect.height + rect.top;

  pw.selection.clearSelection();
  canvas.dispatchEvent(
    new PointerEvent("pointerdown", { clientX: cx, clientY: cy, button: 0, bubbles: true }),
  );
  canvas.dispatchEvent(
    new PointerEvent("pointerup", { clientX: cx, clientY: cy, button: 0, bubbles: true }),
  );
  canvas.dispatchEvent(
    new PointerEvent("click", { clientX: cx, clientY: cy, button: 0, bubbles: true }),
  );
  await new Promise((r) => setTimeout(r, 200));

  let clicked = null;
  pw.placedRoot.traverse((o) => {
    if (o.uuid === pw.state.selectedObjectId) clicked = o;
  });

  return {
    built,
    dinCount: din.length,
    termCount: terms.length,
    dinNames: din,
    afterSelect,
    afterClick: {
      selectedLabel: pw.state.selectedLabel,
      isContainer: !!clicked?.userData?.container,
      kind: clicked?.userData?.kind || null,
      name: clicked?.userData?.name || null,
    },
    clickAt: { cx: Math.round(cx), cy: Math.round(cy) },
  };
});

await page.screenshot({ path: path.join(OUT, "uv-selection.png"), fullPage: true });
console.log(JSON.stringify(result, null, 2));

const passSelect = result.afterSelect.matchesDin;
const passClick =
  !result.afterClick.isContainer &&
  (result.afterClick.kind === "dinDevice" || result.afterClick.kind === "terminal");
const passVisual = result.dinCount >= 4;

console.log(
  JSON.stringify({ passSelect, passClick, passVisual, overall: passSelect && passClick && passVisual }),
);

await browser.close();
process.exit(passSelect && passClick && passVisual ? 0 : 1);
