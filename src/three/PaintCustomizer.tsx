'use client';

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { ResolvedPaint } from '@/hooks/useConfigurator';
import { applyPaint } from './materials';

/** Applies the selected paint, easing the colour so changes feel like a respray, not a cut. */
export function PaintCustomizer({ material, paint }: { material: THREE.MeshPhysicalMaterial; paint: ResolvedPaint }) {
  const target = useMemo(() => new THREE.Color(paint.color), [paint.color]);

  useEffect(() => applyPaint(material, paint), [material, paint]);

  useFrame((_, dt) => {
    if (!material.color.equals(target)) {
      material.color.lerp(target, Math.min(1, dt * 6));
      if (Math.abs(material.color.r - target.r) + Math.abs(material.color.g - target.g) + Math.abs(material.color.b - target.b) < 0.002) {
        material.color.copy(target);
      }
    }
  });

  return null;
}
