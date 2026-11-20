import { EBOX, EBOX_FLOOR_Y, PANEL_INNER, UV } from "../layout.js";
import { MM, TE, toMm } from "../units.js";
import { poseOnDinRail, poseOnLochblech } from "./snap.js";
import { railLabel, railLetter } from "./uvRails.js";

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
  if (face === "din") return { a: "Erste Teilungseinheit (TE)", b: null };
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

/**
 * Place a DIN device by 1-based TE start index (left edge of the module).
 * Abutting terminals keep the same index scale as modular TE slots.
 */
export function poseFromDinTe(rail, teStart, item) {
  const railLength = rail?.userData?.railLength || UV.railLength;
  const teWidth = item?.abutting ? 1 : item?.te || 1;
  const widthM = item?.abutting && item.widthMm ? item.widthMm * MM : teWidth * TE;
  const half = widthM / 2;
  const index = Math.max(0, Math.round(Number(teStart) || 1) - 1);
  const localX = -railLength / 2 + half + index * (item?.abutting ? widthM : TE);
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
  if (!pose) return null;
  const letter = railLetter(rail?.userData?.rowIndex);
  const start = (pose.teIndex ?? index) + 1;
  const widthTe = item?.abutting ? null : item?.te || 1;
  pose.feedback = item?.abutting
    ? `${railLabel(rail?.userData?.rowIndex)} · Pos. ${start}`
    : `${railLabel(rail?.userData?.rowIndex)} · TE ${start}${
        widthTe > 1 ? `–${start + widthTe - 1}` : ""
      } · ${widthTe} TE`;
  pose.railLetter = letter;
  return pose;
}

/** @deprecated Use poseFromDinTe — kept for older tests that spoke millimetres. */
export function poseFromDinMeasure(rail, fromLeftMm, item) {
  const railLength = rail?.userData?.railLength || UV.railLength;
  const widthM = item?.abutting && item.widthMm ? item.widthMm * MM : (item?.te || 1) * TE;
  const teStart = Math.round((Number(fromLeftMm) * MM - widthM / 2) / TE) + 1;
  return poseFromDinTe(rail, teStart, item);
}

export function dinTeFromLocal(localX, item, railLength = UV.railLength) {
  const widthM = item?.abutting && item.widthMm ? item.widthMm * MM : (item?.te || 1) * TE;
  const half = widthM / 2;
  const step = item?.abutting ? widthM : TE;
  return Math.max(1, Math.round((localX - (-railLength / 2 + half)) / step) + 1);
}

export function dinMeasureFromLocal(localX, railLength = UV.railLength) {
  return toMm(localX - -railLength / 2);
}
