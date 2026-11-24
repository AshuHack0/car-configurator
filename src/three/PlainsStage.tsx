'use client';

import { useEffect, useMemo } from 'react';
import { Environment, useEnvironment } from '@react-three/drei';
import { GroundedSkybox } from 'three/examples/jsm/objects/GroundedSkybox.js';

/**
 * Open plains at golden hour ("Aarfontein", Poly Haven, CC0). The HDR both lights the car and is
 * projected onto a dome with a flat floor at y = 0, so the car stands on the cracked dry ground.
 * The real sun sits almost on the horizon (u 0.60, v 0.485), which alone would leave the sides
 * in shadow, so a raised key light from the sun's direction and a soft sky fill keep every
 * panel readable. The car's shadow comes from its baked ground shadow (or contact shadows).
 */
const HDR = '/env/aarfontein_pan_2k.hdr';

/** Height the panorama was shot from (m), and the radius of the projected ground. */
const CAMERA_HEIGHT = 1.7;
const RADIUS = 80;

export function PlainsStage({ rotation = 0 }: { rotation?: number }) {
  const texture = useEnvironment({ files: HDR });

  const skybox = useMemo(() => {
    const box = new GroundedSkybox(texture, CAMERA_HEIGHT, RADIUS, 96);
    // The dome's floor sits CAMERA_HEIGHT below its centre: lift it so the floor is the ground plane.
    box.position.y = CAMERA_HEIGHT - 0.01;
    box.material.fog = false;
    return box;
  }, [texture]);
  useEffect(() => () => skybox.geometry.dispose(), [skybox]);

  // Sun azimuth from u = 0.60, turned with the location.
  const az = (0.6 - 0.5) * Math.PI * 2 + rotation;
  const sun: [number, number, number] = [Math.cos(az) * 20, 14, -Math.sin(az) * 20];

  return (
    <>
      <Environment map={texture} environmentRotation={[0, rotation, 0]} environmentIntensity={0.8} />
      <primitive object={skybox} rotation-y={rotation} />
      <hemisphereLight args={['#fff3e4', '#b9ab98', 1.4]} />
      <directionalLight position={sun} intensity={2.6} color="#ffe7c9" />
      <directionalLight position={[-sun[0], 6, -sun[2]]} intensity={1.1} color="#e8f0ff" />
    </>
  );
}
