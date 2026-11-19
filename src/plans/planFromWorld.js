import * as THREE from "three";
import { EBOX, EBOX_FLOOR_Y, PANEL_INNER } from "../layout.js";
import { MM } from "../units.js";

const CM = 10 * MM;

/** Face panel sizes in cm (inner clear opening). */
export function defaultFacesCm() {
  return {
    left: {
      nr: 1,
      label: "Seite links",
      widthCm: round1(PANEL_INNER.sideD / CM),
      heightCm: round1(PANEL_INNER.sideH / CM),
    },
    back: {
      nr: 2,
      label: "Rückwand",
      widthCm: round1(PANEL_INNER.backW / CM),
      heightCm: round1(PANEL_INNER.backH / CM),
    },
    right: {
      nr: 3,
      label: "Seite rechts",
      widthCm: round1(PANEL_INNER.sideD / CM),
      heightCm: round1(PANEL_INNER.sideH / CM),
    },
    floor: {
      nr: 4,
      label: "Boden",
      widthCm: round1(PANEL_INNER.floorW / CM),
      heightCm: round1(PANEL_INNER.floorD / CM),
    },
  };
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

function roundCm(m) {
  return Math.round((m / CM) * 10) / 10;
}

/**
 * Infer Lochblech face from world position when placement.face is missing.
 */
export function inferFaceFromWorld(position) {
  const T = EBOX.panelThickness;
  const dBack = Math.abs(position.z - T);
  const dFloor = Math.abs(position.y - (EBOX_FLOOR_Y + T));
  const dLeft = Math.abs(position.x - (-EBOX.width / 2 + T));
  const dRight = Math.abs(position.x - (EBOX.width / 2 - T));
  const scores = [
    ["back", dBack],
    ["floor", dFloor],
    ["left", dLeft],
    ["right", dRight],
  ];
  scores.sort((a, b) => a[1] - b[1]);
  return scores[0][0];
}

/**
 * World position → Aufbauplan face coordinates (cm from edges).
 */
export function worldToPlanCoords(face, position) {
  if (face === "back") {
    return {
      face,
      fromLeftCm: roundCm(position.x - -PANEL_INNER.backW / 2),
      fromTopCm: roundCm(EBOX_FLOOR_Y + EBOX.height - EBOX.frame - position.y),
    };
  }
  if (face === "left" || face === "right") {
    return {
      face,
      fromBackCm: roundCm(position.z),
      fromTopCm: roundCm(EBOX_FLOOR_Y + EBOX.height - EBOX.frame - position.y),
    };
  }
  if (face === "floor") {
    return {
      face,
      fromLeftCm: roundCm(position.x - -PANEL_INNER.floorW / 2),
      fromBackCm: roundCm(position.z),
    };
  }
  return { face };
}

/**
 * Resolve face + cm coords for a placed Object3D.
 */
export function coordsFromPlacedObject(object) {
  const place = object.userData?.placement || {};
  if (place.mount === "din" || place.face === "din") {
    return {
      mount: "din",
      face: "din",
      teIndex: place.teIndex ?? null,
      abutting: !!place.abutting,
    };
  }

  const pos = new THREE.Vector3();
  object.getWorldPosition(pos);
  const face =
    place.face && place.face !== "din" ? place.face : inferFaceFromWorld(pos);
  return {
    mount: "lochblech",
    ...worldToPlanCoords(face, pos),
  };
}
