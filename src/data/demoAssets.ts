import type { VehicleAssetConfig } from '@/types/vehicle';

/**
 * 3D asset configurations, one per vehicle GLB.
 *
 * To add a licensed model for a specific car (e.g. a real E-Class W213):
 *   1. Drop the GLB into public/models/vehicles/.
 *   2. Copy STAND_IN below, set `modelUrl`, `standIn: false`, the wheel node
 *      names, paint material and attachment rays for that file.
 *   3. Point the vehicle's `assetId` (src/data/vehicles.ts) at the new config.
 * The viewer, wheel replacement and attachment systems need no code changes.
 */
const STAND_IN: VehicleAssetConfig = {
  id: 'studio-coupe',
  label: 'Studio stand-in model',
  modelUrl: '/models/vehicles/ferrari.glb',
  credit: '"Ferrari 458 Italia" by vicent091036 (Sketchfab, CC BY 4.0), via the three.js examples',
  standIn: true,
  forward: '-z',
  scale: 1,
  paintMaterial: 'Body_Color',
  wheels: { nodes: ['wheel_fl', 'wheel_fr', 'wheel_rl', 'wheel_rr'], keep: /brake/i },
  bodyMeshes: ['body', 'trim', 'plastic_gray', 'grills', 'metal', 'interior_light', 'interior_dark', 'carbon_fibre'],
  attachments: {
    spoiler: { from: [0, 3, 1.97], dir: [0, -1, 0], offset: [0, -0.006, 0] },
    frontLower: { from: [0, 0.2, -4], dir: [0, 0, 1], offset: [0, -0.06, 0.02] },
    rearLower: { from: [0, 0.3, 4], dir: [0, 0, -1], offset: [0, -0.06, -0.1] },
    roof: { from: [0, 3, 0.15], dir: [0, -1, 0], offset: [0, -0.004, 0] },
    // No ray: the tail is open around the outlets on this model, so the tips are placed explicitly.
    exhaust: { from: [0.24, 0.29, 2.13], mirrorX: true },
  },
  sideSkirt: { height: 0.11, inset: 0.05, gapFactor: 1.2 },
  meshGroups: {
    grille: ['grills'],
    headlightLeds: ['leds'],
    headlightGlass: ['lights'],
    taillights: ['lights_red'],
    accentTrim: ['yellow_trim'],
    carbonTrim: ['carbon_fibre', 'carbon_fibre_trim'],
  },
  support: {
    wheels: 'replace',
    spoiler: 'attach',
    frontBumper: 'attach',
    rearBumper: 'attach',
    diffuser: 'attach',
    sideSkirts: 'attach',
    grille: 'material',
    headlights: 'material',
    taillights: 'material',
    carbonTrim: 'material',
    exhaust: 'attach',
    roof: 'none',
    mirrors: 'none',
  },
  unsupportedNotes: {
    roof: 'This demo body is an open-top spider with no fixed roof, so roof accessories cannot be mounted in 3D.',
    mirrors: 'Mirrors are fused into the body mesh of this 3D model, so the caps cannot be swapped in 3D yet.',
  },
  camera: { distance: 7.2, target: [0, 0.55, 0] },
};

export const VEHICLE_ASSETS: Record<string, VehicleAssetConfig> = {
  [STAND_IN.id]: STAND_IN,
};

export function getAssetConfig(assetId: string): VehicleAssetConfig {
  return VEHICLE_ASSETS[assetId] ?? STAND_IN;
}
