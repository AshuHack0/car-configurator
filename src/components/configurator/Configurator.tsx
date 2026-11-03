'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { CATEGORIES, PRODUCTS } from '@/data/products';
import { useConfigurator } from '@/hooks/useConfigurator';
import { useVehicle } from '@/hooks/useVehicle';
import { preloadModels } from '@/three/loaders';
import type { CameraPreset } from '@/three/CameraController';
import type { StageLighting } from '@/three/VehicleScene';
import type { CategoryId, Product, SlotId } from '@/types/product';
import { CategoryNav } from './CategoryNav';
import { PaintPanel } from './PaintPanel';
import { ProductPanel } from './ProductPanel';
import { SummaryBar } from './SummaryBar';
import { TopBar } from './TopBar';
import { ViewerOverlay } from './ViewerOverlay';
import styles from './Configurator.module.css';

const VehicleScene = dynamic(() => import('@/three/VehicleScene'), { ssr: false });

const CATEGORY_VIEW: Record<CategoryId, CameraPreset> = {
  wheels: 'wheel',
  spoilers: 'rearQuarter',
  bumpers: 'frontLow',
  skirts: 'side',
  paint: 'threeQuarter',
  lighting: 'front',
  accessories: 'rearQuarter',
};

const SLOT_VIEW: Partial<Record<SlotId, CameraPreset>> = {
  frontBumper: 'frontLow',
  rearBumper: 'rear',
  diffuser: 'rear',
  exhaust: 'rear',
  taillights: 'rear',
  headlights: 'front',
  grille: 'front',
  roof: 'threeQuarter',
  mirrors: 'threeQuarter',
  carbonTrim: 'threeQuarter',
};

interface Props {
  vehicleId: string;
  generation: string;
  year?: number;
}

export function Configurator({ vehicleId, generation, year }: Props) {
  const v = useVehicle(vehicleId)!;
  const cfg = useConfigurator(vehicleId, year, generation);
  const [category, setCategory] = useState<CategoryId>('wheels');
  const [camera, setCamera] = useState<{ preset: CameraPreset; nonce: number }>({ preset: 'threeQuarter', nonce: 0 });
  const [lighting, setLighting] = useState<StageLighting>('studio');
  const [autoRotate, setAutoRotate] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  const goTo = useCallback((preset: CameraPreset) => setCamera((c) => ({ preset, nonce: c.nonce + 1 })), []);

  const openCategory = (id: CategoryId) => {
    setCategory(id);
    goTo(CATEGORY_VIEW[id]);
  };

  // Lazy-load: only fetch part models for the category the customer is browsing.
  useEffect(() => {
    const urls = PRODUCTS.filter((p) => p.category === category && v.supportFor(p) !== 'none')
      .map((p) => (p.impl.kind === 'wheels' || p.impl.kind === 'attach' ? p.impl.model : null))
      .filter((u): u is string => !!u);
    preloadModels(urls);
  }, [category, v]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const select = (product: Product, finishId?: string) => {
    cfg.select(product, finishId, v.supportFor(product) === 'none');
    const view = SLOT_VIEW[product.slot];
    if (view && view !== camera.preset) goTo(view);
  };

  const supported = useCallback((p: Product) => v.supportFor(p) !== 'none', [v]);
  const activeCategory = useMemo(() => CATEGORIES.find((c) => c.id === category)!, [category]);

  return (
    <div className={styles.shell}>
      <TopBar
        vehicle={v.vehicle}
        brand={v.brand}
        asset={v.asset}
        generation={generation}
        year={year}
        hasSaved={!!cfg.saved}
        onReset={() => { cfg.reset(); goTo('threeQuarter'); setToast('Configuration reset to factory'); }}
        onSave={() => setToast(cfg.save() ? 'Configuration saved on this device' : 'Could not save — storage unavailable')}
        onRestore={() => setToast(cfg.restore() ? 'Saved configuration restored' : 'No saved configuration found')}
      />

      <CategoryNav active={category} onSelect={openCategory} config={cfg.config} />

      <section className={styles.viewer}>
        <VehicleScene
          asset={v.asset}
          config={cfg.config}
          paint={cfg.paint}
          supported={supported}
          preset={camera.preset}
          presetNonce={camera.nonce}
          lighting={lighting}
          autoRotate={autoRotate}
          retryKey={retryKey}
          onError={(e) => setLoadError(e.message)}
        />
        <ViewerOverlay
          asset={v.asset}
          preset={camera.preset}
          onPreset={goTo}
          lighting={lighting}
          onLighting={setLighting}
          autoRotate={autoRotate}
          onAutoRotate={() => setAutoRotate((a) => !a)}
          loadError={loadError}
          onRetry={() => { setLoadError(null); setRetryKey((k) => k + 1); }}
          previewProduct={cfg.previewProduct}
          previewReason={cfg.previewProduct && (
            v.asset.unsupportedNotes?.[cfg.previewProduct.component]
            ?? (cfg.previewProduct.impl.kind === 'preview' ? cfg.previewProduct.impl.reason : 'This part is not available in 3D for this vehicle yet.')
          )}
          onDismissPreview={cfg.dismissPreview}
          toast={toast}
        />
      </section>

      <aside className={styles.panel}>
        <header className={styles.panelHead}>
          <h2>{activeCategory.name}</h2>
          <p>{activeCategory.blurb}</p>
        </header>
        {category === 'paint' ? (
          <PaintPanel paint={cfg.config.paint} resolved={cfg.paint} onChange={cfg.setPaint} />
        ) : (
          <ProductPanel
            category={activeCategory}
            selections={cfg.config.selections}
            supportFor={v.supportFor}
            onSelect={select}
            onRemove={cfg.remove}
            onFinish={cfg.setFinish}
          />
        )}
      </aside>

      <SummaryBar items={cfg.lineItems} total={cfg.total} onRemove={(slot) => (slot === 'paint' ? cfg.setPaint({ id: 'factory' }) : cfg.remove(slot))} />
    </div>
  );
}
