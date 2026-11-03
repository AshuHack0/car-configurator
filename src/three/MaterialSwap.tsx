'use client';

import { useEffect } from 'react';
import type * as THREE from 'three';
import type { MaterialOverride } from '@/types/product';
import { createOverrideMaterial, type MaterialLibrary } from './materials';
import type { VehicleRig } from './rig';

/**
 * Re-skins existing mesh groups (grille, light lenses, trim) for material-type
 * products, restoring the original materials when the product is removed.
 */
export function MaterialSwap({ rig, lib, overrides }: {
  rig: VehicleRig;
  lib: MaterialLibrary;
  overrides: Record<string, MaterialOverride>;
}) {
  useEffect(() => {
    const restored: [THREE.Mesh, THREE.Material | THREE.Material[]][] = [];
    const created: THREE.Material[] = [];
    for (const [group, override] of Object.entries(overrides)) {
      for (const mesh of rig.groups[group] ?? []) {
        restored.push([mesh, mesh.material]);
        const m = createOverrideMaterial(mesh.material as THREE.Material, override, lib);
        if (m.userData.disposable) created.push(m);
        mesh.material = m;
      }
    }
    return () => {
      restored.forEach(([mesh, m]) => (mesh.material = m));
      created.forEach((m) => m.dispose());
    };
  }, [rig, lib, overrides]);

  return null;
}
