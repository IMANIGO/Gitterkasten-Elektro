import * as THREE from "three";
import { MM } from "../units.js";
import { bendRadiusFor } from "./clampRules.js";

const CABLE_RADIUS = 4 * MM;

/**
 * Build an orthogonal polyline with filleted 90° corners.
 * @param {THREE.Vector3[]} corners sharp corner waypoints on one face plane
 * @param {{ isBoxCorner?: (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3) => boolean }} [opts]
 * @returns {{ points: THREE.Vector3[], length: number, bends: Array<{ index: number, kind: string, radius: number }> }}
 */
export function buildFilletedPath(corners, opts = {}) {
  if (corners.length < 2) {
    return { points: corners.map((p) => p.clone()), length: 0, bends: [] };
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

    const kind =
      opts.isBoxCorner?.(prev, curr, next) ? "boxCorner" : "free";
    const radius = bendRadiusFor(kind);
    const trim = Math.min(radius, len1 * 0.45, len2 * 0.45);

    const d1 = v1.clone().normalize();
    const d2 = v2.clone().normalize();
    const enter = curr.clone().addScaledVector(d1, -trim);
    const leave = curr.clone().addScaledVector(d2, trim);

    points.push(enter);

    // Quarter-circle samples in the plane of the bend
    const normal = new THREE.Vector3().crossVectors(d1, d2);
    if (normal.lengthSq() < 1e-10) {
      points.push(curr.clone());
    } else {
      normal.normalize();
      const from = d1.clone().negate();
      const samples = 8;
      for (let s = 1; s < samples; s++) {
        const t = s / samples;
        const q = new THREE.Quaternion().setFromAxisAngle(normal, (Math.PI / 2) * t);
        const dir = from.clone().applyQuaternion(q);
        // Arc center = enter + perpendicular inward
        const inward = new THREE.Vector3().crossVectors(normal, d1).normalize();
        // Determine inward by checking leave side
        if (inward.dot(d2) < 0) inward.negate();
        const center = enter.clone().addScaledVector(inward, trim);
        const arc = center.clone().addScaledVector(dir.normalize(), trim);
        // Simpler: lerp enter→leave with bulge
        const mid = enter.clone().lerp(leave, t);
        const bulge = Math.sin(Math.PI * t) * (trim * (1 - Math.SQRT1_2));
        mid.addScaledVector(inward, bulge);
        points.push(mid);
        void arc;
        void q;
        void dir;
      }
    }

    points.push(leave);
    bends.push({ index: points.length - 1, kind, radius });
  }

  points.push(corners[corners.length - 1].clone());

  let length = 0;
  for (let i = 1; i < points.length; i++) {
    length += points[i].distanceTo(points[i - 1]);
  }
  return { points, length, bends };
}

/**
 * Sample a point at distance `dist` along a polyline.
 * @returns {{ point: THREE.Vector3, tangent: THREE.Vector3 } | null}
 */
export function pointAtDistance(points, dist) {
  if (points.length < 2) return null;
  let remaining = dist;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const seg = a.distanceTo(b);
    if (remaining <= seg || i === points.length - 1) {
      const t = seg < 1e-9 ? 0 : Math.min(1, remaining / seg);
      const point = a.clone().lerp(b, t);
      const tangent = b.clone().sub(a).normalize();
      return { point, tangent };
    }
    remaining -= seg;
  }
  return null;
}

export function createCableMesh(points, material) {
  if (points.length < 2) return null;
  const curve = new THREE.CatmullRomCurve3(points, false, "catmullrom", 0.05);
  // Prefer tube along denser polyline without oversmoothing corners
  const tubular = Math.max(16, points.length * 4);
  const geo = new THREE.TubeGeometry(curve, tubular, CABLE_RADIUS, 8, false);
  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.name = "Leitung";
  return mesh;
}

/**
 * Detect box-corner bend: turn that involves changing the dominant wall axes near box edges.
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
  // Corner of box = near two boundaries
  const edges = [nearLeft, nearRight, nearBack, nearFront, nearFloor].filter(Boolean).length;
  return edges >= 2;
}
