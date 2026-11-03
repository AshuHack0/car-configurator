'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type { Vec3, VehicleAssetConfig } from '@/types/vehicle';

export type CameraPreset = 'threeQuarter' | 'front' | 'rear' | 'side' | 'top' | 'wheel' | 'rearQuarter' | 'frontLow';

/** Narrow (portrait) viewports need the camera further back to keep the whole car in frame. */
export const framingZoom = (aspect: number) => Math.max(1, 1.1 / aspect);

export function presetPosition(preset: CameraPreset, asset: VehicleAssetConfig, zoom = 1): { position: Vec3; target: Vec3 } {
  const d = asset.camera.distance;
  const f = asset.forward === '-z' ? -1 : 1;
  const t = asset.camera.target;
  const positions: Record<CameraPreset, Vec3> = {
    threeQuarter: [d * 0.62, 1.55, f * d * 0.74],
    front: [0, 1.05, f * d * 0.95],
    rear: [0, 1.25, -f * d * 0.95],
    side: [d * 0.98, 0.95, 0],
    top: [0.001, d * 1.25, 0],
    wheel: [d * 0.62, 0.65, f * d * 0.42],
    rearQuarter: [d * 0.55, 2.1, -f * d * 0.72],
    frontLow: [d * 0.42, 0.55, f * d * 0.78],
  };
  const p = positions[preset];
  return { position: [t[0] + (p[0] - t[0]) * zoom, t[1] + (p[1] - t[1]) * zoom, t[2] + (p[2] - t[2]) * zoom], target: t };
}

/**
 * Glides the camera to a preset. Any user drag cancels the move so the
 * customer is never fighting the animation.
 */
export function CameraController({ asset, preset, nonce }: { asset: VehicleAssetConfig; preset: CameraPreset; nonce: number }) {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null;
  const aspect = useThree((s) => s.size.width / Math.max(1, s.size.height));
  const goal = useRef<{ pos: THREE.Vector3; target: THREE.Vector3 } | null>(null);

  useEffect(() => {
    const { position, target } = presetPosition(preset, asset, framingZoom(aspect));
    goal.current = { pos: new THREE.Vector3(...position), target: new THREE.Vector3(...target) };
  }, [preset, nonce, asset, aspect]);

  useEffect(() => {
    if (!controls) return;
    const cancel = () => (goal.current = null);
    controls.addEventListener('start', cancel);
    return () => controls.removeEventListener('start', cancel);
  }, [controls]);

  useFrame((_, dt) => {
    const g = goal.current;
    if (!g || !controls) return;
    const k = 1 - Math.exp(-dt * 3.6);
    camera.position.lerp(g.pos, k);
    controls.target.lerp(g.target, k);
    controls.update();
    if (camera.position.distanceTo(g.pos) < 0.01 && controls.target.distanceTo(g.target) < 0.01) goal.current = null;
  });

  return null;
}
