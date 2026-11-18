'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import { formatINR } from '@/data/products';
import type { LineItem } from '@/hooks/useConfigurator';
import type { SlotId } from '@/types/product';
import styles from './SummaryDialog.module.css';

interface Props {
  title: string;
  items: LineItem[];
  total: number;
  onRemove: (slot: SlotId | 'paint') => void;
  onClose: () => void;
  onEnquire: () => void;
}

export function SummaryDialog({ title, items, total, onRemove, onClose, onEnquire }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.dialog} role="dialog" aria-modal="true" aria-label="Summary" onClick={(e) => e.stopPropagation()}>
        <header>
          <div>
            <small>Summary</small>
            <h2>{title}</h2>
          </div>
          <button onClick={onClose} aria-label="Close summary"><X size={20} /></button>
        </header>

        {items.length === 0 ? (
          <p className={styles.empty}>Standard specification — nothing added yet.</p>
        ) : (
          <ul>
            {items.map((i) => (
              <li key={i.slot}>
                <div>
                  <small>{i.label}</small>
                  <strong>{i.name}</strong>
                  {i.finish && <span>{i.finish}</span>}
                </div>
                <em>{formatINR(i.price)}</em>
                <button onClick={() => onRemove(i.slot)} aria-label={`Remove ${i.name}`}><X size={14} /></button>
              </li>
            ))}
          </ul>
        )}

        <footer>
          <div>
            <small>Estimated customisation total</small>
            <strong>{formatINR(total)}</strong>
          </div>
          <button onClick={onEnquire}>Enquire about this build</button>
        </footer>
        <p className={styles.note}>Demo prices only. Fitting and taxes are not included.</p>
      </div>
    </div>
  );
}
