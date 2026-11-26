import Link from 'next/link';
import type { CSSProperties } from 'react';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { LinkButton } from '@/components/ui/Button';
import { ProductThumb } from '@/components/products/ProductThumb';
import { IntroCurtain } from '@/components/home/IntroCurtain';
import { Showroom, type ShowroomCar } from '@/components/home/Showroom';
import { ScrubWords, SplitWords } from '@/components/motion/split';
import { bodyLabel } from '@/components/vehicle/VehicleCard';
import { photoUrl } from '@/data/photos';
import { CATEGORIES, PAINTS, PRODUCTS, formatINR, getProduct } from '@/data/products';
import { BRANDS, VEHICLES, getBrand, getVehicle } from '@/data/vehicles';
import styles from './home.module.css';

const d = (ms: number) => ({ '--d': ms }) as CSSProperties;

const SHOWROOM: ShowroomCar[] = ['porsche-911', 'bmw-m4-g82', 'lamborghini-huracan', 'mercedes-e-class-w213', 'audi-a6-c8', 'porsche-cayenne']
  .map((id) => getVehicle(id)!)
  .map((v) => ({
    id: v.id,
    brand: getBrand(v.brand).name,
    model: v.model,
    body: bodyLabel(v),
    power: v.power,
    generation: v.generation,
    price: formatINR(v.basePrice),
    photo: photoUrl(v.id) ?? '/photos/hero.jpg',
  }));

const CATEGORY_PREVIEW: Record<string, string> = {
  wheels: 'wheel-racing-mesh',
  spoilers: 'spoiler-gt-wing',
  bumpers: 'front-aggressive',
  skirts: 'skirt-racing',
  lighting: 'head-ice',
  accessories: 'exhaust-titanium',
  interior: 'interior-tan',
};

/** A sample build for the "priced as you build" tile, from real catalogue prices. */
const SAMPLE_BUILD = ['wheel-racing-mesh', 'spoiler-gt-wing', 'front-aggressive'].map((id) => getProduct(id)!);
const SAMPLE_TOTAL = SAMPLE_BUILD.reduce((sum, p) => sum + p.price, 0);

const MANIFESTO =
  'Every car leaves the factory the same. Yours shouldn’t. Pick a model, fit real parts in live 3D, open the doors, sit inside, change the paint and watch the price as you build. Then take it to the workshop.';

export default function HomePage() {
  const partCount = PRODUCTS.length;
  return (
    <>
      <IntroCurtain />
      <SiteHeader />
      <main>
        {/* ---- Hero ---------------------------------------------------- */}
        <section className={styles.hero}>
          <div className={styles.heroMedia} data-reveal="blur">
            <div data-parallax="-0.12" className={styles.heroParallax}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/photos/hero.jpg" alt="A blue sports coupé under show lights" fetchPriority="high" />
            </div>
          </div>
          <div className={styles.heroGrade} />
          <div className={styles.sweep} aria-hidden />

          <div className={styles.heroTop}>
            <span className="mono" data-reveal="fade" style={d(300)}>N°01 — The digital garage</span>
            <span className={`mono ${styles.live}`} data-reveal="fade" style={d(400)}><i /> Live 3D configurator</span>
          </div>

          <h1 className={styles.heroTitle} data-reveal="words" style={d(150)}>
            <SplitWords text={'Build your\ndream machine.'} />
          </h1>

          <div className={styles.heroBottom}>
            <div className={styles.heroCopy}>
              <p data-reveal style={d(650)}>
                Pick a model, fit real parts in live 3D, open the doors and sit inside. Every choice is priced as you build.
              </p>
              <div className={styles.heroActions} data-reveal style={d(780)}>
                <LinkButton href="/vehicles" variant="light" size="lg" icon={<ArrowRight size={18} />}>Choose your model</LinkButton>
                <LinkButton href="/identify" variant="ghost" size="lg">Upload your car</LinkButton>
              </div>
            </div>
            <dl className={styles.stats}>
              {[
                { n: VEHICLES.length, label: 'Models' },
                { n: partCount, label: 'Parts' },
                { n: PAINTS.length, label: 'Paints' },
                { n: 360, label: 'Degree view', suffix: '°' },
              ].map((s, i) => (
                <div key={s.label} data-reveal style={d(900 + i * 90)}>
                  <dt className="mono">{s.label}</dt>
                  <dd><span data-count={s.n}>0</span>{s.suffix}</dd>
                </div>
              ))}
            </dl>
          </div>

        </section>

        {/* ---- Brand marquee ------------------------------------------- */}
        <div className={styles.marquee} aria-hidden>
          <div className={styles.marqueeTrack}>
            {[0, 1].map((k) => (
              <span key={k}>
                {BRANDS.map((b) => (
                  <span key={b.id}>{b.name}<i>✦</i></span>
                ))}
              </span>
            ))}
          </div>
        </div>

        {/* ---- Manifesto (scroll-scrubbed) ----------------------------- */}
        <section id="manifesto" className={styles.manifesto} data-scrub>
          <span className="mono" data-reveal>02 — Why Modified</span>
          <p><ScrubWords text={MANIFESTO} /></p>
        </section>

        {/* ---- Showroom ------------------------------------------------ */}
        <section id="showroom" className={styles.sectionHead}>
          <div>
            <span className="mono" data-reveal>03 — The showroom</span>
            <h2 data-reveal="words"><SplitWords text={'Pick your\nmachine.'} /></h2>
          </div>
          <div className={styles.headAside} data-reveal style={d(200)}>
            <p>Real photographs, real generations and model years. Choose one and it opens in the configurator.</p>
            <LinkButton href="/vehicles" variant="ghost" size="md" icon={<ArrowUpRight size={16} />}>All {VEHICLES.length} models</LinkButton>
          </div>
        </section>
        <Showroom cars={SHOWROOM} total={VEHICLES.length} />

        {/* ---- Inside the garage (bento) ------------------------------- */}
        <section id="garage" className={styles.sectionHead}>
          <div>
            <span className="mono" data-reveal>04 — Inside the garage</span>
            <h2 data-reveal="words"><SplitWords text={'Built like a workshop,\nnot a brochure.'} /></h2>
          </div>
        </section>

        <div className={styles.bento}>
          <Link href="/configurator/volvo-s90" className={`${styles.tile} ${styles.tileLive}`} data-reveal="clip">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/photos/discover-aero.jpg" alt="" loading="lazy" className={styles.tileImg} />
            <div className={styles.hud} aria-hidden>
              <i /><i /><i /><i />
              <svg className={styles.ring} viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="54" />
                <circle cx="60" cy="60" r="40" strokeDasharray="4 8" />
              </svg>
            </div>
            <div className={styles.tileHead}>
              <span className={`mono ${styles.live}`}><i /> Live · WebGL</span>
              <span className="mono">360° orbit</span>
            </div>
            <div className={styles.tileText}>
              <h3>Real-time 3D.</h3>
              <p>Orbit, zoom, sit in the driver&apos;s seat. Every part you choose is fitted on the car as you choose it.</p>
              <span className={styles.tileLink}>Open the configurator <ArrowUpRight size={16} /></span>
            </div>
          </Link>

          <div className={`${styles.tile} ${styles.tileDims}`} data-reveal style={d(100)}>
            <span className="mono">Fitted to the millimetre</span>
            <svg className={styles.blueprint} viewBox="0 0 400 160" aria-hidden>
              <path className={styles.draw} d="M24 112 L26 94 Q28 82 44 78 L112 69 Q142 45 178 37 L250 35 Q287 37 316 61 L360 70 Q378 74 379 88 L379 106 Q379 112 372 112 L330 112 A26 26 0 0 0 278 112 L124 112 A26 26 0 0 0 72 112 Z" />
              <path className={styles.draw} d="M124 68 Q150 48 180 42 L244 41 Q268 43 290 61 Z" />
              <circle className={styles.draw} cx="98" cy="112" r="21" />
              <circle className={styles.draw} cx="304" cy="112" r="21" />
              <g className={styles.dim}>
                <path d="M24 146 L379 146 M24 140 L24 152 M379 140 L379 152" />
                <path d="M98 22 L304 22 M98 16 L98 28 M304 16 L304 28 M98 28 L98 90 M304 28 L304 90" strokeDasharray="3 4" />
              </g>
            </svg>
            <dl className={styles.dims}>
              <div><dt className="mono">Length</dt><dd><span data-count="4963">0</span> mm</dd></div>
              <div><dt className="mono">Wheelbase</dt><dd><span data-count="2941">0</span> mm</dd></div>
              <div><dt className="mono">Width</dt><dd><span data-count="1879">0</span> mm</dd></div>
            </dl>
            <p className={styles.tileNote}>Parts are scaled to the body they mount on, measured from each car&apos;s 3D model. Shown: the Volvo S90&apos;s published dimensions.</p>
          </div>

          <Link href="/configurator/volvo-s90" className={`${styles.tile} ${styles.tileDoors}`} data-reveal style={d(0)}>
            <svg className={styles.topView} viewBox="0 0 220 120" aria-hidden>
              <rect x="30" y="30" width="160" height="60" rx="26" />
              <rect x="70" y="40" width="80" height="40" rx="12" className={styles.cabin} />
              <rect className={`${styles.door} ${styles.doorTF}`} x="104" y="28" width="36" height="4" rx="2" />
              <rect className={`${styles.door} ${styles.doorTR}`} x="68" y="28" width="34" height="4" rx="2" />
              <rect className={`${styles.door} ${styles.doorBF}`} x="104" y="88" width="36" height="4" rx="2" />
              <rect className={`${styles.door} ${styles.doorBR}`} x="68" y="88" width="34" height="4" rx="2" />
            </svg>
            <h3>Open every door.</h3>
            <p>Doors, boot lid and fuel cover all open on the Volvo S90. Tap the dots on the car, then step inside.</p>
          </Link>

          <div className={`${styles.tile} ${styles.tilePaint}`} data-reveal style={d(100)}>
            <div className={styles.swatches} aria-hidden>
              {PAINTS.map((p, i) => (
                <span key={p.id} style={{ '--c': p.color, '--i': i } as CSSProperties} />
              ))}
              <span className={styles.mix} />
            </div>
            <h3>Seven paints. Or mix your own.</h3>
            <p>Gloss, metallic or satin, in any colour, with the clear coat rendered on the body in real time.</p>
          </div>

          <div className={`${styles.tile} ${styles.tilePrice}`} data-reveal style={d(200)}>
            <span className="mono">Priced as you build</span>
            <ul>
              {SAMPLE_BUILD.map((p, i) => (
                <li key={p.id} data-reveal="fade" style={d(400 + i * 220)}>
                  <span>{p.name}</span>
                  <span className="mono">{formatINR(p.price)}</span>
                </li>
              ))}
            </ul>
            <div className={styles.total}>
              <span className="mono">Estimated build</span>
              <strong>₹<span data-count={SAMPLE_TOTAL} data-duration="2400">0</span></strong>
            </div>
          </div>

          <Link href="/identify" className={`${styles.tile} ${styles.tileScan}`} data-reveal="clip" style={d(100)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/photos/feature-own-car.jpg" alt="" loading="lazy" className={styles.tileImg} />
            <div className={styles.scan} aria-hidden><i /></div>
            <div className={styles.brackets} aria-hidden><i /><i /><i /><i /></div>
            <ul className={styles.chips} aria-hidden>
              {[['Model', 'Porsche 911'], ['Generation', '992'], ['Paint', 'Guards Red'], ['Match', 'High']].map(([k, v], i) => (
                <li key={k} data-reveal="fade" style={d(700 + i * 260)}><span className="mono">{k}</span>{v}</li>
              ))}
            </ul>
            <div className={styles.tileText}>
              <h3>Start from your own car.</h3>
              <p>Upload a photo. We recognise the model, generation and paint, then open it ready to modify.</p>
              <span className={styles.tileLink}>Upload your car <ArrowUpRight size={16} /></span>
            </div>
          </Link>
        </div>

        {/* ---- Parts --------------------------------------------------- */}
        <section id="parts" className={styles.sectionHead}>
          <div>
            <span className="mono" data-reveal>05 — Parts</span>
            <h2 data-reveal="words"><SplitWords text={'Fit it. See it.\nPrice it.'} /></h2>
          </div>
          <div className={styles.headAside} data-reveal style={d(200)}>
            <p>{partCount} parts across {CATEGORIES.length} categories, each fitted to your car in 3D and priced as you go.</p>
          </div>
        </section>

        <ol className={styles.parts}>
          {CATEGORIES.filter((c) => CATEGORY_PREVIEW[c.id]).map((c, i) => {
            const items = PRODUCTS.filter((p) => p.category === c.id);
            const preview = getProduct(CATEGORY_PREVIEW[c.id]);
            if (!preview || !items.length) return null;
            const min = Math.min(...items.map((p) => p.price));
            return (
              <li key={c.id} data-reveal style={d(i * 60)}>
                <Link href="/vehicles" className={styles.part}>
                  <span className={`mono ${styles.partIndex}`}>{String(i + 1).padStart(2, '0')}</span>
                  <span className={styles.partName}>{c.name}</span>
                  <span className={styles.partBlurb}>{c.blurb}</span>
                  <span className={`mono ${styles.partMeta}`}>{items.length} options · from {formatINR(min)}</span>
                  <span className={styles.partThumb}>
                    <ProductThumb product={preview} finishColor={c.id === 'wheels' ? '#8a6131' : undefined} size="lg" />
                  </span>
                  <ArrowUpRight className={styles.partArrow} size={28} strokeWidth={1.5} />
                </Link>
              </li>
            );
          })}
        </ol>
      </main>
      <SiteFooter />
    </>
  );
}
