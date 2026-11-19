import * as THREE from "three";
import { getCatalogItem, itemDepthM, itemWidthM } from "../catalog/index.js";
import { createFromFactory, createGhostFromFactory } from "../models/factories.js";
import { setState, state } from "../state.js";
import { poseOnDinRail, poseOnLochblech } from "./snap.js";

function findMountRoot(object) {
  let current = object;
  while (current) {
    if (current.userData?.mount) return current;
    current = current.parent;
  }
  return null;
}

function findDinRail(object) {
  let current = object;
  while (current) {
    if (current.userData?.mount === "din") return current;
    current = current.parent;
  }
  return null;
}

/**
 * Betriebsmittel placement: select from catalog → ghost on raycast → click to commit.
 */
export function createPlacementController({ canvas, camera, scene, placedRoot, controls }) {
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let ghost = null;
  let lastPose = null;

  function clearGhost() {
    if (ghost) {
      ghost.removeFromParent();
      ghost = null;
    }
    lastPose = null;
  }

  function ensureGhost(item) {
    if (ghost && ghost.userData._catalogId === item.id) return ghost;
    clearGhost();
    if (!item?.factory || !item.placeable) return null;
    ghost = createGhostFromFactory(item.factory);
    if (!ghost) return null;
    ghost.userData._catalogId = item.id;
    ghost.userData.ghost = true;
    ghost.traverse((c) => {
      if (c.isMesh) {
        c.castShadow = false;
        c.receiveShadow = false;
      }
    });
    scene.add(ghost);
    return ghost;
  }

  function setPointer(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  function resolvePose(item, hits) {
    if (!hits.length) return null;
    const mountWanted = item.mount;

    if (mountWanted === "din" || mountWanted === "both") {
      for (const hit of hits) {
        const rail = findDinRail(hit.object);
        if (rail) {
          const local = rail.worldToLocal(hit.point.clone());
          if (item.abutting) {
            return poseOnDinRail(rail, local, {
              abutting: true,
              widthM: itemWidthM(item),
              widthMm: item.widthMm,
            });
          }
          return poseOnDinRail(rail, local, { teWidth: item.te || 1 });
        }
      }
      if (mountWanted === "din") return null;
    }

    for (const hit of hits) {
      const mount = findMountRoot(hit.object);
      if (!mount || mount.userData.mount !== "lochblech") continue;
      const face = mount.userData.face;
      if (!face) continue;
      return poseOnLochblech(face, hit.point, itemDepthM(item));
    }
    return null;
  }

  function applyPoseToObject(object, pose) {
    if (pose.parent) {
      pose.parent.add(object);
      object.position.set(pose.position.x, pose.position.y, pose.position.z);
      object.rotation.set(pose.rotation.x, pose.rotation.y, pose.rotation.z);
    } else {
      placedRoot.add(object);
      object.position.set(pose.position.x, pose.position.y, pose.position.z);
      object.rotation.set(pose.rotation.x, pose.rotation.y, pose.rotation.z);
    }
  }

  function onMove(event) {
    if (state.mode !== "betriebsmittel" || !state.selectedCatalogId) {
      clearGhost();
      if (state.placementFeedback) setState({ placementFeedback: null });
      return;
    }
    const item = getCatalogItem(state.selectedCatalogId);
    if (!item?.placeable) {
      clearGhost();
      return;
    }

    setPointer(event);
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(scene.children, true).filter((h) => {
      let o = h.object;
      while (o) {
        if (o.userData?.ghost || o === ghost) return false;
        o = o.parent;
      }
      return true;
    });

    const pose = resolvePose(item, hits);
    lastPose = pose;
    const g = ensureGhost(item);
    if (!g) return;

    if (!pose) {
      g.visible = false;
      setState({ placementFeedback: "Keine passende Montagefläche" });
      return;
    }

    g.visible = true;
    if (pose.parent) {
      // Show ghost in world space matching rail
      const worldPos = new THREE.Vector3(pose.position.x, pose.position.y, pose.position.z);
      pose.parent.localToWorld(worldPos);
      g.position.copy(worldPos);
      g.quaternion.copy(pose.parent.getWorldQuaternion(new THREE.Quaternion()));
    } else {
      if (g.parent !== scene) scene.add(g);
      g.position.set(pose.position.x, pose.position.y, pose.position.z);
      g.rotation.set(pose.rotation.x, pose.rotation.y, pose.rotation.z);
    }
    setState({ placementFeedback: pose.feedback });
  }

  let downPos = null;

  function onDown(event) {
    if (event.button !== 0) return;
    downPos = { x: event.clientX, y: event.clientY };
  }

  function hitsFromEvent(event) {
    setPointer(event);
    raycaster.setFromCamera(pointer, camera);
    return raycaster.intersectObjects(scene.children, true).filter((h) => {
      let o = h.object;
      while (o) {
        if (o.userData?.ghost || o === ghost) return false;
        o = o.parent;
      }
      return true;
    });
  }

  function onClick(event) {
    if (state.mode !== "betriebsmittel" || !state.selectedCatalogId) return;
    if (event.button !== 0) return;
    if (downPos) {
      const dragged = Math.hypot(event.clientX - downPos.x, event.clientY - downPos.y) > 8;
      downPos = null;
      if (dragged) return;
    }

    const item = getCatalogItem(state.selectedCatalogId);
    if (!item?.placeable) return;

    const pose = resolvePose(item, hitsFromEvent(event)) || lastPose;
    if (!pose) return;

    const object = createFromFactory(item.factory);
    if (!object) return;
    applyPoseToObject(object, pose);
    object.userData.placed = true;
    object.userData.catalogId = item.id;
    object.userData.placement = {
      mount: pose.mount,
      face: pose.face,
      teIndex: pose.teIndex,
      feedback: pose.feedback,
    };

    setState({
      placementFeedback: `Platziert: ${item.label} · ${pose.feedback}`,
      placedCount: (state.placedCount || 0) + 1,
    });
  }

  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointerup", onClick);

  return {
    clearGhost,
    dispose() {
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointerup", onClick);
      clearGhost();
    },
  };
}
