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
}

/**
 * Generic component mounting system: loads a part GLB once, clones it for each
 * placement, binds its named material slots and fades it in with a short
 * scale animation. Used by wheels, spoilers, bumpers, skirts and accessories.
 */
export function PartAttachment({ url, placements, lib, finish, hides }: PartAttachmentProps) {
  const { scene } = useModel(url);

  const clones = useMemo(
    () => placements.map(() => scene.clone(true)),
    [scene, placements],
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
