'use client';

import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Environment } from '@react-three/drei';

/**
 * A sunlit courtyard built from real geometry: stone paving, and white brick walls fronted by a
 * row of tall brick fins on all four sides. Because it is geometry (not a photograph), the sun
 * throws the walls' and the car's shadows across the paving and nothing stretches as you orbit.
 * The HDR is only used for sky light and the faint reflections in the paint.
 */
const HDR = '/env/modern_buildings_2_2k.hdr';

/** Half-size of the courtyard (m): the walls stand this far from the car. */
export const COURTYARD_HALF = 13;
const FIN = { width: 0.42, depth: 0.55, height: 4.2, pitch: 0.92 };
const BEAM_HEIGHT = 1.5;
/**
 * Direction the sunlight comes from: mid-height, from the side the opening view looks at and a
 * little behind the car, so the car's shadow falls across the paving in front of it.
 */
const SUN: [number, number, number] = [13, 12, -5];

function canvasTexture(size: number, draw: (ctx: CanvasRenderingContext2D, size: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  draw(canvas.getContext('2d')!, size);
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 16;
  return t;
}

/** Deterministic noise so the paving looks the same on every load. */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

/** One tile = 2.4 m x 2.4 m of long stone pavers laid in offset rows. */
function drawPaving(ctx: CanvasRenderingContext2D, size: number) {
  const rand = rng(7);
  ctx.fillStyle = '#4f4a44';
  ctx.fillRect(0, 0, size, size);
  const rows = 16, cols = 6;
  const h = size / rows, w = size / cols;
  for (let r = 0; r < rows; r++) {
    const offset = (r % 2) * (w / 2) + (rand() - 0.5) * w * 0.2;
    for (let c = -1; c <= cols; c++) {
      const tone = 118 + rand() * 44;
      ctx.fillStyle = `rgb(${tone + 7}, ${tone + 1}, ${tone - 7})`;
      ctx.fillRect(c * w + offset + 2, r * h + 2, w - 4, h - 4);
    }
  }
  // Fine grain so the stone is not flat colour up close.
  for (let i = 0; i < 26000; i++) {
    ctx.fillStyle = rand() > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
    ctx.fillRect(rand() * size, rand() * size, 2, 2);
  }
}

/** One tile = 1 m x 1 m of painted white brick. */
function drawBrick(ctx: CanvasRenderingContext2D, size: number) {
  const rand = rng(21);
  ctx.fillStyle = '#c9c6c0';
  ctx.fillRect(0, 0, size, size);
  const rows = 13, cols = 4;
  const h = size / rows, w = size / cols;
  for (let r = 0; r < rows; r++) {
    for (let c = -1; c <= cols; c++) {
      const tone = 226 + rand() * 20;
      ctx.fillStyle = `rgb(${tone}, ${tone - 1}, ${tone - 4})`;
      ctx.fillRect(c * w + (r % 2) * (w / 2) + 2, r * h + 2, w - 4, h - 4);
    }
  }
}

export function CourtyardStage({ shadows }: { shadows: boolean }) {
  const { paving, finBrick, wallBrick } = useMemo(() => {
    const paving = canvasTexture(1024, drawPaving);
    paving.repeat.set((COURTYARD_HALF * 2 + 8) / 2.4, (COURTYARD_HALF * 2 + 8) / 2.4);
    const finBrick = canvasTexture(512, drawBrick);
    finBrick.repeat.set(FIN.width, FIN.height);
    const wallBrick = canvasTexture(512, drawBrick);
    wallBrick.repeat.set(COURTYARD_HALF * 2 + 2, BEAM_HEIGHT);
    return { paving, finBrick, wallBrick };
  }, []);
  useEffect(() => () => [paving, finBrick, wallBrick].forEach((t) => t.dispose()), [paving, finBrick, wallBrick]);

  // Fins along all four sides.
  const fins = useRef<THREE.InstancedMesh>(null);
  const perSide = Math.floor((COURTYARD_HALF * 2) / FIN.pitch);
  useLayoutEffect(() => {
    const mesh = fins.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    let i = 0;
    for (let side = 0; side < 4; side++) {
      for (let k = 0; k < perSide; k++) {
        const along = -COURTYARD_HALF + FIN.pitch * (k + 0.5);
        const [x, z] = side === 0 ? [along, -COURTYARD_HALF] : side === 1 ? [along, COURTYARD_HALF] : side === 2 ? [-COURTYARD_HALF, along] : [COURTYARD_HALF, along];
        m.makeRotationY(side < 2 ? 0 : Math.PI / 2).setPosition(x, FIN.height / 2, z);
        mesh.setMatrixAt(i++, m);
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [perSide]);

  const span = COURTYARD_HALF * 2 + 2;
  const sides: { position: [number, number, number]; rotation: number }[] = [
    { position: [0, 0, -COURTYARD_HALF], rotation: 0 },
    { position: [0, 0, COURTYARD_HALF], rotation: 0 },
    { position: [-COURTYARD_HALF, 0, 0], rotation: Math.PI / 2 },
    { position: [COURTYARD_HALF, 0, 0], rotation: Math.PI / 2 },
  ];

  return (
    <>
      <color attach="background" args={['#bfd2ea']} />
      <Environment files={HDR} environmentIntensity={0.5} />
      <hemisphereLight args={['#ffffff', '#b9b0a2', 0.95]} />
      <directionalLight position={[-SUN[0], SUN[1] * 0.5, -SUN[2]]} intensity={1.0} color="#eef4ff" />
      <directionalLight
        position={SUN} intensity={4.2} color="#fff3df" castShadow={shadows}
        shadow-mapSize={[4096, 4096]} shadow-bias={-0.0003} shadow-normalBias={0.04} shadow-radius={2.5}
        shadow-camera-left={-20} shadow-camera-right={20} shadow-camera-top={20} shadow-camera-bottom={-20}
        shadow-camera-near={1} shadow-camera-far={70}
      />

      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[COURTYARD_HALF * 2 + 8, COURTYARD_HALF * 2 + 8]} />
        <meshStandardMaterial map={paving} roughness={0.92} />
      </mesh>

      <instancedMesh ref={fins} args={[undefined, undefined, perSide * 4]} castShadow receiveShadow>
        <boxGeometry args={[FIN.width, FIN.height, FIN.depth]} />
        <meshStandardMaterial map={finBrick} roughness={0.9} />
      </instancedMesh>

      {sides.map(({ position, rotation }, i) => {
        // Which way is "outwards" for this side, so the back wall sits behind its fins.
        const out = new THREE.Vector3(position[0], 0, position[2]).normalize().multiplyScalar(1.6);
        return (
          <group key={i}>
            {/* Shaded recess behind the fins. */}
            <mesh position={[position[0] + out.x, FIN.height / 2, position[2] + out.z]} rotation-y={rotation} receiveShadow>
              <boxGeometry args={[span + 3, FIN.height, 0.3]} />
              <meshStandardMaterial color="#4b4d52" roughness={1} />
            </mesh>
            {/* Solid brick band carried by the fins. */}
            <mesh position={[position[0] + out.x * 0.35, FIN.height + BEAM_HEIGHT / 2, position[2] + out.z * 0.35]} rotation-y={rotation} castShadow receiveShadow>
              <boxGeometry args={[span + 2, BEAM_HEIGHT, FIN.depth + 1.1]} />
              <meshStandardMaterial map={wallBrick} roughness={0.9} />
            </mesh>
          </group>
        );
      })}
    </>
  );
}
