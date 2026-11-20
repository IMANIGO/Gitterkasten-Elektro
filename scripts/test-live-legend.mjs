import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto("http://127.0.0.1:5173/", { waitUntil: "networkidle" });
await page.waitForFunction(() => window.__pruefwand?.plansApi);

const result = await page.evaluate(async () => {
  const pw = window.__pruefwand;
  const { CABLE_TYPES } = await import("/src/wiring/cableTypes.js");
  const { getCatalogItem } = await import("/src/catalog/index.js");
  const ids = CABLE_TYPES.map((t) => t.id);
  pw.plansApi.build(pw.plansApi.getPlan("m6-p01"));
  const live = pw.plansApi.refreshLive();
  const svg = pw.plansApi.renderAufbau(live);
  const tags = live.placements.map((p) => p.tag);
  const legendTags = (live.legend || []).map((l) => l.tag);
  return {
    types: ids,
    hasNymO: ids.includes("nym-o"),
    hasRn: ids.includes("h07rn-f"),
    noStop: !getCatalogItem("taster-stop"),
    hasKreuz: !!getCatalogItem("schalter-kreuz"),
    hasSerie: !!getCatalogItem("serie-wechsel-taster"),
    tasterSymbol: getCatalogItem("taster")?.symbol,
    legendMatches: tags.every((t) => legendTags.includes(t)),
    svgLegend: svg.includes("LEGENDE") && svg.includes("live"),
    svgHasTag: tags[0] ? svg.includes(tags[0]) : false,
    legendCount: legendTags.length,
  };
});
console.log(JSON.stringify(result, null, 2));
const pass =
  !result.hasNymO &&
  result.hasRn &&
  result.noStop &&
  result.hasKreuz &&
  result.hasSerie &&
  result.tasterSymbol === "taster" &&
  result.legendMatches &&
  result.svgLegend;
console.log(JSON.stringify({ pass }));
await browser.close();
process.exit(pass ? 0 : 1);
