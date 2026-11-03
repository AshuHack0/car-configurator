'use client';

import { CircleDot, Lightbulb, Package, Palette, PanelBottom, Shield, Wind } from 'lucide-react';
import type { ReactNode } from 'react';
import { CATEGORIES } from '@/data/products';
import type { CategoryId, Configuration } from '@/types/product';
import styles from './CategoryNav.module.css';

const ICONS: Record<CategoryId, ReactNode> = {
  wheels: <CircleDot size={18} />,
  spoilers: <Wind size={18} />,
  bumpers: <Shield size={18} />,
  skirts: <PanelBottom size={18} />,
  paint: <Palette size={18} />,
  lighting: <Lightbulb size={18} />,
  accessories: <Package size={18} />,
};

export function CategoryNav({ active, onSelect, config }: {
  active: CategoryId;
  onSelect: (id: CategoryId) => void;
  config: Configuration;
}) {
  return (
    <nav className={styles.nav} aria-label="Customisation categories">
      <span className={styles.heading}>Customise</span>
      {CATEGORIES.map((c) => {
        const count = c.id === 'paint'
          ? Number(config.paint.id !== 'factory')
          : c.slots.filter((s) => config.selections[s]).length;
        return (
          <button
            key={c.id}
            className={`${styles.item} ${active === c.id ? styles.active : ''}`}
            onClick={() => onSelect(c.id)}
            aria-current={active === c.id}
            title={c.name}
          >
            <span className={styles.icon}>{ICONS[c.id]}</span>
            <span className={styles.name}>{c.name}</span>
            {count > 0 && <span className={styles.count}>{count}</span>}
          </button>
        );
      })}
    </nav>
  );
}
