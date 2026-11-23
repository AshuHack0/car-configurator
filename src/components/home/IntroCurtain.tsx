'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { INTRO_DONE } from '@/components/motion/MotionRoot';
import styles from './IntroCurtain.module.css';

const WORD = 'MODIFED';

/**
 * First visit of the session: the wordmark rises letter by letter over a 0–100 counter, then
 * the curtain lifts and the page's own reveals start. Shown only when the inline script in the
 * root layout set html[data-intro] before first paint, so it never flashes on later visits.
 */
export function IntroCurtain() {
  const [phase, setPhase] = useState<'idle' | 'run' | 'lift' | 'done'>('idle');
  const counter = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    if (!root.hasAttribute('data-intro')) {
      setPhase('done');
      return;
    }
    setPhase('run');
    const duration = 1500;
    const start = performance.now();
    let frame = requestAnimationFrame(function tick(now) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      if (counter.current) counter.current.textContent = String(Math.round(eased * 100)).padStart(3, '0');
      if (t < 1) frame = requestAnimationFrame(tick);
    });
    const lift = setTimeout(() => {
      setPhase('lift');
      root.removeAttribute('data-intro');
      try {
        sessionStorage.setItem('modifed:intro', '1');
      } catch {
        /* storage unavailable: the intro may play again next visit */
      }
      window.dispatchEvent(new Event(INTRO_DONE));
    }, duration + 250);
    const done = setTimeout(() => setPhase('done'), duration + 1300);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(lift);
      clearTimeout(done);
    };
  }, []);

  if (phase === 'done') return null;
  return (
    <div className={`${styles.curtain} ${phase === 'run' ? styles.run : ''} ${phase === 'lift' ? styles.lift : ''}`} aria-hidden>
      <div className={styles.word}>
        {WORD.split('').map((ch, i) => (
          <span key={i} className={styles.mask}>
            <span style={{ '--i': i } as CSSProperties}>{ch}</span>
          </span>
        ))}
      </div>
      <div className={styles.meta}>
        <span className="mono">Starting engine</span>
        <span className="mono"><span ref={counter}>000</span>%</span>
      </div>
      <div className={styles.line}><i /></div>
    </div>
  );
}
