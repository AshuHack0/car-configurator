import Link from 'next/link';
import { LinkButton } from '@/components/ui/Button';
import styles from './SiteHeader.module.css';

export function Logo() {
  return (
    <Link href="/" className={styles.logo} aria-label="Modifed home">
      <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden>
        <circle cx="13" cy="13" r="11.5" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
        <circle cx="13" cy="13" r="4" fill="var(--accent)" />
        {[0, 72, 144, 216, 288].map((a) => (
          <line key={a} x1="13" y1="13" x2={(13 + 10 * Math.cos((a * Math.PI) / 180)).toFixed(2)} y2={(13 + 10 * Math.sin((a * Math.PI) / 180)).toFixed(2)} stroke="currentColor" strokeWidth="1.5" />
        ))}
      </svg>
      <span><b>MODIFED</b></span>
    </Link>
  );
}

export function SiteHeader() {
  return (
    <header className={styles.header}>
      <Logo />
      <nav className={styles.nav}>
        <Link href="/vehicles">Vehicles</Link>
        <Link href="/#categories">Customise</Link>
        <Link href="/#brands">Brands</Link>
      </nav>
      <LinkButton href="/vehicles" variant="primary" size="sm">Start Customizing</LinkButton>
    </header>
  );
}
