import { PLAN_M6_P01 } from "./m6-p01.js";
import { buildPlanInScene } from "./builder.js";
import { capturePlanFromScene } from "./captureFromScene.js";
import { renderAufbauplanSvg } from "./aufbauplanSvg.js";
import { renderStromlaufplanSvg } from "./stromlaufplanSvg.js";
import { klemmenlisteToCsv, renderKlemmenlisteHtml } from "./klemmenliste.js";

/** Example template only — live plan is generated from the 3D scene. */
export const BUILTIN_PLANS = [PLAN_M6_P01];

export { capturePlanFromScene };

export function getPlan(id) {
  return BUILTIN_PLANS.find((p) => p.id === id) || null;
}

export function parsePlanJson(text) {
  const data = typeof text === "string" ? JSON.parse(text) : text;
  if (!data || !Array.isArray(data.placements)) {
    throw new Error("Ungültiger Plan: placements[] fehlt");
  }
  return {
    id: data.id || `import-${Date.now()}`,
    title: data.title || "Importierter Aufbauplan",
    planNr: data.planNr || "IMPORT",
    modul: data.modul || "",
    blatt: data.blatt || "01",
    faces: data.faces || PLAN_M6_P01.faces,
    legend: data.legend || [],
    placements: data.placements,
    circuits: data.circuits || [],
    terminals: data.terminals || [],
  };
}

export function exportPlanJson(plan) {
  return JSON.stringify(plan, null, 2);
}

export {
  buildPlanInScene,
  renderAufbauplanSvg,
  renderStromlaufplanSvg,
  renderKlemmenlisteHtml,
  klemmenlisteToCsv,
  PLAN_M6_P01,
};
