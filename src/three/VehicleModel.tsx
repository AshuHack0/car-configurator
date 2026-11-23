'use client';

import { useEffect, useMemo, useRef } from 'react';
import { Html, useTexture } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import hotspot from './Hotspot.module.css';
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
  /** Hinge nodes (doors, boot, fuel flaps) that are open. */
  openNodes?: ReadonlySet<string>;
  /** Given when the dots on the car should be shown; called with the node to open or close. */
  onToggleNode?: (node: string) => void;
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

/**
 * Swings each opening panel about its hinge node. Doors and flaps turn about a vertical axis
 * (left side, +X, and right side open in opposite directions); lids lift about the car's width.
 */
function Doors({ scene, doors, open }: { scene: THREE.Object3D; doors: NonNullable<VehicleAssetConfig['doors']>; open?: ReadonlySet<string> }) {
  const nodes = useMemo(
    () => doors.flatMap(({ node, angle, axis = 'y' }) => {
      const object = scene.getObjectByName(sanitize(node));
      if (!object) return [];
      const side = axis === 'y' && object.position.x > 0 ? -1 : 1;
      return [{ object, node, axis, angle: THREE.MathUtils.degToRad(angle) * side }];
    }),
    [scene, doors],
  );
  useFrame((_, dt) => {
    const k = 1 - Math.exp(-dt * 4);
    for (const { object, node, axis, angle } of nodes) {
      const goal = open?.has(node) ? angle : 0;
      if (Math.abs(object.rotation[axis] - goal) > 1e-4) object.rotation[axis] += (goal - object.rotation[axis]) * k;
    }
  });
  return null;
}

/**
 * A dot on each panel that can open; clicking it opens or closes that panel. Dots on the far
 * side of the car are hidden, so only the ones you could actually reach are shown.
 */
function Hotspots({ doors, open, onToggle }: { doors: NonNullable<VehicleAssetConfig['doors']>; open?: ReadonlySet<string>; onToggle: (node: string) => void }) {
  const spots = useMemo(() => doors.filter((d) => d.hotspot), [doors]);
  const dots = useRef<(HTMLButtonElement | null)[]>([]);
  const toCamera = useMemo(() => new THREE.Vector3(), []);
  const normal = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ camera }) => {
    spots.forEach((d, i) => {
      const el = dots.current[i];
      if (!el || !d.hotspot) return;
      toCamera.copy(camera.position).sub(normal.set(...d.hotspot.at)).normalize();
      const facing = toCamera.dot(normal.set(...d.hotspot.normal).normalize());
      el.style.opacity = facing > 0.12 ? '1' : '0';
      el.style.pointerEvents = facing > 0.12 ? 'auto' : 'none';
    });
  });
  return (
    <>
      {spots.map((d, i) => {
        const isOpen = !!open?.has(d.node);
        return (
          <Html key={d.node} position={d.hotspot!.at} center zIndexRange={[5, 0]}>
            <button
              ref={(el) => { dots.current[i] = el; }}
              className={`${hotspot.dot} ${isOpen ? hotspot.open : ''}`}
              onClick={() => onToggle(d.node)}
              aria-pressed={isOpen}
              aria-label={`${isOpen ? 'Close' : 'Open'} ${d.hotspot!.label}`}
              title={`${isOpen ? 'Close' : 'Open'} ${d.hotspot!.label}`}
            >
              <i />
            </button>
          </Html>
        );
      })}
    </>
  );
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

export function VehicleModel({ asset, config, paint, supported, quality, onMeasured, openNodes, onToggleNode }: Props) {
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
      // Sharper textures at glancing angles (seat leather, tyre sidewalls, lamp internals).
      const std = source as THREE.MeshStandardMaterial;
      for (const map of [std.map, std.normalMap, std.roughnessMap, std.metalnessMap, std.aoMap, std.emissiveMap]) {
        if (map && map.anisotropy < 8) {
          map.anisotropy = 8;
          map.needsUpdate = true;
        }
      }
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
        const tweak = asset.materialTweaks?.[source.name];
        if (tweak) {
          const tuned = m as THREE.MeshStandardMaterial;
          if (tweak.tint || tweak.brightness) tuned.color.set(tweak.tint ?? '#ffffff').multiplyScalar(tweak.brightness ?? 1);
          if (tweak.roughness !== undefined) {
            tuned.roughness = tweak.roughness;
            tuned.roughnessMap = null;
          }
        }
        owned.push(m);
        mesh.material = m;
      }
    });
    const rig = buildRig(scene, asset);
    // Pose: turn the front wheels (and the brakes behind them) about each wheel's own centre.
    // Done after measuring, so every fitted part is still placed from the straight-ahead car.
    if (asset.steer) {
      const angle = THREE.MathUtils.degToRad(asset.steer);
      const nose = asset.forward === '+z' ? 1 : -1;
      const turn = new THREE.Matrix4().makeRotationY(angle);
      for (const wheel of rig.wheels) {
        if (wheel.placement.position[2] * nose <= 0) continue;
        const node = scene.getObjectByName(sanitize(wheel.node));
        if (!node) continue;
        const centre = new THREE.Vector3(...wheel.placement.position);
        node.rotation.y = angle;
        node.position.copy(centre).sub(centre.clone().applyMatrix4(turn));
        wheel.placement = { ...wheel.placement, rotation: [wheel.placement.rotation[0], wheel.placement.rotation[1] + angle, wheel.placement.rotation[2]] };
      }
    }
    return { scene, rig, lib, owned };
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
      {asset.groundShadow && <GroundShadow {...asset.groundShadow} />}
      <PaintCustomizer material={lib.paint} paint={paint} />
      {asset.doors && <Doors scene={scene} doors={asset.doors} open={openNodes} />}
      {asset.doors && onToggleNode && <Hotspots doors={asset.doors} open={openNodes} onToggle={onToggleNode} />}
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

/**
 * Baked soft shadow under the car: darkest under the sills and tyres, fading out past the body.
 * It sits just above the ground and never writes depth, so it cannot hide the floor or the sun
 * shadow. The image's top edge points to the back of the car (-z), which is the plane's +y.
 */
function GroundShadow({ url, size, centre, opacity = 1 }: NonNullable<VehicleAssetConfig['groundShadow']>) {
  const map = useTexture(url);
  return (
    <mesh rotation-x={-Math.PI / 2} position={[centre[0], 0.004, centre[1]]} renderOrder={1}>
      <planeGeometry args={size} />
      <meshBasicMaterial map={map} transparent opacity={opacity} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}
