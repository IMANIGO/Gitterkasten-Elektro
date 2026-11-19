import * as THREE from "three";
import { MM } from "../units.js";
import { bendRadiusFor } from "./clampRules.js";

const DEFAULT_CABLE_RADIUS = 4 * MM;

/**
 * Orthogonal polyline with true circular 90° fillets (R80 free / R90 box corner).
 * Previous generation mixed a broken quaternion arc with lerp+bulge — that is replaced.
 */
export function buildFilletedPath(corners, opts = {}) {
  if (!corners?.length) return { points: [], length: 0, bends: [] };
  if (corners.length < 2) {
    return { points: [corners[0].clone()], length: 0, bends: [] };
  }

  const points = [corners[0].clone()];
  const bends = [];

  for (let i = 1; i < corners.length - 1; i++) {
    const prev = corners[i - 1];
    const curr = corners[i];
    const next = corners[i + 1];
    const v1 = new THREE.Vector3().subVectors(curr, prev);
    const v2 = new THREE.Vector3().subVectors(next, curr);
    const len1 = v1.length();
    const len2 = v2.length();
    if (len1 < 1e-6 || len2 < 1e-6) continue;

    const d1 = v1.clone().normalize();
    const d2 = v2.clone().normalize();
    const turnDot = THREE.MathUtils.clamp(-d1.dot(d2), -1, 1);
    const turnAngle = Math.acos(turnDot);
    // Straight / nearly collinear — keep the corner point
    if (turnAngle < 0.08) {
      points.push(curr.clone());
      continue;
    }

    const kind = opts.isBoxCorner?.(prev, curr, next) ? "boxCorner" : "free";
    const nominalR = bendRadiusFor(kind);
    // Keep enough straight on both legs
    const trim = Math.min(nominalR, len1 * 0.45, len2 * 0.45);
    if (trim < 2 * MM) {
      points.push(curr.clone());
      continue;
    }

    const enter = curr.clone().addScaledVector(d1, -trim);
    const leave = curr.clone().addScaledVector(d2, trim);
    // For a 90° orthogonal fillet with equal trim: center = enter + leave - curr
    const center = enter.clone().add(leave).sub(curr);

    points.push(enter);

    const startOffset = enter.clone().sub(center);
    const endOffset = leave.clone().sub(center);
    const axis = new THREE.Vector3().crossVectors(startOffset, endOffset);
    if (axis.lengthSq() < 1e-12) {
      points.push(leave.clone());
      bends.push({ index: points.length - 1, kind, radius: trim });
      continue;
    }
    axis.normalize();

    const startDir = startOffset.clone().normalize();
    const endDir = endOffset.clone().normalize();
    const sweep = Math.acos(THREE.MathUtils.clamp(startDir.dot(endDir), -1, 1));
    const samples = Math.max(6, Math.ceil((sweep / (Math.PI / 2)) * 10));
    for (let s = 1; s < samples; s++) {
      const t = s / samples;
      const q = new THREE.Quaternion().setFromAxisAngle(axis, sweep * t);
      const p = center.clone().add(startOffset.clone().applyQuaternion(q));
      points.push(p);
    }

    points.push(leave);
    bends.push({ index: points.length - 1, kind, radius: trim, nominalRadius: nominalR });
  }

  points.push(corners[corners.length - 1].clone());

  let length = 0;
  for (let i = 1; i < points.length; i++) {
    length += points[i].distanceTo(points[i - 1]);
  }
  return { points, length, bends };
}

/** Polyline curve without Catmull-Rom overshoot (keeps fillet geometry). */
class PolylineCurve extends THREE.Curve {
  constructor(pts) {
    super();
    this.pts = pts;
    this.cum = [0];
    for (let i = 1; i < pts.length; i++) {
      this.cum.push(this.cum[i - 1] + pts[i].distanceTo(pts[i - 1]));
    }
    this.total = this.cum[this.cum.length - 1] || 1;
  }

  getPoint(t, optionalTarget = new THREE.Vector3()) {
    const dist = THREE.MathUtils.clamp(t, 0, 1) * this.total;
    for (let i = 1; i < this.pts.length; i++) {
      if (dist <= this.cum[i] || i === this.pts.length - 1) {
        const segLen = this.cum[i] - this.cum[i - 1];
        const local = segLen < 1e-9 ? 0 : (dist - this.cum[i - 1]) / segLen;
        return optionalTarget.copy(this.pts[i - 1]).lerp(this.pts[i], local);
      }
    }
    return optionalTarget.copy(this.pts[this.pts.length - 1]);
  }
}

/**
 * Sample a point at distance `dist` along a polyline.
 * @returns {{ point: THREE.Vector3, tangent: THREE.Vector3 } | null}
 */
export function pointAtDistance(points, dist) {
  if (points.length < 2) return null;
  let remaining = Math.max(0, dist);
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const seg = a.distanceTo(b);
    if (remaining <= seg || i === points.length - 1) {
      const t = seg < 1e-9 ? 0 : Math.min(1, remaining / seg);
      const point = a.clone().lerp(b, t);
      const tangent = b.clone().sub(a);
      if (tangent.lengthSq() < 1e-12 && i > 1) {
        tangent.copy(a).sub(points[i - 2]);
      }
      if (tangent.lengthSq() < 1e-12) tangent.set(1, 0, 0);
      else tangent.normalize();
      return { point, tangent };
    }
    remaining -= seg;
  }
  return null;
}

export function createCableMesh(points, material, radiusM = DEFAULT_CABLE_RADIUS) {
  if (points.length < 2) return null;
  const curve = new PolylineCurve(points);
  const tubular = Math.max(24, points.length * 3);
  const geo = new THREE.TubeGeometry(curve, tubular, radiusM, 8, false);
  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.name = "Leitung";
  return mesh;
}

/**
 * Short colored cores at a cable end for Verklemmen.
 * @param {THREE.Vector3} tip end point of sheath
 * @param {THREE.Vector3} outward direction out of the sheath (away from run)
 * @param {{ id: string, label: string, color: number }[]} cores
 * @param {number} sheathRadiusM
 */
export function createWireEndFan(tip, outward, cores, sheathRadiusM) {
  const group = new THREE.Group();
  group.name = "Aderenden";
  const dir = outward.clone().normalize();
  const stubLen = 45 * MM;
  const coreR = Math.max(0.7 * MM, sheathRadiusM * 0.22);

  // Orthonormal basis for fanning
  const up = Math.abs(dir.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
  const side = new THREE.Vector3().crossVectors(dir, up).normalize();
  const binormal = new THREE.Vector3().crossVectors(side, dir).normalize();

  const n = cores.length;
  cores.forEach((core, i) => {
    const t = n === 1 ? 0 : (i / (n - 1)) * 2 - 1;
    const spread = sheathRadiusM * 1.6;
    const offset = side
      .clone()
      .multiplyScalar(t * spread * 0.55)
      .add(binormal.clone().multiplyScalar((i % 2 === 0 ? 1 : -1) * spread * 0.15 * (n > 2 ? 1 : 0)));

    const start = tip.clone().add(offset.clone().multiplyScalar(0.3));
    const end = tip
      .clone()
      .addScaledVector(dir, stubLen)
      .add(offset);

    const mid = start.clone().lerp(end, 0.5);
    const len = start.distanceTo(end);
    const mat = new THREE.MeshStandardMaterial({
      color: core.color,
      roughness: 0.55,
      metalness: 0.05,
    });
    // PE stripe: yellow body + green ring
    if (core.id === "pe") {
      mat.color.set(0xc7a81a);
    }
    const cyl = new THREE.Mesh(
      new THREE.CylinderGeometry(coreR, coreR, len, 8),
      mat,
    );
    cyl.position.copy(mid);
    const quat = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      end.clone().sub(start).normalize(),
    );
    cyl.quaternion.copy(quat);
    cyl.userData = {
      pickable: true,
      id: `ader-${core.id}`,
      name: `Ader ${core.label}`,
      meta: "Aderende zum Verklemmen",
      coreId: core.id,
    };
    group.add(cyl);

    if (core.id === "pe") {
      const stripe = new THREE.Mesh(
        new THREE.CylinderGeometry(coreR * 1.05, coreR * 1.05, len * 0.22, 8),
        new THREE.MeshStandardMaterial({ color: 0x3d7a28, roughness: 0.5, metalness: 0.05 }),
      );
      stripe.position.copy(start.clone().lerp(end, 0.35));
      stripe.quaternion.copy(quat);
      group.add(stripe);
    }
  });

  return group;
}

/**
 * Detect box-corner bend: turn near two E-Box boundaries.
 */
export function isLikelyBoxCorner(prev, curr, next, box = null) {
  void prev;
  void next;
  if (!box) return false;
  const margin = 90 * MM;
  const nearLeft = Math.abs(curr.x - box.minX) < margin;
  const nearRight = Math.abs(curr.x - box.maxX) < margin;
  const nearBack = Math.abs(curr.z - box.minZ) < margin;
  const nearFront = Math.abs(curr.z - box.maxZ) < margin;
  const nearFloor = Math.abs(curr.y - box.minY) < margin;
  const edges = [nearLeft, nearRight, nearBack, nearFront, nearFloor].filter(Boolean).length;
  return edges >= 2;
}

/** Arc radius residual for tests (enter/leave ↔ center). */
export function measureCornerRadii(corners, opts = {}) {
  const { bends, points } = buildFilletedPath(corners, opts);
  return { bends, pointCount: points.length };
}
