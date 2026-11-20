import * as THREE from "three";
import { EBOX, EBOX_CENTER_Y } from "../layout.js";

/**
 * Where the UV-Ansicht shows the board: in front of the E-box, open side toward +Z.
 * The placed board never moves here. Only a display copy does.
 */
export const UV_STAGE = {
  position: new THREE.Vector3(0, EBOX_CENTER_Y, EBOX.depth + 0.62),
};

export const UV_STAGE_CAMERA = {
  position: new THREE.Vector3(0.16, EBOX_CENTER_Y + 0.1, EBOX.depth + 0.62 + 0.78),
  target: new THREE.Vector3(0, EBOX_CENTER_Y - 0.02, EBOX.depth + 0.62),
};

const COVER_NAME = "Geraeteabdeckung";

function isDistributionBoard(object) {
  const data = object?.userData;
  if (!data || data.ghost || data.uvViewDisplay) return false;
  return data.kind === "distributionBoard" || data.catalogId === "uv-3reihen";
}

/** Geometry-only copy. Shared materials, no placement userData, no raycast. */
function visualClone(source) {
  let clone;
  if (source.isMesh) clone = new THREE.Mesh(source.geometry, source.material);
  else if (source.isLineSegments) clone = new THREE.LineSegments(source.geometry, source.material);
  else if (source.isLine) clone = new THREE.Line(source.geometry, source.material);
  else if (source.isPoints) clone = new THREE.Points(source.geometry, source.material);
  else if (source.isSprite) clone = new THREE.Sprite(source.material);
  else clone = new THREE.Group();

  clone.name = source.name;
  clone.position.copy(source.position);
  clone.quaternion.copy(source.quaternion);
  clone.scale.copy(source.scale);
  clone.visible = source.visible;
  clone.castShadow = source.castShadow;
  clone.receiveShadow = source.receiveShadow;
  clone.renderOrder = source.renderOrder;
  clone.frustumCulled = source.frustumCulled;
  clone.matrixAutoUpdate = source.matrixAutoUpdate !== false;
  if (source.matrixAutoUpdate === false) clone.matrix.copy(source.matrix);
  clone.raycast = () => {};
  for (const child of source.children) clone.add(visualClone(child));
  return clone;
}

function structureKey(object) {
  let count = 0;
  let sig = 0;
  object.traverse((child) => {
    count += 1;
    sig += child.position.x * 12.9898 + child.position.y * 78.233 + child.position.z * 37.719;
    sig += child.quaternion.x + child.quaternion.y + child.quaternion.z + child.quaternion.w;
  });
  return `${count}:${sig.toFixed(5)}`;
}

function placementKey(object) {
  return JSON.stringify(object?.userData?.placement ?? null);
}

/**
 * UV-Ansicht: hide the placed board and show a copy in front of the E-box.
 * Stored placement, local device poses, and the saved matrix stay the source of truth.
 */
export function createUvIsolate({ scene, placedRoot }) {
  const display = new THREE.Group();
  display.name = "UV-Ansicht";
  scene.add(display);

  /** @type {null | {
   *   source: import("three").Object3D,
   *   position: import("three").Vector3,
   *   quaternion: import("three").Quaternion,
   *   scale: import("three").Vector3,
   *   visible: boolean,
   *   placementKey: string,
   *   clone: import("three").Object3D | null,
   *   key: string,
   * }} */
  let session = null;

  function findBoard() {
    let found = null;
    placedRoot.traverse((object) => {
      if (found || !isDistributionBoard(object)) return;
      found = object;
    });
    return found;
  }

  function removeDisplay() {
    if (!session?.clone) return;
    session.clone.removeFromParent();
    session.clone = null;
  }

  function syncCover() {
    if (!session?.source || !session.clone) return;
    const real = session.source.getObjectByName(COVER_NAME);
    const copy = session.clone.getObjectByName(COVER_NAME);
    if (!copy) return;
    const on = real ? real.visible === true : session.source.userData?.coverVisible === true;
    copy.visible = on;
  }

  function showDisplay(source) {
    removeDisplay();
    const clone = visualClone(source);
    clone.name = "UV-Ansicht-Modell";
    clone.position.copy(UV_STAGE.position);
    clone.rotation.set(0, 0, 0);
    clone.scale.set(1, 1, 1);
    clone.visible = true;
    clone.userData = { uvViewDisplay: true, pickable: false };
    display.add(clone);
    session.clone = clone;
    session.key = structureKey(source);
    syncCover();
  }

  function remember(source) {
    source.updateMatrix();
    return {
      source,
      position: source.position.clone(),
      quaternion: source.quaternion.clone(),
      scale: source.scale.clone(),
      visible: source.visible,
      placementKey: placementKey(source),
      clone: null,
      key: "",
    };
  }

  function restoreSource(keepMovedPlacement) {
    if (!session?.source) return;
    const { source, position, quaternion, scale, visible } = session;
    const placementChanged = placementKey(source) !== session.placementKey;
    if (!keepMovedPlacement || !placementChanged) {
      source.position.copy(position);
      source.quaternion.copy(quaternion);
      source.scale.copy(scale);
    }
    source.visible = visible;
    source.updateMatrix();
    source.updateMatrixWorld(true);
  }

  function enter() {
    const board = findBoard();
    if (!board) return false;
    if (session?.source === board && session.clone) {
      syncCover();
      return true;
    }
    if (session) {
      restoreSource(true);
      removeDisplay();
      session = null;
    }
    session = remember(board);
    showDisplay(board);
    board.visible = false;
    return true;
  }

  function leave() {
    if (!session) return;
    restoreSource(true);
    removeDisplay();
    session = null;
  }

  /**
   * @returns {null | "lost"} "lost" when the viewed board disappeared
   */
  function update() {
    if (!session) return null;
    if (!session.source?.parent) {
      const source = session.source;
      const visible = session?.visible;
      removeDisplay();
      if (source) source.visible = visible !== false;
      session = null;
      return "lost";
    }
    const key = structureKey(session.source);
    if (key !== session.key) showDisplay(session.source);
    else syncCover();
    return null;
  }

  return {
    enter,
    leave,
    update,
    hasBoard: () => !!findBoard(),
    isActive: () => !!session,
    getSource: () => session?.source || null,
    getDisplay: () => session?.clone || null,
    stage: UV_STAGE,
    /** Local pose captured when the view opened. Null when the view is closed. */
    getHomePose: () => {
      if (!session) return null;
      return {
        position: session.position.clone(),
        quaternion: session.quaternion.clone(),
        scale: session.scale.clone(),
        placementKey: session.placementKey,
      };
    },
  };
}
