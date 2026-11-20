import { symbolForCatalog, symbolOps, symbolSvg } from "../src/catalog/symbols.js";
import { CATALOG_ITEMS } from "../src/catalog/items.js";

function count(kind, op) {
  return symbolOps(kind).filter((item) => item.op === op).length;
}

const checks = {
  tasterCircles: count("taster", "circle") === 2 && count("taster", "line") === 0,
  ausNose: count("aus", "circle") === 1 && count("aus", "line") >= 2,
  aus2More: count("aus2", "line") === count("aus", "line") + 1,
  wechselFork: count("wechsel", "line") >= 3 && count("wechsel", "circle") === 1,
  kreuzFill: symbolOps("kreuz").some((op) => op.op === "circle" && op.fill),
  serieV: count("serieV", "circle") === 1 && count("serieV", "line") === 2,
  dimmerSlash: count("dimmer", "line") === count("aus", "line") + 1,
  tasterLichtX: count("taster-licht", "circle") === 1 && count("taster-licht", "line") === 2,
  lampeX: count("lampe", "line") === 2,
  dose: symbolOps("dose").some((op) => op.fill),
  stromstoss: count("stromstoss", "rect") === 1 && count("stromstoss", "polyline") === 1,
  daemmerung: symbolOps("daemmerung").some((op) => op.text === "LX"),
  svgTaster: symbolSvg("taster", 10, 10, 16).includes("<circle") && !symbolSvg("taster", 10, 10, 16).includes("<line"),
  map: [
    ["schalter-aus", "aus"],
    ["schalter-aus-2p", "aus2"],
    ["schalter", "wechsel"],
    ["schalter-kreuz", "kreuz"],
    ["schalter-serie", "serieV"],
    ["dimmer", "dimmer"],
    ["taster", "taster"],
    ["taster-leucht", "taster-licht"],
    ["stromstoss", "stromstoss"],
    ["daemmerung", "daemmerung"],
    ["leuchte", "lampe"],
    ["abzweigdose", "dose"],
    ["serie-aus-aus", "serie"],
  ].every(([id, symbol]) => symbolForCatalog(id) === symbol),
};

const missing = [
  "schalter-aus-2p",
  "schalter-serie",
  "dimmer",
  "taster-leucht",
  "stromstoss",
  "daemmerung",
].filter((id) => !CATALOG_ITEMS.some((item) => item.id === id && item.factory));

const pass = Object.values(checks).every(Boolean) && missing.length === 0;
console.log(JSON.stringify({ pass, checks, missing }, null, 2));
process.exit(pass ? 0 : 1);
