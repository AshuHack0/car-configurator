import { ASSET_CREDITS } from '@/data/demoAssets';
import { Logo } from './SiteHeader';
import styles from './SiteFooter.module.css';

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <Logo />
      <p>
        Client presentation demo. All prices are illustrative estimates in INR. Brand names are used only to identify
        vehicles. 3D models:{' '}
        {ASSET_CREDITS.map((c, i) => (
          <span key={c.credit}>
            {c.url ? <a href={c.url} target="_blank" rel="noreferrer">{c.credit}</a> : c.credit}
            {i < ASSET_CREDITS.length - 1 ? '; ' : '.'}
          </span>
        ))}
      </p>
    </footer>
  );
}
