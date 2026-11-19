import { EBOX, EBOX_FLOOR_Y, PANEL_INNER } from "../layout.js";
import { MM } from "../units.js";
import { getCatalogItem, itemDepthM } from "../catalog/index.js";
import { lochblechStandoff } from "../placement/snap.js";

const CM = 10 * MM;

/**
 * Map Aufbauplan face coordinates (cm) → world pose on the E-Box.
 * Walls: fromTopCm from top edge; sides also fromBackCm; back/floor fromLeftCm.
 */
export function poseFromPlanPlacement(placement) {
  const item = getCatalogItem(placement.catalogId);
  const depth = item ? itemDepthM(item) : 45 * MM;
  const standoff = lochblechStandoff(depth, {
    catalogId: item?.id || placement.catalogId,
    factory: item?.factory,
  });
  const T = EBOX.panelThickness;
  const face = placement.face;

  if (face === "back") {
    const fromLeft = (placement.fromLeftCm ?? 0) * CM;
    const fromTop = (placement.fromTopCm ?? 0) * CM;
    const x = -PANEL_INNER.backW / 2 + fromLeft;
    const y = EBOX_FLOOR_Y + EBOX.height - EBOX.frame - fromTop;
    const z = T + standoff;
    return {
      position: { x, y, z },
      rotation: { x: 0, y: 0, z: 0 },
      face,
      mount: "lochblech",
      feedback: `Plan Rückwand · ${placement.fromLeftCm} cm von links · ${placement.fromTopCm} cm von oben`,
    };
  }

  if (face === "left") {
    const fromBack = (placement.fromBackCm ?? 0) * CM;
    const fromTop = (placement.fromTopCm ?? 0) * CM;
    const z = fromBack;
    const y = EBOX_FLOOR_Y + EBOX.height - EBOX.frame - fromTop;
    const x = -EBOX.width / 2 + T + standoff;
    return {
      position: { x, y, z },
      rotation: { x: 0, y: Math.PI / 2, z: 0 },
      face,
      mount: "lochblech",
      feedback: `Plan Seite links · ${placement.fromBackCm} cm von hinten · ${placement.fromTopCm} cm von oben`,
    };
  }

  if (face === "right") {
    const fromBack = (placement.fromBackCm ?? 0) * CM;
    const fromTop = (placement.fromTopCm ?? 0) * CM;
    const z = fromBack;
    const y = EBOX_FLOOR_Y + EBOX.height - EBOX.frame - fromTop;
    const x = EBOX.width / 2 - T - standoff;
    return {
      position: { x, y, z },
      rotation: { x: 0, y: -Math.PI / 2, z: 0 },
      face,
      mount: "lochblech",
      feedback: `Plan Seite rechts · ${placement.fromBackCm} cm von hinten · ${placement.fromTopCm} cm von oben`,
    };
  }

  if (face === "floor") {
    const fromLeft = (placement.fromLeftCm ?? 0) * CM;
    const fromBack = (placement.fromBackCm ?? 0) * CM;
    const x = -PANEL_INNER.floorW / 2 + fromLeft;
    const z = fromBack;
    const y = EBOX_FLOOR_Y + T + standoff;
    return {
      position: { x, y, z },
      rotation: { x: -Math.PI / 2, y: 0, z: 0 },
      face,
      mount: "lochblech",
      feedback: `Plan Boden · ${placement.fromLeftCm} cm von links · ${placement.fromBackCm} cm von hinten`,
    };
  }

  return null;
}
