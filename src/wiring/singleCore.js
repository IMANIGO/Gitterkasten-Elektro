import * as THREE from "three";
import { UV } from "../layout.js";
import { MM } from "../units.js";

/**
 * Einzelader nur innerhalb eines Betriebsmittels.
 * UV: Laststrom am linken Kanal, Steuerkreis am rechten Kanal.
 */

const HOST_KINDS = new Set(["distributionBoard", "junctionBox", "surfaceDevice"]);

export function findHostEquipment(object) {
  let current = object;
  let host = null;
  while (current) {
    const kind = current.userData?.kind;
    if (kind === "distributionBoard") return current;
    if (HOST_KINDS.has(kind) && current.userData?.placed) host = current;
    current = current.parent;
  }
  return host;
}

export function snapInsideHost(host, worldPoint, circuitKind) {
  if (!host) return worldPoint.clone();
  if (host.userData?.kind === "distributionBoard") {
    return snapUvDuct(host, worldPoint, circuitKind);
  }
  const local = host.worldToLocal(worldPoint.clone());
  const limit = 30 * MM;
  local.x = THREE.MathUtils.clamp(local.x, -limit, limit);
  local.y = THREE.MathUtils.clamp(local.y, -limit, limit);
  local.z = Math.min(local.z, 20 * MM);
  return host.localToWorld(local);
}

function snapUvDuct(uv, worldPoint, circuitKind) {
  const local = uv.worldToLocal(worldPoint.clone());
  const innerW = UV.outerW - 2 * UV.wall;
  const innerH = UV.outerH - 2 * UV.wall;
  const ductX = innerW / 2 - 22 * MM;
  const innerBack = -UV.outerD / 2 + UV.wall + 6 * MM;
  local.x = circuitKind === "steuer" ? ductX : -ductX;
  local.z = innerBack + 22 * MM;
  const yLimit = innerH / 2 - 24 * MM;
  local.y = THREE.MathUtils.clamp(local.y, -yLimit, yLimit);
  return uv.localToWorld(local);
}
