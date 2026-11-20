import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const OUT = "/cursor/stores/self/media";
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: "/usr/bin/google-chrome-stable",
  args: ["--use-gl=angle", "--enable-webgl", "--ignore-gpu-blocklist"],
});
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(msg.text());
});

await page.goto("http://127.0.0.1:5173/", { waitUntil: "networkidle" });
await page.waitForTimeout(1200);

const boot = await page.evaluate(() => {
  const api = window.__pruefwand;
  if (!api) return { ok: false, reason: "no api" };
  const names = [];
  api.scene.traverse((o) => {
    if (o.name) names.push(o.name);
  });
  return {
    ok: true,
    hasUv: names.includes("Unterverteilung"),
    hasEbox: names.includes("E-Box"),
    mode: api.state.mode,
    placed: api.placedRoot.children.length,
  };
});

await page.screenshot({ path: path.join(OUT, "12-empty-start.png"), type: "png" });

// Switch to Betriebsmittel, select UV, place via helper for determinism then verify UI
await page.click('[data-mode="betriebsmittel"]');
await page.waitForTimeout(300);
await page.click('[data-catalog-id="uv-3reihen"]');
await page.waitForTimeout(200);

await page.evaluate(async () => {
  const { createDistributionBoard } = await import("/src/models/distributionBoard.js");
  const { UV_POSITION } = await import("/src/layout.js");
  const uv = createDistributionBoard({ includeSampleTerminals: false });
  uv.position.set(UV_POSITION.x, UV_POSITION.y, UV_POSITION.z);
  uv.userData.placed = true;
  uv.userData.catalogId = "uv-3reihen";
  window.__pruefwand.placedRoot.add(uv);
  window.__pruefwand.applyPreset("uv");
});
await page.waitForTimeout(900);
await page.screenshot({ path: path.join(OUT, "13-uv-placed.png"), type: "png" });

// Place LS 1P on first DIN rail via API
await page.click('[data-catalog-id="ls-1p"]');
await page.evaluate(async () => {
  const { createMcb1p } = await import("/src/models/devices.js");
  const { TE } = await import("/src/units.js");
  let rail = null;
  window.__pruefwand.placedRoot.traverse((o) => {
    if (o.userData?.mount === "din" && o.userData.rowIndex === 0) rail = o;
  });
  if (!rail) throw new Error("no din rail");
  const mcb = createMcb1p();
  mcb.position.set(-4 * TE, 0.006, 0.022);
  mcb.userData.placed = true;
  mcb.userData.catalogId = "ls-1p";
  rail.add(mcb);

  const { createOutlet } = await import("/src/models/devices.js");
  const { EBOX, EBOX_FLOOR_Y } = await import("/src/layout.js");
  const { MM } = await import("/src/units.js");
  const outlet = createOutlet();
  outlet.position.set(0.25, EBOX_FLOOR_Y + 0.25, EBOX.panelThickness + 0.025);
  outlet.userData.placed = true;
  outlet.userData.catalogId = "steckdose";
  window.__pruefwand.placedRoot.add(outlet);
  window.__pruefwand.applyPreset("gesamt");
});
await page.waitForTimeout(900);
await page.screenshot({ path: path.join(OUT, "14-devices-placed.png"), type: "png" });

// Wiring mode: synthesize a cable run with clamp rules via wiring internals
await page.click('[data-mode="verdrahtung"]');
const wireResult = await page.evaluate(async () => {
  const THREE = await import("/node_modules/.vite/deps/three.js");
  const { buildFilletedPath, pointAtDistance, createCableMesh } = await import(
    "/src/wiring/pathGeometry.js"
  );
  const { computeClampDistancesAlongPath, CLAMP_RULES_MM } = await import(
    "/src/wiring/clampRules.js"
  );
  const { createCableClamp } = await import("/src/models/cableClamp.js");
  const { materials } = await import("/src/materials.js");
  const { EBOX, EBOX_FLOOR_Y } = await import("/src/layout.js");
  const { MM, toMm } = await import("/src/units.js");

  const z = EBOX.panelThickness + 8 * MM;
  const y = EBOX_FLOOR_Y + 200 * MM;
  const corners = [
    new THREE.Vector3(-300 * MM, y, z),
    new THREE.Vector3(200 * MM, y, z),
    new THREE.Vector3(200 * MM, y + 250 * MM, z),
  ];
  const { points, length } = buildFilletedPath(corners);
  const distances = computeClampDistancesAlongPath(length);
  const run = new THREE.Group();
  run.name = "Leitung Test";
  const cable = createCableMesh(points, materials.cable);
  if (cable) run.add(cable);
  const clampMm = [];
  for (const d of distances) {
    const s = pointAtDistance(points, d);
    const c = createCableClamp();
    c.position.copy(s.point);
    c.userData.autoPlaced = true;
    run.add(c);
    clampMm.push(toMm(d));
  }
  window.__pruefwand.wiring.group.add(run);
  window.__pruefwand.wiring.wires.push({
    lengthMm: toMm(length),
    clamps: distances.map((d) => ({ distanceMm: toMm(d) })),
  });
  window.__pruefwand.applyPreset("gitter");
  const spacings = [];
  for (let i = 1; i < clampMm.length; i++) spacings.push(clampMm[i] - clampMm[i - 1]);
  return {
    lengthMm: toMm(length),
    clampCount: distances.length,
    clampMm,
    spacings,
    firstOffset: clampMm[0],
    lastOffsetFromEnd: toMm(length) - clampMm[clampMm.length - 1],
    rules: CLAMP_RULES_MM,
  };
});
await page.waitForTimeout(900);
await page.screenshot({ path: path.join(OUT, "15-leitung-schellen.png"), type: "png" });

await page.click('[data-mode="aufmass"]');
await page.waitForTimeout(400);
await page.screenshot({ path: path.join(OUT, "16-aufmass.png"), type: "png" });

await page.click('[data-mode="betriebsmittel"]');
const uiState = await page.evaluate(() => {
  const panel = document.getElementById("library-panel");
  const items = [...document.querySelectorAll(".catalog-item:not(:disabled)")].map((b) =>
    b.dataset.catalogId,
  );
  return {
    libraryVisible: !panel.hidden,
    placeableCount: items.length,
    items,
    placedChildren: window.__pruefwand.placedRoot.children.length,
  };
});

await browser.close();

const report = { boot, wireResult, uiState, errors };
console.log(JSON.stringify(report, null, 2));

if (!boot.ok) process.exit(1);
if (boot.hasUv) {
  console.error("FAIL: UV present at empty start");
  process.exit(1);
}
if (wireResult.firstOffset !== 70) {
  console.error("FAIL: first clamp not at 70 mm", wireResult);
  process.exit(1);
}
if (wireResult.spacings.some((s) => s > 220 + 0.5)) {
  console.error("FAIL: spacing > 220", wireResult);
  process.exit(1);
}
if (errors.length) {
  console.error("PAGE ERRORS", errors);
  process.exit(1);
}
console.log("SMOKE OK");
