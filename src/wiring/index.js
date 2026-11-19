import * as THREE from "three";
import { EBOX, EBOX_FLOOR_Y } from "../layout.js";
import { materials } from "../materials.js";
import { createCableClamp } from "../models/cableClamp.js";
import { setState, state } from "../state.js";
import { MM, toMm } from "../units.js";
import { computeClampLayout } from "./clampRules.js";
import {
  coreColorsFor,
  formatCableSpec,
  normalizeCableSpec,
  sheathColor,
  sheathDiameterM,
} from "./cableTypes.js";
import {
  buildFilletedPath,
  createCableMesh,
  createWireEndFan,
  isLikelyBoxCorner,
  pointAtDistance,
} from "./pathGeometry.js";
import {
  faceLabelDe,
  faceNormal,
  inferFaceAtPoint,
  planWaypointAppend,
} from "./wireFaces.js";
import { isSingleCoreType } from "./cableTypes.js";
import { findHostEquipment, snapInsideHost } from "./singleCore.js";

const BOX_BOUNDS = {
  minX: -EBOX.width / 2 + EBOX.frame,
  maxX: EBOX.width / 2 - EBOX.frame,
  minY: EBOX_FLOOR_Y + EBOX.panelThickness,
  maxY: EBOX_FLOOR_Y + EBOX.height - EBOX.frame,
  minZ: EBOX.panelThickness,
  maxZ: EBOX.depth - EBOX.frame,
};

function findFace(object) {
  let current = object;
  while (current) {
    if (current.userData?.face) return current.userData.face;
    current = current.parent;
  }
  return null;
}

function orientClamp(clamp, point, tangent, face) {
  clamp.position.copy(point);
  const zAxis = tangent.clone().normalize();
  let yAxis = faceNormal(face);

  const xAxis = new THREE.Vector3().crossVectors(yAxis, zAxis).normalize();
  if (xAxis.lengthSq() < 1e-6) {
    yAxis = new THREE.Vector3(0, 1, 0);
    xAxis.crossVectors(yAxis, zAxis).normalize();
  }
  yAxis.crossVectors(zAxis, xAxis).normalize();
  const m = new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis);
  clamp.quaternion.setFromRotationMatrix(m);
}

function sheathMaterial(spec) {
  const mat = materials.cable.clone();
  mat.color.set(sheathColor(spec));
  return mat;
}

/**
 * Verdrahtung layer: click waypoints on any Lochblech faces → cable + Schellen + Aderenden.
 */
export function createWiringLayer({ canvas, camera, scene, controls } = {}) {
  void controls;
  const group = new THREE.Group();
  group.name = "Verdrahtung";

  const runs = [];
  /** @type {THREE.Vector3[]} */
  const draftPoints = [];
  /** @type {string[]} */
  const draftFaces = [];
  /** Betriebsmittel, in dem eine Einzelader verläuft */
  let draftHost = null;
  let draftPreview = null;
  let markerGroup = new THREE.Group();
  group.add(markerGroup);

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  function currentSpec() {
    return normalizeCableSpec(state.cableSpec);
  }

  function clearDraftVisuals() {
    if (draftPreview) {
      draftPreview.removeFromParent();
      draftPreview = null;
    }
    while (markerGroup.children.length) {
      markerGroup.remove(markerGroup.children[0]);
    }
  }

  function addMarker(point, faceChanged = false) {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(6 * MM, 12, 12),
      new THREE.MeshBasicMaterial({ color: faceChanged ? 0x3d8bfd : 0xd4a017 }),
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
    const spec = currentSpec();
    const radius = sheathDiameterM(spec.cores, spec.mm2, spec.typeId) / 2;
    const { points } = buildFilletedPath(draftPoints, {
      isBoxCorner: (a, b, c) => isLikelyBoxCorner(a, b, c, BOX_BOUNDS),
    });
    draftPreview = createCableMesh(points, materials.ghost.clone(), radius);
    if (draftPreview) {
      draftPreview.userData.ghost = true;
      group.add(draftPreview);
    }
  }

  function appendWaypoint(face, rawTarget) {
    const planned = planWaypointAppend(draftPoints, draftFaces, face, rawTarget);
    for (let i = 0; i < planned.points.length; i++) {
      const pt = planned.points[i];
      const f = planned.faces[i];
      const faceChanged =
        draftFaces.length > 0
          ? f !== draftFaces[draftFaces.length - 1]
          : false;
      draftPoints.push(pt);
      draftFaces.push(f);
      addMarker(pt, faceChanged);
    }
  }

  function commitRun() {
    if (draftPoints.length < 2) {
      draftPoints.length = 0;
      draftFaces.length = 0;
      clearDraftVisuals();
      setState({ wiringFeedback: "Leitung benötigt mindestens 2 Punkte" });
      return null;
    }

    const spec = currentSpec();
    const singleCore = isSingleCoreType(spec.typeId);
    const radius = sheathDiameterM(spec.cores, spec.mm2, spec.typeId) / 2;
    const cores = coreColorsFor(spec);
    const label = formatCableSpec(spec);

    const { points, length, bends } = buildFilletedPath(draftPoints, {
      isBoxCorner: (a, b, c) => isLikelyBoxCorner(a, b, c, BOX_BOUNDS),
    });

    const runGroup = new THREE.Group();
    runGroup.name = `Leitung ${runs.length + 1}`;
    const cable = createCableMesh(points, sheathMaterial(spec), radius);
    if (cable) {
      cable.userData = {
        pickable: true,
        id: `leitung-${runs.length + 1}`,
        name: `Leitung ${label}`,
        meta: singleCore
          ? `${toMm(length)} mm · ${label} · Einzelader ohne Schellen`
          : `${toMm(length)} mm · ${label} · Schellen 70 / max 220 mm · 90° mit Schelle, R80`,
        cableSpec: { ...spec },
      };
      runGroup.add(cable);
    }

    if (points.length >= 2) {
      const t0 = points[1].clone().sub(points[0]).normalize();
      const t1 = points[points.length - 1]
        .clone()
        .sub(points[points.length - 2])
        .normalize();
      const startFan = createWireEndFan(
        points[0],
        t0.clone().negate(),
        cores,
        radius,
      );
      const endFan = createWireEndFan(points[points.length - 1], t1, cores, radius);
      runGroup.add(startFan, endFan);
    }

    const layout = singleCore ? [] : computeClampLayout(length, { bends });
    const clamps = [];
    for (const slot of layout) {
      const sample = pointAtDistance(points, slot.distanceM);
      if (!sample) continue;
      const face = inferFaceAtPoint(sample.point);
      const clamp = createCableClamp();
      orientClamp(clamp, sample.point, sample.tangent, face);
      clamp.position.addScaledVector(faceNormal(face), -2 * MM);
      clamp.userData.autoPlaced = true;
      clamp.userData.alongMm = toMm(slot.distanceM);
      clamp.userData.face = face;
      clamp.userData.clampRole = slot.role;
      runGroup.add(clamp);
      clamps.push({
        distanceM: slot.distanceM,
        distanceMm: toMm(slot.distanceM),
        face,
        role: slot.role,
      });
    }

    const facesUsed = [...new Set(draftFaces)];

    group.add(runGroup);
    const run = {
      id: runs.length + 1,
      points: points.map((p) => p.clone()),
      corners: draftPoints.map((p) => p.clone()),
      lengthM: length,
      lengthMm: toMm(length),
      clamps,
      bends,
      face: facesUsed[0] || null,
      faces: facesUsed,
      cornerFaces: [...draftFaces],
      group: runGroup,
      cableSpec: { ...spec },
      label,
    };
    runs.push(run);

    let spacingMm = null;
    for (let i = 1; i < clamps.length; i++) {
      if (clamps[i - 1].role === "straight" && clamps[i].role === "straight") {
        spacingMm = Math.round((clamps[i].distanceMm - clamps[i - 1].distanceMm) * 10) / 10;
        break;
      }
    }
    const bendClamps = clamps.filter((c) => c.role === "bend-start" || c.role === "bend-end").length;

    const faceText = singleCore
      ? facesUsed.includes("steuer")
        ? "UV Steuer rechts"
        : facesUsed.includes("last")
          ? "UV Last links"
          : "im Betriebsmittel"
      : facesUsed.length > 1
        ? facesUsed.map(faceLabelDe).join(" → ")
        : faceLabelDe(facesUsed[0]);

    setState({
      wiringFeedback: singleCore
        ? `${label} · ${run.lengthMm} mm · ${faceText} · ohne Schellen`
        : `${label} · ${run.lengthMm} mm · ${faceText} · ${clamps.length} Schellen${
            bendClamps ? ` · ${bendClamps} an 90°-Kurven (R80)` : ""
          }${spacingMm != null ? ` · Gerade ${spacingMm} mm` : ""} · ${cores.map((c) => c.label).join("/")} Enden`,
      wireCount: runs.length,
      lastWireLengthMm: run.lengthMm,
    });

    draftPoints.length = 0;
    draftFaces.length = 0;
    draftHost = null;
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
    if (state.selectionAction) return;

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

    const specNow = currentSpec();
    if (isSingleCoreType(specNow.typeId)) {
      let host = null;
      let raw = null;
      for (const hit of hits) {
        const found = findHostEquipment(hit.object);
        if (found) {
          host = found;
          raw = hit.point;
          break;
        }
      }
      if (!host) {
        setState({
          wiringFeedback:
            "Einzelader nur innerhalb von Betriebsmitteln — nicht auf der Fläche und nicht mit Schellen",
        });
        return;
      }
      if (draftHost && draftHost !== host) {
        setState({ wiringFeedback: "Einzelader bleibt im selben Betriebsmittel" });
        return;
      }
      draftHost = host;
      const pt = snapInsideHost(host, raw, specNow.circuitKind);
      if (draftPoints.length && pt.distanceTo(draftPoints[draftPoints.length - 1]) < 8 * MM) return;
      const lane =
        host.userData?.kind === "distributionBoard"
          ? specNow.circuitKind === "steuer"
            ? "steuer"
            : "last"
          : "geraet";
      draftPoints.push(pt);
      draftFaces.push(lane);
      addMarker(pt, false);
      refreshDraftPreview();
      const where =
        lane === "steuer" ? "UV rechts (Steuer)" : lane === "last" ? "UV links (Last)" : host.userData?.name || "Gerät";
      setState({
        wiringFeedback: `${formatCableSpec(specNow)} · ${where} · ohne Schellen · Punkt ${draftPoints.length} · Enter = fertig`,
      });
      return;
    }

    let face = null;
    let hitPoint = null;
    for (const hit of hits) {
      const f = findFace(hit.object);
      if (f) {
        face = f;
        hitPoint = hit.point;
        break;
      }
    }
    if (!face) {
      setState({
        wiringFeedback: "Auf Lochblech klicken (Wand/Boden — Flächenwechsel erlaubt)",
      });
      return;
    }

    const prevFace = draftFaces.length ? draftFaces[draftFaces.length - 1] : null;
    appendWaypoint(face, hitPoint);
    refreshDraftPreview();
    const spec = specNow;
    const switchNote =
      prevFace && prevFace !== face
        ? ` · Wechsel ${faceLabelDe(prevFace)} → ${faceLabelDe(face)}`
        : "";
    setState({
      wiringFeedback: `${formatCableSpec(spec)} · Punkt ${draftPoints.length} · ${faceLabelDe(face)}${switchNote} · Enter = fertig`,
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
      draftFaces.length = 0;
      draftHost = null;
      clearDraftVisuals();
      setState({ wiringFeedback: "Leitung verworfen" });
    } else if (event.key === "Backspace" && draftPoints.length) {
      draftPoints.pop();
      draftFaces.pop();
      if (!draftPoints.length) draftHost = null;
      clearDraftVisuals();
      draftPoints.forEach((p, i) => {
        const changed = i > 0 && draftFaces[i] !== draftFaces[i - 1];
        addMarker(p, changed);
      });
      refreshDraftPreview();
      setState({
        wiringFeedback: draftPoints.length
          ? `Punkt ${draftPoints.length} · ${faceLabelDe(draftFaces[draftFaces.length - 1])}`
          : "Leitungspfad zeichnen",
      });
    }
  }

  let lastSpecKey = "";
  function syncSpecPreview() {
    const spec = currentSpec();
    const key = `${spec.typeId}-${spec.mm2}-${spec.cores}`;
    if (key !== lastSpecKey) {
      lastSpecKey = key;
      refreshDraftPreview();
    }
  }
  const specTimer = setInterval(syncSpecPreview, 300);

  if (canvas) {
    canvas.addEventListener("pointerup", onClick);
    canvas.addEventListener("dblclick", onDblClick);
    window.addEventListener("keydown", onKey);
  }

  return {
    group,
    wires: runs,
    addWire: commitRun,
    /** Test/helper: append a waypoint without raycast */
    debugAppend(face, point) {
      appendWaypoint(face, point);
      refreshDraftPreview();
    },
    getDraft() {
      return {
        points: draftPoints.map((p) => p.clone()),
        faces: [...draftFaces],
      };
    },
    getTotalLengthMm() {
      return runs.reduce((s, r) => s + r.lengthMm, 0);
    },
    getClampCount() {
      return runs.reduce((s, r) => s + r.clamps.length, 0);
    },
    dispose() {
      clearInterval(specTimer);
      if (!canvas) return;
      canvas.removeEventListener("pointerup", onClick);
      canvas.removeEventListener("dblclick", onDblClick);
      window.removeEventListener("keydown", onKey);
    },
  };
}
