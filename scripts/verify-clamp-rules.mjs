/**
 * Quick node check for Schellen spacing rules (no Three.js).
 * Run: node scripts/verify-clamp-rules.mjs
 */
import { CLAMP_RULES_MM, computeClampDistancesAlongPath } from "../src/wiring/clampRules.js";
import { MM } from "../src/units.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const fromEq = CLAMP_RULES_MM.fromEquipmentMm * MM;
const maxSp = CLAMP_RULES_MM.maxSpacingMm * MM;

assert(CLAMP_RULES_MM.fromEquipmentMm === 70, "fromEquipment must be 70 mm");
assert(CLAMP_RULES_MM.maxSpacingMm === 220, "maxSpacing must be 220 mm");
assert(CLAMP_RULES_MM.bendRadiusMm === 80, "bendRadius must be 80 mm");
assert(CLAMP_RULES_MM.cornerBendRadiusMm === 90, "corner bend must be 90 mm");

// Short run: only endpoints offset → maybe 2 clamps or empty if too short
const short = computeClampDistancesAlongPath(100 * MM);
assert(short.length === 0, "path 100 mm too short for clamps beyond 2×70");

// 500 mm run: usable 360 → ceil(360/220)=2 gaps → 3 clamps, spacing 180
const mid = computeClampDistancesAlongPath(500 * MM);
assert(mid.length === 3, `expected 3 clamps, got ${mid.length}`);
assert(Math.abs(mid[0] / MM - 70) < 0.01, "first clamp at 70 mm");
assert(Math.abs(mid[mid.length - 1] / MM - (500 - 70)) < 0.01, "last clamp at L-70");
const spacing = (mid[1] - mid[0]) / MM;
assert(spacing <= 220 + 1e-6, `spacing ${spacing} exceeds 220`);
assert(Math.abs(spacing - 180) < 0.1, `expected even spacing 180, got ${spacing}`);

// Long run 1000 mm: usable 860 → ceil(860/220)=4 → 5 clamps, spacing 215
const long = computeClampDistancesAlongPath(1000 * MM);
assert(long.length === 5, `expected 5 clamps, got ${long.length}`);
const sp2 = (long[1] - long[0]) / MM;
assert(sp2 <= 220 + 1e-6, `spacing ${sp2} exceeds max`);

console.log("clampRules OK", {
  midCount: mid.length,
  midSpacingMm: spacing,
  longCount: long.length,
  longSpacingMm: sp2,
  constants: CLAMP_RULES_MM,
});
