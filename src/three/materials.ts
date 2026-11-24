import * as THREE from 'three';
import type { Finish, MaterialOverride } from '@/types/product';
import type { ResolvedPaint } from '@/hooks/useConfigurator';
import type { SurfacePreset } from '@/types/vehicle';

let carbonTexture: THREE.CanvasTexture | null = null;

/** 2×2 twill weave drawn on a canvas — no image download needed. */
function getCarbonTexture() {
  if (carbonTexture) return carbonTexture;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#0d0e10';
  ctx.fillRect(0, 0, size, size);
  const cell = size / 8;
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const horizontal = ((x + y) >> 1) % 2 === 0;
      const g = horizontal
        ? ctx.createLinearGradient(x * cell, y * cell, x * cell, (y + 1) * cell)
        : ctx.createLinearGradient(x * cell, y * cell, (x + 1) * cell, y * cell);
      g.addColorStop(0, '#16181b');
      g.addColorStop(0.5, '#3a3d42');
      g.addColorStop(1, '#141518');
      ctx.fillStyle = g;
      ctx.fillRect(x * cell + 0.5, y * cell + 0.5, cell - 1, cell - 1);
    }
  }
  carbonTexture = new THREE.CanvasTexture(canvas);
  carbonTexture.wrapS = carbonTexture.wrapT = THREE.RepeatWrapping;
  carbonTexture.repeat.set(10, 10);
  carbonTexture.colorSpace = THREE.SRGBColorSpace;
  carbonTexture.anisotropy = 4;
  return carbonTexture;
}

/** "high" uses refractive glass (transmission); "low" (phones) uses cheap alpha-blended glass. */
export type RenderQuality = 'high' | 'low';

export interface MaterialLibrary {
  paint: THREE.MeshPhysicalMaterial;
  carbon: THREE.MeshPhysicalMaterial;
  glossBlack: THREE.MeshPhysicalMaterial;
  chrome: THREE.MeshStandardMaterial;
  aluminium: THREE.MeshStandardMaterial;
  titanium: THREE.MeshStandardMaterial;
  rubber: THREE.MeshPhysicalMaterial;
  /** Diamond-cut alloy: bright, fine-grained metal on wheel lips and bezels. */
  machined: THREE.MeshPhysicalMaterial;
  dispose: () => void;
}

/**
 * Automotive paint: base coat under a mirror-smooth clear coat. Metallic paints
 * get their look from base metalness/roughness; flake detail is invisible at
 * configurator viewing distance and only adds shimmer when rendered.
 */
function createCarPaint() {
  return new THREE.MeshPhysicalMaterial({
    name: 'Runtime_Paint', clearcoat: 1, clearcoatRoughness: 0.03, specularIntensity: 1, envMapIntensity: 0.7,
  });
}

export function createMaterialLibrary(): MaterialLibrary {
  const paint = createCarPaint();
  const rubber = new THREE.MeshPhysicalMaterial({
    // Used rubber with a film of road dust, not pure black (matches the Volvo's own tyres).
    name: 'Runtime_Rubber', color: '#2a2927', metalness: 0, roughness: 0.93, sheen: 0.3, sheenRoughness: 0.85, sheenColor: '#55524c',
  });
  const machined = new THREE.MeshPhysicalMaterial({
    name: 'Runtime_Machined', color: '#d4d7db', metalness: 1, roughness: 0.16, clearcoat: 0.6, clearcoatRoughness: 0.08,
  });
  const carbon = new THREE.MeshPhysicalMaterial({
    // Dark resin weave under a glossy lacquer: the colour comes from the weave, the shine from the
    // clear coat. (Metalness made it mirror the sky and read as silver outdoors.)
    name: 'Runtime_Carbon', map: getCarbonTexture(), color: '#ffffff', metalness: 0.05, roughness: 0.6, specularIntensity: 0.4,
    // A slightly softer, thinner lacquer: crisp enough to shine, without mirroring the whole sky.
    clearcoat: 0.7, clearcoatRoughness: 0.14,
  });
  const glossBlack = new THREE.MeshPhysicalMaterial({
    name: 'Runtime_GlossBlack', color: '#050506', metalness: 0.2, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.02,
  });
  const chrome = new THREE.MeshStandardMaterial({ name: 'Runtime_Chrome', color: '#ffffff', metalness: 1, roughness: 0.04 });
  const aluminium = new THREE.MeshStandardMaterial({ name: 'Runtime_Alu', color: '#1b1c1f', metalness: 0.85, roughness: 0.42 });
  const titanium = new THREE.MeshStandardMaterial({ name: 'Runtime_Titanium', color: '#9b8fb3', metalness: 1, roughness: 0.18 });
  const all = [paint, carbon, glossBlack, chrome, aluminium, titanium, rubber, machined];
  return { paint, carbon, glossBlack, chrome, aluminium, titanium, rubber, machined, dispose: () => all.forEach((m) => m.dispose()) };
}

export function applyPaint(material: THREE.MeshPhysicalMaterial, paint: ResolvedPaint) {
  // Kept deliberately mild: the body shows its own colour first, with only a faint, softened
  // mirror of the surroundings in the lacquer.
  material.metalness = paint.metalness * 0.5;
  material.roughness = Math.max(paint.roughness, 0.34);
  material.clearcoat = paint.clearcoat * 0.65;
  material.clearcoatRoughness = Math.max(paint.clearcoatRoughness, 0.1);
}

/**
 * Builds a physically based replacement for one of the vehicle's original
 * materials. Returns the shared library material for carbon; everything else is
 * a new material the caller owns.
 */
export function createSurfaceMaterial(
  source: THREE.Material, preset: SurfacePreset, lib: MaterialLibrary, quality: RenderQuality,
): THREE.Material {
  if (preset.kind === 'carbon') return lib.carbon;
  const base = source as THREE.MeshStandardMaterial;
  const color = new THREE.Color(preset.color ?? base.color ?? '#ffffff');
  const m = new THREE.MeshPhysicalMaterial({ name: `Surface_${source.name}`, color, side: source.side, metalness: 0 });
  const r = preset.roughness;

  switch (preset.kind) {
    case 'glass':
      if (quality === 'high') {
        Object.assign(m, { roughness: r ?? 0, transmission: 1, thickness: 0.01, ior: 1.52, envMapIntensity: 0.3 });
      } else {
        Object.assign(m, { roughness: r ?? 0, transparent: true, opacity: 0.35, depthWrite: false });
        m.color.set('#20262c');
      }
      break;
    case 'lens':
      if (quality === 'high') {
        Object.assign(m, { roughness: r ?? 0.04, transmission: 1, thickness: 0.15, ior: 1.49 });
      } else {
        Object.assign(m, { roughness: r ?? 0.04, transparent: true, opacity: 0.6, depthWrite: false });
      }
      break;
    case 'chrome':
      Object.assign(m, { metalness: 1, roughness: r ?? 0.04 });
      break;
    case 'alloy':
      Object.assign(m, { metalness: 1, roughness: r ?? 0.24, clearcoat: 0.6, clearcoatRoughness: 0.08 });
      break;
    case 'metal':
      Object.assign(m, { metalness: 1, roughness: r ?? 0.42 });
      break;
    case 'rubber':
      Object.assign(m, { roughness: r ?? 0.9, sheen: 0.25, sheenRoughness: 0.8 });
      m.sheenColor.set('#3a3b3e');
      break;
    case 'plastic':
      Object.assign(m, { roughness: r ?? 0.6 });
      break;
    case 'glossPlastic':
      Object.assign(m, { roughness: r ?? 0.12, clearcoat: 1, clearcoatRoughness: 0.04 });
      break;
    case 'leather':
      Object.assign(m, { roughness: r ?? 0.55, sheen: 0.4, sheenRoughness: 0.6 });
      m.sheenColor.copy(color).lerp(new THREE.Color('#ffffff'), 0.3);
      break;
    case 'fabric':
      Object.assign(m, { roughness: r ?? 1, sheen: 0.6, sheenRoughness: 0.9 });
      m.sheenColor.copy(color);
      break;
    case 'accent':
      Object.assign(m, { metalness: 0.1, roughness: r ?? 0.3, clearcoat: 1, clearcoatRoughness: 0.05 });
      break;
  }
  // Keep the model's surface detail (tyre sidewall lettering, panel ambient occlusion).
  const std = source as THREE.MeshStandardMaterial;
  if (std.normalMap) {
    m.normalMap = std.normalMap;
    m.normalScale.copy(std.normalScale);
  }
  if (std.aoMap) {
    m.aoMap = std.aoMap;
    m.aoMapIntensity = std.aoMapIntensity;
  }
  if (preset.emissive) {
    m.emissive.set(preset.emissive);
    m.emissiveIntensity = preset.emissiveIntensity ?? 1;
  }
  return m;
}

export function createFinishMaterial(finish?: Finish) {
  return new THREE.MeshPhysicalMaterial({
    name: 'Runtime_RimFinish',
    color: finish?.color ?? '#1a1a1a',
    metalness: finish?.metalness ?? 0.8,
    roughness: finish?.roughness ?? 0.3,
    // Alloy wheels are lacquered: a light clear coat gives the crisp edge highlights of a real rim.
    clearcoat: finish?.clearcoat ?? 0.5,
    clearcoatRoughness: 0.08,
  });
}

/**
 * Rebinds a cloned part's named material slots to the configurator's live
 * materials, so parts follow the paint colour, chosen finish and carbon weave.
 */
export function bindPartMaterials(root: THREE.Object3D, lib: MaterialLibrary, finish?: THREE.Material) {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const name = (mesh.material as THREE.Material).name;
    switch (name) {
      case 'Paint': mesh.material = lib.paint; break;
      case 'Carbon': mesh.material = lib.carbon; break;
      case 'Gloss_Black': mesh.material = lib.glossBlack; break;
      case 'Chrome': mesh.material = lib.chrome; break;
      case 'Rim_Lip': mesh.material = lib.machined; break;
      case 'Aluminium_Black': mesh.material = lib.aluminium; break;
      case 'Titanium': mesh.material = lib.titanium; break;
      case 'Tire': mesh.material = lib.rubber; break;
      case 'Rim_Finish': if (finish) mesh.material = finish; break;
    }
  });
}

/** Builds the material a mesh group should wear for a material-type product. */
export function createOverrideMaterial(base: THREE.Material, o: MaterialOverride, lib: MaterialLibrary): THREE.Material {
  if (o.preset === 'carbon') return lib.carbon;
  if (o.preset === 'chrome') return lib.chrome;
  if (o.preset === 'glossBlack') return lib.glossBlack;
  const m = base.clone() as THREE.MeshStandardMaterial;
  if (o.color) m.color = new THREE.Color(o.color);
  if (o.metalness !== undefined) m.metalness = o.metalness;
  if (o.roughness !== undefined) m.roughness = o.roughness;
  if (o.emissive) {
    m.emissive = new THREE.Color(o.emissive);
    m.emissiveIntensity = o.emissiveIntensity ?? 1;
  }
  if (o.opacity !== undefined) {
    m.transparent = o.opacity < 1;
    m.opacity = o.opacity;
  }
  m.userData.disposable = true;
  return m;
}
