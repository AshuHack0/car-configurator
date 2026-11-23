'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import styles from './Showroom.module.css';

export interface ShowroomCar {
  id: string;
  brand: string;
  model: string;
  body: string;
  power: string;
  generation: string;
  price: string;
  photo: string;
}

/**
 * Pinned horizontal showroom: while you scroll down through this section, the row of cars
 * glides sideways, each photo drifting slightly against the motion. On small screens or with
 * reduced motion it falls back to a normal swipeable row.
 */
export function Showroom({ cars, total }: { cars: ShowroomCar[]; total: number }) {
  const section = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const [pinned, setPinned] = useState(false);
  const [height, setHeight] = useState<number | null>(null);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 900px) and (prefers-reduced-motion: no-preference)');
    const measure = () => {
      const on = mq.matches;
      setPinned(on);
      if (!on || !track.current) {
        setHeight(null);
        return;
      }
      const overflow = track.current.scrollWidth - window.innerWidth;
      setHeight(window.innerHeight + Math.max(0, overflow));
    };
    measure();
    mq.addEventListener('change', measure);
    window.addEventListener('resize', measure);
    return () => {
      mq.removeEventListener('change', measure);
      window.removeEventListener('resize', measure);
    };
  }, []);

  useEffect(() => {
    if (!pinned) {
      if (track.current) track.current.style.transform = '';
      return;
    }
    let frame = 0;
    const update = () => {
      frame = 0;
      const s = section.current;
      const t = track.current;
      if (!s || !t) return;
      const rect = s.getBoundingClientRect();
      const run = rect.height - window.innerHeight;
      const p = run > 0 ? Math.min(1, Math.max(0, -rect.top / run)) : 0;
      const overflow = t.scrollWidth - window.innerWidth;
      t.style.transform = `translate3d(${(-p * overflow).toFixed(1)}px, 0, 0)`;
      s.style.setProperty('--p', p.toFixed(4));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
    };
  }, [pinned, height]);

  return (
    <section ref={section} className={`${styles.showroom} ${pinned ? styles.pinned : ''}`} style={height ? { height } : undefined} aria-label="Featured models">
      <div className={styles.sticky}>
        <div ref={track} className={styles.track}>
          {cars.map((car, i) => (
            <Link key={car.id} href={`/configurator/${car.id}`} className={styles.card} style={{ '--k': i } as CSSProperties}>
              <div className={styles.photo}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={car.photo} alt={`${car.brand} ${car.model}`} loading={i < 2 ? 'eager' : 'lazy'} />
              </div>
              <div className={styles.shade} />
              <div className={styles.index}>
                <span className="mono">{String(i + 1).padStart(2, '0')} / {String(cars.length).padStart(2, '0')}</span>
                <span className="mono">{car.generation}</span>
              </div>
              <div className={styles.info}>
                <p className="mono">{car.brand}</p>
                <h3>{car.model}</h3>
                <dl>
                  <div><dt className="mono">Power</dt><dd>{car.power}</dd></div>
                  <div><dt className="mono">Body</dt><dd>{car.body}</dd></div>
                  <div><dt className="mono">From</dt><dd>{car.price}</dd></div>
                </dl>
                <span className={styles.go}>Configure <ArrowUpRight size={18} /></span>
              </div>
            </Link>
          ))}
          <Link href="/vehicles" className={styles.more}>
            <span className="mono">The full garage</span>
            <strong>{total}</strong>
            <span>models ready to configure</span>
            <span className={styles.go}>See all models <ArrowUpRight size={18} /></span>
          </Link>
        </div>
        <div className={styles.progress} aria-hidden><i /></div>
      </div>
    </section>
  );
}
