import { GRID_PITCH, MM, TE } from "./units.js";

/**
 * E-Box outer envelope from ehandwerkshop.de/produkt/e-box/:
 * Breite 102 cm × Tiefe 51 cm × Höhe 54 cm.
 * Wandlochrasterplatte: 25 × 510 × 1020 mm.
 */
export const EBOX = {
  width: 1020 * MM,
  depth: 510 * MM,
  height: 540 * MM,
  panelThickness: 25 * MM,
  frame: 22 * MM,
  /** Visual / snap pitch for mounting (Aufmaß). */
  pitch: GRID_PITCH,
};

/** Table the E-Box sits on. */
export const WORKBENCH = {
  width: 1400 * MM,
  depth: 800 * MM,
  thickness: 36 * MM,
  height: 780 * MM,
  leg: 45 * MM,
  overhang: 40 * MM,
};

/** Inner clear opening of a face panel (frame inset). */
export const PANEL_INNER = {
  backW: EBOX.width - 2 * EBOX.frame,
  backH: EBOX.height - 2 * EBOX.frame,
  sideD: EBOX.depth - EBOX.frame,
  sideH: EBOX.height - 2 * EBOX.frame,
  floorW: EBOX.width - 2 * EBOX.frame,
  floorD: EBOX.depth - EBOX.frame,
};

/** World Y of the E-Box floor top (on the table). */
export const EBOX_FLOOR_Y = WORKBENCH.height;
export const EBOX_CENTER_Y = EBOX_FLOOR_Y + EBOX.height / 2;
export const EBOX_BACK_Z = 0;
export const EBOX_FRONT_Z = EBOX.depth;

/** Legacy aliases used by older modules during the transition. */
export const GRID = {
  cellsX: Math.round(PANEL_INNER.backW / GRID_PITCH),
  cellsY: Math.round(PANEL_INNER.backH / GRID_PITCH),
  pitch: GRID_PITCH,
  wire: 4 * MM,
  frame: EBOX.frame,
  frameDepth: EBOX.panelThickness,
};

export const GRID_INNER_W = PANEL_INNER.backW;
export const GRID_INNER_H = PANEL_INNER.backH;
export const GRID_BOTTOM_Y = EBOX_FLOOR_Y + EBOX.frame;
export const GRID_CENTER_Y = EBOX_CENTER_Y;
export const GRID_Z = EBOX_BACK_Z;

/**
 * Aufputz-Kleinverteiler, 3 Reihen × 12 TE.
 * Proportionen eines üblichen 3×12-Gehäuses (etwa 305 × 515 × 97 mm),
 * die Höhe bleibt in der lichten E-Box-Öffnung.
 */
export const UV = {
  te: 12,
  rows: 3,
  outerW: 305 * MM,
  outerH: 480 * MM,
  outerD: 96.5 * MM,
  wall: 8 * MM,
  railPitch: 118 * MM,
  railLength: 12 * TE,
  slotH: 46 * MM,
  dinWidth: 35 * MM,
  dinHeight: 7.5 * MM,
};

/** UV on the back wall, slightly left of center, open toward +Z. */
export const UV_POSITION = {
  x: -80 * MM,
  y: EBOX_FLOOR_Y + EBOX.frame + UV.outerH / 2 + 40 * MM,
  z: EBOX.panelThickness / 2 + UV.outerD / 2 + 4 * MM,
};
