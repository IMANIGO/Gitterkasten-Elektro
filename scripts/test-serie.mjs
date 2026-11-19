import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const outDir = "/cursor/stores/bc-2687ee42-9b39-41c1-ab88-5a37f790d724/media";
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto("http://127.0.0.1:5173/", { waitUntil: "networkidle" });
await page.waitForFunction(() => window.__pruefwand?.scene);

const result = await page.evaluate(async () => {
  const pw = window.__pruefwand;
  const { createFromFactory } = await import("/src/models/factories.js");
  const mix = createFromFactory("seriesWechselTaster");
  const pair = createFromFactory("seriesAusAus");
  mix.position.set(-0.02, 1.12, 1.02);
  pair.position.set(0.2, 1.12, 1.0);
  mix.rotation.y = 0.35;
  pair.rotation.y = -0.2;
  pw.scene.add(mix, pair);
  pw.camera.position.set(0.12, 1.28, 1.28);
  pw.controls.target.set(0.08, 1.14, 1.0);
  pw.controls.update();

  function rockerWidths(object) {
    const widths = [];
    object.traverse((c) => {
      if (c.isMesh && c.geometry?.type === "BoxGeometry") {
        const w = c.geometry.parameters.width;
        const h = c.geometry.parameters.height;
        if (w > 0.05 && w < 0.08 && h > 0.05) widths.push(Math.round(w * 1000));
      }
    });
    return widths;
  }

  return {
    mix: {
      rockers: mix.userData.rockers,
      widthMm: mix.userData.widthMm,
      plates: mix.children.filter((c) => c.material?.map).length,
      rockerMm: rockerWidths(mix),
    },
    pair: {
      rockers: pair.userData.rockers,
      plates: pair.children.filter((c) => c.material?.map).length,
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
await page.waitForTimeout(300);
await page.screenshot({ path: `${outDir}/serie-kombination.png` });
console.log(JSON.stringify(result, null, 2));
const pass =
  result.mix.rockers.join(",") === "wechsel,taster" &&
  result.mix.widthMm === 151 &&
  result.mix.plates === 2 &&
  result.mix.rockerMm.includes(64) &&
  result.pair.rockers.join(",") === "aus,aus" &&
  result.pair.plates === 2;
console.log(JSON.stringify({ pass }));
await browser.close();
process.exit(pass ? 0 : 1);
