import { EBOX, EBOX_FLOOR_Y, PANEL_INNER, UV } from "../layout.js";
import { MM, toMm } from "../units.js";
import { poseOnDinRail, poseOnLochblech } from "./snap.js";

const INNER_LEFT = -PANEL_INNER.backW / 2;
const INNER_BOTTOM = EBOX_FLOOR_Y + EBOX.frame;

export const MEASURE_FACES = [
  { id: "back", label: "Rückwand" },
  { id: "left", label: "Seite links" },
  { id: "right", label: "Seite rechts" },
  { id: "floor", label: "Boden" },
  { id: "din", label: "Hutschiene" },
];

export function measureLabels(face) {
  if (face === "floor") return { a: "Von links", b: "Von der Rückwand" };
  if (face === "left" || face === "right") return { a: "Von der Rückwand", b: "Von unten" };
  if (face === "din") return { a: "Mitte von links auf der Schiene", b: null };
  return { a: "Von links", b: "Von unten" };
}

/** Mitte des Bauteils, mm von der Bezugskante, ohne 50-mm-Raster. */
export function poseFromPanelMeasures(face, aMm, bMm, depthM) {
  const a = Number(aMm) * MM;
  const b = Number(bMm) * MM;
  let hit = { x: 0, y: INNER_BOTTOM, z: 0 };
  if (face === "back") hit = { x: INNER_LEFT + a, y: INNER_BOTTOM + b, z: 0 };
  else if (face === "floor") hit = { x: INNER_LEFT + a, y: EBOX_FLOOR_Y, z: b };
  else if (face === "left" || face === "right") hit = { x: 0, y: INNER_BOTTOM + b, z: a };
  else return null;
  const pose = poseOnLochblech(face, hit, depthM, { exact: true });
  if (!pose) return null;
  const labels = measureLabels(face);
  pose.feedback = `${labels.a} ${Math.round(Number(aMm))} mm · ${labels.b} ${Math.round(Number(bMm))} mm`;
  return pose;
}

export function panelMeasuresFromWorld(face, world) {
  if (face === "back") {
    return { a: toMm(world.x - INNER_LEFT), b: toMm(world.y - INNER_BOTTOM) };
  }
  if (face === "floor") {
    return { a: toMm(world.x - INNER_LEFT), b: toMm(world.z) };
  }
  if (face === "left" || face === "right") {
    return { a: toMm(world.z), b: toMm(world.y - INNER_BOTTOM) };
  }
  return { a: 0, b: 0 };
}

export function poseFromDinMeasure(rail, fromLeftMm, item) {
  const railLength = rail?.userData?.railLength || UV.railLength;
  const localX = -railLength / 2 + Number(fromLeftMm) * MM;
  const pose = poseOnDinRail(
    rail,
    { x: localX, y: 0, z: 0 },
    {
      exact: true,
      railLength,
      teWidth: item?.te || 1,
      abutting: !!item?.abutting,
      widthM: item?.abutting ? item.widthMm * MM : 0,
      widthMm: item?.widthMm,
    },
  );
  pose.feedback = `Hutschiene · Mitte ${Math.round(Number(fromLeftMm))} mm von links`;
  return pose;
}

export function dinMeasureFromLocal(localX, railLength = UV.railLength) {
  return toMm(localX - -railLength / 2);
}
