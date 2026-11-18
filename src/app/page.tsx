import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { LinkButton } from '@/components/ui/Button';
import { ProductThumb } from '@/components/products/ProductThumb';
import { VehicleCard } from '@/components/vehicle/VehicleCard';
import { CATEGORIES, PRODUCTS, formatINR } from '@/data/products';
import { getVehicle } from '@/data/vehicles';
import styles from './home.module.css';

const FEATURED = ['porsche-911', 'bmw-m4-g82', 'mercedes-e-class-w213', 'audi-a6-c8', 'porsche-cayenne', 'lamborghini-huracan']
  .map((id) => getVehicle(id)!);

const DISCOVER = [
  { title: 'Wheels', text: 'Forged, mesh and aero designs in four finishes.', img: '/photos/discover-wheels.jpg', pos: '50% 50%' },
  { title: 'Exterior colours', text: 'Seven paints, or mix your own.', img: '/photos/discover-colours.jpg', pos: '50% 60%' },
  { title: 'Aero and body parts', text: 'Wings, splitters, diffusers and skirts.', img: '/photos/discover-aero.jpg', pos: '50% 55%' },
];

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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/photos/hero.jpg" alt="A blue sports coupé under studio lights" />
          <div className={styles.heroShade} />
          <div className={styles.heroContent}>
            <h1>Build Your Dream Machine.</h1>
            <p>Customize every detail. Explore your vehicle in 3D. Make it yours.</p>
            <div className={styles.heroActions}>
              <LinkButton href="/vehicles" variant="light" size="lg" icon={<ArrowRight size={18} />}>Choose a model</LinkButton>
              <LinkButton href="/identify" variant="ghost" size="lg" className={styles.onPhoto}>Upload your car</LinkButton>
            </div>
          </div>
        </section>

        <section id="models" className={styles.section}>
          <header className={styles.sectionHead}>
            <h2>Models</h2>
            <LinkButton href="/vehicles" variant="ghost" size="sm" icon={<ArrowRight size={16} />}>All models</LinkButton>
          </header>
          <div className={styles.grid3}>
            {FEATURED.map((v) => <VehicleCard key={v.id} vehicle={v} />)}
          </div>
        </section>

        <section className={styles.split}>
          <div className={styles.splitText}>
            <h2>Start from your own car.</h2>
            <p>Upload a photo. We identify the model and paint, then open it in the configurator, ready to modify.</p>
            <LinkButton href="/identify" variant="primary" size="md" icon={<ArrowRight size={18} />}>Upload your car</LinkButton>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/photos/feature-own-car.jpg" alt="A red sports coupé parked outdoors" loading="lazy" />
        </section>

        <section id="discover" className={styles.section}>
          <header className={styles.sectionHead}><h2>Discover</h2></header>
          <div className={styles.grid3}>
            {DISCOVER.map((d) => (
              <Link key={d.title} href="/configurator/porsche-911" className={styles.tile}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={d.img} alt="" loading="lazy" style={{ objectPosition: d.pos }} />
                <div>
                  <h3>{d.title}</h3>
                  <p>{d.text}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section id="individualisation" className={styles.section}>
          <header className={styles.sectionHead}>
            <h2>Individualisation</h2>
            <p>Every part is fitted live in 3D and priced as you build.</p>
          </header>
          <div className={styles.grid3}>
            {CATEGORIES.filter((c) => CATEGORY_PREVIEW[c.id]).map((c) => {
              const items = PRODUCTS.filter((p) => p.category === c.id);
              const preview = PRODUCTS.find((p) => p.id === CATEGORY_PREVIEW[c.id])!;
              const min = Math.min(...items.map((p) => p.price));
              return (
                <Link key={c.id} href="/vehicles" className={styles.category}>
                  <ProductThumb product={preview} finishColor={c.id === 'wheels' ? '#8a6131' : undefined} size="lg" />
                  <div className={styles.categoryMeta}>
                    <h3>{c.name}</h3>
                    <p>{c.blurb}</p>
                    <span>{items.length} options · from {formatINR(min)}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
