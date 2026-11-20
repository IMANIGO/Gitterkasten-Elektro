import { formatCableSpec } from "../wiring/cableTypes.js";
import { getCatalogItem } from "../catalog/index.js";

/**
 * Aufmaß — Stückliste + Leitungslängen nach Typ/Querschnitt/Adern.
 */
export function createTakeoff({ wiring, getPlacedItems } = {}) {
  function summarize() {
    const wires = wiring?.wires ?? [];
    const laengeMm = wires.reduce((s, r) => s + (r.lengthMm || 0), 0);
    const schellen = wires.reduce((s, r) => s + (r.clamps?.length || 0), 0);
    const placed = getPlacedItems?.() ?? [];

    const byCatalog = new Map();
    for (const p of placed) {
      const id = p.userData?.catalogId || p.userData?.id || "unbekannt";
      byCatalog.set(id, (byCatalog.get(id) || 0) + 1);
    }
    for (const w of wires) {
      byCatalog.set(
        "leitungsschelle",
        (byCatalog.get("leitungsschelle") || 0) + (w.clamps?.length || 0),
      );
    }

    /** Aggregate cable lengths by spec key */
    const byCable = new Map();
    for (const w of wires) {
      const label = w.label || formatCableSpec(w.cableSpec) || "Leitung";
      const prev = byCable.get(label) || { label, lengthMm: 0, count: 0, schellen: 0 };
      prev.lengthMm += w.lengthMm || 0;
      prev.count += 1;
      prev.schellen += w.clamps?.length || 0;
      byCable.set(label, prev);
    }

    const stueckLines = [];
    for (const [id, count] of byCatalog.entries()) {
      if (id === "leitungsschelle") continue;
      const item = getCatalogItem(id);
      stueckLines.push({
        id,
        label: item?.label || id,
        count,
        kind: "teil",
      });
    }
    if (byCatalog.get("leitungsschelle")) {
      stueckLines.push({
        id: "leitungsschelle",
        label: "Leitungsschelle",
        count: byCatalog.get("leitungsschelle"),
        kind: "teil",
      });
    }

    const cableLines = [...byCable.values()].map((c) => ({
      id: c.label,
      label: c.label,
      count: c.count,
      lengthMm: c.lengthMm,
      schellen: c.schellen,
      kind: "leitung",
    }));

    return {
      stueck: stueckLines.reduce((a, l) => a + l.count, 0) + schellen,
      laengeMm,
      schellen,
      byCatalog: Object.fromEntries(byCatalog),
      stueckLines,
      cableLines,
    };
  }

  return {
    items: [],
    get totalLengthMm() {
      return summarize().laengeMm;
    },
    summarize,
  };
}
