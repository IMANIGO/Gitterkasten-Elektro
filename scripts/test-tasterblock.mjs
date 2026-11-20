import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto("http://127.0.0.1:5173/", { waitUntil: "networkidle" });
await page.waitForFunction(() => window.__pruefwand?.selection);

await page.keyboard.press("b");
await page.click('[data-catalog-id="tasterblock-4"]');
await page.waitForSelector("#station-setup select");

const library = await page.evaluate(() => {
  const selects = [...document.querySelectorAll("#station-setup select")];
  return {
    count: selects.length,
    labels: selects.map((s) => s.options[s.selectedIndex]?.textContent),
    hasLeer: selects[0].innerHTML.includes("Leer"),
    hasZu: selects[0].innerHTML.includes("Zu"),
    hasLampe: selects[0].innerHTML.includes("Lampe"),
    hasTaster: selects[0].innerHTML.includes("Taster"),
  };
});

const setup = page.locator("#station-setup select");
await setup.nth(0).selectOption("leer");
await setup.nth(1).selectOption("zu");
await setup.nth(2).selectOption("lampe:rot");
await setup.nth(3).selectOption("taster:blau");

const placed = await page.evaluate(async () => {
  const pw = window.__pruefwand;
  const { createFromFactory } = await import("/src/models/factories.js");
  const slots = [...document.querySelectorAll("#station-setup select")].map((s) => s.value);
  const object = createFromFactory("controlStation", { slots });
  object.userData.placed = true;
  object.position.set(0.15, 0.55, 0.35);
  pw.placedRoot.add(object);
  pw.selection.selectObject(object);
  const live = pw.plansApi.refreshLive();
  const hit = live.placements.find((p) => p.catalogId === "tasterblock-4");
  const legend = (live.legend || []).find((l) => l.catalogId === "tasterblock-4");
  const svg = pw.plansApi.renderAufbau(live);
  return {
    slots: object.userData.slots,
    meta: object.userData.meta,
    inserts: object.getObjectByName("station-inserts")?.children.length || 0,
    tag: hit?.tag || null,
    symbol: legend?.symbol || null,
    svgGlyph: svg.includes("tasterblock") || (legend?.symbol === "tasterblock" && svg.includes(hit?.tag || "___")),
    selectedLabel: pw.state.selectedLabel,
  };
});

await page.waitForSelector("#station-edit select");
await page.locator("#station-edit select").nth(0).selectOption("lampe:gelb");

const edited = await page.evaluate(() => {
  const pw = window.__pruefwand;
  const selected = pw.selection.getSelected();
  return {
    slots: selected?.userData?.slots || null,
    editValues: [...document.querySelectorAll("#station-edit select")].map((s) => s.value),
  };
});

const result = { library, placed, edited };
console.log(JSON.stringify(result, null, 2));
const pass =
  library.count === 4 &&
  library.hasLeer &&
  library.hasZu &&
  library.hasLampe &&
  library.hasTaster &&
  placed.slots?.join(",") === "leer,zu,lampe:rot,taster:blau" &&
  placed.inserts >= 8 &&
  placed.symbol === "tasterblock" &&
  String(placed.tag || "").startsWith("TB") &&
  edited.slots?.[0] === "lampe:gelb" &&
  edited.editValues[0] === "lampe:gelb";
console.log(JSON.stringify({ pass }));
await browser.close();
process.exit(pass ? 0 : 1);
