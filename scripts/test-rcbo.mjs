import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const outDir = "/cursor/stores/bc-2687ee42-9b39-41c1-ab88-5a37f790d724/media";
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto("http://127.0.0.1:5173/", { waitUntil: "networkidle" });
await page.waitForFunction(() => window.__pruefwand?.selection);

await page.keyboard.press("b");
await page.click('[data-catalog-id="fils-1p"]');
await page.waitForSelector("#rcbo-setup select");

const library = await page.evaluate(() => {
  const selects = [...document.querySelectorAll("#rcbo-setup select")];
  return {
    labels: [...document.querySelectorAll("#rcbo-setup label")].map((l) =>
      l.childNodes[0]?.textContent?.trim(),
    ),
    values: selects.map((s) => s.value),
    texts: selects.map((s) => s.options[s.selectedIndex]?.textContent),
  };
});

const setup = page.locator("#rcbo-setup select");
await setup.nth(0).selectOption("B");
await setup.nth(1).selectOption("10");
await setup.nth(2).selectOption("100");
await setup.nth(3).selectOption("AC");

const placed = await page.evaluate(async () => {
  const pw = window.__pruefwand;
  const { createFromFactory } = await import("/src/models/factories.js");
  const spec = { ...pw.state.rcboSpec };
  const object = createFromFactory("rcbo1p", { spec });
  object.userData.placed = true;
  object.position.set(0.02, 1.08, 1.05);
  object.rotation.y = 0.65;
  pw.placedRoot.add(object);

  const compare = createFromFactory("rcbo1p", {
    spec: { curve: "C", amps: 16, ma: 30, fiType: "A" },
  });
  compare.position.set(0.1, 1.08, 1.02);
  compare.rotation.y = 0.65;
  pw.scene.add(compare);

  const plate = object.getObjectByName("rcbo-print");
  const canvas = plate?.material?.map?.image;
  const data = canvas?.getContext("2d")?.getImageData(180, 70, 160, 90).data;
  let dark = 0;
  if (data) {
    for (let i = 0; i < data.length; i += 4) if (data[i] < 70) dark += 1;
  }

  pw.camera.position.set(0.2, 1.22, 1.22);
  pw.controls.target.set(0.06, 1.12, 1.03);
  pw.controls.update();
  pw.selection.selectObject(object);

  return {
    spec,
    name: object.userData.name,
    meta: object.userData.meta,
    print: plate?.userData?.print || null,
    dark,
    hasLever: object.children.some((c) => c.isMesh && c.geometry?.type === "BoxGeometry"),
  };
});

await page.waitForSelector("#rcbo-edit select");
await page.locator("#rcbo-edit select").nth(0).selectOption("D");
await page.waitForTimeout(500);
await page.evaluate(() => {
  for (const id of ["library-panel", "selection-card", "hover-card"]) {
    const el = document.getElementById(id);
    if (el) el.hidden = true;
  }
  const top = document.querySelector(".topbar");
  if (top) top.style.visibility = "hidden";
  const bar = document.querySelector(".statusbar");
  if (bar) bar.style.visibility = "hidden";
});
await page.waitForTimeout(200);
await page.screenshot({ path: `${outDir}/fils-charakteristik.png` });

const edited = await page.evaluate(() => {
  const selected = window.__pruefwand.selection.getSelected();
  const plate = selected?.getObjectByName("rcbo-print");
  return {
    spec: selected?.userData?.rcboSpec || null,
    print: plate?.userData?.print || null,
    name: selected?.userData?.name || null,
    edit: [...document.querySelectorAll("#rcbo-edit select")].map((s) => s.value),
  };
});

const result = { library, placed, edited };
console.log(JSON.stringify(result, null, 2));
const pass =
  library.values.join(",") === "C,16,30,A" &&
  library.labels.includes("Charakteristik") &&
  placed.spec?.curve === "B" &&
  placed.spec?.amps === 10 &&
  placed.spec?.ma === 100 &&
  placed.spec?.fiType === "AC" &&
  placed.print?.includes("B10") &&
  placed.print?.includes("100 mA") &&
  placed.dark > 40 &&
  edited.spec?.curve === "D" &&
  edited.print?.startsWith("D10") &&
  edited.edit[0] === "D";
console.log(JSON.stringify({ pass }));
await browser.close();
process.exit(pass ? 0 : 1);
