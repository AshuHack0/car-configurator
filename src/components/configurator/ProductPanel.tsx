'use client';

import { Box, Check, Eye, Layers, Paintbrush } from 'lucide-react';
import type { ReactNode } from 'react';
import { ProductThumb } from '@/components/products/ProductThumb';
import { CATEGORIES, PRODUCTS, SLOT_LABELS, formatINR, productFinish } from '@/data/products';
import type { Configuration, Product, SlotId } from '@/types/product';
import type { ComponentSupport } from '@/types/vehicle';
import styles from './ProductPanel.module.css';

const SUPPORT: Record<ComponentSupport, { label: string; icon: ReactNode; tone: string }> = {
  replace: { label: 'Live 3D · replaces original', icon: <Box size={11} />, tone: styles.live },
  attach: { label: 'Live 3D · fitted to body', icon: <Layers size={11} />, tone: styles.live },
  material: { label: 'Live 3D · material change', icon: <Paintbrush size={11} />, tone: styles.live },
  none: { label: 'Preview only', icon: <Eye size={11} />, tone: styles.preview },
};

interface Props {
  category: (typeof CATEGORIES)[number];
  selections: Configuration['selections'];
  supportFor: (p: Product) => ComponentSupport;
  onSelect: (p: Product, finishId?: string) => void;
  onRemove: (slot: SlotId) => void;
  onFinish: (slot: SlotId, finishId: string) => void;
}

export function ProductPanel({ category, selections, supportFor, onSelect, onRemove, onFinish }: Props) {
  return (
    <div className={styles.list}>
      {category.slots.map((slot) => {
        const products = PRODUCTS.filter((p) => p.slot === slot);
        const current = selections[slot];
        return (
          <section key={slot} className={styles.slot}>
            <header className={styles.slotHead}>
              <h3>{SLOT_LABELS[slot]}</h3>
              {current ? (
                <button className={styles.stock} onClick={() => onRemove(slot)}>Restore factory</button>
              ) : (
                <span className={styles.factory}>Factory fitted</span>
              )}
            </header>
            {products.map((p) => {
              const selected = current?.productId === p.id;
              const finish = productFinish(p, selected ? current?.finishId : undefined);
              const support = SUPPORT[supportFor(p)];
              return (
                <article key={p.id} className={`${styles.card} ${selected ? styles.selected : ''}`}>
                  <div className={styles.row}>
                    <ProductThumb product={p} finishColor={finish?.color} />
                    <div className={styles.info}>
                      <h4>{p.name}</h4>
                      <p>{p.description}</p>
                      <span className={`${styles.badge} ${support.tone}`}>{support.icon}{support.label}</span>
                    </div>
                  </div>

                  {p.finishes && (
                    <div className={styles.finishes} role="radiogroup" aria-label={`${p.name} finish`}>
                      {p.finishes.map((f) => {
                        const active = finish?.id === f.id;
                        return (
                          <button
                            key={f.id}
                            role="radio"
                            aria-checked={active}
                            title={`${f.name}${f.price ? ` (+${formatINR(f.price)})` : ''}`}
                            className={`${styles.swatch} ${active ? styles.swatchActive : ''}`}
                            style={{ background: `linear-gradient(135deg, ${f.color} 40%, #ffffff55 50%, ${f.color} 60%)` }}
                            onClick={() => (selected ? onFinish(slot, f.id) : onSelect(p, f.id))}
                          />
                        );
                      })}
                      <span className={styles.finishName}>{finish?.name}</span>
                    </div>
                  )}

                  <footer className={styles.foot}>
                    <span className={styles.price}>{formatINR(p.price + (finish?.price ?? 0))}</span>
                    {selected ? (
                      <button className={`${styles.select} ${styles.selectedBtn}`} onClick={() => onRemove(slot)}>
                        <Check size={14} /> Selected
                      </button>
                    ) : (
                      <button className={styles.select} onClick={() => onSelect(p, finish?.id)}>Select</button>
                    )}
                  </footer>
                </article>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}
