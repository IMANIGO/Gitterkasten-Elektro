import { createFromFactory } from "../models/factories.js";
import { getCatalogItem } from "../catalog/index.js";
import { poseOnDinRail } from "./snap.js";
import { MM, TE } from "../units.js";

/**
 * Collect DIN rail groups inside a UV (top row first).
 */
export function getUvRails(uvRoot) {
  const rails = [];
  uvRoot.traverse((o) => {
    if (o.userData?.mount === "din") rails.push(o);
  });
  rails.sort((a, b) => b.position.y - a.position.y);
  return rails;
}

/**
 * Mount a catalog DIN/terminal device onto a UV rail at a TE / abutting index.
 * @returns {THREE.Object3D|null}
 */
export function mountCatalogOnUvRail(uvRoot, catalogId, { row = 0, teIndex = 0 } = {}) {
  const item = getCatalogItem(catalogId);
  if (!item?.placeable || !item.factory) return null;
  const rails = getUvRails(uvRoot);
  const rail = rails[row];
  if (!rail) return null;

  const object = createFromFactory(item.factory);
  if (!object) return null;

  const widthM = item.abutting && item.widthMm ? item.widthMm * MM : (item.te || 1) * 18 * MM;
  // Approximate local X from TE index (left-origin)
  const half = widthM / 2;
  const railHalf = rail.userData.railLength / 2;
  const step = item.abutting ? widthM : TE;
  const localX = -railHalf + half + teIndex * step;

  const spans = [];
  for (const child of rail.children) {
    if (!child.userData?.catalogId || !child.userData?.placed) continue;
    const placed = getCatalogItem(child.userData.catalogId);
    const spanW = placed?.abutting && placed.widthMm ? placed.widthMm * MM : (placed?.te || 1) * TE;
    spans.push({ left: child.position.x - spanW / 2, right: child.position.x + spanW / 2 });
  }
  const pose = poseOnDinRail(rail, { x: localX, y: 0, z: 0 }, item.abutting
    ? { abutting: true, widthM, widthMm: item.widthMm, railLength: rail.userData?.railLength, spans }
    : { teWidth: item.te || 1, railLength: rail.userData?.railLength, spans });
  if (!pose) return null;

  pose.parent.add(object);
  object.position.set(pose.position.x, pose.position.y, pose.position.z);
  object.rotation.set(pose.rotation.x, pose.rotation.y, pose.rotation.z);
  object.userData.placed = true;
  object.userData.selectable = true;
  object.userData.catalogId = item.id;
  object.userData.placement = {
    mount: pose.mount,
    face: pose.face,
    teIndex: pose.teIndex,
    abutting: pose.abutting,
    feedback: pose.feedback,
  };
  return object;
}

/**
 * Typical protection lineup for visual / training demos (markenneutral silhouettes).
 */
export function mountDemoProtectionLineup(uvRoot) {
  const mounted = [];
  const lineup = [
    { catalogId: "reihenklemme-l", row: 0, teIndex: 0 },
    { catalogId: "reihenklemme-l", row: 0, teIndex: 1 },
    { catalogId: "reihenklemme-n", row: 0, teIndex: 2 },
    { catalogId: "reihenklemme-pe", row: 0, teIndex: 3 },
    { catalogId: "fi-4p", row: 1, teIndex: 0 },
    { catalogId: "ls-3p", row: 1, teIndex: 4 },
    { catalogId: "ls-1p", row: 1, teIndex: 7 },
    { catalogId: "ls-1p", row: 1, teIndex: 8 },
    { catalogId: "ls-1p", row: 1, teIndex: 9 },
    { catalogId: "ls-1p", row: 1, teIndex: 10 },
    { catalogId: "ls-1p", row: 1, teIndex: 11 },
    { catalogId: "fi-4p", row: 2, teIndex: 0 },
    { catalogId: "ls-1p", row: 2, teIndex: 4 },
    { catalogId: "ls-1p", row: 2, teIndex: 5 },
    { catalogId: "ls-1p", row: 2, teIndex: 6 },
    { catalogId: "ls-1p", row: 2, teIndex: 7 },
    { catalogId: "ls-1p", row: 2, teIndex: 8 },
    { catalogId: "ls-1p", row: 2, teIndex: 9 },
    { catalogId: "ls-1p", row: 2, teIndex: 10 },
    { catalogId: "ls-1p", row: 2, teIndex: 11 },
  ];
  for (const entry of lineup) {
    const o = mountCatalogOnUvRail(uvRoot, entry.catalogId, entry);
    if (o) {
      o.userData.fromPlan = true;
      mounted.push(o);
    }
  }
  return mounted;
}
