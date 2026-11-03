'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { useProgress } from '@react-three/drei';
import { getAssetConfig } from '@/data/demoAssets';
import { resolvePaint } from '@/hooks/useConfigurator';
import type { Configuration } from '@/types/product';
import styles from './HeroViewer.module.css';

const VehicleScene = dynamic(() => import('@/three/VehicleScene'), { ssr: false });

/** A pre-built showcase spec so the homepage car already looks customised. */
const SHOWCASE: Configuration = {
  vehicleId: 'showcase',
  paint: { id: 'metallic-silver' },
  selections: {
    wheels: { productId: 'wheel-racing-mesh', finishId: 'bronze' },
    spoiler: { productId: 'spoiler-carbon' },
    frontBumper: { productId: 'front-aggressive' },
    sideSkirts: { productId: 'skirt-racing' },
  },
};

export function HeroViewer() {
  const asset = getAssetConfig('studio-coupe');
  const { progress, active } = useProgress();
  const [failed, setFailed] = useState(false);

  return (
    <div className={styles.viewer}>
      <VehicleScene
        asset={asset}
        config={SHOWCASE}
        paint={resolvePaint(SHOWCASE.paint)}
        supported={() => true}
        hero
        onError={() => setFailed(true)}
      />
      {active && !failed && (
        <div className={styles.loading}>
          <span>Loading 3D model</span>
          <div className={styles.bar}><i style={{ width: `${progress}%` }} /></div>
        </div>
      )}
      {failed && <div className={styles.loading}>3D preview unavailable — open the configurator to retry.</div>}
    </div>
  );
}
