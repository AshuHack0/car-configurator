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
  // Mesh names first, then material names as a fallback (the source GLB ships every
  // material with identical metalness 0.2 / roughness 0.8, which reads as plastic).
  surfaces: {
    // Exterior
    glass: { kind: 'glass', color: '#d3d9de' },
    Glass_Gray: { kind: 'glass', color: '#d3d9de' },
    lights: { kind: 'lens', color: '#ffffff', roughness: 0.02 },
    Projector_Glass: { kind: 'lens', color: '#ffffff', roughness: 0.02 },
    lights_red: { kind: 'lens', color: '#b0000b', roughness: 0.06 },
    Taillight_Glass: { kind: 'lens', color: '#b0000b', roughness: 0.06 },
    leds: { kind: 'accent', roughness: 0.15 },
    chrome: { kind: 'chrome' },
    metal_chrome: { kind: 'chrome' },
    metal: { kind: 'metal', color: '#8a8d92', roughness: 0.35 },
    grills: { kind: 'plastic', color: '#0d0e10', roughness: 0.45 },
    wipers: { kind: 'plastic', color: '#0b0c0d', roughness: 0.55 },
    plastic_gray: { kind: 'plastic', color: '#1a1b1d', roughness: 0.6 },
    yellow_trim: { kind: 'accent' },
    blue: { kind: 'accent' },
    // Wheels
    tire: { kind: 'rubber' },
    Tires: { kind: 'rubber' },
    wheel: { kind: 'alloy', color: '#b4b8be' },
    rim_fl: { kind: 'alloy', color: '#b4b8be' },
    rim_fr: { kind: 'alloy', color: '#b4b8be' },
    rim_rl: { kind: 'alloy', color: '#b4b8be' },
    rim_rr: { kind: 'alloy', color: '#b4b8be' },
    brake: { kind: 'metal', color: '#5f6267', roughness: 0.48 },
    nuts: { kind: 'chrome', roughness: 0.12 },
    centre: { kind: 'accent' },
    metal_gray: { kind: 'metal' },
    // Interior
    leather: { kind: 'leather' },
    Leather: { kind: 'leather' },
    Leather_red: { kind: 'leather' },
    trim: { kind: 'leather' },
    carpet: { kind: 'fabric', color: '#262628' },
    Carpet: { kind: 'fabric', color: '#262628' },
    Interior_dark: { kind: 'plastic', roughness: 0.75 },
    Interior_light: { kind: 'plastic', roughness: 0.75 },
    Carbon_Fiber: { kind: 'carbon' },
    Ferrari_Yellow: { kind: 'accent' },
  },
  // Framed for a ~30° lens: a longer lens flattens perspective like product photography.
  camera: { distance: 9.2, target: [0, 0.55, 0] },
};

/*
 * Real vehicle bodies. Source GLBs live in assets-src/vehicles/ and are converted by
 * `npm run prepare:vehicles` (scripts/prepare-vehicles.mjs), which scales them to real size, puts
 * the tyres on y = 0, names the wheels wheel_fl/fr/rl/rr and brakes brake_*, and compresses them.
 * Both face +Z. Group names starting with "mat:" match by material name.
 * Attachment offsets are in model space, so on these +Z-facing cars "into the car" is -Z at the
 * front and +Z at the rear — the opposite of the -Z-facing stand-in above.
 */
const BMW_M4_G82: VehicleAssetConfig = {
  id: 'bmw-m4-g82',
  label: 'BMW M4 Competition (G82)',
  modelUrl: '/models/vehicles/bmw-m4-g82.glb',
  credit: '"BMW M4 Competition 2021" by 3DCars4U (Sketchfab, CC BY 4.0)',
  sourceUrl: 'https://sketchfab.com/3d-models/bmw-m4-competition-2021-3e3e2c71612a476fab22d40758854b8e',
  standIn: false,
  generations: ['G82'],
  vehicles: ['bmw-m4-g82'],
  shortLabel: 'BMW M4 (G82)',
  forward: '+z',
  scale: 1,
  paintMaterial: '025_0_25',
  wheels: { nodes: ['wheel_fl', 'wheel_fr', 'wheel_rl', 'wheel_rr'], keep: /brake/i },
  bodyMeshes: ['body'],
  attachments: {
    spoiler: { from: [0, 3, -2.0], dir: [0, -1, 0], offset: [0, -0.004, 0] },
    frontLower: { from: [0, 0.22, 4], dir: [0, 0, -1], offset: [0, -0.07, -0.02] },
    rearLower: { from: [0, 0.3, -4], dir: [0, 0, 1], offset: [0, -0.06, 0.04] },
    roof: { from: [0, 3, -0.1], dir: [0, -1, 0], offset: [0, -0.004, 0] },
    exhaust: { from: [0.5, 0.3, -4], dir: [0, 0, 1], offset: [0, 0, -0.02], mirrorX: true },
  },
  sideSkirt: { height: 0.16, inset: 0.04, gapFactor: 1.15 },
  meshGroups: {
    taillights: ['mat:red_glass'],
    carbonTrim: [],
  },
  surfaces: {
    'mat:025_0_25': { kind: 'accent' }, // body paint is swapped for the live paint material; kept for safety
    'mat:glass': { kind: 'glass', color: '#cfd6db' },
    'mat:red_glass': { kind: 'lens', color: '#a8000c', roughness: 0.05 },
    'mat:black': { kind: 'glossPlastic', color: '#08090a' },
    'mat:chrome': { kind: 'metal', roughness: 0.22 },
    'mat:chrome_2': { kind: 'alloy', color: '#1b1c1f', roughness: 0.32 },
    'mat:chrome_wh': { kind: 'accent', color: '#b0121b' },
    'mat:wheel': { kind: 'rubber' },
    'mat:plate': { kind: 'plastic', color: '#e8e8e8', roughness: 0.5 },
    'mat:107_0_107': { kind: 'plastic', roughness: 0.75 },
    'mat:061_0_61': { kind: 'metal', color: '#6d7075', roughness: 0.45 },
  },
  support: {
    wheels: 'replace',
    spoiler: 'attach',
    frontBumper: 'attach',
    rearBumper: 'attach',
    diffuser: 'attach',
    sideSkirts: 'attach',
    exhaust: 'none',
    roof: 'attach',
    taillights: 'material',
    grille: 'none',
    headlights: 'none',
    carbonTrim: 'none',
    mirrors: 'none',
  },
  unsupportedNotes: {
    exhaust: 'The four factory exhaust tips are part of the bumper on this 3D model and cannot be removed, so new tips cannot be fitted in 3D yet.',
    grille: 'The kidney grille shares its material with other black trim on this 3D model, so it cannot be re-skinned on its own yet.',
    headlights: 'The headlight lenses are part of the shared glass on this 3D model, so tints cannot be previewed in 3D yet.',
    carbonTrim: 'Carbon trim is not split out on this 3D model yet.',
    mirrors: 'Mirrors are part of the body mesh on this 3D model, so the caps cannot be swapped in 3D yet.',
  },
  camera: { distance: 9.8, target: [0, 0.62, 0] },
};

const PORSCHE_911_991: VehicleAssetConfig = {
  id: 'porsche-911-991',
  label: 'Porsche 911 Carrera 4S (991)',
  modelUrl: '/models/vehicles/porsche-911-991.glb',
  credit: '"(FREE) Porsche 911 Carrera 4S" by Lionsharp Studios (Sketchfab, CC BY-SA 4.0)',
  sourceUrl: 'https://sketchfab.com/3d-models/free-porsche-911-carrera-4s-d01b254483794de3819786d93e0e1ebf',
  standIn: false,
  generations: ['991'],
  vehicles: ['porsche-911'],
  shortLabel: 'Porsche 911 (991)',
  forward: '+z',
  scale: 1,
  paintMaterial: 'paint',
  wheels: { nodes: ['wheel_fl', 'wheel_fr', 'wheel_rl', 'wheel_rr'], keep: /brake/i },
  bodyMeshes: ['vehicle'],
  attachments: {
    spoiler: { from: [0, 3, -1.78], dir: [0, -1, 0], offset: [0, -0.004, 0] },
    frontLower: { from: [0, 0.2, 4], dir: [0, 0, -1], offset: [0, -0.06, -0.02] },
    rearLower: { from: [0, 0.28, -4], dir: [0, 0, 1], offset: [0, -0.06, 0.04] },
    roof: { from: [0, 3, -0.15], dir: [0, -1, 0], offset: [0, -0.004, 0] },
    exhaust: { from: [0.45, 0.3, -4], dir: [0, 0, 1], offset: [0, 0, -0.02], mirrorX: true },
  },
  sideSkirt: { height: 0.15, inset: 0.04, gapFactor: 1.15 },
  meshGroups: {
    headlightLeds: ['mat:lights'],
    headlightGlass: ['mat:glass'],
    taillights: ['Plane.001'],
  },
  surfaces: {
    'mat:full_black': { kind: 'plastic', color: '#0b0b0c', roughness: 0.6 },
    'mat:plastic': { kind: 'plastic', color: '#111214', roughness: 0.5 },
    'mat:silver': { kind: 'alloy', color: '#c3c6cb', roughness: 0.22 },
    'mat:rubber': { kind: 'rubber' },
    'mat:Material.001': { kind: 'accent', color: '#e0601a' },
    'mat:window': { kind: 'glass', color: '#cfd6db' },
    'mat:glass': { kind: 'lens', color: '#ffffff', roughness: 0.02 },
    'mat:lights': { kind: 'chrome', roughness: 0.06 },
  },
  support: {
    wheels: 'replace',
    spoiler: 'attach',
    frontBumper: 'attach',
    rearBumper: 'attach',
    diffuser: 'attach',
    sideSkirts: 'attach',
    exhaust: 'attach',
    roof: 'attach',
    headlights: 'material',
    taillights: 'material',
    grille: 'none',
    carbonTrim: 'none',
    mirrors: 'none',
  },
  unsupportedNotes: {
    grille: 'The 911 has no front grille to re-skin.',
    carbonTrim: 'Carbon trim is not split out on this 3D model yet.',
    mirrors: 'Mirrors are part of the body mesh on this 3D model, so the caps cannot be swapped in 3D yet.',
  },
  camera: { distance: 9.4, target: [0, 0.58, 0] },
  renders: {
    base: '/renders/porsche-911',
    paints: ['factory', 'gloss-black', 'matte-black', 'pearl-white', 'metallic-silver', 'racing-red', 'midnight-blue'],
    views: ['threeQuarter', 'wheel', 'side', 'rearQuarter', 'top', 'front', 'rear'],
  },
};

export const VEHICLE_ASSETS: Record<string, VehicleAssetConfig> = {
  [STAND_IN.id]: STAND_IN,
  [BMW_M4_G82.id]: BMW_M4_G82,
  [PORSCHE_911_991.id]: PORSCHE_911_991,
};

/** Every asset whose model needs a credit line (CC licences). */
export const ASSET_CREDITS = Object.values(VEHICLE_ASSETS).map((a) => ({ credit: a.credit, url: a.sourceUrl }));

export function getAssetConfig(assetId: string): VehicleAssetConfig {
  return VEHICLE_ASSETS[assetId] ?? STAND_IN;
}
