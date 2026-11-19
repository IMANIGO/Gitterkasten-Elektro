/**
 * Federkraftklemmen snap bündig (5,2 mm), ohne Zwischenabstand.
 * Run: node scripts/verify-abutting-snap.mjs
 */
import { MM } from "../src/units.js";
import { snapToAbutting } from "../src/placement/snap.js";
import { UV } from "../src/layout.js";

function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exitCode = 1;
  } else {
    console.log("OK:", msg);
  }
}

const w = 5.2 * MM;
const x0 = snapToAbutting(-UV.railLength / 2 + w / 2, w);
const x1 = snapToAbutting(x0 + w * 0.6, w);
const x2 = snapToAbutting(x1 + w * 0.9, w);

assert(Math.abs(x1 - x0 - w) < 1e-9, `neighbor centers 5,2 mm apart (${((x1 - x0) / MM).toFixed(3)} mm)`);
assert(Math.abs(x2 - x1 - w) < 1e-9, "third terminal also flush");
assert(Math.abs((x1 - w / 2) - (x0 + w / 2)) < 1e-9, "side faces touch (zero gap)");

if (!process.exitCode) console.log("\nAbutting snap checks passed.");
