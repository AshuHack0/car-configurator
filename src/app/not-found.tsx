import { ArrowRight } from 'lucide-react';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { LinkButton } from '@/components/ui/Button';
import type { CSSProperties } from 'react';
import { SplitWords } from '@/components/motion/split';
import styles from './not-found.module.css';

export const metadata = { title: 'Page not found — Modifed' };

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className={styles.page}>
        <p className={styles.code} aria-hidden data-reveal="blur">404</p>
        <h1 data-reveal="words"><SplitWords text={'Wrong turn.\nThis road is closed.'} /></h1>
        <p data-reveal style={{ '--d': 300 } as CSSProperties}>The link may be old, or the model may no longer be in the catalogue.</p>
        <div className={styles.actions} data-reveal style={{ '--d': 420 } as CSSProperties}>
          <LinkButton href="/vehicles" variant="primary" size="md" icon={<ArrowRight size={18} />}>Model overview</LinkButton>
          <LinkButton href="/" variant="ghost" size="md">Home</LinkButton>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
