import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { ASSET_CREDITS } from '@/data/demoAssets';
import { BRANDS } from '@/data/vehicles';
import { Logo } from './SiteHeader';
import styles from './SiteFooter.module.css';

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.top}>
        <p className={styles.pitch} data-reveal>
          Every car leaves the factory the same.<br />
          <span>Yours doesn&apos;t have to.</span>
        </p>
        <Link href="/vehicles" className={styles.big} data-reveal style={{ '--d': 120 } as React.CSSProperties}>
          Start your build <ArrowUpRight size={22} />
        </Link>
      </div>

      <div className={styles.columns}>
        <div>
          <h4 className="mono">Models</h4>
          <ul>
            {BRANDS.map((b) => (
              <li key={b.id}><Link href={`/vehicles?brand=${b.id}`}>{b.name}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="mono">Build</h4>
          <ul>
            <li><Link href="/vehicles">Model overview</Link></li>
            <li><Link href="/configurator/volvo-s90">Configurator</Link></li>
            <li><Link href="/identify">Upload your car</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mono">Parts</h4>
          <ul>
            <li><Link href="/#parts">Wheels</Link></li>
            <li><Link href="/#parts">Aero and body parts</Link></li>
            <li><Link href="/#parts">Lights and accessories</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mono">About this demo</h4>
          <p>
            A learning project. All prices are illustrative estimates in INR. Brand and model names are used only to
            identify vehicles; this site is not affiliated with any manufacturer.
          </p>
        </div>
      </div>

      {/* The wordmark, set as wide as the page. */}
      <div className={styles.wordmark} aria-hidden>MODIFED</div>

      <div className={styles.legal}>
        <Logo />
        <p>
          3D models:{' '}
          {ASSET_CREDITS.map((c, i) => (
            <span key={c.credit}>
              {c.url ? <a href={c.url} target="_blank" rel="noreferrer">{c.credit}</a> : c.credit}
              {i < ASSET_CREDITS.length - 1 ? '; ' : '.'}
            </span>
          ))}{' '}
          Location photography: Poly Haven (CC0). <Link href="/credits">Photo credits</Link>.
        </p>
      </div>
    </footer>
  );
}
