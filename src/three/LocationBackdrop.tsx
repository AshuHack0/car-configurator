'use client';

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { Environment, useTexture } from '@react-three/drei';
import { GroundedSkybox } from 'three/examples/jsm/objects/GroundedSkybox.js';

/**
 * A photographed location ("Dresden Square", Poly Haven, CC0) used two ways:
 *  - the small HDR lights the car and appears in its reflections;
 *  - the sharp JPG is projected onto a dome with a flat floor, so the car
 *    stands on the real paving instead of floating in front of a picture.
 */
const HDR = '/env/dresden_square_1k.hdr';
const BACKDROP = { high: '/env/dresden_square_8k.jpg', low: '/env/dresden_square_4k.jpg' };

/** Height the panorama was shot from (m); sets the scale of the projected ground. */
const CAMERA_HEIGHT = 1.9;
const RADIUS = 90;

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

  return (
    <>
      <Environment files={HDR} environmentRotation={[0, rotation, 0]} environmentIntensity={0.8} />
      <primitive object={skybox} rotation-y={rotation} />
    </>
  );
}
