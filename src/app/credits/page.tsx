import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { PHOTOS } from '@/data/photos';
import type { CSSProperties } from 'react';
import { SplitWords } from '@/components/motion/split';
import styles from './credits.module.css';

export const metadata = { title: 'Photo credits — Modifed' };

export default function CreditsPage() {
  return (
    <>
      <SiteHeader />
      <main className={styles.page}>
        <h1 data-reveal="words"><SplitWords text="Photo credits." /></h1>
        <p data-reveal style={{ '--d': 200 } as CSSProperties}>
          The photographs on this site come from Wikimedia Commons and are used under the Creative Commons licence
          shown beside each one. They are cropped to fit; no other changes were made.
        </p>
        <ul className={styles.list}>
          {Object.entries(PHOTOS).map(([key, c]) => (
            <li key={key} data-reveal="fade">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/photos/${key}.jpg`} alt="" loading="lazy" />
              <div>
                <a href={c.page} target="_blank" rel="noreferrer">{c.title}</a>
                <span>{c.artist} · {c.license}</span>
              </div>
            </li>
          ))}
        </ul>
      </main>
      <SiteFooter />
    </>
  );
}
