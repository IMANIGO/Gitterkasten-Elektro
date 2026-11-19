/**
 * Aufmaß — empty totals this increment.
 * Later: Leitungslängen, Stückliste, Prüfungsprotokoll.
 */
export function createTakeoff() {
  return {
    items: [],
    totalLengthMm: 0,
    summarize() {
      return { stueck: 0, laengeMm: 0 };
    },
  };
}
