'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, Bookmark, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { BRANDS, getBrand, getVehicle, vehiclesByBrand } from '@/data/vehicles';
import type { BrandId } from '@/types/vehicle';
import { VehicleSilhouette } from './VehicleSilhouette';
import styles from './VehicleSelector.module.css';

export function VehicleSelector() {
  const router = useRouter();
  const params = useSearchParams();
  const initialVehicle = getVehicle(params.get('vehicle') ?? '');
  const initialBrand = (initialVehicle?.brand ?? (params.get('brand') as BrandId | null)) || 'mercedes';

  const [brandId, setBrandId] = useState<BrandId>(BRANDS.some((b) => b.id === initialBrand) ? initialBrand : 'mercedes');
  const models = useMemo(() => vehiclesByBrand(brandId), [brandId]);
  const [vehicleId, setVehicleId] = useState(initialVehicle?.id ?? models[0]?.id);
  const vehicle = getVehicle(vehicleId) ?? models[0];
  const [genCode, setGenCode] = useState(vehicle.generation);
  const generation = vehicle.generations.find((g) => g.code === genCode) ?? vehicle.generations[0];
  const [year, setYear] = useState(generation.years[0]);
  const [savedIds, setSavedIds] = useState<string[]>([]);

  useEffect(() => {
    try {
      setSavedIds(Object.keys(localStorage).filter((k) => k.startsWith('dream-machine:config:')).map((k) => k.split(':')[2]));
    } catch {
      /* storage unavailable */
    }
  }, []);

  const chooseBrand = (id: BrandId) => {
    setBrandId(id);
    const first = vehiclesByBrand(id)[0];
    if (first) chooseVehicle(first.id);
  };

  const chooseVehicle = (id: string) => {
    const v = getVehicle(id)!;
    setVehicleId(id);
    setGenCode(v.generation);
    setYear(v.generations.find((g) => g.code === v.generation)!.years[0]);
  };

  const chooseGeneration = (code: string) => {
    setGenCode(code);
    setYear(vehicle.generations.find((g) => g.code === code)!.years[0]);
  };

  const open = () => router.push(`/configurator/${vehicle.id}?gen=${encodeURIComponent(generation.code)}&year=${year}`);
  const brand = getBrand(brandId);

  return (
    <main className={styles.page}>
      <header className={styles.head}>
        <span className={styles.step}>Step 1 of 2</span>
        <h1>Select your vehicle</h1>
        <p>Choose a brand, model, generation and year. Your car opens in the 3D configurator.</p>
      </header>

      <div className={styles.brands} role="tablist" aria-label="Brands">
        {BRANDS.map((b) => (
          <button
            key={b.id} role="tab" aria-selected={b.id === brandId}
            className={`${styles.brandTab} ${b.id === brandId ? styles.active : ''}`}
            onClick={() => chooseBrand(b.id)}
          >
            {b.name}
            <small>{vehiclesByBrand(b.id).length} models</small>
          </button>
        ))}
      </div>

      <div className={styles.layout}>
        <div className={styles.models}>
          {models.map((v) => {
            const selected = v.id === vehicle.id;
            return (
              <button key={v.id} className={`${styles.model} ${selected ? styles.selected : ''}`} onClick={() => chooseVehicle(v.id)}>
                {selected && <span className={styles.tick}><Check size={14} /></span>}
                {savedIds.includes(v.id) && <span className={styles.saved}><Bookmark size={12} /> Saved build</span>}
                <div className={styles.modelArt}><VehicleSilhouette body={v.body} accent={brand.accent} /></div>
                <h3>{v.model} <span>{v.generation}</span></h3>
                <p>{v.power} · {v.body}</p>
              </button>
            );
          })}
        </div>

        <aside className={styles.panel}>
          <span className={styles.panelBrand}>{brand.name}</span>
          <h2>{vehicle.model}</h2>

          <label className={styles.label}>Generation</label>
          <div className={styles.chips}>
            {vehicle.generations.map((g) => (
              <button key={g.code} className={`${styles.chip} ${g.code === generation.code ? styles.chipActive : ''}`} onClick={() => chooseGeneration(g.code)}>
                {g.label}
              </button>
            ))}
          </div>

          <label className={styles.label} htmlFor="year">Model year</label>
          <select id="year" className={styles.select} value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {generation.years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>

          <dl className={styles.specs}>
            <div><dt>Body</dt><dd>{vehicle.body}</dd></div>
            <div><dt>Power</dt><dd>{vehicle.power}</dd></div>
            <div><dt>Chassis</dt><dd>{generation.code}</dd></div>
          </dl>

          <Button variant="primary" size="lg" className={styles.cta} onClick={open} icon={<ArrowRight size={18} />}>
            Open 3D configurator
          </Button>
        </aside>
      </div>
    </main>
  );
}
