'use client';

import { useProgress } from '@react-three/drei';
import { AlertTriangle, Eye, Pause, Play, RefreshCw, Snowflake, Sun, Sunset, X } from 'lucide-react';
import { ProductThumb } from '@/components/products/ProductThumb';
import type { CameraPreset } from '@/three/CameraController';
import type { StageLighting } from '@/three/VehicleScene';
import type { Product } from '@/types/product';
import type { VehicleAssetConfig } from '@/types/vehicle';
import styles from './ViewerOverlay.module.css';

const PRESETS: { id: CameraPreset; label: string }[] = [
  { id: 'threeQuarter', label: '3/4' },
  { id: 'front', label: 'Front' },
  { id: 'side', label: 'Side' },
  { id: 'rear', label: 'Rear' },
  { id: 'top', label: 'Top' },
];

const LIGHTING: { id: StageLighting; label: string; icon: JSX.Element }[] = [
  { id: 'studio', label: 'Studio', icon: <Sun size={15} /> },
  { id: 'warm', label: 'Warm', icon: <Sunset size={15} /> },
  { id: 'cool', label: 'Cool', icon: <Snowflake size={15} /> },
];

interface Props {
  asset: VehicleAssetConfig;
  preset: CameraPreset;
  onPreset: (p: CameraPreset) => void;
  lighting: StageLighting;
  onLighting: (l: StageLighting) => void;
  autoRotate: boolean;
  onAutoRotate: () => void;
  loadError: string | null;
  onRetry: () => void;
  previewProduct: Product | null;
  previewReason: string | null;
  onDismissPreview: () => void;
  toast: string | null;
}

export function ViewerOverlay(props: Props) {
  const { progress, active, item } = useProgress();
  const loadingVehicle = active && item?.includes('/vehicles/');

  return (
    <>
      <div className={styles.presets} role="toolbar" aria-label="Camera views">
        {PRESETS.map((p) => (
          <button key={p.id} className={props.preset === p.id ? styles.on : ''} onClick={() => props.onPreset(p.id)}>{p.label}</button>
        ))}
      </div>

      <div className={styles.tools}>
        <div className={styles.segment} role="radiogroup" aria-label="Stage lighting">
          {LIGHTING.map((l) => (
            <button key={l.id} role="radio" aria-checked={props.lighting === l.id} title={`${l.label} lighting`}
              className={props.lighting === l.id ? styles.on : ''} onClick={() => props.onLighting(l.id)}>
              {l.icon}
            </button>
          ))}
        </div>
        <button className={`${styles.round} ${props.autoRotate ? styles.on : ''}`} onClick={props.onAutoRotate}
          title={props.autoRotate ? 'Stop 360° turntable' : 'Start 360° turntable'} aria-pressed={props.autoRotate}>
          {props.autoRotate ? <Pause size={15} /> : <Play size={15} />}
          <span>360°</span>
        </button>
      </div>

      <p className={styles.hint}>Drag to rotate · Scroll or pinch to zoom</p>

      {active && (
        <div className={`${styles.loader} ${loadingVehicle ? styles.loaderFull : ''}`}>
          <span>{loadingVehicle ? 'Loading 3D vehicle' : 'Fitting component'} · {Math.round(progress)}%</span>
          <div className={styles.bar}><i style={{ width: `${progress}%` }} /></div>
        </div>
      )}

      {props.loadError && (
        <div className={styles.error} role="alert">
          <AlertTriangle size={28} />
          <h3>The 3D model could not be loaded</h3>
          <p>
            <code>{props.asset.modelUrl}</code> failed to load. Check that the file exists in <code>public/models/vehicles</code>{' '}
            and is a valid GLB. Customisation choices and pricing still work.
          </p>
          <small>{props.loadError}</small>
          <button onClick={props.onRetry}><RefreshCw size={14} /> Retry</button>
        </div>
      )}

      {props.previewProduct && (
        <div className={styles.preview}>
          <button className={styles.close} onClick={props.onDismissPreview} aria-label="Close preview"><X size={14} /></button>
          <ProductThumb product={props.previewProduct} size="md" />
          <div>
            <span className={styles.previewTag}><Eye size={11} /> Preview only — not shown on the 3D car</span>
            <h4>{props.previewProduct.name}</h4>
            <p>{props.previewReason}</p>
          </div>
        </div>
      )}

      {props.toast && <div className={styles.toast} role="status">{props.toast}</div>}
    </>
  );
}
