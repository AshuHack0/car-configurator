'use client';

import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getProduct, productFinish } from '@/data/products';
import type { ResolvedPaint } from '@/hooks/useConfigurator';
import type { Configuration, Product, SlotId } from '@/types/product';
import type { VehicleAssetConfig } from '@/types/vehicle';
import { BumperReplacement } from './BumperReplacement';
import { MaterialSwap } from './MaterialSwap';
import { PaintCustomizer } from './PaintCustomizer';
import { SpoilerReplacement } from './SpoilerReplacement';
import { WheelReplacement } from './WheelReplacement';
import { useModel } from './loaders';
import { createMaterialLibrary, createSurfaceMaterial, type RenderQuality } from './materials';
import { buildRig, sanitize, type VehicleRig } from './rig';

interface Props {
  asset: VehicleAssetConfig;
  config: Configuration;
  paint: ResolvedPaint;
  supported: (product: Product) => boolean;
  quality: RenderQuality;
  /** Called with the dimensions measured from this 3D body, once it has loaded. */
  onMeasured?: (dimensions: VehicleRig['dimensions']) => void;
  doorsOpen?: boolean;
}


/** Slots realised by mounting a GLB part, and the attachment point / mesh group each uses. */
const ATTACH_SLOTS: { slot: SlotId; replaces?: string }[] = [
  { slot: 'frontBumper', replaces: 'frontBumper' },
  { slot: 'rearBumper', replaces: 'rearBumper' },
  { slot: 'diffuser', replaces: 'diffuser' },
  { slot: 'sideSkirts', replaces: 'sideSkirts' },
  { slot: 'roof' },
  { slot: 'exhaust', replaces: 'exhaust' },
];

/** Swings each door about its hinge node. Left doors (+X) and right doors open in opposite directions. */
function Doors({ scene, doors, open }: { scene: THREE.Object3D; doors: NonNullable<VehicleAssetConfig['doors']>; open: boolean }) {
  const nodes = useMemo(
    () => doors.flatMap(({ node, angle }) => {
      const object = scene.getObjectByName(sanitize(node));
      return object ? [{ object, angle: THREE.MathUtils.degToRad(angle) * (object.position.x > 0 ? -1 : 1) }] : [];
    }),
    [scene, doors],
  );
  useFrame((_, dt) => {
    const k = 1 - Math.exp(-dt * 4);
    for (const { object, angle } of nodes) {
      const goal = open ? angle : 0;
      if (Math.abs(object.rotation.y - goal) > 1e-4) object.rotation.y += (goal - object.rotation.y) * k;
    }
  });
  return null;
}

/** Re-trims the cabin: swaps the colour texture of each listed interior material, keeping its grain and stitching maps. */
function InteriorTrim({ scene, interior, set }: { scene: THREE.Object3D; interior: NonNullable<VehicleAssetConfig['interior']>; set: string | null }) {
  useEffect(() => {
    const files = set ? interior.sets[set] : undefined;
    if (!files) return;
    const loader = new THREE.TextureLoader();
    const loaded: THREE.Texture[] = [];
    const restore: (() => void)[] = [];
    let cancelled = false;
    for (const [materialName, file] of Object.entries(files)) {
      const materials: THREE.MeshStandardMaterial[] = [];
      scene.traverse((o) => {
        const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
        if (m && m.name === materialName && m.map) materials.push(m);
      });
      if (!materials.length) continue;
      loader.load(`${interior.base}/${file}`, (texture) => {
        if (cancelled) return texture.dispose();
        const original = materials[0].map!;
        // Match the GLB's texture conventions so the new colours land on the same UVs.
        texture.flipY = false;
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.wrapS = original.wrapS;
        texture.wrapT = original.wrapT;
        texture.anisotropy = 8;
        loaded.push(texture);
        for (const m of materials) {
          const before = m.map;
          m.map = texture;
          m.needsUpdate = true;
          restore.push(() => { m.map = before; m.needsUpdate = true; });
        }
      });
    }
    return () => {
      cancelled = true;
      restore.forEach((undo) => undo());
      loaded.forEach((t) => t.dispose());
    };
  }, [scene, interior, set]);
  return null;
}

export function VehicleModel({ asset, config, paint, supported, quality, onMeasured, doorsOpen = false }: Props) {
  const gltf = useModel(asset.modelUrl);

  // Each mount gets its own clone with its own materials, so the cached GLB is never mutated.
  const { scene, rig, lib, owned } = useMemo(() => {
    const scene = gltf.scene.clone(true);
    const lib = createMaterialLibrary();
    const owned: THREE.Material[] = [];
    // Keys may be written as in the source file ("car body", "Plane.001"); three.js sanitises node names.
    const surfaces: NonNullable<VehicleAssetConfig['surfaces']> = {};
    for (const [key, preset] of Object.entries(asset.surfaces ?? {})) {
      surfaces[key] = preset;
      surfaces[sanitize(key)] ??= preset;
    }
    const presetFor = (mesh: THREE.Mesh, material: THREE.Material) =>
      surfaces[mesh.name] ?? surfaces[mesh.parent?.name ?? ''] ?? surfaces[`mat:${material.name}`] ?? surfaces[material.name];
    scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      const source = mesh.material as THREE.Material;
      const preset = presetFor(mesh, source);
      if (source.name === asset.paintMaterial) {
        mesh.material = lib.paint;
      } else if (preset) {
        const m = createSurfaceMaterial(source, preset, lib, quality);
        if (m !== lib.carbon) owned.push(m);
        mesh.material = m;
        // Clear glass should not block the light reaching the cabin.
        if (preset.kind === 'glass' || preset.kind === 'lens') mesh.castShadow = false;
      } else {
        const m = source.clone();
        owned.push(m);
        mesh.material = m;
      }
    });
    return { scene, rig: buildRig(scene, asset), lib, owned };
  }, [gltf.scene, asset, quality]);

  useEffect(() => () => {
    lib.dispose();
    owned.forEach((m) => m.dispose());
  }, [lib, owned]);

  const pick = (slot: SlotId) => {
    const sel = config.selections[slot];
    const product = sel && getProduct(sel.productId);
    if (!product || !supported(product)) return null;
    return { product, finish: productFinish(product, sel.finishId) };
  };

  useEffect(() => {
    onMeasured?.(rig.dimensions);
  }, [rig, onMeasured]);

  const wheels = pick('wheels');
  const trim = pick('interior');
  const spoiler = pick('spoiler');
  const materialProducts = (Object.keys(config.selections) as SlotId[])
    .map(pick)
    .filter((p): p is NonNullable<typeof p> => p?.product.impl.kind === 'material');

  const modelOf = (p: ReturnType<typeof pick>) =>
    p && (p.product.impl.kind === 'wheels' || p.product.impl.kind === 'attach') ? p.product.impl.model : null;

  return (
    <group scale={asset.scale}>
      <primitive object={scene} />
      <PaintCustomizer material={lib.paint} paint={paint} />
      {asset.doors && <Doors scene={scene} doors={asset.doors} open={doorsOpen} />}
      {asset.interior && (
        <InteriorTrim scene={scene} interior={asset.interior} set={trim?.product.impl.kind === 'interior' ? trim.product.impl.set : null} />
      )}
      <WheelReplacement key={modelOf(wheels) ?? 'stock'} rig={rig} lib={lib} model={modelOf(wheels)} finish={wheels?.finish} />
      <SpoilerReplacement
        key={modelOf(spoiler) ?? 'none'} rig={rig} lib={lib} model={modelOf(spoiler)}
        span={spoiler?.product.impl.kind === 'attach' ? spoiler.product.impl.span : undefined}
        uniform={spoiler?.product.impl.kind === 'attach' ? spoiler.product.impl.uniform : undefined}
      />
      {ATTACH_SLOTS.map(({ slot, replaces }) => {
        const p = pick(slot);
        if (!p || p.product.impl.kind !== 'attach') return null;
        return (
          <BumperReplacement
            key={`${slot}:${p.product.id}`}
            rig={rig} lib={lib} model={p.product.impl.model} attachment={p.product.impl.attachment} replaces={replaces}
            span={p.product.impl.span} uniform={p.product.impl.uniform}
          />
        );
      })}
      {materialProducts.map(({ product }) => (
        product.impl.kind === 'material' && (
          <MaterialSwap key={product.id} rig={rig} lib={lib} overrides={product.impl.overrides} />
        )
      ))}
    </group>
  );
}
