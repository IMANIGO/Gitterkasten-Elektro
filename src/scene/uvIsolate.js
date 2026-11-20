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

function isInteractiveSource(source) {
  const data = source?.userData || {};
  if (data.mount === "din") return true;
  if (data.placed || data.selectable) return true;
  if (
    data.kind === "dinDevice" ||
    data.kind === "terminal" ||
    data.kind === "surfaceDevice" ||
    data.kind === "junctionBox" ||
    data.kind === "cableClamp" ||
    data.kind === "clamp"
  ) {
    return true;
  }
  return false;
}

/**
 * Geometry copy with pick proxies for DIN rails and placed devices.
 * Interactive nodes keep raycast and point back to the real source uuid.
 */
function visualClone(source, maps) {
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

  maps.sourceToDisplay.set(source.uuid, clone);
  maps.displayToSource.set(clone.uuid, source);

  // Keep raycasts so Betriebsmittel can be placed/selected in UV-Ansicht.
  // Controllers remap hits from the display copy onto the real board.
  if (isInteractiveSource(source)) {
    clone.userData = {
      ...source.userData,
      uvViewDisplay: true,
      uvSourceUuid: source.uuid,
      pickable: true,
    };
    if (source.userData?.mount === "din") {
      maps.displayRailsByRow.set(source.userData.rowIndex, clone);
      maps.sourceRailsByRow.set(source.userData.rowIndex, source);
    }
  } else {
    clone.userData = {
      ...(source.userData || {}),
      uvViewDisplay: true,
      uvSourceUuid: source.uuid,
      pickable: false,
    };
  }

  for (const child of source.children) clone.add(visualClone(child, maps));
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
   *   sourceToDisplay: Map<string, import("three").Object3D>,
   *   displayToSource: Map<string, import("three").Object3D>,
   *   displayRailsByRow: Map<number, import("three").Object3D>,
   *   sourceRailsByRow: Map<number, import("three").Object3D>,
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
    const maps = {
      sourceToDisplay: new Map(),
      displayToSource: new Map(),
      displayRailsByRow: new Map(),
      sourceRailsByRow: new Map(),
    };
    const clone = visualClone(source, maps);
    clone.name = "UV-Ansicht-Modell";
    clone.position.copy(UV_STAGE.position);
    clone.rotation.set(0, 0, 0);
    clone.scale.set(1, 1, 1);
    clone.visible = true;
    clone.userData = { uvViewDisplay: true, pickable: false };
    display.add(clone);
    session.clone = clone;
    session.key = structureKey(source);
    session.sourceToDisplay = maps.sourceToDisplay;
    session.displayToSource = maps.displayToSource;
    session.displayRailsByRow = maps.displayRailsByRow;
    session.sourceRailsByRow = maps.sourceRailsByRow;
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
      sourceToDisplay: new Map(),
      displayToSource: new Map(),
      displayRailsByRow: new Map(),
      sourceRailsByRow: new Map(),
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

  function resolveDisplayObject(object) {
    if (!session) return null;
    let current = object;
    while (current) {
      if (current === session.clone || current.userData?.uvViewDisplay) {
        const source = session.displayToSource.get(current.uuid);
        if (source) return source;
      }
      if (current.userData?.uvSourceUuid) {
        const source = session.displayToSource.get(current.uuid);
        if (source) return source;
      }
      current = current.parent;
    }
    return null;
  }

  /** Map a raycast hit on the display copy onto the real board / rail. */
  function remapHit(hit) {
    if (!session || !hit) return hit;
    let current = hit.object;
    let underDisplay = false;
    while (current) {
      if (current === session.clone) {
        underDisplay = true;
        break;
      }
      current = current.parent;
    }
    if (!underDisplay) return hit;

    let displayRail = hit.object;
    while (displayRail && displayRail.userData?.mount !== "din") {
      displayRail = displayRail.parent;
      if (displayRail === session.clone) {
        displayRail = null;
        break;
      }
    }

    if (displayRail && displayRail.userData?.mount === "din") {
      const rowIndex = displayRail.userData.rowIndex;
      const realRail = session.sourceRailsByRow.get(rowIndex) || session.displayToSource.get(displayRail.uuid);
      if (!realRail) return hit;
      const local = displayRail.worldToLocal(hit.point.clone());
      const point = realRail.localToWorld(local.clone());
      return {
        ...hit,
        object: realRail,
        point,
        displayRail,
        realRail,
        uvRemapped: true,
      };
    }

    const real = resolveDisplayObject(hit.object);
    if (!real) return hit;
    return {
      ...hit,
      object: real,
      uvRemapped: true,
    };
  }

  return {
    enter,
    leave,
    update,
    hasBoard: () => !!findBoard(),
    isActive: () => !!session,
    getSource: () => session?.source || null,
    getDisplay: () => session?.clone || null,
    getDisplayRoot: () => (session?.clone ? display : null),
    remapHit,
    resolveDisplayObject,
    displayRailFor(rowIndex) {
      return session?.displayRailsByRow.get(rowIndex) || null;
    },
    sourceRailFor(rowIndex) {
      return session?.sourceRailsByRow.get(rowIndex) || null;
    },
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
