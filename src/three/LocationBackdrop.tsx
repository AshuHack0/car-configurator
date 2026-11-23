'use client';

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { Environment, useTexture } from '@react-three/drei';
import { GroundedSkybox } from 'three/examples/jsm/objects/GroundedSkybox.js';

/**
 * A photographed location ("Modern Buildings 2", Poly Haven, CC0) used three ways:
 *  - the HDR lights the car and is what the paint and glass reflect;
 *  - the sharp JPG is projected onto a dome with a flat floor, so the car stands on the real paving;
 *  - a sun light placed where the sun is in the photograph casts the car's shadow onto that paving.
 * Files come from scripts/prepare-location.mjs, which also reports the sun position.
 */
const HDR = '/env/modern_buildings_2_2k.hdr';
const BACKDROP = { high: '/env/modern_buildings_2_8k.jpg', low: '/env/modern_buildings_2_4k.jpg' };

/** Where the sun is in the panorama (u across, v down, both 0..1). */
const SUN_UV = { u: 0.596, v: 0.3 };

/** Height the panorama was shot from (m); sets the scale of the projected ground. */
const CAMERA_HEIGHT = 1.7;
const RADIUS = 90;

/** Direction towards a point of the panorama, before the location is rotated. */
function directionOf(u: number, v: number) {
  const azimuth = (u - 0.5) * Math.PI * 2;
  const elevation = (0.5 - v) * Math.PI;
  return new THREE.Vector3(Math.cos(elevation) * Math.cos(azimuth), Math.sin(elevation), Math.cos(elevation) * Math.sin(azimuth));
}

export function LocationBackdrop({ quality, rotation = 0 }: { quality: 'high' | 'low'; rotation?: number }) {
  const texture = useTexture(BACKDROP[quality]);

  const skybox = useMemo(() => {
    texture.mapping = THREE.EquirectangularReflectionMapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    const box = new GroundedSkybox(texture, CAMERA_HEIGHT, RADIUS, 96);
    box.position.y = CAMERA_HEIGHT - 0.01;
    box.material.fog = false;
    return box;
  }, [texture]);

  useEffect(() => () => skybox.geometry.dispose(), [skybox]);

  const sun = useMemo(
    () => directionOf(SUN_UV.u, SUN_UV.v).applyAxisAngle(new THREE.Vector3(0, 1, 0), rotation).multiplyScalar(30).toArray(),
    [rotation],
  );

  return (
    <>
      <Environment files={HDR} environmentRotation={[0, rotation, 0]} environmentIntensity={0.7} />
      {/* Bright open-sky fill, plus a soft light from the side away from the sun, so no part of the car sits in murk. */}
      <hemisphereLight args={['#ffffff', '#cfc8bc', 1.5]} />
      <directionalLight position={[-sun[0], sun[1] * 0.6, -sun[2]]} intensity={1.3} color="#eef4ff" />
      <primitive object={skybox} rotation-y={rotation} />
      <directionalLight
        position={sun} intensity={3.4} color="#fff6e8" castShadow={quality === 'high'}
        shadow-mapSize={[4096, 4096]} shadow-bias={-0.0002} shadow-normalBias={0.03} shadow-radius={3}
        shadow-camera-left={-5} shadow-camera-right={5} shadow-camera-top={5} shadow-camera-bottom={-5}
        shadow-camera-near={5} shadow-camera-far={60}
      />
      {/* Invisible ground that only shows the car's sun shadow on the photographed paving. */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.003, 0]} receiveShadow>
        <planeGeometry args={[40, 40]} />
        <shadowMaterial transparent opacity={0.5} color="#0b1220" />
      </mesh>
    </>
  );
}
