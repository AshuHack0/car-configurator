import Link from 'next/link';
import { ASSET_CREDITS } from '@/data/demoAssets';
import { BRANDS } from '@/data/vehicles';
import { Logo } from './SiteHeader';
import styles from './SiteFooter.module.css';

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.columns}>
        <div>
          <h4>Models</h4>
          <ul>
            {BRANDS.map((b) => (
              <li key={b.id}><Link href={`/vehicles?brand=${b.id}`}>{b.name}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <h4>Build</h4>
          <ul>
            <li><Link href="/vehicles">Model overview</Link></li>
            <li><Link href="/configurator/porsche-911">Configurator</Link></li>
            <li><Link href="/identify">Upload your car</Link></li>
          </ul>
        </div>
        <div>
          <h4>Individualisation</h4>
          <ul>
            <li><Link href="/#individualisation">Wheels</Link></li>
            <li><Link href="/#individualisation">Aero and body parts</Link></li>
            <li><Link href="/#individualisation">Lights and accessories</Link></li>
          </ul>
        </div>
        <div>
          <h4>About this demo</h4>
          <p>
            A learning project. All prices are illustrative estimates in INR. Brand and model names are used only to
            identify vehicles; this site is not affiliated with any manufacturer.
          </p>
        </div>
      </div>
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
