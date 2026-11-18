import { ArrowRight } from 'lucide-react';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { LinkButton } from '@/components/ui/Button';
import styles from './not-found.module.css';

export const metadata = { title: 'Page not found — Modifed' };

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className={styles.page}>
        <p className={styles.code}>404</p>
        <h1>This page could not be found.</h1>
        <p>The link may be old, or the model may no longer be in the catalogue.</p>
        <div className={styles.actions}>
          <LinkButton href="/vehicles" variant="primary" size="md" icon={<ArrowRight size={18} />}>Model overview</LinkButton>
          <LinkButton href="/" variant="ghost" size="md">Home</LinkButton>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
