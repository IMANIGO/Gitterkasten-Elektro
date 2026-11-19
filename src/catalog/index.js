/**
 * Betriebsmittel catalog — structure only in this increment.
 * Later: LS, FI/RCD, Schütze, Steckdosen, placed on TE / 50 mm grid.
 */
export const catalog = {
  groups: [
    { id: "schutzorgane", label: "Schutzorgane", items: [] },
    { id: "klemmen", label: "Klemmen", items: [] },
    { id: "installationsgeraete", label: "Installationsgeräte", items: [] },
  ],
  ready: false,
};

export function getCatalog() {
  return catalog;
}
