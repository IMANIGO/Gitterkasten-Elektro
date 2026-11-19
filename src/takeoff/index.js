/**
 * Aufmaß — Leitungslängen + Stückliste (erweiterbar).
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
      byCatalog.set("leitungsschelle", (byCatalog.get("leitungsschelle") || 0) + (w.clamps?.length || 0));
    }
    return {
      stueck: [...byCatalog.values()].reduce((a, b) => a + b, 0),
      laengeMm,
      schellen,
      byCatalog: Object.fromEntries(byCatalog),
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
