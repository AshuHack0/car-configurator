'use client';

import { Check, Pipette } from 'lucide-react';
import { CUSTOM_PAINT_FINISHES, CUSTOM_PAINT_PRICE, PAINTS, formatINR } from '@/data/products';
import type { OwnPaint, ResolvedPaint } from '@/hooks/useConfigurator';
import type { Configuration } from '@/types/product';
import styles from './PaintPanel.module.css';

interface Props {
  paint: Configuration['paint'];
  resolved: ResolvedPaint;
  onChange: (paint: Configuration['paint']) => void;
  /** The customer's detected paint; shown in place of the factory finish. */
  ownPaint?: OwnPaint;
}

const swatchStyle = (color: string, roughness: number) => ({
  background: roughness > 0.6
    ? color
    : `radial-gradient(circle at 30% 25%, #ffffff${roughness > 0.4 ? '22' : '66'} 0%, transparent 38%), linear-gradient(160deg, ${color} 30%, #000 140%)`,
});

export function PaintPanel({ paint, resolved, onChange, ownPaint }: Props) {
  const isCustom = paint.id === 'custom';
  const customColor = paint.color ?? '#3b82f6';
  const customFinish = paint.finish ?? 'gloss';

  return (
    <div className={styles.panel}>
      <div className={styles.current}>
        <span className={styles.big} style={swatchStyle(resolved.color, resolved.roughness)} />
        <div>
          <small>Selected paint</small>
          <strong>{resolved.name}</strong>
          <span>{resolved.price ? formatINR(resolved.price) : 'Included'}</span>
        </div>
      </div>

      <h3 className={styles.heading}>Signature finishes</h3>
      <div className={styles.grid}>
        {PAINTS.map((p) => {
          const active = paint.id === p.id;
          const own = p.id === 'factory' && ownPaint;
          const roughness = own ? (CUSTOM_PAINT_FINISHES.find((f) => f.id === ownPaint.finish)?.roughness ?? p.roughness) : p.roughness;
          return (
            <button key={p.id} className={`${styles.option} ${active ? styles.active : ''}`} onClick={() => onChange({ id: p.id })}>
              <span className={styles.swatch} style={swatchStyle(own ? ownPaint.color : p.color, roughness)}>
                {active && <Check size={16} />}
              </span>
              <span className={styles.name}>{own ? 'Your paint' : p.name}</span>
              <span className={styles.price}>{own ? 'Current' : p.price ? formatINR(p.price) : 'Included'}</span>
            </button>
          );
        })}
      </div>

      <h3 className={styles.heading}>Custom colour</h3>
      <div className={`${styles.custom} ${isCustom ? styles.active : ''}`}>
        <label className={styles.picker} style={{ background: customColor }}>
          <Pipette size={16} />
          <input
            type="color"
            value={customColor}
            onChange={(e) => onChange({ id: 'custom', color: e.target.value, finish: customFinish })}
            aria-label="Pick a custom paint colour"
          />
        </label>
        <div className={styles.customBody}>
          <div className={styles.finishRow}>
            {CUSTOM_PAINT_FINISHES.map((f) => (
              <button
                key={f.id}
                className={`${styles.finish} ${isCustom && customFinish === f.id ? styles.finishActive : ''}`}
                onClick={() => onChange({ id: 'custom', color: customColor, finish: f.id })}
              >
                {f.name}
              </button>
            ))}
          </div>
          <span className={styles.price}>{formatINR(CUSTOM_PAINT_PRICE)} · bespoke mix</span>
        </div>
      </div>
    </div>
  );
}
