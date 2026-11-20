/**
 * Aderenden verlassen den Mantel eng und fächern am Ende weit auf.
 * Run: node scripts/verify-wire-end-fan.mjs
 */
import * as THREE from "three";
import { MM } from "../src/units.js";
import { coreColorsFor, sheathDiameterM } from "../src/wiring/cableTypes.js";
import { createWireEndFan } from "../src/wiring/pathGeometry.js";

function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exitCode = 1;
  } else {
    console.log("OK:", msg);
  }
}

function coreSegments(group) {
  return group.children
    .filter((child) => child.userData?.coreId)
    .map((cyl) => {
      const len = cyl.geometry.parameters.height;
      const axis = new THREE.Vector3(0, 1, 0).applyQuaternion(cyl.quaternion).normalize();
      const start = cyl.position.clone().addScaledVector(axis, -len / 2);
      const end = cyl.position.clone().addScaledVector(axis, len / 2);
      return {
        id: cyl.userData.coreId,
        name: cyl.userData.name,
        meta: cyl.userData.meta,
        start,
        end,
      };
    });
}

/** Largest distance between points, measured across the cable axis. */
function lateralSpan(points, origin, dir) {
  const perp = points.map((point) => {
    const rel = point.clone().sub(origin);
    return rel.addScaledVector(dir, -rel.dot(dir));
  });
  let max = 0;
  for (let i = 0; i < perp.length; i++) {
    for (let j = i + 1; j < perp.length; j++) {
      max = Math.max(max, perp[i].distanceTo(perp[j]));
    }
  }
  return max;
}

function radial(point, origin, dir) {
  const rel = point.clone().sub(origin);
  return rel.addScaledVector(dir, -rel.dot(dir)).length();
}

function checkFan(label, spec, outward) {
  const cores = coreColorsFor(spec);
  const radius = sheathDiameterM(spec.cores, spec.mm2, spec.typeId) / 2;
  const tip = new THREE.Vector3(0.12, -0.04, 0.08);
  const dir = outward.clone().normalize();
  const group = createWireEndFan(tip, dir, cores, radius);
  const segs = coreSegments(group);

  assert(group.name === "Aderenden", `${label}: Gruppe heißt Aderenden`);
  assert(segs.length === cores.length, `${label}: ${cores.length} Adern im Fächer`);
  for (const seg of segs) {
    assert(seg.name === `Ader ${cores.find((core) => core.id === seg.id).label}`, `${label}: Bezeichnung ${seg.name}`);
    assert(seg.meta === "Aderende zum Verklemmen", `${label}: Hinweis Aderende zum Verklemmen`);
  }

  const startSpan = lateralSpan(segs.map((seg) => seg.start), tip, dir);
  const endSpan = lateralSpan(segs.map((seg) => seg.end), tip, dir);
  const sheathMm = (radius * 2) / MM;
  console.log(
    `  ${label}: Mund ${(startSpan / MM).toFixed(1)} mm, Ende ${(endSpan / MM).toFixed(1)} mm, Mantel ${sheathMm.toFixed(1)} mm`,
  );

  if (cores.length === 1) {
    assert(startSpan < 1 * MM && endSpan < 1 * MM, `${label}: gerader Stummel ohne Fächer`);
  } else {
    assert(endSpan > radius * 2 * 2, `${label}: Endspan deutlich größer als der Mantel`);
    assert(startSpan < radius * 2, `${label}: Mundspan enger als der Manteldurchmesser`);
    assert(startSpan < endSpan * 0.35, `${label}: Mund deutlich enger als das Ende`);
    for (const seg of segs) {
      assert(radial(seg.start, tip, dir) < radius, `${label}: ${seg.name} beginnt innerhalb des Mantels`);
      const along = seg.end.clone().sub(seg.start).dot(dir);
      assert(along > 80 * MM && along < 90 * MM, `${label}: Stummel ${(along / MM).toFixed(1)} mm`);
    }
    const outer = Math.max(...segs.map((seg) => radial(seg.end, tip, dir)));
    assert(outer > 22 * MM && outer < 33 * MM, `${label}: Außenader ${(outer / MM).toFixed(1)} mm neben der Achse`);
  }

  if (cores.length >= 5) {
    assert(endSpan >= 40 * MM, `${label}: Außenadern mindestens 40 mm auseinander (${(endSpan / MM).toFixed(1)} mm)`);
  }

  const pe = segs.find((seg) => seg.id === "pe");
  if (pe) {
    const stripe = group.children.find((child) => child.material?.color?.getHex?.() === 0x3d7a28);
    assert(stripe, `${label}: grün-gelbe PE-Ader trägt den grünen Streifen`);
    const axis = pe.end.clone().sub(pe.start);
    const len = axis.length();
    axis.normalize();
    const rel = stripe.position.clone().sub(pe.start);
    const along = rel.dot(axis);
    const off = rel.clone().addScaledVector(axis, -along).length();
    assert(off < 1 * MM, `${label}: PE-Streifen folgt der Ader`);
    assert(along > 0.25 * len && along < 0.5 * len, `${label}: PE-Streifen liegt auf der Ader`);
    const stripeAxis = new THREE.Vector3(0, 1, 0).applyQuaternion(stripe.quaternion);
    assert(stripeAxis.dot(axis) > 0.99, `${label}: PE-Streifen in Aderichtung`);
  }
}

checkFan("3-adrig", { typeId: "nym-j", cores: 3, mm2: 1.5 }, new THREE.Vector3(0, 0, 1));
checkFan("5-adrig", { typeId: "nym-j", cores: 5, mm2: 2.5 }, new THREE.Vector3(1, 0, 0));
checkFan("Einzelader", { typeId: "h07v-u", cores: 1, mm2: 2.5, coreColor: "blau" }, new THREE.Vector3(0, 1, 0));

if (!process.exitCode) console.log("\nAderenden-Fächer geprüft.");
