'use client';

import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useModel } from './loaders';
import { bindPartMaterials, type MaterialLibrary } from './materials';
import type { Placement } from './rig';

export interface PartAttachmentProps {
  url: string;
  placements: Placement[];
  lib: MaterialLibrary;
  /** Material bound to the part's Rim_Finish slot. */
  finish?: THREE.Material;
  /** Original meshes to hide while this part is fitted (restored on removal). */
  hides?: THREE.Mesh[];
  /** Scale the part so it is `width` metres wide (see `span` on attach products). */
  fit?: { width: number; uniform?: boolean };
  /** Material slots of the part not to show (e.g. its own tyre when the car's tyre is kept). */
  hideSlots?: string[];
}

/** Parts are never stretched or shrunk beyond this, so a bad measurement cannot produce a silly part. */
const FIT_RANGE: [number, number] = [0.72, 1.3];

/**
 * Generic component mounting system: loads a part GLB once, clones it for each
 * placement, binds its named material slots and fades it in with a short
 * scale animation. Used by wheels, spoilers, bumpers, skirts and accessories.
 */
export function PartAttachment({ url, placements: authored, lib, finish, hides, fit, hideSlots }: PartAttachmentProps) {
  const { scene } = useModel(url);

  // Fit to the car: measure the part itself, then scale it to the width this car calls for.
  const fitWidth = fit?.width;
  const fitUniform = fit?.uniform;
  const placements = useMemo(() => {
    if (!fitWidth) return authored;
    const partWidth = new THREE.Box3().setFromObject(scene).getSize(new THREE.Vector3()).x;
    if (!(partWidth > 0)) return authored;
    const k = THREE.MathUtils.clamp(fitWidth / partWidth, ...FIT_RANGE);
    return authored.map((p): Placement => ({
      ...p,
      scale: fitUniform ? [p.scale[0] * k, p.scale[1] * k, p.scale[2] * k] : [p.scale[0] * k, p.scale[1], p.scale[2]],
    }));
  }, [authored, scene, fitWidth, fitUniform]);

  const hidden = hideSlots?.join('|');
  const clones = useMemo(
    () => placements.map(() => {
      const c = scene.clone(true);
      // Slot names are read before bindPartMaterials swaps in the runtime materials.
      if (hidden) {
        const slots = new Set(hidden.split('|'));
        c.traverse((o) => {
          const m = o as THREE.Mesh;
          if (m.isMesh && slots.has((m.material as THREE.Material).name)) m.visible = false;
        });
      }
      return c;
    }),
    [scene, placements, hidden],
  );

  useEffect(() => {
    clones.forEach((c) => bindPartMaterials(c, lib, finish));
  }, [clones, lib, finish]);

  // Hide originals only once the replacement has loaded, so the car is never missing parts.
  useEffect(() => {
    if (!hides?.length) return;
    hides.forEach((m) => (m.visible = false));
    return () => hides.forEach((m) => (m.visible = true));
  }, [hides]);

  return (
    <>
      {placements.map((p, i) => (
        <AnimatedMount key={i} placement={p} object={clones[i]} />
      ))}
    </>
  );
}

function AnimatedMount({ placement, object }: { placement: Placement; object: THREE.Object3D }) {
  const ref = useRef<THREE.Group>(null);
  const progress = useRef(0);
  const target = useMemo(() => new THREE.Vector3(...placement.scale), [placement.scale]);

  useFrame((_, dt) => {
    if (!ref.current || progress.current >= 1) return;
    progress.current = Math.min(1, progress.current + dt * 3.2);
    const t = 1 - Math.pow(1 - progress.current, 3);
    ref.current.scale.copy(target).multiplyScalar(0.85 + 0.15 * t);
    ref.current.position.set(placement.position[0], placement.position[1] + (1 - t) * 0.06, placement.position[2]);
  });

  return (
    <group ref={ref} position={placement.position} rotation={placement.rotation} scale={placement.scale}>
      <primitive object={object} />
    </group>
  );
}
