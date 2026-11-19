import { createFromFactory } from "../models/factories.js";
import { getCatalogItem } from "../catalog/index.js";
import { setState } from "../state.js";
import { poseFromPlanPlacement } from "./poseFromPlan.js";

/**
 * Clear previous plan-built objects and place all placements from a plan.
 * @returns {{ placed: number, skipped: string[] }}
 */
export function buildPlanInScene(plan, placedRoot) {
  // Remove previous plan instances
  const toRemove = [];
  placedRoot.traverse((o) => {
    if (o.userData?.fromPlan) toRemove.push(o);
  });
  for (const o of toRemove) o.removeFromParent();

  const skipped = [];
  let placed = 0;

  for (const p of plan.placements || []) {
    const item = getCatalogItem(p.catalogId);
    if (!item?.placeable || !item.factory) {
      skipped.push(p.tag || p.catalogId);
      continue;
    }
    const pose = poseFromPlanPlacement(p);
    if (!pose) {
      skipped.push(p.tag || p.catalogId);
      continue;
    }
    const object = createFromFactory(item.factory);
    if (!object) {
      skipped.push(p.tag || p.catalogId);
      continue;
    }
    placedRoot.add(object);
    object.position.set(pose.position.x, pose.position.y, pose.position.z);
    object.rotation.set(pose.rotation.x, pose.rotation.y, pose.rotation.z);
    object.userData.placed = true;
    object.userData.fromPlan = true;
    object.userData.planTag = p.tag;
    object.userData.catalogId = item.id;
    object.userData.placement = {
      mount: pose.mount,
      face: pose.face,
      feedback: pose.feedback,
      planTag: p.tag,
    };
    if (p.tag) {
      object.userData.name = `${object.userData.name || item.label} (${p.tag})`;
    }
    placed += 1;
  }

  let total = 0;
  placedRoot.traverse((o) => {
    if (o.userData?.placed) total += 1;
  });

  setState({
    activePlanId: plan.id,
    placedCount: total,
    placementFeedback: `Plan ${plan.planNr || plan.id}: ${placed} Bauteile gebaut${
      skipped.length ? ` · übersprungen: ${skipped.join(", ")}` : ""
    }`,
  });

  return { placed, skipped };
}
