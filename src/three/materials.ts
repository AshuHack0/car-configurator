import * as THREE from 'three';
import type { Finish, MaterialOverride } from '@/types/product';
import type { ResolvedPaint } from '@/hooks/useConfigurator';

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

export interface MaterialLibrary {
  paint: THREE.MeshPhysicalMaterial;
  carbon: THREE.MeshPhysicalMaterial;
  glossBlack: THREE.MeshPhysicalMaterial;
  chrome: THREE.MeshStandardMaterial;
  aluminium: THREE.MeshStandardMaterial;
  titanium: THREE.MeshStandardMaterial;
  dispose: () => void;
}

export function createMaterialLibrary(): MaterialLibrary {
  const paint = new THREE.MeshPhysicalMaterial({ name: 'Runtime_Paint', clearcoat: 1, clearcoatRoughness: 0.05 });
  const carbon = new THREE.MeshPhysicalMaterial({
    name: 'Runtime_Carbon', map: getCarbonTexture(), color: '#ffffff', metalness: 0.35, roughness: 0.42,
    clearcoat: 1, clearcoatRoughness: 0.04,
  });
  const glossBlack = new THREE.MeshPhysicalMaterial({
    name: 'Runtime_GlossBlack', color: '#050506', metalness: 0.2, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.02,
  });
  const chrome = new THREE.MeshStandardMaterial({ name: 'Runtime_Chrome', color: '#ffffff', metalness: 1, roughness: 0.04 });
  const aluminium = new THREE.MeshStandardMaterial({ name: 'Runtime_Alu', color: '#1b1c1f', metalness: 0.85, roughness: 0.42 });
  const titanium = new THREE.MeshStandardMaterial({ name: 'Runtime_Titanium', color: '#9b8fb3', metalness: 1, roughness: 0.18 });
  const all = [paint, carbon, glossBlack, chrome, aluminium, titanium];
  return { paint, carbon, glossBlack, chrome, aluminium, titanium, dispose: () => all.forEach((m) => m.dispose()) };
}

export function applyPaint(material: THREE.MeshPhysicalMaterial, paint: ResolvedPaint) {
  material.metalness = paint.metalness;
  material.roughness = paint.roughness;
  material.clearcoat = paint.clearcoat;
  material.clearcoatRoughness = paint.clearcoatRoughness;
}

export function createFinishMaterial(finish?: Finish) {
  return new THREE.MeshPhysicalMaterial({
    name: 'Runtime_RimFinish',
    color: finish?.color ?? '#1a1a1a',
    metalness: finish?.metalness ?? 0.8,
    roughness: finish?.roughness ?? 0.3,
    clearcoat: finish?.clearcoat ?? 0,
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
      case 'Chrome':
      case 'Rim_Lip': mesh.material = lib.chrome; break;
      case 'Aluminium_Black': mesh.material = lib.aluminium; break;
      case 'Titanium': mesh.material = lib.titanium; break;
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
