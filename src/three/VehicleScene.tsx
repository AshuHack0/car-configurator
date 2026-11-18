'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { ContactShadows, Environment, Lightformer, OrbitControls } from '@react-three/drei';
import { Bloom, EffectComposer, N8AO, ToneMapping } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import type { ResolvedPaint } from '@/hooks/useConfigurator';
import type { Configuration, Product } from '@/types/product';
import type { VehicleAssetConfig } from '@/types/vehicle';
import { CameraController, presetPosition, type CameraPreset } from './CameraController';
import { LocationBackdrop } from './LocationBackdrop';
import { ModelErrorBoundary } from './ModelErrorBoundary';
import { VehicleModel } from './VehicleModel';
import type { VehicleRig } from './rig';
import type { RenderQuality } from './materials';

/** `outdoor` is a photographed location; the others are the built-in studio. */
export type StageLighting = 'outdoor' | 'studio' | 'warm' | 'cool';

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
  /** Dimensions measured from the loaded 3D body (m). */
  onMeasured?: (dimensions: VehicleRig['dimensions']) => void;
}

interface Stage { key: string; rim: string; floor: string; bg: string; pool: string; walls: string }

/**
 * Bright showroom stages. `walls` is the studio surround the paint reflects:
 * kept mid-dark so the softbox strips read as crisp highlight lines on the body.
 */
const STAGES: Record<Exclude<StageLighting, 'outdoor'>, Stage> = {
  studio: { key: '#ffffff', rim: '#e6eeff', floor: '#e6e8eb', bg: '#dcdfe3', pool: '#f7f8f9', walls: '#565b63' },
  warm: { key: '#fff1e2', rim: '#ffd9b5', floor: '#ece6df', bg: '#e2dcd5', pool: '#faf6f1', walls: '#5c554f' },
  cool: { key: '#eef4ff', rim: '#b5d2ff', floor: '#e2e7ee', bg: '#d6dce5', pool: '#f3f6fa', walls: '#505864' },
};

/** Turns the location so its buildings sit behind the car in the opening view. */
const LOCATION_ROTATION = Math.PI;

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

/**
 * Long softboxes like a photo studio. They give paint the crisp, continuous
 * highlight lines that make a body read as real sheet metal.
 */
function Softboxes({ stage }: { stage: Stage }) {
  return (
    <>
      {/* Overhead softbox: kept narrow so the roof and bonnet show a defined highlight, not a white wash. */}
      <Lightformer form="rect" intensity={1.6} color={stage.key} position={[0, 7, 0]} rotation-x={Math.PI / 2} scale={[9, 2.2, 1]} />
      {/* Long horizontal strips: the shoulder-line highlights you see in car photography. */}
      <Lightformer form="rect" intensity={2.2} color={stage.key} position={[-7, 1.6, 0]} rotation-y={Math.PI / 2} scale={[16, 0.35, 1]} />
      <Lightformer form="rect" intensity={2.2} color={stage.key} position={[7, 1.6, 0]} rotation-y={-Math.PI / 2} scale={[16, 0.35, 1]} />
      <Lightformer form="rect" intensity={1.2} color={stage.rim} position={[-7, 3.8, 0]} rotation-y={Math.PI / 2} scale={[16, 0.2, 1]} />
      <Lightformer form="rect" intensity={1.2} color={stage.rim} position={[7, 3.8, 0]} rotation-y={-Math.PI / 2} scale={[16, 0.2, 1]} />
      <Lightformer form="rect" intensity={1.2} color={stage.rim} position={[0, 2.2, 9]} rotation-y={Math.PI} scale={[8, 0.8, 1]} />
      <Lightformer form="rect" intensity={1.2} color={stage.rim} position={[0, 2.2, -9]} scale={[8, 0.8, 1]} />
    </>
  );
}

/**
 * A fully controlled photo studio rendered once into the environment map: dark
 * surround, softbox strips, and a light floor that gives the lower body the
 * horizon reflection real cars show. Built from local geometry, so nothing is downloaded.
 */
function StudioEnvironment({ stage, resolution }: { stage: Stage; resolution: number }) {
  return (
    <Environment resolution={resolution} frames={1}>
      <color attach="background" args={[stage.walls]} />
      <Softboxes stage={stage} />
      <Lightformer form="rect" intensity={0.55} color={stage.floor} position={[0, -0.5, 0]} rotation-x={-Math.PI / 2} scale={[60, 60, 1]} />
    </Environment>
  );
}

/**
 * Studio floor: a pool of light under the car that falls away to the backdrop tone,
 * the way a photo-studio cyclorama looks. The outer edge matches the background
 * exactly, so there is still no horizon line.
 */
function StudioFloor({ stage }: { stage: Stage }) {
  const texture = useMemo(() => {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, stage.pool);
    g.addColorStop(0.1, stage.pool);
    g.addColorStop(0.42, stage.bg);
    g.addColorStop(1, stage.bg);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [stage.pool, stage.bg]);
  useEffect(() => () => texture.dispose(), [texture]);

  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, 0, 0]}>
      <circleGeometry args={[50, 64]} />
      <meshBasicMaterial map={texture} toneMapped={false} fog={false} />
    </mesh>
  );
}

export default function VehicleScene({
  asset, config, paint, supported, preset = 'threeQuarter', presetNonce = 0, lighting = 'studio',
  autoRotate = false, hero = false, retryKey = 0, onError, onMeasured,
}: Props) {
  const mobile = useIsMobile();
  const quality: RenderQuality = mobile ? 'low' : 'high';
  const outdoor = lighting === 'outdoor';
  const stage = STAGES[outdoor ? 'studio' : lighting];
  const initial = presetPosition('threeQuarter', asset, hero ? 1.3 : 1);

  return (
    <Canvas
      shadows
      dpr={mobile ? [1, 1.5] : [1, 2]}
      // ~30 degree lens: wide angles exaggerate perspective and make a car look like a toy.
      camera={{ position: initial.position, fov: hero ? 26 : 30, near: 0.1, far: 120 }}
      // Desktop anti-aliasing comes from the composer's multisampling.
      gl={{ antialias: mobile, powerPreference: 'high-performance', stencil: false }}
      onCreated={({ gl }) => {
        // Khronos PBR Neutral keeps paint colours true; ACES shifts reds towards orange and crushes blacks.
        gl.toneMapping = THREE.NeutralToneMapping;
        gl.toneMappingExposure = 1;
      }}
      style={{ touchAction: 'none' }}
    >
      <color attach="background" args={[stage.bg]} />
      {!outdoor && <fog attach="fog" args={[stage.bg, 16, 42]} />}

      {/* One soft key light for self-shadowing; all other light comes from the environment. */}
      <spotLight
        position={[3, 10, 2]} angle={0.5} penumbra={1} intensity={outdoor ? 6 : 45} color={stage.key}
        castShadow={!mobile} shadow-mapSize={[2048, 2048]} shadow-bias={-0.0001} shadow-normalBias={0.02}
      />
      {/*
        Soft sky/floor fill, like a studio's overhead diffusion. It lifts the diffuse base coat of
        light paints (whites read grey against the darker reflection surround otherwise) without
        adding reflections, so dark paints and highlight lines are barely affected.
      */}
      {outdoor ? (
        <Suspense fallback={null}>
          <LocationBackdrop quality={quality} rotation={LOCATION_ROTATION} />
        </Suspense>
      ) : (
        <>
          <hemisphereLight args={[stage.key, stage.floor, 1.1]} />
          <StudioEnvironment key={lighting} stage={stage} resolution={mobile ? 256 : 512} />
        </>
      )}

      <ModelErrorBoundary resetKey={`${asset.modelUrl}:${retryKey}`} onError={onError}>
        <Suspense fallback={null}>
          <VehicleModel asset={asset} config={config} paint={paint} supported={supported} quality={quality} onMeasured={onMeasured} />
        </Suspense>
      </ModelErrorBoundary>

      {/*
        Two-layer studio shadow: a tight, darker layer where the body meets the floor and a
        wide, faint layer for the soft ambient spread under a car lit by overhead softboxes.
      */}
      <ContactShadows position={[0, 0.002, 0]} opacity={outdoor ? 0.95 : 0.7} scale={10} blur={1.6} far={0.6} color="#10141a" resolution={mobile ? 256 : 512} />
      <ContactShadows position={[0, 0.001, 0]} opacity={outdoor ? 0.7 : 0.45} scale={14} blur={3.2} far={3} color="#1a1f27" resolution={mobile ? 256 : 512} />

      {/*
        Seamless cyclorama floor: unlit, fading to the backdrop tone, so there is
        no horizon line. Grounding comes from the soft shadow and ambient occlusion.
        toneMapped=false keeps it matched to the (untonemapped) background on phones.
      */}
      {!outdoor && <StudioFloor key={lighting} stage={stage} />}

      <OrbitControls
        makeDefault
        target={asset.camera.target}
        enableDamping
        dampingFactor={0.08}
        enablePan={false}
        enableZoom={!hero}
        minDistance={4.5}
        maxDistance={20}
        maxPolarAngle={Math.PI / 2 - 0.04}
        autoRotate={autoRotate || hero}
        autoRotateSpeed={hero ? 0.5 : 1}
      />
      {!hero && <CameraController asset={asset} preset={preset} nonce={presetNonce} />}

      {/* Phones skip post-processing and rely on the renderer's tone mapping. */}
      {!mobile && (
        <EffectComposer multisampling={4} enableNormalPass={false}>
          {/* Ambient occlusion: panel gaps, wheel arches and the car-to-floor contact. */}
          <N8AO aoRadius={0.5} distanceFalloff={0.8} intensity={2} quality="medium" halfRes />
          <Bloom mipmapBlur luminanceThreshold={1} luminanceSmoothing={0.2} intensity={0.2} />
          <ToneMapping mode={ToneMappingMode.NEUTRAL} />
        </EffectComposer>
      )}
    </Canvas>
  );
}
