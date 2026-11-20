import { chromium } from "playwright";
import { UV } from "../src/layout.js";
import { nearestFreeDinX } from "../src/placement/snap.js";
import { TE } from "../src/units.js";

const rail = UV.railLength;
const spans = [
  { left: -rail / 2, right: -rail / 2 + 4 * TE },
  { left: -rail / 2 + 4 * TE, right: -rail / 2 + 7 * TE },
];
const next = nearestFreeDinX(-rail / 2, TE, rail, spans, false);
const blocked = nearestFreeDinX(0, 12 * TE, rail, [{ left: -rail / 2, right: rail / 2 }], false);
const unit = {
  te: UV.te,
  widthMm: Math.round(UV.outerW * 1000),
  heightMm: Math.round(UV.outerH * 1000),
  nextIndex: next?.index,
  full: blocked == null,
};
console.log(JSON.stringify({ unit }));

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto("http://127.0.0.1:5173/", { waitUntil: "networkidle" });
const scene = await page.evaluate(async () => {
  const board = await import("/src/models/distributionBoard.js");
  const mount = await import("/src/placement/mountOnUv.js");
  const uv = board.createDistributionBoard();
  const rails = mount.getUvRails(uv);
  const names = new Set();
  uv.traverse((object) => {
    if (object.name) names.add(object.name);
  });
  const lineup = mount.mountDemoProtectionLineup(uv);
  const rows = rails.map((rail) =>
    rail.children
      .filter((child) => child.userData?.placed)
      .map((child) => ({
        id: child.userData.catalogId,
        x: Math.round(child.position.x * 1000),
      })),
  );
  return {
    capacity: rails.map((rail) => rail.userData.teCapacity),
    hasDoor: names.has("Tuer"),
    hasCover: names.has("Geraeteabdeckung"),
    hasField: names.has("Klemmenfeld"),
    lineup: lineup.length,
    rows,
  };
});
console.log(JSON.stringify(scene, null, 2));

function overlaps(row) {
  const items = [...row].sort((a, b) => a.x - b.x);
  for (let i = 1; i < items.length; i += 1) {
    if (items[i].x <= items[i - 1].x) return true;
  }
  return false;
}

const pass =
  unit.te === 12 &&
  unit.widthMm === 305 &&
  unit.nextIndex === 7 &&
  unit.full &&
  scene.capacity.join(",") === "12,12,12" &&
  scene.hasDoor &&
  scene.hasCover &&
  scene.hasField &&
  scene.lineup === 20 &&
  scene.rows[1].some((item) => item.id === "fi-4p") &&
  scene.rows[1].filter((item) => item.id === "ls-1p").length === 5 &&
  scene.rows[2].filter((item) => item.id === "ls-1p").length === 8 &&
  scene.rows.every((row) => !overlaps(row));

console.log(JSON.stringify({ pass }));
await browser.close();
process.exit(pass ? 0 : 1);
