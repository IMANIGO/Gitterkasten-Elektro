/**
 * Verify circular 90° fillets use R80 / R90 and do not collapse to sharp corners.
 * Run: node scripts/verify-path-geometry.mjs
 */
import * as THREE from "three";
import { MM } from "../src/units.js";
import { bendRadiusFor } from "../src/wiring/clampRules.js";
import { buildFilletedPath } from "../src/wiring/pathGeometry.js";

function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exitCode = 1;
  } else {
    console.log("OK:", msg);
  }
}

const a = new THREE.Vector3(0, 0, 0);
const b = new THREE.Vector3(0.4, 0, 0);
const c = new THREE.Vector3(0.4, 0.35, 0);

const free = buildFilletedPath([a, b, c], { isBoxCorner: () => false });
assert(free.bends.length === 1, "one free bend");
assert(Math.abs(free.bends[0].radius - bendRadiusFor("free")) < 1e-9, `free radius = ${bendRadiusFor("free")} m (80 mm)`);
assert(free.points.length >= 8, `fillet samples present (${free.points.length} points)`);

// Mid-arc point should not sit on the sharp corner
const mid = free.points[Math.floor(free.points.length / 2)];
assert(mid.distanceTo(b) > 20 * MM, "arc bulges away from sharp corner");

const corner = buildFilletedPath([a, b, c], { isBoxCorner: () => true });
assert(
  Math.abs(corner.bends[0].radius - bendRadiusFor("boxCorner")) < 1e-9,
  `box-corner radius = ${bendRadiusFor("boxCorner")} m (90 mm)`,
);

// Chord length of quarter circle ≈ R * π/2; path longer than Manhattan of sharp legs minus 2R + arc
const sharpLen = a.distanceTo(b) + b.distanceTo(c);
const r = bendRadiusFor("free");
const expectedMin = sharpLen - 2 * r + (Math.PI / 2) * r * 0.9;
assert(free.length > expectedMin, `filleted length ${free.length.toFixed(4)} > ${expectedMin.toFixed(4)}`);

if (!process.exitCode) console.log("\nAll path-geometry checks passed.");
