import * as THREE from "three";
import { EBOX, EBOX_FLOOR_Y } from "../layout.js";
import { materials } from "../materials.js";
import { createCableClamp } from "../models/cableClamp.js";
import { setState, state } from "../state.js";
import { MM, toMm } from "../units.js";
import {
  CLAMP_RULES_MM,
  computeClampDistancesAlongPath,
} from "./clampRules.js";
import {
  buildFilletedPath,
  createCableMesh,
  isLikelyBoxCorner,
  pointAtDistance,
} from "./pathGeometry.js";

const BOX_BOUNDS = {
  minX: -EBOX.width / 2 + EBOX.frame,
  maxX: EBOX.width / 2 - EBOX.frame,
  minY: EBOX_FLOOR_Y + EBOX.panelThickness,
  maxY: EBOX_FLOOR_Y + EBOX.height - EBOX.frame,
  minZ: EBOX.panelThickness,
  maxZ: EBOX.depth - EBOX.frame,
};

function snapWirePoint(point, face) {
  const p = point.clone();
  const pitch = 50 * MM;
  if (face === "back") {
    p.x = Math.round(p.x / pitch) * pitch;
    p.y = Math.round((p.y - EBOX_FLOOR_Y) / pitch) * pitch + EBOX_FLOOR_Y;
    p.z = EBOX.panelThickness + 8 * MM;
  } else if (face === "floor") {
    p.x = Math.round(p.x / pitch) * pitch;
    p.z = Math.round(p.z / pitch) * pitch;
    p.y = EBOX_FLOOR_Y + EBOX.panelThickness + 8 * MM;
  } else if (face === "left") {
    p.z = Math.round(p.z / pitch) * pitch;
    p.y = Math.round((p.y - EBOX_FLOOR_Y) / pitch) * pitch + EBOX_FLOOR_Y;
    p.x = -EBOX.width / 2 + EBOX.panelThickness + 8 * MM;
  } else if (face === "right") {
    p.z = Math.round(p.z / pitch) * pitch;
    p.y = Math.round((p.y - EBOX_FLOOR_Y) / pitch) * pitch + EBOX_FLOOR_Y;
    p.x = EBOX.width / 2 - EBOX.panelThickness - 8 * MM;
  }
  return p;
}

function findFace(object) {
  let current = object;
  while (current) {
    if (current.userData?.face) return current.userData.face;
    if (current.userData?.mount === "lochblech" && current.userData.face) {
      return current.userData.face;
    }
    current = current.parent;
  }
  return null;
}

function orientClamp(clamp, point, tangent, face) {
  clamp.position.copy(point);
  // Align clamp so cable axis (local Z) follows tangent; base toward wall
  const zAxis = tangent.clone().normalize();
  let yAxis;
  if (face === "back") yAxis = new THREE.Vector3(0, 0, 1);
  else if (face === "floor") yAxis = new THREE.Vector3(0, 1, 0);
  else if (face === "left") yAxis = new THREE.Vector3(1, 0, 0);
  else if (face === "right") yAxis = new THREE.Vector3(-1, 0, 0);
  else yAxis = new THREE.Vector3(0, 0, 1);

  const xAxis = new THREE.Vector3().crossVectors(yAxis, zAxis).normalize();
  if (xAxis.lengthSq() < 1e-6) {
    yAxis = new THREE.Vector3(0, 1, 0);
    xAxis.crossVectors(yAxis, zAxis).normalize();
  }
  yAxis.crossVectors(zAxis, xAxis).normalize();
  const m = new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis);
  clamp.quaternion.setFromRotationMatrix(m);
}

/**
 * Verdrahtung layer: click waypoints on Lochblech, finish run → cable + Schellen.
 */
export function createWiringLayer({ canvas, camera, scene, controls } = {}) {
  const group = new THREE.Group();
  group.name = "Verdrahtung";

  const runs = [];
  const draftPoints = [];
  let draftFace = null;
  let draftPreview = null;
  let markerGroup = new THREE.Group();
  group.add(markerGroup);

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  function clearDraftVisuals() {
    if (draftPreview) {
      draftPreview.removeFromParent();
      draftPreview = null;
    }
    while (markerGroup.children.length) {
      markerGroup.remove(markerGroup.children[0]);
    }
  }

  function addMarker(point) {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(6 * MM, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0xd4a017 }),
    );
    m.position.copy(point);
    markerGroup.add(m);
  }

  function refreshDraftPreview() {
    if (draftPreview) {
      draftPreview.removeFromParent();
      draftPreview = null;
    }
    if (draftPoints.length < 2) return;
    const { points } = buildFilletedPath(draftPoints, {
      isBoxCorner: (a, b, c) => isLikelyBoxCorner(a, b, c, BOX_BOUNDS),
    });
    draftPreview = createCableMesh(points, materials.ghost.clone());
    if (draftPreview) {
      draftPreview.userData.ghost = true;
      group.add(draftPreview);
    }
  }

  function commitRun() {
    if (draftPoints.length < 2) {
      draftPoints.length = 0;
      draftFace = null;
      clearDraftVisuals();
      setState({ wiringFeedback: "Leitung benötigt mindestens 2 Punkte" });
      return null;
    }

    const { points, length, bends } = buildFilletedPath(draftPoints, {
      isBoxCorner: (a, b, c) => isLikelyBoxCorner(a, b, c, BOX_BOUNDS),
    });

    const runGroup = new THREE.Group();
    runGroup.name = `Leitung ${runs.length + 1}`;
    const cable = createCableMesh(points, materials.cable);
    if (cable) {
      cable.userData = {
        pickable: true,
        id: `leitung-${runs.length + 1}`,
        name: "Leitung",
        meta: `${toMm(length)} mm · Schellen-Regel 70 / max 220 mm`,
      };
      runGroup.add(cable);
    }

    const distances = computeClampDistancesAlongPath(length);
    const clamps = [];
    for (const dist of distances) {
      const sample = pointAtDistance(points, dist);
      if (!sample) continue;
      const clamp = createCableClamp();
      orientClamp(clamp, sample.point, sample.tangent, draftFace || "back");
      // Offset clamp slightly toward wall so base sits on Lochblech
      const wallNormal =
        draftFace === "floor"
          ? new THREE.Vector3(0, 1, 0)
          : draftFace === "left"
            ? new THREE.Vector3(1, 0, 0)
            : draftFace === "right"
              ? new THREE.Vector3(-1, 0, 0)
              : new THREE.Vector3(0, 0, 1);
      clamp.position.addScaledVector(wallNormal, -2 * MM);
      clamp.userData.autoPlaced = true;
      clamp.userData.alongMm = toMm(dist);
      runGroup.add(clamp);
      clamps.push({ distanceM: dist, distanceMm: toMm(dist) });
    }

    group.add(runGroup);
    const run = {
      id: runs.length + 1,
      points: points.map((p) => p.clone()),
      corners: draftPoints.map((p) => p.clone()),
      lengthM: length,
      lengthMm: toMm(length),
      clamps,
      bends,
      face: draftFace,
      group: runGroup,
    };
    runs.push(run);

    const spacingMm =
      clamps.length > 1
        ? Math.round((clamps[1].distanceMm - clamps[0].distanceMm) * 10) / 10
        : null;

    setState({
      wiringFeedback: `Leitung ${run.lengthMm} mm · ${clamps.length} Schellen${
        spacingMm != null ? ` · Abstand ${spacingMm} mm (max ${CLAMP_RULES_MM.maxSpacingMm})` : ""
      } · Rand ${CLAMP_RULES_MM.fromEquipmentMm} mm`,
      wireCount: runs.length,
      lastWireLengthMm: run.lengthMm,
    });

    draftPoints.length = 0;
    draftFace = null;
    clearDraftVisuals();
    return run;
  }

  function setPointer(event) {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  function onClick(event) {
    if (!canvas || state.mode !== "verdrahtung") return;
    if (event.button !== 0) return;

    setPointer(event);
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(scene.children, true).filter((h) => {
      let o = h.object;
      while (o) {
        if (o.userData?.ghost) return false;
        if (o.parent === markerGroup) return false;
        o = o.parent;
      }
      return true;
    });
    if (!hits.length) return;

    const face = findFace(hits[0].object);
    if (!face) {
      setState({ wiringFeedback: "Auf Lochblech klicken (Wand/Boden)" });
      return;
    }
    if (draftFace && draftFace !== face && draftPoints.length > 0) {
      // Allow face change only via orthogonal corner at shared edge — for v1 keep same face
      setState({ wiringFeedback: "Leitung vorerst auf einer Fläche halten · Enter zum Abschluss" });
      return;
    }

    draftFace = face;
    const pt = snapWirePoint(hits[0].point, face);

    // Orthogonal constraint: after first point, only move on one axis at a time
    if (draftPoints.length > 0) {
      const last = draftPoints[draftPoints.length - 1];
      const dx = Math.abs(pt.x - last.x);
      const dy = Math.abs(pt.y - last.y);
      const dz = Math.abs(pt.z - last.z);
      if (face === "back") {
        if (dx >= dy) pt.y = last.y;
        else pt.x = last.x;
      } else if (face === "floor") {
        if (dx >= dz) pt.z = last.z;
        else pt.x = last.x;
      } else {
        if (dz >= dy) pt.y = last.y;
        else pt.z = last.z;
      }
      // Skip zero-length segments
      if (pt.distanceTo(last) < 10 * MM) return;
    }

    draftPoints.push(pt);
    addMarker(pt);
    refreshDraftPreview();
    setState({
      wiringFeedback: `Punkt ${draftPoints.length} · Enter/Doppelklick = Leitung + Schellen`,
    });
  }

  function onDblClick(event) {
    if (state.mode !== "verdrahtung") return;
    event.preventDefault();
    commitRun();
  }

  function onKey(event) {
    if (state.mode !== "verdrahtung") return;
    if (event.key === "Enter") {
      commitRun();
    } else if (event.key === "Escape") {
      draftPoints.length = 0;
      draftFace = null;
      clearDraftVisuals();
      setState({ wiringFeedback: "Leitung verworfen" });
    } else if (event.key === "Backspace" && draftPoints.length) {
      draftPoints.pop();
      clearDraftVisuals();
      draftPoints.forEach(addMarker);
      refreshDraftPreview();
      setState({ wiringFeedback: `Punkt ${draftPoints.length}` });
    }
  }

  if (canvas) {
    canvas.addEventListener("pointerup", onClick);
    canvas.addEventListener("dblclick", onDblClick);
    window.addEventListener("keydown", onKey);
  }

  return {
    group,
    wires: runs,
    addWire: commitRun,
    getTotalLengthMm() {
      return runs.reduce((s, r) => s + r.lengthMm, 0);
    },
    getClampCount() {
      return runs.reduce((s, r) => s + r.clamps.length, 0);
    },
    dispose() {
      if (!canvas) return;
      canvas.removeEventListener("pointerup", onClick);
      canvas.removeEventListener("dblclick", onDblClick);
      window.removeEventListener("keydown", onKey);
    },
  };
}
