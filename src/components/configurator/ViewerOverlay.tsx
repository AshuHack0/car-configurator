'use client';

import { useState } from 'react';
import { useProgress } from '@react-three/drei';
import { AlertTriangle, Box, ChevronUp, Eye, Image as ImageIcon, Maximize2, RefreshCw, Rotate3d, X } from 'lucide-react';
import { ProductThumb } from '@/components/products/ProductThumb';
import type { StageLighting } from '@/three/VehicleScene';
import type { Product } from '@/types/product';
import type { VehicleAssetConfig } from '@/types/vehicle';
import styles from './ViewerOverlay.module.css';

const LIGHTING: { id: StageLighting; label: string }[] = [
  { id: 'studio', label: 'Studio' },
  { id: 'warm', label: 'Warm' },
  { id: 'cool', label: 'Cool' },
];

interface Props {
  asset: VehicleAssetConfig;
  /** What the stage is showing: an offline photo render or the live 3D viewer. */
  mode: 'photo' | '3d';
  /** Set when photo view exists for this car but cannot show the current choices. */
  photoNote: string | null;
  /** Undefined when the vehicle has no photo renders. */
  onMode?: (mode: 'photo' | '3d') => void;
  lighting: StageLighting;
  onLighting: (l: StageLighting) => void;
  autoRotate: boolean;
  onAutoRotate: () => void;
  onFullscreen: () => void;
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
  const [sceneOpen, setSceneOpen] = useState(false);

  return (
    <>
      <div className={styles.toolbar}>
        {sceneOpen && props.mode === '3d' && (
          <div className={styles.scene} role="radiogroup" aria-label="Scene">
            <span>Background</span>
            <div>
              {LIGHTING.map((l) => (
                <button key={l.id} role="radio" aria-checked={props.lighting === l.id}
                  className={props.lighting === l.id ? styles.on : ''} onClick={() => props.onLighting(l.id)}>
                  {l.label}
                </button>
              ))}
            </div>
          </div>
        )}
        {props.onMode && (
          <>
            <button onClick={() => props.onMode?.('photo')} disabled={!!props.photoNote} title={props.photoNote ?? 'Photo-quality images'}
              aria-pressed={props.mode === 'photo'} className={props.mode === 'photo' ? styles.active : ''}>
              <ImageIcon size={16} /> <span>Photo</span>
            </button>
            <button onClick={() => props.onMode?.('3d')} aria-pressed={props.mode === '3d'} className={props.mode === '3d' ? styles.active : ''}>
              <Box size={16} /> <span>Live 3D</span>
            </button>
            <i />
          </>
        )}
        {props.mode === '3d' && (
          <>
            <button onClick={() => setSceneOpen((o) => !o)} aria-expanded={sceneOpen}>
              <ChevronUp size={16} className={sceneOpen ? styles.flip : ''} /> <span>Adjust scene</span>
            </button>
            <button onClick={props.onAutoRotate} aria-pressed={props.autoRotate} className={props.autoRotate ? styles.active : ''}>
              <Rotate3d size={16} /> <span>360° View</span>
            </button>
            <i />
          </>
        )}
        <button onClick={props.onFullscreen} aria-label="Full screen" title="Full screen"><Maximize2 size={16} /></button>
      </div>

      {active && props.mode === '3d' && (
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
