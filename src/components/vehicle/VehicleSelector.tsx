'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { flushSync } from 'react-dom';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowRight, Bookmark, RotateCcw } from 'lucide-react';
import { LinkButton } from '@/components/ui/Button';
import { formatINR } from '@/data/products';
import { BRANDS, VEHICLES, getVehicle } from '@/data/vehicles';
import type { BodyStyle, BrandId, Vehicle } from '@/types/vehicle';
import { SplitWords } from '@/components/motion/split';
import { VehicleArt, bodyLabel } from './VehicleCard';
import styles from './VehicleSelector.module.css';

const BODIES: { id: BodyStyle; label: string }[] = [
  { id: 'coupe', label: 'Coupé' },
  { id: 'sedan', label: 'Saloon' },
  { id: 'suv', label: 'SUV' },
];

const toggle = <T,>(list: T[], item: T) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);

function ModelCard({ vehicle, saved, index }: { vehicle: Vehicle; saved: boolean; index: number }) {
  const [genCode, setGenCode] = useState(vehicle.generation);
  const generation = vehicle.generations.find((g) => g.code === genCode) ?? vehicle.generations[0];
  const [year, setYear] = useState(generation.years[0]);
  const brand = BRANDS.find((b) => b.id === vehicle.brand)!;

  const chooseGeneration = (code: string) => {
    setGenCode(code);
    setYear(vehicle.generations.find((g) => g.code === code)!.years[0]);
  };

  return (
    <article
      id={vehicle.id}
      className={styles.card}
      data-reveal
      style={{ '--d': (index % 3) * 90, viewTransitionName: `car-${vehicle.id}` } as CSSProperties}
    >
      <div className={styles.artWrap}>
        <VehicleArt vehicle={vehicle} />
        <span className={`mono ${styles.badge}`}>{brand.name} · {generation.code}</span>
      </div>
      <div className={styles.cardBody}>
        <h3>{vehicle.model}</h3>
        <p className={styles.price}>From {formatINR(vehicle.basePrice)}</p>
        <div className={styles.tags}>
          <span>{year}</span>
          <span>{bodyLabel(vehicle)}</span>
          {saved && <span className={styles.saved}><Bookmark size={12} /> Saved build</span>}
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
            variant="primary" size="md" icon={<ArrowRight size={18} />} className={styles.configure}
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

  /** Filter changes animate: cards glide to their new places (View Transitions, where supported). */
  const animate = (change: () => void) => {
    const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!doc.startViewTransition || still) return change();
    doc.startViewTransition(() => flushSync(change));
  };

  const matches = useMemo(
    () => VEHICLES.filter((v) => (!brands.length || brands.includes(v.brand)) && (!bodies.length || bodies.includes(v.body))),
    [brands, bodies],
  );
  const groups = BRANDS.map((b) => ({ brand: b, vehicles: matches.filter((v) => v.brand === b.id) })).filter((g) => g.vehicles.length);
  const filtered = brands.length + bodies.length > 0;
  const lastSaved = savedIds.find((id) => getVehicle(id));
  const reset = () => animate(() => { setBrands([]); setBodies([]); });

  return (
    <main className={styles.page}>
      <header className={styles.head}>
        <span className="mono" data-reveal>Model overview — {VEHICLES.length} models</span>
        <h1 data-reveal="words"><SplitWords text="The garage." /></h1>
        <div className={styles.headRow}>
          <p data-reveal style={{ '--d': 200 } as CSSProperties}>
            Choose a model, generation and year. It opens in the 3D configurator, ready for paint, wheels and parts.
          </p>
          {lastSaved && (
            <Link href={`/configurator/${lastSaved}`} className={styles.load} data-reveal style={{ '--d': 300 } as CSSProperties}>
              <Bookmark size={16} /> Continue your saved build
            </Link>
          )}
        </div>
      </header>

      <div className={styles.filterBar} role="group" aria-label="Filter models">
        <div className={styles.chips}>
          <button className={`${styles.chip} ${!brands.length ? styles.on : ''}`} aria-pressed={!brands.length} onClick={() => animate(() => setBrands([]))}>
            All brands
          </button>
          {BRANDS.map((b) => (
            <button
              key={b.id}
              className={`${styles.chip} ${brands.includes(b.id) ? styles.on : ''}`}
              aria-pressed={brands.includes(b.id)}
              onClick={() => animate(() => setBrands((l) => toggle(l, b.id)))}
            >
              {b.name}
              <small>{VEHICLES.filter((v) => v.brand === b.id).length}</small>
            </button>
          ))}
          <i className={styles.divider} aria-hidden />
          {BODIES.map((b) => (
            <button
              key={b.id}
              className={`${styles.chip} ${bodies.includes(b.id) ? styles.on : ''}`}
              aria-pressed={bodies.includes(b.id)}
              onClick={() => animate(() => setBodies((l) => toggle(l, b.id)))}
            >
              {b.label}
              <small>{VEHICLES.filter((v) => v.body === b.id).length}</small>
            </button>
          ))}
        </div>
        <div className={styles.barEnd}>
          <p className="mono" aria-live="polite">{matches.length} {matches.length === 1 ? 'model' : 'models'}</p>
          {filtered && <button className={styles.reset} onClick={reset}><RotateCcw size={14} /> Reset</button>}
        </div>
      </div>

      <div className={styles.results}>
        {groups.map(({ brand, vehicles }) => (
          <section key={brand.id} className={styles.group} style={{ viewTransitionName: `brand-${brand.id}` } as CSSProperties}>
            <h2 data-reveal>
              {brand.name}
              <span className="mono">{String(vehicles.length).padStart(2, '0')} {vehicles.length === 1 ? 'model' : 'models'}</span>
            </h2>
            <div className={styles.grid}>
              {vehicles.map((v, i) => <ModelCard key={v.id} vehicle={v} saved={savedIds.includes(v.id)} index={i} />)}
            </div>
          </section>
        ))}
        {!groups.length && (
          <div className={styles.empty}>
            <p>No models match this filter.</p>
            <button onClick={reset}>Reset filter</button>
          </div>
        )}
      </div>
    </main>
  );
}
