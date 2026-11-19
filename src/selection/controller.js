import * as THREE from "three";
import { getCatalogItem } from "../catalog/index.js";
import { EBOX_FLOOR_Y } from "../layout.js";
import { createFromFactory } from "../models/factories.js";
import { setState, state } from "../state.js";
import { toMm } from "../units.js";

const SELECT_COLOR = new THREE.Color(0x3d8bfd);

function findPlacedRoot(object) {
  let current = object;
  let found = null;
  while (current) {
    if (current.userData?.placed) found = current;
    current = current.parent;
  }
  return found;
}

function prepareMesh(mesh) {
  if (mesh.userData._selReady) return;
  const source = mesh.material;
  if (!source) return;
  mesh.material = Array.isArray(source) ? source.map((m) => m.clone()) : source.clone();
  mesh.userData._selReady = true;
}

function setSelectedHighlight(object, on) {
  if (!object) return;
  object.traverse((child) => {
    if (!child.isMesh || !child.material) return;
    prepareMesh(child);
    const mats = Array.isArray(child.material) ? child.material : [child.material];
    for (const mat of mats) {
      if (!mat.emissive) continue;
      if (on) {
        mat.emissive.copy(SELECT_COLOR);
        mat.emissiveIntensity = 0.45;
      } else {
        mat.emissive.set(0x000000);
        mat.emissiveIntensity = 1;
      }
    }
  });
}

function formatPosition(object) {
  const p = new THREE.Vector3();
  object.getWorldPosition(p);
  const xMm = toMm(p.x);
  const yMm = toMm(p.y - EBOX_FLOOR_Y);
  const zMm = toMm(p.z);
  const place = object.userData?.placement;
  const parts = [`X ${xMm} mm`, `Y ${yMm} mm (über Boden)`, `Z ${zMm} mm`];
  if (place?.face && place.face !== "din") parts.unshift(`Fläche: ${faceDe(place.face)}`);
  if (place?.mount === "din" && place.teIndex != null) {
    parts.unshift(
      place.abutting
        ? `Hutschiene · Pos. ${place.teIndex + 1}`
        : `Hutschiene · TE ${place.teIndex + 1}`,
    );
  }
  if (place?.feedback) parts.push(place.feedback);
  return parts.join(" · ");
}

function faceDe(face) {
  return (
    {
      back: "Rückwand",
      floor: "Boden",
      left: "Seite links",
      right: "Seite rechts",
      din: "Hutschiene",
    }[face] || face
  );
}

/**
 * Selection of placed Betriebsmittel: delete / move / replace + position dimensions.
 */
export function createSelectionController({
  canvas,
  camera,
  scene,
  placedRoot,
  placement,
}) {
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let selected = null;
  let downPos = null;

  function clearSelection() {
    setSelectedHighlight(selected, false);
    selected = null;
    setState({
      selectedObjectId: null,
      selectedLabel: null,
      selectedPositionText: null,
      selectionAction: null,
    });
  }

  function selectObject(object) {
    if (selected === object) return;
    setSelectedHighlight(selected, false);
    selected = object;
    setSelectedHighlight(selected, true);
    setState({
      selectedObjectId: object.uuid,
      selectedLabel: object.userData?.name || object.userData?.catalogId || "Bauteil",
      selectedPositionText: formatPosition(object),
      selectedCatalogId: null,
      selectionAction: null,
      placementFeedback: null,
    });
  }

  function setPointer(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  function pickPlaced(event) {
    setPointer(event);
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(placedRoot.children, true);
    for (const hit of hits) {
      const root = findPlacedRoot(hit.object);
      if (root) return root;
    }
    return null;
  }

  function onDown(event) {
    if (event.button !== 0) return;
    downPos = { x: event.clientX, y: event.clientY };
  }

  function onClick(event) {
    if (event.button !== 0) return;
    if (state.mode !== "betriebsmittel" && state.mode !== "ansicht") return;
    // Don't steal clicks while placing a new catalog item (unless moving)
    if (state.mode === "betriebsmittel" && state.selectedCatalogId && state.selectionAction !== "move") {
      return;
    }
    if (downPos) {
      const dragged = Math.hypot(event.clientX - downPos.x, event.clientY - downPos.y) > 8;
      downPos = null;
      if (dragged) return;
    }

    const hit = pickPlaced(event);
    if (hit) {
      selectObject(hit);
      if (state.selectionAction === "move" && placement) {
        // Move is handled by placement re-pose — keep selected and wait for place
      }
    } else if (state.mode === "ansicht" || !state.selectedCatalogId) {
      clearSelection();
    }
  }

  function deleteSelected() {
    if (!selected) return;
    const name = selected.userData?.name || "Bauteil";
    selected.removeFromParent();
    clearSelection();
    setState({
      placementFeedback: `Gelöscht: ${name}`,
      placedCount: Math.max(0, (state.placedCount || 1) - 1),
    });
  }

  function beginMove() {
    if (!selected) return;
    const catalogId = selected.userData?.catalogId;
    if (!catalogId) return;
    setState({
      selectionAction: "move",
      selectedCatalogId: catalogId,
      placementFeedback: "Neue Position anklicken (Raster / TE)",
    });
  }

  function beginReplace() {
    if (!selected) return;
    setState({
      selectionAction: "replace",
      selectedCatalogId: null,
      placementFeedback: "Ersatz aus der Bibliothek wählen",
    });
  }

  /**
   * Called by placement after a successful pose while move/replace is active.
   */
  function applyMoveOrReplace(pose, factoryObject, item) {
    if (!selected) return false;
    if (state.selectionAction === "move") {
      // Re-parent / re-pose existing object
      if (pose.parent) {
        pose.parent.add(selected);
      } else {
        placedRoot.add(selected);
      }
      selected.position.set(pose.position.x, pose.position.y, pose.position.z);
      selected.rotation.set(pose.rotation.x, pose.rotation.y, pose.rotation.z);
      selected.userData.placement = {
        mount: pose.mount,
        face: pose.face,
        teIndex: pose.teIndex,
        abutting: pose.abutting,
        feedback: pose.feedback,
      };
      setSelectedHighlight(selected, true);
      setState({
        selectedCatalogId: null,
        selectionAction: null,
        selectedPositionText: formatPosition(selected),
        placementFeedback: `Verschoben · ${pose.feedback}`,
      });
      return true;
    }

    if (state.selectionAction === "replace" && factoryObject && item) {
      const parent = selected.parent;
      const pos = selected.position.clone();
      const rot = selected.rotation.clone();
      const place = { ...selected.userData.placement };
      selected.removeFromParent();
      if (parent) parent.add(factoryObject);
      else placedRoot.add(factoryObject);
      // Prefer new pose if mount compatible, else keep old transform
      if (pose) {
        if (pose.parent) pose.parent.add(factoryObject);
        factoryObject.position.set(pose.position.x, pose.position.y, pose.position.z);
        factoryObject.rotation.set(pose.rotation.x, pose.rotation.y, pose.rotation.z);
        factoryObject.userData.placement = {
          mount: pose.mount,
          face: pose.face,
          teIndex: pose.teIndex,
          abutting: pose.abutting,
          feedback: pose.feedback,
        };
      } else {
        factoryObject.position.copy(pos);
        factoryObject.rotation.copy(rot);
        factoryObject.userData.placement = place;
      }
      factoryObject.userData.placed = true;
      factoryObject.userData.catalogId = item.id;
      selectObject(factoryObject);
      setState({
        selectedCatalogId: null,
        selectionAction: null,
        placementFeedback: `Ausgetauscht: ${item.label}`,
      });
      return true;
    }

    return false;
  }

  function onKey(event) {
    if (!selected) return;
    if (state.mode !== "betriebsmittel" && state.mode !== "ansicht") return;
    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      deleteSelected();
    } else if (event.key === "Escape") {
      clearSelection();
      setState({ selectedCatalogId: null, selectionAction: null });
    }
  }

  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointerup", onClick);
  window.addEventListener("keydown", onKey);

  return {
    getSelected: () => selected,
    clearSelection,
    deleteSelected,
    beginMove,
    beginReplace,
    applyMoveOrReplace,
    refreshPositionText() {
      if (selected) {
        setState({ selectedPositionText: formatPosition(selected) });
      }
    },
    dispose() {
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointerup", onClick);
      window.removeEventListener("keydown", onKey);
      clearSelection();
    },
  };
}

export function replaceFromCatalog(selection, catalogId, pose) {
  const item = getCatalogItem(catalogId);
  if (!item?.placeable) return false;
  const object = createFromFactory(item.factory);
  if (!object) return false;
  return selection.applyMoveOrReplace(pose, object, item);
}
