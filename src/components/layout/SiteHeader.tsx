'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowUpRight } from 'lucide-react';
import { BRANDS } from '@/data/vehicles';
import styles from './SiteHeader.module.css';

export function Logo() {
  return (
    <Link href="/" className={styles.logo} aria-label="Modifed home">
      <i aria-hidden />
      MODIFED
    </Link>
  );
}

const NAV = [
  { href: '/vehicles', label: 'Models' },
  { href: '/configurator/volvo-s90', label: 'Configurator' },
  { href: '/#parts', label: 'Parts' },
  { href: '/identify', label: 'Upload your car' },
];

const MENU = [
  { href: '/vehicles', label: 'Models' },
  { href: '/configurator/volvo-s90', label: 'Configurator' },
  { href: '/identify', label: 'Upload your car' },
  { href: '/#garage', label: 'Inside the garage' },
  { href: '/#parts', label: 'Parts' },
];

/**
 * Fixed top bar. Transparent over the page's opening section, turns to dark glass once you
 * scroll, slides away while scrolling down and returns as soon as you scroll up.
 */
export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [solid, setSolid] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      setSolid(y > 24);
      setHidden(y > 320 && y > last + 2);
      if (y < last - 2) setHidden(false);
      last = y;
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => setOpen(false), [pathname]);

  // Let sticky elements lower on the page (the model filter bar) sit just under the bar while it shows.
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.header = hidden && !open ? 'hidden' : 'shown';
    return () => {
      delete root.dataset.header;
    };
  }, [hidden, open]);

  return (
    <>
      <header className={`${styles.header} ${solid ? styles.solid : ''} ${hidden && !open ? styles.hidden : ''}`}>
        <Logo />
        <nav className={styles.nav} aria-label="Main">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className={pathname === n.href ? styles.current : ''}>
              {n.label}
            </Link>
          ))}
        </nav>
        <div className={styles.end}>
          <Link href="/vehicles" className={styles.cta}>
            <span>Start building</span>
            <ArrowUpRight size={16} />
          </Link>
          <button
            className={`${styles.burger} ${open ? styles.burgerOpen : ''}`}
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls="site-menu"
            aria-label={open ? 'Close menu' : 'Open menu'}
          >
            <i /><i />
          </button>
        </div>
      </header>

      <div id="site-menu" className={`${styles.menu} ${open ? styles.menuOpen : ''}`} aria-hidden={!open} role="dialog" aria-modal="true" aria-label="Menu">
        <div className={styles.menuInner}>
          <ul className={styles.primary}>
            {MENU.map((m, i) => (
              <li key={m.href} style={{ '--i': i } as CSSProperties}>
                <Link href={m.href} onClick={() => setOpen(false)} tabIndex={open ? 0 : -1}>
                  <span className="mono">{String(i + 1).padStart(2, '0')}</span>
                  {m.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className={styles.brands} style={{ '--i': MENU.length } as CSSProperties}>
            <p className="mono">Models by brand</p>
            <ul>
              {BRANDS.map((b) => (
                <li key={b.id}>
                  <Link href={`/vehicles?brand=${b.id}`} onClick={() => setOpen(false)} tabIndex={open ? 0 : -1}>{b.name}</Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
