import { materials } from "../materials.js";
import { createCableClamp } from "./cableClamp.js";
import {
  createMcb1p,
  createMcb3p,
  createOutlet,
  createRcd4p,
  createSwitch,
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
  terminalL: createTerminalL,
  terminalN: createTerminalN,
  terminalPe: createTerminalPe,
  outlet: createOutlet,
  switch: createSwitch,
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
  // Ensure UV / complex groups also look ghosted
  object.traverse((child) => {
    if (!child.isMesh || !child.material) return;
    child.material = materials.ghost.clone();
  });
  return object;
}
