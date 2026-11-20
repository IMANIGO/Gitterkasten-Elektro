import * as THREE from "three";
import { EBOX, EBOX_FLOOR_Y } from "../layout.js";
import { MM } from "../units.js";

export const PITCH = 50 * MM;
export const STANDOFF = 8 * MM;

const FACE_ADJACENT = new Set([
  "back|left",
  "left|back",
  "back|right",
  "right|back",
  "back|floor",
  "floor|back",
  "left|floor",
  "floor|left",
  "right|floor",
  "floor|right",
]);

export function facePlaneOffset(face) {
  if (face === "back") return EBOX.panelThickness + STANDOFF;
  if (face === "floor") return EBOX_FLOOR_Y + EBOX.panelThickness + STANDOFF;
  if (face === "left") return -EBOX.width / 2 + EBOX.panelThickness + STANDOFF;
  if (face === "right") return EBOX.width / 2 - EBOX.panelThickness - STANDOFF;
  return 0;
}

export function snapWirePoint(point, face) {
  const p = point.clone();
  if (face === "back") {
    p.x = Math.round(p.x / PITCH) * PITCH;
    p.y = Math.round((p.y - EBOX_FLOOR_Y) / PITCH) * PITCH + EBOX_FLOOR_Y;
    p.z = facePlaneOffset("back");
  } else if (face === "floor") {
    p.x = Math.round(p.x / PITCH) * PITCH;
    p.z = Math.round(p.z / PITCH) * PITCH;
    p.y = facePlaneOffset("floor");
  } else if (face === "left") {
    p.z = Math.round(p.z / PITCH) * PITCH;
    p.y = Math.round((p.y - EBOX_FLOOR_Y) / PITCH) * PITCH + EBOX_FLOOR_Y;
    p.x = facePlaneOffset("left");
  } else if (face === "right") {
    p.z = Math.round(p.z / PITCH) * PITCH;
    p.y = Math.round((p.y - EBOX_FLOOR_Y) / PITCH) * PITCH + EBOX_FLOOR_Y;
    p.x = facePlaneOffset("right");
  }
  return p;
}

export function applyFacePlane(p, face) {
  if (face === "back") p.z = facePlaneOffset("back");
  else if (face === "floor") p.y = facePlaneOffset("floor");
  else if (face === "left") p.x = facePlaneOffset("left");
  else if (face === "right") p.x = facePlaneOffset("right");
  return p;
}

export function makeEdgeCorner(fromFace, toFace, seed) {
  const p = seed.clone();
  applyFacePlane(p, fromFace);
  applyFacePlane(p, toFace);
  if (fromFace === "back" && (toFace === "left" || toFace === "right")) {
    p.y = Math.round((seed.y - EBOX_FLOOR_Y) / PITCH) * PITCH + EBOX_FLOOR_Y;
  } else if (toFace === "back" && (fromFace === "left" || fromFace === "right")) {
    p.y = Math.round((seed.y - EBOX_FLOOR_Y) / PITCH) * PITCH + EBOX_FLOOR_Y;
  } else if (
    (fromFace === "back" && toFace === "floor") ||
    (fromFace === "floor" && toFace === "back")
  ) {
    p.x = Math.round(seed.x / PITCH) * PITCH;
  } else if ((fromFace === "left" || fromFace === "right") && toFace === "floor") {
    p.z = Math.round(seed.z / PITCH) * PITCH;
  } else if (fromFace === "floor" && (toFace === "left" || toFace === "right")) {
    p.z = Math.round(seed.z / PITCH) * PITCH;
  }
  return p;
}

export function orthoOnFace(face, from, target) {
  const pt = target.clone();
  applyFacePlane(pt, face);
  const dx = Math.abs(pt.x - from.x);
  const dy = Math.abs(pt.y - from.y);
  const dz = Math.abs(pt.z - from.z);
  if (face === "back") {
    if (dx >= dy) pt.y = from.y;
    else pt.x = from.x;
  } else if (face === "floor") {
    if (dx >= dz) pt.z = from.z;
    else pt.x = from.x;
  } else {
    if (dz >= dy) pt.y = from.y;
    else pt.z = from.z;
  }
  return pt;
}

export function facesAreAdjacent(a, b) {
  return FACE_ADJACENT.has(`${a}|${b}`);
}

export function faceRoute(fromFace, toFace) {
  if (fromFace === toFace) return [];
  if (facesAreAdjacent(fromFace, toFace)) return [toFace];
  if (
    (fromFace === "left" && toFace === "right") ||
    (fromFace === "right" && toFace === "left")
  ) {
    return ["back", toFace];
  }
  return [toFace];
}

export function faceNormal(face) {
  if (face === "floor") return new THREE.Vector3(0, 1, 0);
  if (face === "left") return new THREE.Vector3(1, 0, 0);
  if (face === "right") return new THREE.Vector3(-1, 0, 0);
  return new THREE.Vector3(0, 0, 1);
}

export function inferFaceAtPoint(point) {
  const scores = [
    ["back", Math.abs(point.z - facePlaneOffset("back"))],
    ["floor", Math.abs(point.y - facePlaneOffset("floor"))],
    ["left", Math.abs(point.x - facePlaneOffset("left"))],
    ["right", Math.abs(point.x - facePlaneOffset("right"))],
  ];
  scores.sort((a, b) => a[1] - b[1]);
  return scores[0][0];
}

export function faceLabelDe(face) {
  return (
    {
      back: "Rückwand",
      floor: "Boden",
      left: "Seite links",
      right: "Seite rechts",
    }[face] || face
  );
}

/**
 * Build the sequence of points (and faces) for a new click, given existing draft.
 * Pure helper used by the wiring layer and tests.
 */
export function planWaypointAppend(draftPoints, draftFaces, face, rawTarget) {
  const target = snapWirePoint(rawTarget, face);
  const outPts = [];
  const outFaces = [];

  if (draftPoints.length === 0) {
    outPts.push(target);
    outFaces.push(face);
    return { points: outPts, faces: outFaces };
  }

  const lastFace = draftFaces[draftFaces.length - 1];
  const lastPt = draftPoints[draftPoints.length - 1];

  if (face === lastFace) {
    outPts.push(orthoOnFace(face, lastPt, target));
    outFaces.push(face);
    return { points: outPts, faces: outFaces };
  }

  const route = faceRoute(lastFace, face);
  let cursorPt = lastPt;
  let cursorFace = lastFace;

  for (const nextFace of route) {
    const corner = makeEdgeCorner(cursorFace, nextFace, cursorPt);
    if (corner.distanceTo(cursorPt) >= 10 * MM) {
      outPts.push(corner);
      outFaces.push(nextFace);
      cursorPt = corner;
    }
    cursorFace = nextFace;
  }

  const ortho = orthoOnFace(face, cursorPt, target);
  if (ortho.distanceTo(cursorPt) >= 10 * MM) {
    outPts.push(ortho);
    outFaces.push(face);
  }
  return { points: outPts, faces: outFaces };
}
