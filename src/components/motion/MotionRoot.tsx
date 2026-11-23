'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import Lenis from 'lenis';
import styles from './MotionRoot.module.css';

/** Routes that are apps, not pages: they manage their own scrolling (3D viewer, option panels). */
const APP_ROUTES = ['/configurator', '/visualize'];

export const INTRO_DONE = 'modifed:intro-done';

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Counts a number up from zero, easing out. Keeps the element's formatting (Indian grouping). */
function countUp(el: HTMLElement) {
  const target = Number(el.dataset.count);
  if (!Number.isFinite(target)) return;
  const decimals = Number(el.dataset.decimals ?? 0);
  const fmt = new Intl.NumberFormat('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  if (reducedMotion()) {
    el.textContent = fmt.format(target);
    return;
  }
  const duration = Number(el.dataset.duration ?? 1800);
  const start = performance.now();
  const tick = (now: number) => {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(2, -10 * t);
    el.textContent = fmt.format(t >= 1 ? target : target * eased);
    if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/**
 * Site-wide motion controller, mounted once in the root layout:
 *  - smooth (inertial) scrolling on content pages;
 *  - reveals: adds data-shown to [data-reveal] elements as they enter the viewport, and
 *    counts up [data-count] numbers inside them;
 *  - parallax: [data-parallax="0.12"] elements drift against the scroll;
 *  - scrubbed text: [data-scrub] sections get --p (0..1) as they scroll past;
 *  - a thin scroll-progress line at the top of the page.
 */
export function MotionRoot() {
  const pathname = usePathname();
  const app = APP_ROUTES.some((r) => pathname.startsWith(r));
  const bar = useRef<HTMLDivElement>(null);

  // ---- Smooth scrolling --------------------------------------------------
  useEffect(() => {
    if (app || reducedMotion()) return;
    const lenis = new Lenis({ lerp: 0.085, smoothWheel: true, anchors: { offset: -80 } });
    let frame = requestAnimationFrame(function raf(time) {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    });
    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
    };
  }, [app]);

  // Every new page starts at the top.
  useEffect(() => {
    if (!window.location.hash) window.scrollTo(0, 0);
  }, [pathname]);

  // ---- Reveals and counters ---------------------------------------------
  useEffect(() => {
    const root = document.documentElement;
    const pending = new Set<HTMLElement>();
    const show = (el: HTMLElement) => {
      el.setAttribute('data-shown', '');
      el.querySelectorAll<HTMLElement>('[data-count]').forEach(countUp);
      if (el.dataset.count) countUp(el);
    };
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const el = entry.target as HTMLElement;
        io.unobserve(el);
        // While the home-page intro plays, hold reveals so they run when the curtain lifts.
        if (root.hasAttribute('data-intro')) pending.add(el);
        else show(el);
      }
    }, { rootMargin: '0px 0px -4% 0px', threshold: 0.01 });

    // Tracked per run (not as an attribute), so a re-run of this effect re-observes everything.
    const watched = new WeakSet<Element>();
    const scan = () => document.querySelectorAll<HTMLElement>('[data-reveal]:not([data-shown])').forEach((el) => {
      if (watched.has(el)) return;
      watched.add(el);
      io.observe(el);
    });
    scan();
    // Catch elements added later (filtered lists, client-only sections).
    const mo = new MutationObserver(scan);
    mo.observe(document.body, { childList: true, subtree: true });

    const flush = () => {
      pending.forEach(show);
      pending.clear();
    };
    window.addEventListener(INTRO_DONE, flush);
    return () => {
      io.disconnect();
      mo.disconnect();
      window.removeEventListener(INTRO_DONE, flush);
    };
  }, [pathname]);

  // ---- Scroll-linked effects --------------------------------------------
  useEffect(() => {
    if (app) return;
    const still = reducedMotion();
    let frame = 0;
    const update = () => {
      frame = 0;
      const vh = window.innerHeight;
      const max = document.documentElement.scrollHeight - vh;
      if (bar.current) bar.current.style.transform = `scaleX(${max > 0 ? window.scrollY / max : 0})`;
      if (still) return;
      document.querySelectorAll<HTMLElement>('[data-parallax]').forEach((el) => {
        const r = (el.parentElement ?? el).getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        const speed = Number(el.dataset.parallax) || 0.1;
        const offset = (r.top + r.height / 2 - vh / 2) * -speed;
        el.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0) scale(${1 + Math.abs(speed) * 1.2})`;
      });
      document.querySelectorAll<HTMLElement>('[data-scrub]').forEach((el) => {
        const r = el.getBoundingClientRect();
        const p = (vh * 0.85 - r.top) / (r.height + vh * 0.35);
        el.style.setProperty('--p', Math.min(1, Math.max(0, p)).toFixed(3));
      });
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [app, pathname]);

  if (app) return null;
  return <div ref={bar} className={styles.progress} aria-hidden />;
}
