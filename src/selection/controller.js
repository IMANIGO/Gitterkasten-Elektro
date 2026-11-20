import * as THREE from "three";
import { getCatalogItem } from "../catalog/index.js";
import { EBOX_FLOOR_Y } from "../layout.js";
import { createFromFactory } from "../models/factories.js";
import { railLabel } from "../placement/uvRails.js";
import { setState, state } from "../state.js";
import { toMm } from "../units.js";

const SELECT_COLOR = new THREE.Color(0x3d8bfd);

/**
 * Innermost selectable Betriebsmittel (DIN-Gerät in UV vor dem UV-Gehäuse).
 * Früher wurde beim Hochlaufen die äußere UV überschrieben — Innenteile waren nicht editierbar.
 * Container (UV) werden übersprungen, solange ein Kind-Betriebsmittel gefunden wird.
 */
function findPlacedRoot(object) {
  let current = object;
  let containerFallback = null;
  while (current) {
    const ud = current.userData || {};
    const isDevice =
      ud.kind === "dinDevice" ||
      ud.kind === "terminal" ||
      ud.kind === "surfaceDevice" ||
      ud.kind === "junctionBox" ||
      ud.kind === "cableClamp" ||
      ud.kind === "clamp";
    if ((ud.placed || ud.selectable) && !ud.container) {
      return current;
    }
    if (ud.catalogId && isDevice) {
      return current;
    }
    if ((ud.placed || ud.selectable) && ud.container && !containerFallback) {
      containerFallback = current;
    }
    current = current.parent;
  }
  return containerFallback;
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
    const rail =
      place.railLetter != null
        ? `Schiene ${place.railLetter}`
        : object.parent?.userData?.rowIndex != null
          ? railLabel(object.parent.userData.rowIndex)
          : "Hutschiene";
    parts.unshift(
      place.abutting ? `${rail} · Pos. ${place.teIndex + 1}` : `${rail} · TE ${place.teIndex + 1}`,
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
  controls,
  getUvView,
}) {
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let selected = null;
  let downPos = null;
  let drag = null;
  /** Click on another Betriebsmittel must not also relocate the one being moved. */
  let suppressClickMove = false;
  /** Set when a click (not a drag) already relocated the selection, so the empty click keeps it. */
  let keepSelectionOnEmptyClick = false;

  function uvView() {
    return typeof getUvView === "function" ? getUvView() : getUvView;
  }

  function clearSelection() {
    setSelectedHighlight(selected, false);
    selected = null;
    setState({
      selectedObjectId: null,
      selectedLabel: null,
      selectedPositionText: null,
      selectedStationSlots: null,
      selectedRcboSpec: null,
      selectedMcbSpec: null,
      selectedRcdSpec: null,
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
      selectedStationSlots: object.userData?.slots ? [...object.userData.slots] : null,
      selectedRcboSpec: object.userData?.rcboSpec ? { ...object.userData.rcboSpec } : null,
      selectedMcbSpec: object.userData?.mcbSpec ? { ...object.userData.mcbSpec } : null,
      selectedRcdSpec: object.userData?.rcdSpec ? { ...object.userData.rcdSpec } : null,
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
    const view = uvView();
    const targets = [placedRoot];
    const displayRoot = view?.isActive?.() ? view.getDisplayRoot?.() || view.getDisplay?.() : null;
    if (displayRoot) targets.push(displayRoot);
    const hits = raycaster.intersectObjects(targets, true).map((hit) => {
      if (!view?.isActive?.() || !view.remapHit) return hit;
      return view.remapHit(hit);
    });
    // Mehrere Meshes entlang des Strahls (UV-Rahmen vor DIN-Gerät) —
    // zuerst Nicht-Container (DIN/Klemme/AP), sonst UV-Container.
    let containerHit = null;
    for (const hit of hits) {
      const root = findPlacedRoot(hit.object);
      if (!root) continue;
      if (root.userData?.container) {
        if (!containerHit) containerHit = root;
        continue;
      }
      return root;
    }
    return containerHit;
  }

  function onDown(event) {
    if (event.button !== 0) return;
    downPos = { x: event.clientX, y: event.clientY };
    suppressClickMove = false;
    if (
      state.mode !== "betriebsmittel" &&
      state.mode !== "ansicht" &&
      state.mode !== "plaene"
    ) {
      return;
    }
    // A catalog ghost owns the press: first placement stays click-to-place.
    if (state.selectedCatalogId && state.selectionAction !== "move") return;
    const hit = pickPlaced(event);
    if (!hit?.userData?.catalogId) return;
    // Drag only the already selected device, and only after Verschieben.
    if (state.selectionAction === "move" && hit === selected) {
      drag = { object: hit, moved: false };
      if (controls) controls.enabled = false;
      event.stopPropagation();
      return;
    }
    suppressClickMove = true;
    event.stopPropagation();
  }

  function onClick(event) {
    if (event.button !== 0) return;
    // Auswahl in Ansicht, Betriebsmittel und Pläne (nach „In 3D bauen“)
    if (
      state.mode !== "betriebsmittel" &&
      state.mode !== "ansicht" &&
      state.mode !== "plaene"
    ) {
      return;
    }
    // Don't steal clicks while placing a new catalog item (unless moving)
    if (state.mode === "betriebsmittel" && state.selectedCatalogId && state.selectionAction !== "move") {
      return;
    }
    if (downPos) {
      const dragged = Math.hypot(event.clientX - downPos.x, event.clientY - downPos.y) > 8;
      downPos = null;
      if (dragged) {
        keepSelectionOnEmptyClick = false;
        return;
      }
    }

    const keep = keepSelectionOnEmptyClick;
    keepSelectionOnEmptyClick = false;
    const hit = pickPlaced(event);
    if (hit) {
      selectObject(hit);
    } else if (keep) {
      // Klick hat das gewählte Bauteil schon versetzt; Auswahl behalten.
    } else if (state.selectionAction === "move") {
      setState({
        selectionAction: null,
        placementFeedback: "Verschieben abgebrochen",
      });
    } else if (state.mode === "ansicht" || !state.selectedCatalogId) {
      clearSelection();
    }
  }

  function applyPose(object, pose) {
    if (pose.parent) pose.parent.add(object);
    else placedRoot.add(object);
    object.position.set(pose.position.x, pose.position.y, pose.position.z);
    object.rotation.set(pose.rotation.x, pose.rotation.y, pose.rotation.z);
    object.userData.placement = {
      mount: pose.mount,
      face: pose.face,
      teIndex: pose.teIndex,
      abutting: pose.abutting,
      feedback: pose.feedback,
      railLetter: pose.railLetter,
      rowIndex: pose.rowIndex,
    };
  }

  function moveToPose(pose) {
    if (!selected || !pose) return false;
    applyPose(selected, pose);
    setSelectedHighlight(selected, true);
    setState({
      selectedPositionText: formatPosition(selected),
      placementFeedback: `Verschoben · ${pose.feedback}`,
      selectionAction: null,
    });
    return true;
  }

  function placeFresh(item, pose) {
    if (!item || !pose) return false;
    const object = createFromFactory(item.factory, factoryOptsFromState(item));
    if (!object) return false;
    applyPose(object, pose);
    object.userData.placed = true;
    object.userData.catalogId = item.id;
    selectObject(object);
    setState({
      selectedCatalogId: null,
      selectionAction: null,
      placementFeedback: `Platziert · ${item.label} · ${pose.feedback}`,
      placedCount: (state.placedCount || 0) + 1,
    });
    return true;
  }

  function onDragMove(event) {
    if (!drag) return;
    const item = getCatalogItem(drag.object.userData?.catalogId);
    if (!item) return;
    const pose = placement?.poseAtEvent?.(event, item, { exact: true, ignore: drag.object });
    if (!pose) return;
    drag.moved = true;
    applyPose(drag.object, pose);
  }

  function onDragEnd() {
    if (!drag) return;
    const moved = drag.moved;
    drag = null;
    if (controls) controls.enabled = true;
    if (moved && selected) {
      setState({
        selectedPositionText: formatPosition(selected),
        placementFeedback: `Verschoben · ${selected.userData?.placement?.feedback || "exakt"}`,
        selectionAction: null,
      });
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
    if (!selected.userData?.catalogId) return;
    setState({
      selectionAction: "move",
      selectedCatalogId: null,
      placementFeedback: "Ziehen, neue Stelle anklicken oder Schiene/TE eintragen",
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
        railLetter: pose.railLetter,
        rowIndex: pose.rowIndex,
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
          railLetter: pose.railLetter,
          rowIndex: pose.rowIndex,
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
    if (
      state.mode !== "betriebsmittel" &&
      state.mode !== "ansicht" &&
      state.mode !== "plaene"
    ) {
      return;
    }
    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      deleteSelected();
    } else if (event.key === "Escape") {
      drag = null;
      suppressClickMove = false;
      if (controls) controls.enabled = true;
      clearSelection();
      setState({ selectedCatalogId: null, selectionAction: null });
    }
  }

  canvas.addEventListener("pointerdown", onDown, true);
  canvas.addEventListener("pointerup", onClick);
  window.addEventListener("pointermove", onDragMove);
  window.addEventListener("pointerup", onDragEnd);
  window.addEventListener("keydown", onKey);

  return {
    getSelected: () => selected,
    selectObject,
    clearSelection,
    deleteSelected,
    beginMove,
    beginReplace,
    applyMoveOrReplace,
    moveToPose,
    placeFresh,
    dragMoved: () => Boolean(drag?.moved),
    suppressClickMove: () => suppressClickMove,
    keepSelectionAfterClick() {
      keepSelectionOnEmptyClick = true;
    },
    listDinRails: () => placement?.listDinRails?.() || [],
    refreshPositionText() {
      if (selected) {
        setState({ selectedPositionText: formatPosition(selected) });
      }
    },
    dispose() {
      canvas.removeEventListener("pointerdown", onDown, true);
      canvas.removeEventListener("pointerup", onClick);
      window.removeEventListener("pointermove", onDragMove);
      window.removeEventListener("pointerup", onDragEnd);
      window.removeEventListener("keydown", onKey);
      clearSelection();
    },
  };
}

function factoryOptsFromState(item) {
  if (item?.factory === "controlStation") return { slots: state.stationSlots };
  if (item?.factory === "rcbo1p") return { spec: state.rcboSpec };
  if (item?.factory === "mcb1p" || item?.factory === "mcb3p") return { spec: state.mcbSpec };
  if (item?.factory === "rcd4p") return { spec: state.rcdSpec };
  return {};
}

export function replaceFromCatalog(selection, catalogId, pose) {
  const item = getCatalogItem(catalogId);
  if (!item?.placeable) return false;
  const object = createFromFactory(item.factory, factoryOptsFromState(item));
  if (!object) return false;
  return selection.applyMoveOrReplace(pose, object, item);
}
