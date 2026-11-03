'use client';

import { Suspense, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { ContactShadows, Environment, Lightformer, OrbitControls } from '@react-three/drei';
import type { ResolvedPaint } from '@/hooks/useConfigurator';
import type { Configuration, Product } from '@/types/product';
import type { VehicleAssetConfig } from '@/types/vehicle';
import { CameraController, presetPosition, type CameraPreset } from './CameraController';
import { ModelErrorBoundary } from './ModelErrorBoundary';
import { VehicleModel } from './VehicleModel';

export type StageLighting = 'studio' | 'warm' | 'cool';

interface Props {
  asset: VehicleAssetConfig;
  config: Configuration;
  paint: ResolvedPaint;
  supported: (product: Product) => boolean;
  preset?: CameraPreset;
  presetNonce?: number;
  lighting?: StageLighting;
  autoRotate?: boolean;
  /** Hero mode: no zoom/pan, slow turntable, used on the homepage. */
  hero?: boolean;
  retryKey?: number;
  onError?: (error: Error) => void;
}

/** Bright showroom stages; `env` is the backdrop the paint reflects (mid-grey keeps body lines readable). */
const STAGES: Record<StageLighting, { key: string; rim: string; floor: string; intensity: number; bg: string; env: string }> = {
  studio: { key: '#ffffff', rim: '#dbe7ff', floor: '#e4e7eb', intensity: 1, bg: '#eceef1', env: '#7b828c' },
  warm: { key: '#fff1e2', rim: '#ffd2a8', floor: '#ebe5df', intensity: 1, bg: '#f1ece6', env: '#857d74' },
  cool: { key: '#eef4ff', rim: '#9cc3ff', floor: '#e1e7ef', intensity: 1, bg: '#e8edf4', env: '#737e8e' },
};

function useIsMobile() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const q = window.matchMedia('(max-width: 820px), (pointer: coarse)');
    const update = () => setMobile(q.matches);
    update();
    q.addEventListener('change', update);
    return () => q.removeEventListener('change', update);
  }, []);
  return mobile;
}

export default function VehicleScene({
  asset, config, paint, supported, preset = 'threeQuarter', presetNonce = 0, lighting = 'studio',
  autoRotate = false, hero = false, retryKey = 0, onError,
}: Props) {
  const mobile = useIsMobile();
  const stage = STAGES[lighting];
  const initial = presetPosition('threeQuarter', asset, hero ? 1.3 : 1);

  return (
    <Canvas
      shadows
      dpr={mobile ? [1, 1.5] : [1, 2]}
      camera={{ position: initial.position, fov: hero ? 32 : 38, near: 0.1, far: 100 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      style={{ touchAction: 'none' }}
    >
      <color attach="background" args={[stage.bg]} />
      <fog attach="fog" args={[stage.bg, 10, 24]} />

      <ambientLight intensity={0.5 * stage.intensity} />
      <spotLight position={[4, 8, 3]} angle={0.45} penumbra={1} intensity={60 * stage.intensity} color={stage.key} castShadow={!mobile} shadow-mapSize={[1024, 1024]} />

      {/* Studio reflections built from local light panels — no HDRI download. */}
      <Environment resolution={mobile ? 128 : 256} frames={1} key={lighting}>
        <color attach="background" args={[stage.env]} />
        <Lightformer form="rect" intensity={2.2 * stage.intensity} color={stage.key} position={[0, 6, 0]} rotation-x={Math.PI / 2} scale={[12, 3, 1]} />
        <Lightformer form="rect" intensity={1.6 * stage.intensity} color={stage.key} position={[-6, 2, 0]} rotation-y={Math.PI / 2} scale={[10, 1.2, 1]} />
        <Lightformer form="rect" intensity={1.6 * stage.intensity} color={stage.key} position={[6, 2, 0]} rotation-y={-Math.PI / 2} scale={[10, 1.2, 1]} />
        <Lightformer form="rect" intensity={1.2 * stage.intensity} color={stage.rim} position={[0, 1.5, 7]} rotation-y={Math.PI} scale={[8, 1, 1]} />
        <Lightformer form="rect" intensity={1.2 * stage.intensity} color={stage.rim} position={[0, 1.5, -7]} scale={[8, 1, 1]} />
        <Lightformer form="ring" intensity={2 * stage.intensity} color={stage.rim} position={[4, 4, -6]} scale={2} />
      </Environment>

      <ModelErrorBoundary resetKey={`${asset.modelUrl}:${retryKey}`} onError={onError}>
        <Suspense fallback={null}>
          <VehicleModel asset={asset} config={config} paint={paint} supported={supported} />
        </Suspense>
      </ModelErrorBoundary>

      <ContactShadows position={[0, 0.002, 0]} opacity={0.55} scale={12} blur={2.2} far={2.5} color="#1e2530" resolution={mobile ? 256 : 1024} />

      {/* Matte showroom floor; fog fades its edge into the backdrop so there is no horizon line. */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, 0]} receiveShadow>
        <circleGeometry args={[40, 64]} />
        <meshStandardMaterial color={stage.floor} roughness={0.95} metalness={0} envMapIntensity={0.3} />
      </mesh>

      <OrbitControls
        makeDefault
        target={asset.camera.target}
        enableDamping
        dampingFactor={0.08}
        enablePan={false}
        enableZoom={!hero}
        minDistance={3.4}
        maxDistance={16}
        maxPolarAngle={Math.PI / 2 - 0.04}
        autoRotate={autoRotate || hero}
        autoRotateSpeed={hero ? 0.6 : 1.2}
      />
      {!hero && <CameraController asset={asset} preset={preset} nonce={presetNonce} />}
    </Canvas>
  );
}
