'use client';

import { useEffect, useMemo } from 'react';
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

export function VehicleModel({ asset, config, paint, supported, quality, onMeasured }: Props) {
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
