import {
  CATALOG_FOLDERS,
  CATALOG_GROUPS,
  CATALOG_ITEMS,
  formatItemDims,
  itemFolderId,
} from "./items.js";

export { CATALOG_FOLDERS, CATALOG_GROUPS, CATALOG_ITEMS, formatItemDims, itemFolderId } from "./items.js";
export { itemDepthM, itemHeightM, itemWidthM } from "./items.js";

function groupsForFolder(folder) {
  const byId = new Map(CATALOG_GROUPS.map((group) => [group.id, group]));
  const orderedIds = [...(folder.groupIds || [])];
  for (const group of CATALOG_GROUPS) {
    if (!orderedIds.includes(group.id)) orderedIds.push(group.id);
  }
  return orderedIds
    .map((id) => byId.get(id))
    .filter(Boolean)
    .map((group) => ({
      ...group,
      items: CATALOG_ITEMS.filter(
        (item) => item.group === group.id && itemFolderId(item) === folder.id,
      ),
    }))
    .filter((group) => group.items.length > 0);
}

/**
 * Betriebsmittel-Katalog — Ordner, Gruppen und Artikel mit Maßen.
 */
export const catalog = {
  folders: CATALOG_FOLDERS.map((folder) => ({
    id: folder.id,
    label: folder.label,
    groups: groupsForFolder(folder),
  })),
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
