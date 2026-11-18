'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowRight, Bookmark, SlidersHorizontal } from 'lucide-react';
import { LinkButton } from '@/components/ui/Button';
import { formatINR } from '@/data/products';
import { BRANDS, VEHICLES, getVehicle } from '@/data/vehicles';
import type { BodyStyle, BrandId, Vehicle } from '@/types/vehicle';
import { VehicleArt, bodyLabel } from './VehicleCard';
import styles from './VehicleSelector.module.css';

const BODIES: { id: BodyStyle; label: string }[] = [
  { id: 'coupe', label: 'Coupé' },
  { id: 'sedan', label: 'Saloon' },
  { id: 'suv', label: 'SUV' },
];

const toggle = <T,>(list: T[], item: T) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);

function ModelCard({ vehicle, saved }: { vehicle: Vehicle; saved: boolean }) {
  const [genCode, setGenCode] = useState(vehicle.generation);
  const generation = vehicle.generations.find((g) => g.code === genCode) ?? vehicle.generations[0];
  const [year, setYear] = useState(generation.years[0]);
  const brand = BRANDS.find((b) => b.id === vehicle.brand)!;

  const chooseGeneration = (code: string) => {
    setGenCode(code);
    setYear(vehicle.generations.find((g) => g.code === code)!.years[0]);
  };

  return (
    <article id={vehicle.id} className={styles.card}>
      <VehicleArt vehicle={vehicle} />
      <div className={styles.cardBody}>
        <h3>{brand.name} {vehicle.model}</h3>
        <p className={styles.price}>From {formatINR(vehicle.basePrice)}</p>
        <div className={styles.tags}>
          <span>{year}</span>
          <span>{bodyLabel(vehicle)}</span>
          <span>{generation.code}</span>
          {saved && <span className={styles.saved}><Bookmark size={12} /> Saved configuration</span>}
        </div>

        <dl className={styles.specs}>
          <div>
            <dt>Power</dt>
            <dd>{vehicle.power}</dd>
          </div>
          <div>
            <dt><label htmlFor={`gen-${vehicle.id}`}>Generation</label></dt>
            <dd>
              <select id={`gen-${vehicle.id}`} value={generation.code} onChange={(e) => chooseGeneration(e.target.value)}>
                {vehicle.generations.map((g) => <option key={g.code} value={g.code}>{g.label}</option>)}
              </select>
            </dd>
          </div>
          <div>
            <dt><label htmlFor={`year-${vehicle.id}`}>Model year</label></dt>
            <dd>
              <select id={`year-${vehicle.id}`} value={year} onChange={(e) => setYear(Number(e.target.value))}>
                {generation.years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </dd>
          </div>
        </dl>

        <div className={styles.actions}>
          <LinkButton
            href={`/configurator/${vehicle.id}?gen=${encodeURIComponent(generation.code)}&year=${year}`}
            variant="primary" size="md" icon={<ArrowRight size={18} />}
          >
            Configure
          </LinkButton>
        </div>
      </div>
    </article>
  );
}

export function VehicleSelector() {
  const params = useSearchParams();
  const paramVehicle = getVehicle(params.get('vehicle') ?? '');
  const paramBrand = (paramVehicle?.brand ?? params.get('brand')) as BrandId | null;
  const startBrand = BRANDS.some((b) => b.id === paramBrand) ? [paramBrand as BrandId] : [];

  const [brands, setBrands] = useState<BrandId[]>(startBrand);
  const [bodies, setBodies] = useState<BodyStyle[]>([]);
  const [savedIds, setSavedIds] = useState<string[]>([]);

  useEffect(() => {
    try {
      setSavedIds(Object.keys(localStorage).filter((k) => k.startsWith('dream-machine:config:')).map((k) => k.split(':')[2]));
    } catch {
      /* storage unavailable */
    }
  }, []);

  // Follow header / footer links that change ?brand= while this page stays mounted.
  useEffect(() => {
    setBrands(startBrand);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramBrand]);

  useEffect(() => {
    const id = paramVehicle?.id ?? window.location.hash.slice(1);
    if (id) document.getElementById(id)?.scrollIntoView({ block: 'center' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const matches = useMemo(
    () => VEHICLES.filter((v) => (!brands.length || brands.includes(v.brand)) && (!bodies.length || bodies.includes(v.body))),
    [brands, bodies],
  );
  const groups = BRANDS.map((b) => ({ brand: b, vehicles: matches.filter((v) => v.brand === b.id) })).filter((g) => g.vehicles.length);
  const filtered = brands.length + bodies.length > 0;
  const lastSaved = savedIds.find((id) => getVehicle(id));

  return (
    <main className={styles.page}>
      <header className={styles.head}>
        <h1>Configure your dream machine</h1>
        <p>Choose a model, generation and year. Your car opens in the configurator.</p>
        {lastSaved && (
          <Link href={`/configurator/${lastSaved}`} className={styles.load}>
            <Bookmark size={16} /> Load saved configuration
          </Link>
        )}
      </header>

      <div className={styles.layout}>
        <aside className={styles.filter} aria-label="Filter models">
          <div className={styles.filterHead}>
            <h2><SlidersHorizontal size={18} /> Filter</h2>
            {filtered && <button onClick={() => { setBrands([]); setBodies([]); }}>Reset filter</button>}
          </div>

          <fieldset>
            <legend>Brand</legend>
            {BRANDS.map((b) => (
              <label key={b.id} className={styles.check}>
                <input type="checkbox" checked={brands.includes(b.id)} onChange={() => setBrands((l) => toggle(l, b.id))} />
                <span>{b.name}</span>
                <small>{VEHICLES.filter((v) => v.brand === b.id).length}</small>
              </label>
            ))}
          </fieldset>

          <fieldset>
            <legend>Body design</legend>
            {BODIES.map((b) => (
              <label key={b.id} className={styles.check}>
                <input type="checkbox" checked={bodies.includes(b.id)} onChange={() => setBodies((l) => toggle(l, b.id))} />
                <span>{b.label}</span>
                <small>{VEHICLES.filter((v) => v.body === b.id).length}</small>
              </label>
            ))}
          </fieldset>
        </aside>

        <div className={styles.results}>
          <p className={styles.count} aria-live="polite">{matches.length} {matches.length === 1 ? 'model' : 'models'}</p>
          {groups.map(({ brand, vehicles }) => (
            <section key={brand.id} className={styles.group}>
              <h2>{brand.name} <span>Model variants</span></h2>
              <div className={styles.grid}>
                {vehicles.map((v) => <ModelCard key={v.id} vehicle={v} saved={savedIds.includes(v.id)} />)}
              </div>
            </section>
          ))}
          {!groups.length && (
            <div className={styles.empty}>
              <p>No models match this filter.</p>
              <button onClick={() => { setBrands([]); setBodies([]); }}>Reset filter</button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
