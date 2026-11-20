import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const appUrl = process.env.APP_URL || "http://127.0.0.1:5173/";
await page.goto(appUrl, { waitUntil: "networkidle" });
await page.waitForFunction(() => window.__pruefwand?.plansApi && window.__pruefwand?.THREE);

const result = await page.evaluate(async () => {
  const pw = window.__pruefwand;
  const THREE = pw.THREE;
  pw.setState({ mode: "plaene" });
  const plan = pw.plansApi.listPlans().find((p) => p.id === "m6-p01") || pw.plansApi.listPlans()[1];
  if (!plan) return { error: "no-plan" };
  pw.plansApi.build(plan);
  pw.applyPreset("uv", { animate: false });
  await new Promise((r) => setTimeout(r, 300));

  let firstDin = null;
  pw.placedRoot.traverse((o) => {
    if (!firstDin && o.userData?.kind === "dinDevice" && o.userData?.placed && o.userData?.mcbSpec) {
      firstDin = o;
    }
  });
  if (!firstDin) {
    return { error: "no-mcb" };
  }

  // Click display copy of the MCB in UV-Ansicht
  let displayDevice = null;
  pw.uvView.getDisplay()?.traverse((o) => {
    if (
      !displayDevice &&
      o.userData?.kind === "dinDevice" &&
      o.userData?.uvSourceUuid === firstDin.uuid
    ) {
      displayDevice = o;
    }
  });
  const target = displayDevice || firstDin;
  const canvas = document.getElementById("viewport");
  const rect = canvas.getBoundingClientRect();
  const v = new THREE.Vector3();
  target.getWorldPosition(v);
  v.z += 0.05;
  v.project(pw.camera);
  const cx = (v.x * 0.5 + 0.5) * rect.width + rect.left;
  const cy = (-v.y * 0.5 + 0.5) * rect.height + rect.top;

  pw.setState({ mode: "betriebsmittel", selectedCatalogId: null });
  canvas.dispatchEvent(new PointerEvent("pointerdown", { clientX: cx, clientY: cy, button: 0, bubbles: true }));
  canvas.dispatchEvent(new PointerEvent("pointerup", { clientX: cx, clientY: cy, button: 0, bubbles: true }));
  canvas.dispatchEvent(new PointerEvent("click", { clientX: cx, clientY: cy, button: 0, bubbles: true }));
  await new Promise((r) => setTimeout(r, 150));

  const selected = pw.state.selectedObjectId === firstDin.uuid;
  const editVisible = !document.getElementById("mcb-edit")?.hidden;
  const before = { ...firstDin.userData.mcbSpec };

  const curveSelect = document.querySelector("#mcb-edit select[data-field='curve']");
  const ampsSelect = document.querySelector("#mcb-edit select[data-field='amps']");
  if (curveSelect) {
    curveSelect.value = before.curve === "C" ? "B" : "C";
    curveSelect.dispatchEvent(new Event("change", { bubbles: true }));
  }
  if (ampsSelect) {
    ampsSelect.value = "32";
    ampsSelect.dispatchEvent(new Event("change", { bubbles: true }));
  }
  await new Promise((r) => setTimeout(r, 100));
  // Allow UV isolate to rebuild the display copy
  pw.uvView.update?.();
  await new Promise((r) => setTimeout(r, 50));

  const after = { ...firstDin.userData.mcbSpec };
  let displayPrint = null;
  pw.uvView.getDisplay()?.traverse((o) => {
    if (o.userData?.uvSourceUuid === firstDin.uuid || o.parent?.userData?.uvSourceUuid === firstDin.uuid) {
      const plate = o.getObjectByName?.("mcb-print") || (o.name === "mcb-print" ? o : null);
      if (plate?.userData?.print) displayPrint = plate.userData.print;
    }
  });
  // Fallback: find print under remapped display device
  if (!displayPrint) {
    pw.uvView.getDisplay()?.traverse((o) => {
      if (o.name === "mcb-print" && o.userData?.print) displayPrint = o.userData.print;
    });
  }

  const bodyY = [];
  firstDin.traverse((o) => {
    if (o.isMesh && o.parent === firstDin && o.name !== "din-foot") {
      bodyY.push(o.position.y);
    }
  });
  const body = firstDin.children.find((c) => c.isMesh && c !== firstDin.getObjectByName("din-foot"));
  const foot = firstDin.getObjectByName("din-foot");
  const railY = firstDin.position.y;
  const bodyCenterLocal = body ? body.position.y : null;

  return {
    selected,
    editVisible,
    before,
    after,
    name: firstDin.userData.name,
    displayPrint,
    railMountY: railY,
    bodyCenterLocal,
    footAtRail: foot ? Math.abs(foot.position.y) < 1e-6 : false,
    uvActive: pw.uvView.isActive(),
  };
});

const pass =
  !result.error &&
  result.selected === true &&
  result.editVisible === true &&
  result.after.curve !== result.before.curve &&
  result.after.amps === 32 &&
  String(result.name).includes("32") &&
  result.footAtRail === true &&
  result.bodyCenterLocal != null &&
  Math.abs(result.bodyCenterLocal) < 0.01;

console.log(JSON.stringify({ result, pass }, null, 2));
await browser.close();
process.exit(pass ? 0 : 1);
