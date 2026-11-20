import * as THREE from "three";
import { setState } from "../state.js";

const HIGHLIGHT = new THREE.Color(0xc9a227);

function pickRoot(object) {
  let current = object;
  while (current) {
    if (current.userData?.pickable) return current;
    current = current.parent;
  }
  return null;
}

function prepareMesh(mesh) {
  if (mesh.userData._hlReady) return;
  const source = mesh.material;
  if (!source) return;
  if (Array.isArray(source)) {
    mesh.material = source.map((m) => m.clone());
  } else {
    mesh.material = source.clone();
  }
  mesh.userData._hlReady = true;
}

function setHighlighted(object, on) {
  if (!object) return;
  object.traverse((child) => {
    if (!child.isMesh || !child.material) return;
    prepareMesh(child);
    const mats = Array.isArray(child.material) ? child.material : [child.material];
    for (const mat of mats) {
      if (!mat.emissive) continue;
      if (on) {
        mat.emissive.copy(HIGHLIGHT);
        mat.emissiveIntensity = 0.7;
      } else {
        mat.emissive.set(0x000000);
        mat.emissiveIntensity = 1;
      }
    }
  });
}

export function createInteraction(canvas, camera, scene) {
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let hovered = null;

  function onMove(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(scene.children, true);
    const next = hits.length ? pickRoot(hits[0].object) : null;
    if (next === hovered) return;
    setHighlighted(hovered, false);
    hovered = next;
    setHighlighted(hovered, true);
    if (hovered) {
      setState({
        hovered: {
          id: hovered.userData.id,
          name: hovered.userData.name,
          meta: hovered.userData.meta || "",
        },
      });
    } else {
      setState({ hovered: null });
    }
  }

  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerleave", () => {
    setHighlighted(hovered, false);
    hovered = null;
    setState({ hovered: null });
  });

  return {
    getHovered: () => hovered,
    dispose() {
      canvas.removeEventListener("pointermove", onMove);
    },
  };
}
