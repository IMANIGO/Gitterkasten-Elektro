import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const outDir = "/cursor/stores/bc-2687ee42-9b39-41c1-ab88-5a37f790d724/media";
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto("http://127.0.0.1:5173/", { waitUntil: "networkidle" });
await page.waitForFunction(() => window.__pruefwand?.selection);

await page.keyboard.press("b");
await page.click('[data-catalog-id="fi-4p"]');
await page.waitForSelector("#rcd-setup select");

const library = await page.evaluate(() => {
  const selects = [...document.querySelectorAll("#rcd-setup select")];
  return {
    labels: [...document.querySelectorAll("#rcd-setup label")].map((l) => l.childNodes[0]?.textContent?.trim()),
    values: selects.map((s) => s.value),
  };
});

const setup = page.locator("#rcd-setup select");
await setup.nth(0).selectOption("63");
await setup.nth(1).selectOption("100");
await setup.nth(2).selectOption("AC");

const placed = await page.evaluate(async () => {
  const pw = window.__pruefwand;
  const { createFromFactory } = await import("/src/models/factories.js");
  const spec = { ...pw.state.rcdSpec };
  const object = createFromFactory("rcd4p", { spec });
  object.position.set(0.04, 1.08, 1.02);
  object.rotation.y = 0.55;
  pw.scene.add(object);
  pw.camera.position.set(0.18, 1.22, 1.22);
  pw.controls.target.set(0.04, 1.12, 1.02);
  pw.controls.update();
  const plate = object.getObjectByName("rcd-print");
  const canvas = plate?.material?.map?.image;
  const data = canvas?.getContext("2d")?.getImageData(120, 40, 280, 220).data;
  let dark = 0;
  if (data) for (let i = 0; i < data.length; i += 4) if (data[i] < 80) dark += 1;
  const blob = JSON.stringify(object.userData) + (plate?.userData?.print || "");
  return {
    spec,
    name: object.userData.name,
    print: plate?.userData?.print || null,
    te: object.userData.te,
    poles: object.userData.poles,
    hasTest: !!object.getObjectByName("rcd-test"),
    redMarks: object.children.filter((c) => c.name === "mcb-on").length,
    dark,
    branded: /legrand|tx3/i.test(blob),
  };
});

await page.evaluate(() => {
  for (const id of ["library-panel", "selection-card", "hover-card"]) {
    const el = document.getElementById(id);
    if (el) el.hidden = true;
  }
  for (const sel of [".topbar", ".statusbar"]) {
    const el = document.querySelector(sel);
    if (el) el.style.visibility = "hidden";
  }
});
await page.waitForTimeout(250);
await page.screenshot({ path: `${outDir}/fi-schutzschalter.png` });

await page.evaluate(() => {
  const pw = window.__pruefwand;
  const object = pw.scene.children.find((c) => c.userData?.catalogId === "fi-4p");
  pw.selection.selectObject(object);
});
await page.waitForSelector("#rcd-edit select");
await page.locator("#rcd-edit select").nth(1).selectOption("300");

const after = await page.evaluate(() => {
  const selected = window.__pruefwand.selection.getSelected();
  return {
    spec: selected?.userData?.rcdSpec,
    print: selected?.getObjectByName("rcd-print")?.userData?.print,
    name: selected?.userData?.name,
  };
});

const result = { library, placed, after };
console.log(JSON.stringify(result, null, 2));
const pass =
  library.values.join(",") === "40,30,A" &&
  library.labels.includes("Fehlerstrom") &&
  placed.spec?.amps === 63 &&
  placed.spec?.ma === 100 &&
  placed.spec?.fiType === "AC" &&
  placed.print === "63 A · 100 mA · Typ AC" &&
  placed.te === 4 &&
  placed.poles === 4 &&
  placed.hasTest &&
  placed.redMarks === 0 &&
  placed.dark > 40 &&
  placed.branded === false &&
  after.spec?.ma === 300 &&
  after.print?.includes("300 mA") &&
  after.spec?.amps === 63;
console.log(JSON.stringify({ pass }));
await browser.close();
process.exit(pass ? 0 : 1);
