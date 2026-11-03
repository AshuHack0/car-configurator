import Link from 'next/link';
import { ArrowRight, Box, Gauge, MousePointer2, Save } from 'lucide-react';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { LinkButton } from '@/components/ui/Button';
import { ProductThumb } from '@/components/products/ProductThumb';
import { HeroViewer } from '@/components/vehicle/HeroViewer';
import { VehicleCard } from '@/components/vehicle/VehicleCard';
import { CATEGORIES, PRODUCTS, formatINR } from '@/data/products';
import { BRANDS, getVehicle } from '@/data/vehicles';
import styles from './home.module.css';

const FEATURED = ['mercedes-e-class-w213', 'bmw-5-series-g30', 'porsche-911', 'audi-a6-c8'].map((id) => getVehicle(id)!);

const CATEGORY_PREVIEW: Record<string, string> = {
  wheels: 'wheel-racing-mesh',
  spoilers: 'spoiler-gt-wing',
  bumpers: 'front-aggressive',
  skirts: 'skirt-racing',
  lighting: 'head-ice',
  accessories: 'exhaust-titanium',
};

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main>
        <section className={styles.hero}>
          <HeroViewer />
          <div className={styles.heroShade} />
          <div className={styles.heroContent}>
            <span className={styles.eyebrow}><i /> Real-time 3D configurator</span>
            <h1>Build Your<br />Dream Machine.</h1>
            <p>Customize every detail. Explore your vehicle in 3D. Make it yours.</p>
            <div className={styles.heroActions}>
              <LinkButton href="/vehicles" variant="primary" size="lg" icon={<ArrowRight size={18} />}>Start Customizing</LinkButton>
              <LinkButton href="#showcase" variant="ghost" size="lg">Explore Vehicles</LinkButton>
            </div>
          </div>
          <div className={styles.heroHint}><MousePointer2 size={14} /> Drag to rotate</div>
        </section>

        <section id="brands" className={styles.brands}>
          {BRANDS.map((b) => (
            <Link key={b.id} href={`/vehicles?brand=${b.id}`} className={styles.brand}>
              <span>{b.name}</span>
              <small>{b.tagline}</small>
            </Link>
          ))}
        </section>

        <section id="showcase" className={styles.section}>
          <header className={styles.sectionHead}>
            <div>
              <span className={styles.kicker}>Showroom</span>
              <h2>Choose your starting point</h2>
            </div>
            <LinkButton href="/vehicles" variant="ghost" size="sm" icon={<ArrowRight size={14} />}>All vehicles</LinkButton>
          </header>
          <div className={styles.grid4}>
            {FEATURED.map((v) => <VehicleCard key={v.id} vehicle={v} />)}
          </div>
        </section>

        <section id="categories" className={styles.section}>
          <header className={styles.sectionHead}>
            <div>
              <span className={styles.kicker}>Customisation</span>
              <h2>Every part, fitted live in 3D</h2>
            </div>
          </header>
          <div className={styles.grid3}>
            {CATEGORIES.filter((c) => CATEGORY_PREVIEW[c.id]).map((c) => {
              const items = PRODUCTS.filter((p) => p.category === c.id);
              const preview = PRODUCTS.find((p) => p.id === CATEGORY_PREVIEW[c.id])!;
              const min = Math.min(...items.map((p) => p.price));
              const max = Math.max(...items.map((p) => p.price));
              return (
                <Link key={c.id} href="/vehicles" className={styles.category}>
                  <ProductThumb product={preview} finishColor={c.id === 'wheels' ? '#8a6131' : undefined} size="lg" />
                  <div className={styles.categoryMeta}>
                    <h3>{c.name}</h3>
                    <p>{c.blurb}</p>
                    <span>{items.length} options · {formatINR(min)} – {formatINR(max)}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        <section className={styles.features}>
          {[
            { icon: <Box size={20} />, title: 'Real 3D components', text: 'Wheels, aero and accessories are real meshes fitted to the car — not swapped pictures.' },
            { icon: <Gauge size={20} />, title: 'Instant pricing', text: 'Every choice updates your build sheet and estimated total in real time.' },
            { icon: <Save size={20} />, title: 'Save your build', text: 'Keep your configuration on this device and pick up where you left off.' },
          ].map((f) => (
            <div key={f.title} className={styles.feature}>
              <span className={styles.featureIcon}>{f.icon}</span>
              <h3>{f.title}</h3>
              <p>{f.text}</p>
            </div>
          ))}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
