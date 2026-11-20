import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
await page.goto("http://127.0.0.1:5173/", { waitUntil: "networkidle" });
await page.waitForFunction(() => window.__pruefwand?.plansApi);

const result = await page.evaluate(() => {
  const pw = window.__pruefwand;
  // Empty live
  let live = pw.plansApi.refreshLive();
  const emptyCount = live.placements.length;

  // Build example into scene
  const m6 = pw.plansApi.getPlan("m6-p01");
  pw.plansApi.build(m6);
  live = pw.plansApi.refreshLive();

  const svg = pw.plansApi.renderAufbau(live);
  const tags = live.placements.map((p) => p.tag);
  const hasUv = live.placements.some((p) => p.catalogId === "uv-3reihen");
  const hasDims = live.placements.some((p) => p.fromLeftCm != null || p.fromBackCm != null);
  const uvKeys = Object.keys(live.uvContents || {});

  return {
    emptyCount,
    liveId: live.id,
    liveFlag: live.live,
    placementCount: live.placements.length,
    tags,
    hasUv,
    hasDims,
    uvInterior: uvKeys.length > 0,
    svgHasLive: svg.includes("Live aus 3D"),
    svgHasTag: tags.length ? svg.includes(tags[0]) : false,
    legendCount: live.legend.length,
    terminalCount: live.terminals.length,
    circuitCount: live.circuits.length,
  };
});

console.log(JSON.stringify(result, null, 2));
const pass =
  result.emptyCount === 0 &&
  result.liveFlag &&
  result.placementCount >= 8 &&
  result.hasUv &&
  result.hasDims &&
  result.svgHasLive &&
  result.svgHasTag;
console.log(JSON.stringify({ pass }));
await browser.close();
process.exit(pass ? 0 : 1);
