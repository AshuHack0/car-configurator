'use client';

import { Suspense, useEffect, useMemo } from 'react';
import type { Finish } from '@/types/product';
import { PartAttachment } from './PartAttachment';
import { createFinishMaterial, type MaterialLibrary } from './materials';
import type { VehicleRig } from './rig';

interface Props {
  rig: VehicleRig;
  lib: MaterialLibrary;
  /** Wheel GLB to fit, or null for the factory wheels. */
  model: string | null;
  finish?: Finish;
}

/**
 * Replaces the four road wheels:
 *  1. The rig has already found each wheel node and measured its centre, diameter and width.
 *  2. The selected wheel GLB is loaded (cached) and cloned four times.
 *  3. Each clone gets that wheel's position, outward-facing rotation and measured scale.
 *  4. Once loaded, the original rim/tyre meshes are hidden; brake discs stay visible.
 */
export function WheelReplacement({ rig, lib, model, finish }: Props) {
  const finishMaterial = useMemo(() => createFinishMaterial(finish), [finish]);
  useEffect(() => () => finishMaterial.dispose(), [finishMaterial]);

  const placements = useMemo(() => rig.wheels.map((w) => w.placement), [rig]);
  const originals = useMemo(() => rig.wheels.flatMap((w) => w.originals), [rig]);

  if (!model || rig.wheels.length === 0) return null;
  return (
    <Suspense fallback={null}>
      <PartAttachment url={model} placements={placements} lib={lib} finish={finishMaterial} hides={originals} />
    </Suspense>
  );
}
