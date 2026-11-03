import { getAssetConfig } from '@/data/demoAssets';
import { Logo } from './SiteHeader';
import styles from './SiteFooter.module.css';

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <Logo />
      <p>
        Client presentation demo. All prices are illustrative estimates in INR. Brand names are used only to identify
        vehicles. 3D model: {getAssetConfig('studio-coupe').credit}.
      </p>
    </footer>
  );
}
