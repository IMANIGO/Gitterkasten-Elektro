import { chromium } from "playwright";
import { CATALOG_ITEMS } from "../src/catalog/items.js";
import { rankCatalogItems } from "../src/catalog/search.js";

function ids(query) {
  return rankCatalogItems(CATALOG_ITEMS, query).map((entry) => entry.item.id);
}

const kreuz = ids("kreuz");
const typo = ids("kreutz");
const mixed = ids("kreuz taster");
const junk = ids("xyzqwerty");

const unit = {
  kreuzHasSimple: kreuz.includes("schalter-kreuz"),
  kreuzHasCombo: kreuz.includes("serie-kreuz-wechsel") && kreuz.includes("serie-kreuz-taster"),
  kreuzSkipsPlainTaster: !kreuz.includes("taster"),
  typoSame: typo.includes("schalter-kreuz") && typo.includes("serie-kreuz-taster"),
  mixedIsCombo: mixed.includes("serie-kreuz-taster") && !mixed.includes("schalter-kreuz"),
  junkEmpty: junk.length === 0,
};
console.log(JSON.stringify(unit, null, 2));

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto("http://127.0.0.1:5173/", { waitUntil: "networkidle" });
await page.keyboard.press("b");
await page.waitForSelector("#library-query");

async function visibleIds() {
  return page.evaluate(() =>
    [...document.querySelectorAll("#library-body .catalog-item")].map((el) => el.dataset.catalogId),
  );
}

await page.fill("#library-query", "kreutz");
await page.waitForTimeout(50);
const typed = await visibleIds();
await page.fill("#library-query", "kreuz taster");
await page.waitForTimeout(50);
const both = await visibleIds();
await page.fill("#library-query", "");
await page.waitForTimeout(50);
const all = await visibleIds();
await page.fill("#library-query", "xyzqwerty");
await page.waitForTimeout(50);
const empty = await page.locator(".library-empty").textContent();

const ui = {
  typed,
  both,
  allCount: all.length,
  empty,
};
console.log(JSON.stringify(ui, null, 2));

const pass =
  unit.kreuzHasSimple &&
  unit.kreuzHasCombo &&
  unit.kreuzSkipsPlainTaster &&
  unit.typoSame &&
  unit.mixedIsCombo &&
  unit.junkEmpty &&
  typed.includes("schalter-kreuz") &&
  typed.includes("serie-kreuz-taster") &&
  typed.includes("serie-kreuz-wechsel") &&
  !typed.includes("taster") &&
  both.includes("serie-kreuz-taster") &&
  !both.includes("schalter-kreuz") &&
  all.length > typed.length &&
  empty === "Nichts gefunden";
console.log(JSON.stringify({ pass }));
await browser.close();
process.exit(pass ? 0 : 1);
