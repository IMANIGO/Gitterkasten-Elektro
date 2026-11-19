import { materials } from "../materials.js";
import { createCableClamp } from "./cableClamp.js";
import {
  createJunctionBox,
  createMcb1p,
  createMcb3p,
  createOutlet,
  createPushbutton,
  createRcbo1p,
  createRcd4p,
  createSwitch,
  createTerminalDouble,
  createTerminalDoubleN,
  createTerminalL,
  createTerminalN,
  createTerminalPe,
} from "./devices.js";
import { createDistributionBoard } from "./distributionBoard.js";

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
  pushbutton: createPushbutton,
  junctionBox: createJunctionBox,
  cableClamp: createCableClamp,
};

export function createFromFactory(factoryName, opts = {}) {
  const fn = FACTORIES[factoryName];
  if (!fn) return null;
  return fn(opts);
}

export function createGhostFromFactory(factoryName) {
  const object = createFromFactory(factoryName, { ghost: true });
  if (!object) return null;
  object.traverse((child) => {
    if (!child.isMesh || !child.material) return;
    child.material = materials.ghost.clone();
  });
  return object;
}
