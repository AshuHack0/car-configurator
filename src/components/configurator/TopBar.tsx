'use client';

import Link from 'next/link';
import { History, Info, RotateCcw, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { Brand, Vehicle, VehicleAssetConfig } from '@/types/vehicle';
import styles from './TopBar.module.css';

interface Props {
  vehicle: Vehicle;
  brand: Brand;
  asset: VehicleAssetConfig;
  generation: string;
  year?: number;
  hasSaved: boolean;
  onReset: () => void;
  onSave: () => void;
  onRestore: () => void;
}

export function TopBar({ vehicle, brand, asset, generation, year, hasSaved, onReset, onSave, onRestore }: Props) {
  return (
    <header className={styles.bar}>
      <div className={styles.identity}>
        <span className={styles.brand}>{brand.name}</span>
        <h1>
          {vehicle.model}
          <span>{generation}{year ? ` · ${year}` : ''}</span>
        </h1>
        {asset.standIn && (
          <span className={styles.standIn} title={`3D body: ${asset.credit}. Add a licensed GLB for this exact model in src/data/demoAssets.ts.`}>
            <Info size={12} /> Demo 3D body
          </span>
        )}
      </div>
      <div className={styles.actions}>
        {hasSaved && (
          <Button size="sm" variant="ghost" icon={<History size={15} />} onClick={onRestore} aria-label="Restore saved configuration">
            <span className={styles.label}>Restore</span>
          </Button>
        )}
        <Button size="sm" variant="ghost" icon={<RotateCcw size={15} />} onClick={onReset} aria-label="Reset configuration">
          <span className={styles.label}>Reset</span>
        </Button>
        <Button size="sm" variant="primary" icon={<Save size={15} />} onClick={onSave} aria-label="Save configuration">
          <span className={styles.label}>Save</span>
        </Button>
        <Link href="/vehicles" className={styles.exit} aria-label="Exit configurator" title="Exit configurator">
          <X size={18} />
        </Link>
      </div>
    </header>
  );
}
