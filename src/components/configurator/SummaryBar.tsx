'use client';

import { ChevronUp, X } from 'lucide-react';
import { useState } from 'react';
import { formatINR } from '@/data/products';
import type { LineItem } from '@/hooks/useConfigurator';
import type { SlotId } from '@/types/product';
import styles from './SummaryBar.module.css';

export function SummaryBar({ items, total, onRemove }: {
  items: LineItem[];
  total: number;
  onRemove: (slot: SlotId | 'paint') => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <footer className={`${styles.bar} ${open ? styles.open : ''}`}>
      {open && (
        <div className={styles.sheet}>
          <h3>Build sheet</h3>
          {items.length === 0 ? (
            <p className={styles.empty}>Factory specification — nothing added yet.</p>
          ) : (
            <table>
              <tbody>
                {items.map((i) => (
                  <tr key={i.slot}>
                    <td>{i.label}</td>
                    <td>{i.name}{i.finish && <small> · {i.finish}</small>}</td>
                    <td>{formatINR(i.price)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr><td colSpan={2}>Estimated customisation total</td><td>{formatINR(total)}</td></tr>
              </tfoot>
            </table>
          )}
          <p className={styles.note}>Demo prices only. Fitting and taxes not included.</p>
        </div>
      )}

      <div className={styles.row}>
        <div className={styles.chips}>
          <span className={styles.label}>Selected</span>
          {items.length === 0 && <span className={styles.none}>No accessories yet — pick a category to begin.</span>}
          {items.map((i) => (
            <span key={i.slot} className={styles.chip}>
              <em>{i.label}</em>
              {i.name}
              <button onClick={() => onRemove(i.slot)} aria-label={`Remove ${i.name}`}><X size={12} /></button>
            </span>
          ))}
        </div>
        <button className={styles.total} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          <span>
            <small>{items.length} item{items.length === 1 ? '' : 's'} · estimated</small>
            <strong>{formatINR(total)}</strong>
          </span>
          <ChevronUp size={18} className={styles.chev} />
        </button>
      </div>
    </footer>
  );
}
