'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Camera, ChevronRight, LayoutGrid, Menu, X } from 'lucide-react';
import { BRANDS } from '@/data/vehicles';
import styles from './SiteHeader.module.css';

export function Logo() {
  return (
    <Link href="/" className={styles.logo} aria-label="Modifed home">
      MODIFED
    </Link>
  );
}

const MENU = [
  { href: '/vehicles', label: 'Models' },
  { href: '/identify', label: 'Upload your car' },
  { href: '/configurator/porsche-911', label: 'Configurator' },
  { href: '/#individualisation', label: 'Individualisation' },
  { href: '/#discover', label: 'Discover' },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);

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

  return (
    <>
      <header className={styles.header}>
        <button className={styles.menuButton} onClick={() => setOpen(true)} aria-expanded={open} aria-controls="site-menu">
          <Menu size={24} strokeWidth={1.5} />
          <span>Menu</span>
        </button>
        <Logo />
        <nav className={styles.tools} aria-label="Shortcuts">
          <Link href="/vehicles" title="Models">
            <LayoutGrid size={22} strokeWidth={1.5} />
            <span>Models</span>
          </Link>
          <Link href="/identify" title="Upload your car">
            <Camera size={22} strokeWidth={1.5} />
            <span>Upload your car</span>
          </Link>
        </nav>
      </header>

      {open && (
        <div className={styles.overlay} onClick={() => setOpen(false)}>
          <aside id="site-menu" className={styles.drawer} role="dialog" aria-modal="true" aria-label="Menu" onClick={(e) => e.stopPropagation()}>
            <button className={styles.close} onClick={() => setOpen(false)} aria-label="Close menu" autoFocus>
              <X size={24} strokeWidth={1.5} />
            </button>
            <ul className={styles.primary}>
              {MENU.map((m) => (
                <li key={m.href}>
                  <Link href={m.href} onClick={() => setOpen(false)}>
                    {m.label}
                    <ChevronRight size={22} strokeWidth={1.5} />
                  </Link>
                </li>
              ))}
            </ul>
            <p className={styles.groupLabel}>Models by brand</p>
            <ul className={styles.secondary}>
              {BRANDS.map((b) => (
                <li key={b.id}>
                  <Link href={`/vehicles?brand=${b.id}`} onClick={() => setOpen(false)}>{b.name}</Link>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      )}
    </>
  );
}
