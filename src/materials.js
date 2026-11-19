import * as THREE from "three";

export const materials = {
  steel: new THREE.MeshStandardMaterial({
    color: 0x8a9096,
    metalness: 0.85,
    roughness: 0.35,
  }),
  /** E-Box frame — light industrial grey (near RAL 9006 / galvanized). */
  eboxFrame: new THREE.MeshStandardMaterial({
    color: 0xc4c8cd,
    metalness: 0.55,
    roughness: 0.42,
  }),
  frame: new THREE.MeshStandardMaterial({
    color: 0x7a8086,
    metalness: 0.55,
    roughness: 0.45,
  }),
  wire: new THREE.MeshStandardMaterial({
    color: 0x9aa2aa,
    metalness: 0.9,
    roughness: 0.28,
  }),
  wood: new THREE.MeshStandardMaterial({
    color: 0xb08958,
    metalness: 0.0,
    roughness: 0.72,
  }),
  woodEdge: new THREE.MeshStandardMaterial({
    color: 0x7a5a32,
    metalness: 0.0,
    roughness: 0.8,
  }),
  concrete: new THREE.MeshStandardMaterial({
    color: 0x8a8680,
    metalness: 0.05,
    roughness: 0.92,
  }),
  housing: new THREE.MeshStandardMaterial({
    color: 0xc5c7c4,
    metalness: 0.15,
    roughness: 0.55,
  }),
  interior: new THREE.MeshStandardMaterial({
    color: 0xe6e4d8,
    metalness: 0.04,
    roughness: 0.7,
  }),
  din: new THREE.MeshStandardMaterial({
    color: 0xcfd5db,
    metalness: 0.82,
    roughness: 0.28,
  }),
  pe: new THREE.MeshStandardMaterial({
    color: 0xc7a81a,
    metalness: 0.1,
    roughness: 0.45,
  }),
  peStripe: new THREE.MeshStandardMaterial({
    color: 0x3d7a28,
    metalness: 0.1,
    roughness: 0.45,
  }),
  n: new THREE.MeshStandardMaterial({
    color: 0x1f6fb2,
    metalness: 0.1,
    roughness: 0.45,
  }),
  brass: new THREE.MeshStandardMaterial({
    color: 0xc4a35a,
    metalness: 0.85,
    roughness: 0.28,
  }),
  screw: new THREE.MeshStandardMaterial({
    color: 0x3a3a3a,
    metalness: 0.7,
    roughness: 0.35,
  }),
  terminalGray: new THREE.MeshStandardMaterial({
    color: 0x8d9094,
    metalness: 0.05,
    roughness: 0.5,
  }),
  terminalBlue: new THREE.MeshStandardMaterial({
    color: 0x2a6fad,
    metalness: 0.05,
    roughness: 0.5,
  }),
  terminalPe: new THREE.MeshStandardMaterial({
    color: 0x6b8f2e,
    metalness: 0.05,
    roughness: 0.5,
  }),
  duct: new THREE.MeshStandardMaterial({
    color: 0x9aa0a4,
    metalness: 0.05,
    roughness: 0.55,
  }),
  plasticBlack: new THREE.MeshStandardMaterial({
    color: 0x222426,
    metalness: 0.1,
    roughness: 0.5,
  }),
};

export function cloneMaterial(mat) {
  return mat.clone();
}
