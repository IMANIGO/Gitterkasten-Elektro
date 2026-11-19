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
export function snapToTe(localX, teWidth = 1) {
  const half = (teWidth * TE) / 2;
  const railHalf = UV.railLength / 2;
  const min = -railHalf + half;
  const max = railHalf - half;
  const stepped = Math.round(localX / TE) * TE;
  return Math.min(max, Math.max(min, stepped));
}

export function formatSnapFeedback({ face, xMm, yMm, zMm, teIndex, teWidth, mount }) {
  if (mount === "din" && teIndex != null) {
    return `Hutschiene · TE ${teIndex + 1}${teWidth > 1 ? `–${teIndex + teWidth}` : ""} · ${teWidth} TE`;
  }
  const parts = [];
  if (face) parts.push(faceLabel(face));
  if (xMm != null) parts.push(`X ${xMm} mm`);
  if (yMm != null) parts.push(`Y ${yMm} mm`);
  if (zMm != null) parts.push(`Z ${zMm} mm`);
  parts.push("Raster 50 mm");
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
 * Place a Lochblech-mounted object so its back sits on the face.
 * Object local: +Z is "front"/open; footprint centered on XY.
 */
export function poseOnLochblech(face, hitPoint, itemDepthM) {
  const standoff = Math.max(itemDepthM / 2, 2 * MM);
  const T = EBOX.panelThickness;

  if (face === "back") {
    const x = snapToGrid(hitPoint.x);
    const y = snapToGrid(hitPoint.y, EBOX_FLOOR_Y + EBOX.frame);
    const z = T + standoff;
    return {
      position: { x, y, z },
      rotation: { x: 0, y: 0, z: 0 },
      feedback: formatSnapFeedback({
        face,
        xMm: toMm(x),
        yMm: toMm(y - EBOX_FLOOR_Y),
        mount: "lochblech",
      }),
      face,
      mount: "lochblech",
    };
  }

  if (face === "floor") {
    const x = snapToGrid(hitPoint.x);
    const z = snapToGrid(hitPoint.z);
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
      }),
      face,
      mount: "lochblech",
    };
  }

  if (face === "left") {
    const z = snapToGrid(hitPoint.z);
    const y = snapToGrid(hitPoint.y, EBOX_FLOOR_Y + EBOX.frame);
    const x = -EBOX.width / 2 + T + standoff;
    return {
      position: { x, y, z },
      rotation: { x: 0, y: Math.PI / 2, z: 0 },
      feedback: formatSnapFeedback({
        face,
        zMm: toMm(z),
        yMm: toMm(y - EBOX_FLOOR_Y),
        mount: "lochblech",
      }),
      face,
      mount: "lochblech",
    };
  }

  if (face === "right") {
    const z = snapToGrid(hitPoint.z);
    const y = snapToGrid(hitPoint.y, EBOX_FLOOR_Y + EBOX.frame);
    const x = EBOX.width / 2 - T - standoff;
    return {
      position: { x, y, z },
      rotation: { x: 0, y: -Math.PI / 2, z: 0 },
      feedback: formatSnapFeedback({
        face,
        zMm: toMm(z),
        yMm: toMm(y - EBOX_FLOOR_Y),
        mount: "lochblech",
      }),
      face,
      mount: "lochblech",
    };
  }

  return null;
}

/**
 * Pose a DIN device on a rail group (local coords of rail).
 * @param {THREE.Object3D} railGroup
 * @param {THREE.Vector3} localPoint point in rail local space
 * @param {number} teWidth
 */
export function poseOnDinRail(railGroup, localPoint, teWidth) {
  const x = snapToTe(localPoint.x, teWidth);
  const teIndex = Math.round((x + UV.railLength / 2) / TE - teWidth / 2);
  return {
    position: { x, y: 6 * MM, z: 22 * MM },
    rotation: { x: 0, y: 0, z: 0 },
    parent: railGroup,
    feedback: formatSnapFeedback({
      mount: "din",
      teIndex: Math.max(0, teIndex),
      teWidth,
    }),
    face: "din",
    mount: "din",
    teIndex: Math.max(0, teIndex),
    teWidth,
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
