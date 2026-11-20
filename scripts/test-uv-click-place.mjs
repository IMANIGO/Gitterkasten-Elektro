import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const appUrl = process.env.APP_URL || "http://127.0.0.1:5173/";
await page.goto(appUrl, { waitUntil: "networkidle" });
await page.keyboard.press("b");
await page.waitForSelector("#library-body .catalog-item");

await page.evaluate(() => document.querySelector('[data-catalog-id="uv-3reihen"]')?.click());
await page.waitForFunction(() => !document.getElementById("measure-place").hidden);
await page.fill("#place-a", "400");
await page.fill("#place-b", "280");
await page.click("#btn-place-measure");
await page.waitForFunction(() => document.getElementById("measure-place").hidden);

await page.evaluate(() => window.__pruefwand.applyPreset("uv", { animate: false }));
await page.waitForTimeout(200);

await page.evaluate(() => document.querySelector('[data-catalog-id="ls-1p"]')?.click());
await page.waitForFunction(() => window.__pruefwand.state.selectedCatalogId === "ls-1p");

const click = await page.evaluate(() => {
  const { THREE, camera, uvView, scene } = window.__pruefwand;
  const canvas = document.querySelector("canvas");
  const rect = canvas.getBoundingClientRect();
  const display = uvView.getDisplay();
  if (!display) return { error: "no-display" };
  let rail = null;
  display.traverse((object) => {
    if (!rail && object.userData?.mount === "din" && object.userData?.rowIndex === 1) rail = object;
  });
  if (!rail) return { error: "no-rail" };
  const local = new THREE.Vector3(0, 0.05, 0.02);
  const world = rail.localToWorld(local);
  world.project(camera);
  return {
    x: rect.left + (world.x * 0.5 + 0.5) * rect.width,
    y: rect.top + (-world.y * 0.5 + 0.5) * rect.height,
    active: uvView.isActive(),
  };
});

if (click.x != null) {
  await page.mouse.click(click.x, click.y);
  await page.waitForTimeout(80);
}

const result = await page.evaluate(() => {
  let device = null;
  window.__pruefwand.scene.traverse((object) => {
    if (object.userData?.catalogId === "ls-1p" && object.userData.placed) device = object;
  });
  return {
    active: window.__pruefwand.uvView.isActive(),
    placed: !!device,
    rowIndex: device?.parent?.userData?.rowIndex,
    railLetter: device?.parent?.userData?.railLetter,
    te: device?.userData?.placement?.teIndex,
    catalog: window.__pruefwand.state.selectedCatalogId,
    feedback: window.__pruefwand.state.placementFeedback,
  };
});

const pass =
  click.active === true &&
  result.active === true &&
  result.placed === true &&
  result.rowIndex === 1 &&
  result.railLetter === "B" &&
  result.catalog == null &&
  String(result.feedback).includes("Schiene B");

console.log(JSON.stringify({ click, result, pass }, null, 2));
await browser.close();
process.exit(pass ? 0 : 1);
