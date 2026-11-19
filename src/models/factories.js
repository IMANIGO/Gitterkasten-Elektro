import { materials } from "../materials.js";
import { createCableClamp } from "./cableClamp.js";
import { createControlStation } from "./controlStation.js";
import {
  createCeeOutlet,
  createJunctionBox,
  createLuminaire,
  createMcb1p,
  createMcb3p,
  createOutlet,
  createRcbo1p,
  createRcd4p,
  createTerminalDouble,
  createTerminalDoubleN,
  createTerminalL,
  createTerminalN,
  createTerminalPe,
} from "./devices.js";
import { createDistributionBoard } from "./distributionBoard.js";
import {
  createPushbutton,
  createSeries,
  createSwitch,
  createSwitchCross,
  createSwitchOff,
} from "./rockers.js";

const FACTORIES = {
  distributionBoard: (opts) => createDistributionBoard({ includeSampleTerminals: false, ...opts }),
  mcb1p: createMcb1p,
  mcb3p: createMcb3p,
  rcd4p: createRcd4p,
  rcbo1p: createRcbo1p,
  terminalL: createTerminalL,
  terminalN: createTerminalN,
  terminalPe: createTerminalPe,
  terminalDouble: createTerminalDouble,
  terminalDoubleN: createTerminalDoubleN,
  outlet: createOutlet,
  switch: createSwitch,
  switchOff: createSwitchOff,
  switchCross: createSwitchCross,
  pushbutton: createPushbutton,
  seriesAusAus: (opts) => createSeries("serie-aus-aus", "AP-Serie Aus + Aus", ["aus", "aus"], opts),
  seriesWechselWechsel: (opts) =>
    createSeries("serie-wechsel-wechsel", "AP-Serie Wechsel + Wechsel", ["wechsel", "wechsel"], opts),
  seriesKreuzWechsel: (opts) =>
    createSeries("serie-kreuz-wechsel", "AP-Serie Kreuz + Wechsel", ["kreuz", "wechsel"], opts),
  seriesTasterTaster: (opts) =>
    createSeries("serie-taster-taster", "AP-Serie Taster + Taster", ["taster", "taster"], opts),
  seriesWechselTaster: (opts) =>
    createSeries("serie-wechsel-taster", "AP-Serie Wechsel + Taster", ["wechsel", "taster"], opts),
  seriesAusTaster: (opts) =>
    createSeries("serie-aus-taster", "AP-Serie Aus + Taster", ["aus", "taster"], opts),
  seriesKreuzTaster: (opts) =>
    createSeries("serie-kreuz-taster", "AP-Serie Kreuz + Taster", ["kreuz", "taster"], opts),
  ceeOutlet: createCeeOutlet,
  luminaire: createLuminaire,
  junctionBox: createJunctionBox,
  cableClamp: createCableClamp,
  controlStation: (opts) => createControlStation(opts),
};

export function createFromFactory(factoryName, opts = {}) {
  const fn = FACTORIES[factoryName];
  if (!fn) return null;
  return fn(opts);
}

export function createGhostFromFactory(factoryName, opts = {}) {
  const object = createFromFactory(factoryName, { ...opts, ghost: true });
  if (!object) return null;
  // Steuerstelle behält die farbigen Einsätze, nur das Gehäuse ist durchscheinend.
  if (factoryName === "controlStation") return object;
  object.traverse((child) => {
    if (!child.isMesh || !child.material) return;
    child.material = materials.ghost.clone();
  });
  return object;
}
