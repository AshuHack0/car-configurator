'use client';

import { Suspense } from 'react';
import { PartAttachment } from './PartAttachment';
import type { MaterialLibrary } from './materials';
import type { VehicleRig } from './rig';

interface Props {
  rig: VehicleRig;
  lib: MaterialLibrary;
  model: string | null;
}

/**
 * Mounts a spoiler at the vehicle's `spoiler` attachment point (a ray snapped
 * onto the boot lid). If the asset defines a `spoiler` mesh group, that factory
 * spoiler is hidden while the replacement is fitted.
 */
export function SpoilerReplacement({ rig, lib, model }: Props) {
  const placements = rig.attachments.spoiler;
  if (!model || !placements) return null;
  return (
    <Suspense fallback={null}>
      <PartAttachment url={model} placements={placements} lib={lib} hides={rig.groups.spoiler} />
    </Suspense>
  );
}
