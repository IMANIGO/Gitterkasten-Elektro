import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto("http://127.0.0.1:5173/", { waitUntil: "networkidle" });
await page.keyboard.press("b");
await page.waitForSelector("#library-view");

await page.waitForFunction(
  () => [...document.querySelectorAll(".item-thumb")].filter((img) => img.getAttribute("src")).length >= 8,
  null,
  { timeout: 20000 },
);

const list = await page.evaluate(() => {
  const item = document.querySelector('[data-catalog-id="cee-16a"]');
  const label = item?.querySelector(".item-label");
  const style = label ? getComputedStyle(label) : null;
  return {
    view: document.querySelector("#library-view button.active")?.textContent,
    tiles: document.getElementById("library-body").classList.contains("tiles"),
    thumbs: [...document.querySelectorAll(".item-thumb")].filter((img) => img.src.startsWith("data:image")).length,
    labelVisible: style ? style.display !== "none" : false,
    label: label?.textContent,
  };
});

await page.click("#library-view [data-library-view='tiles']");
await page.waitForTimeout(50);
const tile = await page.evaluate(() => {
  const item = document.querySelector('[data-catalog-id="schalter-aus"]');
  const copy = item.querySelector(".item-copy");
  return {
    tiles: document.getElementById("library-body").classList.contains("tiles"),
    copyHidden: getComputedStyle(copy).display === "none",
    onlyThumb: item.querySelector(".item-thumb") != null,
  };
});
await page.hover('[data-catalog-id="schalter-aus"]');
await page.waitForTimeout(40);
const hovered = await page.evaluate(() => {
  const item = document.querySelector('[data-catalog-id="schalter-aus"]');
  const copy = item.querySelector(".item-copy");
  return {
    shown: getComputedStyle(copy).display !== "none",
    text: copy.innerText.replace(/\s+/g, " ").trim(),
  };
});

console.log(JSON.stringify({ list, tile, hovered }, null, 2));
const pass =
  list.view === "Liste" &&
  !list.tiles &&
  list.thumbs >= 8 &&
  list.labelVisible &&
  list.label.includes("CEE") &&
  tile.tiles &&
  tile.copyHidden &&
  hovered.shown &&
  hovered.text.includes("Ausschalter");
console.log(JSON.stringify({ pass }));
await browser.close();
process.exit(pass ? 0 : 1);
