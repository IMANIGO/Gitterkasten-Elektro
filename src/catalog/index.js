import { CATALOG_GROUPS, CATALOG_ITEMS, formatItemDims } from "./items.js";

export { CATALOG_GROUPS, CATALOG_ITEMS, formatItemDims } from "./items.js";
export { itemDepthM, itemHeightM, itemWidthM } from "./items.js";

/**
 * Betriebsmittel-Katalog — Gruppen + Artikel mit Maßen.
 */
export const catalog = {
  groups: CATALOG_GROUPS.map((g) => ({
    ...g,
    items: CATALOG_ITEMS.filter((i) => i.group === g.id),
  })),
  items: CATALOG_ITEMS,
  ready: true,
};

export function getCatalog() {
  return catalog;
}

export function getCatalogItem(id) {
  return CATALOG_ITEMS.find((i) => i.id === id) ?? null;
}

export function describeCatalogItem(item) {
  if (!item) return "";
  return `${formatItemDims(item)}${item.placeable ? "" : " · stub"}`;
}
