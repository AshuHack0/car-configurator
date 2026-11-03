'use client';

import { Suspense } from 'react';
import type { AttachmentId } from '@/types/vehicle';
import { PartAttachment } from './PartAttachment';
import type { MaterialLibrary } from './materials';
import type { VehicleRig } from './rig';

interface Props {
  rig: VehicleRig;
  lib: MaterialLibrary;
  model: string | null;
  attachment: AttachmentId | 'sideSkirt';
  /** Mesh group replaced by this part, if the asset has one (e.g. a separate bumper mesh). */
  replaces?: string;
}

/**
 * Front/rear bumpers, diffusers, side skirts and bolt-on accessories. On assets
 * with a separate bumper mesh the original is hidden ("replace"); on assets
 * where it is fused into the body the kit is mounted over it ("attach").
 */
export function BumperReplacement({ rig, lib, model, attachment, replaces }: Props) {
  const placements = rig.attachments[attachment];
  if (!model || !placements?.length) return null;
  return (
    <Suspense fallback={null}>
      <PartAttachment url={model} placements={placements} lib={lib} hides={replaces ? rig.groups[replaces] : undefined} />
    </Suspense>
  );
}
