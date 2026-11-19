import { chromium } from "playwright";
import * as THREE from "three";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto("http://127.0.0.1:5173/", { waitUntil: "networkidle" });
await page.waitForFunction(() => window.__pruefwand?.wiring);

const result = await page.evaluate(() => {
  const pw = window.__pruefwand;
  pw.setState({ mode: "verdrahtung" });
  const FY = 0.78; // workbench height approx — use actual from scene if needed
  // Use layout values from points on faces via debugAppend
  const wiring = pw.wiring;

  // Start on back
  wiring.debugAppend("back", { x: 0, y: FY + 0.25, z: 0.05, isVector3: true, clone() { return this; } });
  // Force Vector3: recreate via THREE
  return null;
});

void result;

const result2 = await page.evaluate(() => {
  const pw = window.__pruefwand;
  const THREE = pw.THREE;
  const wiring = pw.wiring;
  const FY = 0.78;

  // clear any draft by Escape path
  pw.setState({ mode: "verdrahtung" });
  window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

  wiring.debugAppend("back", new THREE.Vector3(0.1, FY + 0.3, 0.04));
  wiring.debugAppend("left", new THREE.Vector3(-0.5, FY + 0.25, 0.25));
  wiring.debugAppend("floor", new THREE.Vector3(-0.2, FY + 0.03, 0.35));
  const draft = wiring.getDraft();
  const run = wiring.addWire();
  return {
    draftFaces: draft.faces,
    draftCount: draft.points.length,
    runFaces: run?.faces || [],
    lengthMm: run?.lengthMm || 0,
    clamps: run?.clamps?.length || 0,
    feedback: pw.state.wiringFeedback,
  };
});

console.log(JSON.stringify(result2, null, 2));
const pass =
  result2.runFaces.includes("back") &&
  result2.runFaces.includes("left") &&
  result2.runFaces.includes("floor") &&
  result2.lengthMm > 100;
console.log(JSON.stringify({ pass }));
await browser.close();
process.exit(pass ? 0 : 1);
