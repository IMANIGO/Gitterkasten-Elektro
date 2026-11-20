import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const outDir = "/cursor/stores/bc-2687ee42-9b39-41c1-ab88-5a37f790d724/media";
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto("http://127.0.0.1:5173/", { waitUntil: "networkidle" });
await page.waitForFunction(() => window.__pruefwand?.selection);

await page.keyboard.press("b");
await page.click('[data-catalog-id="ls-1p"]');
await page.waitForSelector("#mcb-setup select");

const library = await page.evaluate(() => {
  const selects = [...document.querySelectorAll("#mcb-setup select")];
  return {
    labels: [...document.querySelectorAll("#mcb-setup label")].map((l) => l.childNodes[0]?.textContent?.trim()),
    values: selects.map((s) => s.value),
  };
});

const setup = page.locator("#mcb-setup select");
await setup.nth(0).selectOption("C");
await setup.nth(1).selectOption("32");

await page.click('[data-catalog-id="ls-3p"]');
await page.waitForFunction(() => document.querySelector("#mcb-setup select")?.value === "C");

const placed = await page.evaluate(async () => {
  const pw = window.__pruefwand;
  const { createFromFactory } = await import("/src/models/factories.js");
  const spec = { ...pw.state.mcbSpec };
  const single = createFromFactory("mcb1p", { spec });
  const triple = createFromFactory("mcb3p", { spec });
  single.position.set(-0.02, 1.08, 1.05);
  triple.position.set(0.1, 1.08, 1.02);
  single.rotation.y = 0.6;
  triple.rotation.y = 0.6;
  pw.scene.add(single, triple);
  pw.camera.position.set(0.18, 1.22, 1.24);
  pw.controls.target.set(0.05, 1.12, 1.03);
  pw.controls.update();

  function darkCount(object) {
    const canvas = object.getObjectByName("mcb-print")?.material?.map?.image;
    const data = canvas?.getContext("2d")?.getImageData(160, 60, 200, 120).data;
    let dark = 0;
    if (data) for (let i = 0; i < data.length; i += 4) if (data[i] < 70) dark += 1;
    return dark;
  }

  return {
    spec,
    single: {
      name: single.userData.name,
      print: single.getObjectByName("mcb-print")?.userData?.print,
      ons: single.children.filter((c) => c.name === "mcb-on").length,
      poles: single.userData.poles,
      dark: darkCount(single),
    },
    triple: {
      name: triple.userData.name,
      print: triple.getObjectByName("mcb-print")?.userData?.print,
      ons: triple.children.filter((c) => c.name === "mcb-on").length,
      poles: triple.userData.poles,
      te: triple.userData.te,
      dark: darkCount(triple),
    },
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
await page.screenshot({ path: `${outDir}/ls-einpolig-mehrpolig.png` });

const edited = await page.evaluate(() => {
  const pw = window.__pruefwand;
  const triple = pw.scene.children.find((c) => c.userData?.catalogId === "ls-3p" && c.userData?.mcbSpec);
  pw.selection.selectObject(triple);
  return triple.uuid;
});
await page.waitForSelector("#mcb-edit select");
await page.locator("#mcb-edit select").nth(0).selectOption("D");
await page.locator("#mcb-edit select").nth(1).selectOption("20");

const after = await page.evaluate(() => {
  const selected = window.__pruefwand.selection.getSelected();
  return {
    spec: selected?.userData?.mcbSpec,
    print: selected?.getObjectByName("mcb-print")?.userData?.print,
    name: selected?.userData?.name,
    poles: selected?.userData?.poles,
  };
});

const result = { library, placed, edited, after };
console.log(JSON.stringify(result, null, 2));
const pass =
  library.values.join(",") === "B,16" &&
  library.labels.includes("Charakteristik") &&
  placed.spec?.curve === "C" &&
  placed.spec?.amps === 32 &&
  placed.single.print === "C32 · 1P" &&
  placed.single.ons === 1 &&
  placed.single.poles === 1 &&
  placed.single.dark > 40 &&
  placed.triple.print === "C32 · 3P" &&
  placed.triple.ons === 3 &&
  placed.triple.poles === 3 &&
  placed.triple.te === 3 &&
  placed.triple.dark > 40 &&
  after.spec?.curve === "D" &&
  after.spec?.amps === 20 &&
  after.print === "D20 · 3P" &&
  after.poles === 3;
console.log(JSON.stringify({ pass }));
await browser.close();
process.exit(pass ? 0 : 1);
