import {
  EBOX,
  EBOX_FLOOR_Y,
  PANEL_INNER,
  UV,
} from "../layout.js";
import { GRID_PITCH, MM, TE, toMm } from "../units.js";

/**
 * Snap a world coordinate to the 50 mm Lochblech raster.
 * @param {number} value metres
 * @param {number} [origin] local origin for the axis
 */
export function snapToGrid(value, origin = 0) {
  const rel = value - origin;
  const snapped = Math.round(rel / GRID_PITCH) * GRID_PITCH;
  return origin + snapped;
}

/** Snap to TE (18 mm) along a DIN rail local X. */
export function snapToTe(localX, teWidth = 1, railLength = UV.railLength) {
  const half = (teWidth * TE) / 2;
  const railHalf = railLength / 2;
  const min = -railHalf + half;
  const max = railHalf - half;
  const stepped = Math.round(localX / TE) * TE;
  return Math.min(max, Math.max(min, stepped));
}

/**
 * Snap to abutting module width (e.g. 5,2 mm Federkraftklemmen) — no gap between neighbors.
 * Centers land on halfWidth + n * width so side faces touch.
 */
export function snapToAbutting(localX, widthM, railLength = UV.railLength) {
  const railHalf = railLength / 2;
  const half = widthM / 2;
  const min = -railHalf + half;
  const max = railHalf - half;
  const origin = -railHalf + half;
  const index = Math.round((localX - origin) / widthM);
  const stepped = origin + index * widthM;
  return Math.min(max, Math.max(min, stepped));
}

export function formatSnapFeedback({ face, xMm, yMm, zMm, teIndex, teWidth, mount, widthMm, abutting, exact }) {
  if (mount === "din" && abutting && widthMm != null) {
    return `Hutschiene · bündig ${widthMm} mm · Pos. ${teIndex != null ? teIndex + 1 : "–"}`;
  }
  if (mount === "din" && teIndex != null) {
    return `Hutschiene · TE ${teIndex + 1}${teWidth > 1 ? `–${teIndex + teWidth}` : ""} · ${teWidth} TE`;
  }
  const parts = [];
  if (face) parts.push(faceLabel(face));
  if (xMm != null) parts.push(`X ${xMm} mm`);
  if (yMm != null) parts.push(`Y ${yMm} mm`);
  if (zMm != null) parts.push(`Z ${zMm} mm`);
  if (!exact) parts.push("Raster 50 mm");
  return parts.join(" · ");
}

function faceLabel(face) {
  switch (face) {
    case "back":
      return "Rückwand";
    case "floor":
      return "Boden";
    case "left":
      return "Seite links";
    case "right":
      return "Seite rechts";
    default:
      return face;
  }
}

/**
 * Gap that keeps a back-face mesh (local z = 0) off the Lochblech.
 * One millimetre avoids z-fighting without a visible float.
 */
export const LOCHBLECH_FLUSH_GAP = MM;

/**
 * Unterverteilung only: the housing is centered, so the back face is at
 * local z = -depth/2. Other Lochblech devices are seated as back-face
 * meshes (local z = 0).
 */
export function isCenteredDistributionBoard(hint = {}, depthM) {
  if (
    hint.catalogId === "uv-3reihen" ||
    hint.factory === "distributionBoard" ||
    hint.kind === "distributionBoard"
  ) {
    return true;
  }
  if (hint.catalogId || hint.factory || hint.kind) return false;
  // Measure placement still forwards only a depth. That depth is unique to the UV.
  if (typeof depthM !== "number") return false;
  return Math.round(depthM / MM) === Math.round(UV.outerD / MM);
}

/**
 * Offset from the panel face to the mesh origin.
 * Back-face devices sit on LOCHBLECH_FLUSH_GAP. The centered UV keeps depth/2
 * so its back lands on the panel instead of sinking or floating an extra half.
 */
export function lochblechStandoff(depthM, hint = {}) {
  if (isCenteredDistributionBoard(hint, depthM)) return depthM / 2;
  return LOCHBLECH_FLUSH_GAP;
}

/**
 * Place a Lochblech-mounted object so its back sits on the face.
 * Object local: +Z is "front"/open; footprint centered on XY.
 * Pass catalogId, factory, or kind when known. Without them, a depth equal
 * to the UV catalog depth still selects the centered housing.
 */
export function poseOnLochblech(face, hitPoint, itemDepthM, { exact = false, catalogId, factory, kind } = {}) {
  const standoff = lochblechStandoff(itemDepthM, { catalogId, factory, kind });
  const T = EBOX.panelThickness;
  const use = (value, origin) => (exact ? value : snapToGrid(value, origin));

  if (face === "back") {
    const x = use(hitPoint.x, 0);
    const y = use(hitPoint.y, EBOX_FLOOR_Y + EBOX.frame);
    const z = T + standoff;
    return {
      position: { x, y, z },
      rotation: { x: 0, y: 0, z: 0 },
      feedback: formatSnapFeedback({
        face,
        xMm: toMm(x),
        yMm: toMm(y - EBOX_FLOOR_Y),
        mount: "lochblech",
        exact,
      }),
      face,
      mount: "lochblech",
    };
  }

  if (face === "floor") {
    const x = use(hitPoint.x, 0);
    const z = use(hitPoint.z, 0);
    const y = EBOX_FLOOR_Y + T + standoff;
    return {
      position: { x, y, z },
      // Lay flat: local +Z becomes +Y (standing up from floor would need different).
      // For floor-mounted AP devices we keep upright facing +Z (into box).
      rotation: { x: -Math.PI / 2, y: 0, z: 0 },
      feedback: formatSnapFeedback({
        face,
        xMm: toMm(x),
        zMm: toMm(z),
        mount: "lochblech",
        exact,
      }),
      face,
      mount: "lochblech",
    };
  }

  if (face === "left") {
    const z = use(hitPoint.z, 0);
    const y = use(hitPoint.y, EBOX_FLOOR_Y + EBOX.frame);
    const x = -EBOX.width / 2 + T + standoff;
    return {
      position: { x, y, z },
      rotation: { x: 0, y: Math.PI / 2, z: 0 },
      feedback: formatSnapFeedback({
        face,
        zMm: toMm(z),
        yMm: toMm(y - EBOX_FLOOR_Y),
        mount: "lochblech",
        exact,
      }),
      face,
      mount: "lochblech",
    };
  }

  if (face === "right") {
    const z = use(hitPoint.z, 0);
    const y = use(hitPoint.y, EBOX_FLOOR_Y + EBOX.frame);
    const x = EBOX.width / 2 - T - standoff;
    return {
      position: { x, y, z },
      rotation: { x: 0, y: -Math.PI / 2, z: 0 },
      feedback: formatSnapFeedback({
        face,
        zMm: toMm(z),
        yMm: toMm(y - EBOX_FLOOR_Y),
        mount: "lochblech",
        exact,
      }),
      face,
      mount: "lochblech",
    };
  }

  return null;
}

function dinSpanBlocked(center, widthM, spans) {
  const left = center - widthM / 2;
  const right = center + widthM / 2;
  return spans.some((span) => left < span.right - 0.3 * MM && right > span.left + 0.3 * MM);
}

/** Nächster freier Modulplatz auf der Schiene. `null`, wenn die Reihe voll ist. */
export function nearestFreeDinX(localX, widthM, railLength, spans, abutting = false) {
  const railHalf = railLength / 2;
  const step = abutting ? widthM : TE;
  const origin = -railHalf + widthM / 2;
  const maxIndex = Math.max(0, Math.floor((railLength - widthM) / step + 1e-4));
  let best = null;
  for (let index = 0; index <= maxIndex; index += 1) {
    const x = origin + index * step;
    if (dinSpanBlocked(x, widthM, spans)) continue;
    const dist = Math.abs(x - localX);
    if (!best || dist < best.dist) best = { x, index, dist };
  }
  return best;
}

/**
 * Rail-local seat shared by every DIN device (drop, measure, and plan).
 * Y keeps the 90 mm body on the cover slot (slot centre is 50 mm above the rail).
 * Z puts the modular face (local +36.3 mm) on the cover's inner plane, 65.15 mm
 * ahead of the rail back, so the clip and foot meet the hat lip instead of
 * passing through the rail or floating in front of it.
 */
export const DIN_RAIL_MOUNT_Y = 6 * MM;
export const DIN_RAIL_MOUNT_Z = 28.85 * MM;

/**
 * Pose a DIN device on a rail group (local coords of rail).
 * @param {THREE.Object3D} railGroup
 * @param {THREE.Vector3} localPoint point in rail local space
 * @param {{ teWidth?: number, widthM?: number, widthMm?: number, abutting?: boolean }} opts
 */
export function poseOnDinRail(railGroup, localPoint, opts = {}) {
  const teWidth = typeof opts === "number" ? opts : opts.teWidth || 1;
  const abutting = typeof opts === "object" && opts.abutting && opts.widthM > 0;
  const widthM = abutting ? opts.widthM : teWidth * TE;
  const half = widthM / 2;
  const railLength = opts.railLength || UV.railLength;
  const railHalf = railLength / 2;
  const min = -railHalf + half;
  const max = railHalf - half;
  const raw = abutting
    ? snapToAbutting(localPoint.x, widthM, railLength)
    : snapToTe(localPoint.x, teWidth, railLength);
  const clamped = Math.min(max, Math.max(min, localPoint.x));
  const spans = Array.isArray(opts.spans) ? opts.spans : null;
  let x = opts.exact ? clamped : raw;
  let teIndex = Math.max(0, Math.round((x - (-railHalf + half)) / (abutting ? widthM : TE)));
  if (spans) {
    const exactFree = opts.exact && !dinSpanBlocked(x, widthM, spans);
    if (!exactFree) {
      const free = nearestFreeDinX(opts.exact ? clamped : raw, widthM, railLength, spans, abutting);
      if (!free) return null;
      x = free.x;
      teIndex = free.index;
    }
  }

  return {
    position: { x, y: DIN_RAIL_MOUNT_Y, z: DIN_RAIL_MOUNT_Z },
    rotation: { x: 0, y: 0, z: 0 },
    parent: railGroup,
    feedback: formatSnapFeedback({
      mount: "din",
      teIndex,
      teWidth: abutting ? null : teWidth,
      widthMm: abutting ? opts.widthMm ?? toMm(widthM) : null,
      abutting: !!abutting,
    }),
    face: "din",
    mount: "din",
    teIndex,
    teWidth: abutting ? null : teWidth,
    widthM,
    abutting: !!abutting,
  };
}

export function clampInsidePanel(face, x, y, z, halfW, halfH) {
  // Soft bounds — leave as-is for now; snap already keeps near grid.
  void face;
  void halfW;
  void halfH;
  return { x, y, z };
}

export { PANEL_INNER, GRID_PITCH, TE, toMm };
