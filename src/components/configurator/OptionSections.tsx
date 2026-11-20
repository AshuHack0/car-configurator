'use client';

import { Ban, ChevronDown, Eye, Pipette } from 'lucide-react';
import { ProductThumb } from '@/components/products/ProductThumb';
import {
  CATEGORIES, CUSTOM_PAINT_FINISHES, CUSTOM_PAINT_PRICE, PAINTS, PRODUCTS, SLOT_LABELS, formatINR, productFinish,
} from '@/data/products';
import type { OwnPaint, ResolvedPaint } from '@/hooks/useConfigurator';
import type { CategoryId, Configuration, Product, SlotId } from '@/types/product';
import type { ComponentSupport } from '@/types/vehicle';
import styles from './OptionSections.module.css';

const SECTION_TITLES: Record<CategoryId, string> = {
  paint: 'Exterior Colours',
  wheels: 'Wheels',
  spoilers: 'Spoilers & Wings',
  bumpers: 'Bumpers & Diffusers',
  skirts: 'Side Skirts',
  lighting: 'Lights & Vision',
  accessories: 'Exterior Accessories',
  interior: 'Interior',
};
const ORDER: CategoryId[] = ['paint', 'wheels', 'spoilers', 'bumpers', 'skirts', 'lighting', 'accessories', 'interior'];

const price = (n: number) => formatINR(n);

const paintSwatch = (color: string, roughness: number) => ({
  background: roughness > 0.6
    ? color
    : `linear-gradient(135deg, ${color} 0%, ${color} 38%, #ffffff${roughness > 0.4 ? '30' : '70'} 50%, ${color} 62%, ${color} 100%)`,
});

interface Props {
  config: Configuration;
  paint: ResolvedPaint;
  ownPaint?: OwnPaint;
  query: string;
  open: Set<CategoryId>;
  onToggle: (id: CategoryId) => void;
  supportFor: (p: Product) => ComponentSupport;
  onSelect: (p: Product, finishId?: string) => void;
  onRemove: (slot: SlotId) => void;
  onFinish: (slot: SlotId, finishId: string) => void;
  onPaint: (paint: Configuration['paint']) => void;
}

export function OptionSections(props: Props) {
  const q = props.query.trim().toLowerCase();
  const matches = (text: string) => !q || text.toLowerCase().includes(q);

  return (
    <div className={styles.sections}>
      {ORDER.map((id) => {
        const category = CATEGORIES.find((c) => c.id === id)!;
        // Interior trims only exist for cars whose 3D model has a cabin; hide the section elsewhere.
        if (id === 'interior' && !PRODUCTS.some((p) => p.category === 'interior' && props.supportFor(p) !== 'none')) return null;
        const title = SECTION_TITLES[id];
        const sectionMatches = matches(title);
        const slots = category.slots
          .map((slot) => ({
            slot,
            products: PRODUCTS.filter((p) => p.slot === slot && (sectionMatches || matches(p.name) || matches(SLOT_LABELS[slot]))),
          }))
          .filter((s) => s.products.length > 0);
        const paints = id === 'paint' ? PAINTS.filter((p) => sectionMatches || matches(p.name)) : [];
        if (q && id === 'paint' && paints.length === 0 && !matches('custom colour')) return null;
        if (q && id !== 'paint' && slots.length === 0) return null;

        const isOpen = !!q || props.open.has(id);
        const count = id === 'paint'
          ? Number(props.config.paint.id !== 'factory')
          : category.slots.filter((s) => props.config.selections[s]).length;

        return (
          <section key={id} className={styles.card}>
            <button className={styles.head} onClick={() => props.onToggle(id)} aria-expanded={isOpen}>
              <h2>{title}</h2>
              {count > 0 && <span className={styles.count}>{count}</span>}
              <ChevronDown size={18} className={`${styles.chev} ${isOpen ? styles.chevOpen : ''}`} />
            </button>
            {isOpen && (
              <div className={styles.body}>
                {id === 'paint'
                  ? <PaintGroups {...props} paints={paints} />
                  : slots.map(({ slot, products }) => <SlotGroup key={slot} slot={slot} products={products} {...props} />)}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

function PaintGroups({ config, paint, ownPaint, onPaint, paints }: Props & { paints: typeof PAINTS }) {
  const isCustom = config.paint.id === 'custom';
  const customColor = config.paint.color ?? '#31506e';
  const customFinish = config.paint.finish ?? 'gloss';

  return (
    <>
      <div className={styles.group}>
        <div className={styles.groupHead}>
          <strong>{isCustom ? 'Signature finishes' : paint.name}</strong>
          {!isCustom && <span>{price(paint.price)}</span>}
        </div>
        <div className={styles.tiles}>
          {paints.map((p) => {
            const own = p.id === 'factory' && ownPaint;
            const roughness = own ? (CUSTOM_PAINT_FINISHES.find((f) => f.id === ownPaint.finish)?.roughness ?? p.roughness) : p.roughness;
            return (
              <button
                key={p.id}
                className={`${styles.tile} ${config.paint.id === p.id ? styles.selected : ''}`}
                title={`${own ? 'Your paint' : p.name} · ${price(own ? 0 : p.price)}`}
                aria-label={own ? 'Your paint' : p.name}
                aria-pressed={config.paint.id === p.id}
                onClick={() => onPaint({ id: p.id })}
              >
                <span className={styles.swatch} style={paintSwatch(own ? ownPaint.color : p.color, roughness)} />
              </button>
            );
          })}
        </div>
      </div>

      <div className={styles.group}>
        <div className={styles.groupHead}>
          <strong>Paint to Sample</strong>
          <span>{formatINR(CUSTOM_PAINT_PRICE)}</span>
        </div>
        <p className={styles.note}>Any colour, mixed to your choice.</p>
        <div className={styles.custom}>
          <label className={`${styles.tile} ${isCustom ? styles.selected : ''}`} title="Pick a custom colour">
            <span className={styles.swatch} style={{ background: customColor }}><Pipette size={18} /></span>
            <input
              type="color"
              value={customColor}
              onChange={(e) => onPaint({ id: 'custom', color: e.target.value, finish: customFinish })}
              aria-label="Pick a custom paint colour"
            />
          </label>
          <div className={styles.chips}>
            {CUSTOM_PAINT_FINISHES.map((f) => (
              <button
                key={f.id}
                className={`${styles.chip} ${isCustom && customFinish === f.id ? styles.chipOn : ''}`}
                onClick={() => onPaint({ id: 'custom', color: customColor, finish: f.id })}
              >
                {f.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function SlotGroup({ slot, products, config, supportFor, onSelect, onRemove, onFinish }: Props & { slot: SlotId; products: Product[] }) {
  const current = config.selections[slot];
  const selected = products.find((p) => p.id === current?.productId) ?? PRODUCTS.find((p) => p.id === current?.productId);
  const finish = selected && productFinish(selected, current?.finishId);
  const previewOnly = selected && supportFor(selected) === 'none';

  return (
    <div className={styles.group}>
      <div className={styles.groupHead}>
        <strong>{SLOT_LABELS[slot]}</strong>
        {selected && <span>{price(selected.price + (finish?.price ?? 0))}</span>}
      </div>
      <p className={styles.note}>
        {selected ? `${selected.name} — ${selected.description}` : 'Standard equipment'}
        {previewOnly && <em className={styles.preview}><Eye size={11} /> Preview only on this 3D model</em>}
      </p>

      <div className={styles.tiles}>
        <button
          className={`${styles.tile} ${!current ? styles.selected : ''}`}
          title="Standard equipment"
          aria-pressed={!current}
          onClick={() => onRemove(slot)}
        >
          <span className={styles.standard}><Ban size={20} /><small>Standard</small></span>
        </button>
        {products.map((p) => {
          const isSelected = current?.productId === p.id;
          const f = productFinish(p, isSelected ? current?.finishId : undefined);
          return (
            <button
              key={p.id}
              className={`${styles.tile} ${isSelected ? styles.selected : ''}`}
              title={`${p.name} · ${formatINR(p.price)}${supportFor(p) === 'none' ? ' · preview only' : ''}`}
              aria-label={p.name}
              aria-pressed={isSelected}
              onClick={() => (isSelected ? onRemove(slot) : onSelect(p, f?.id))}
            >
              <ProductThumb product={p} finishColor={f?.color} size="lg" />
              {supportFor(p) === 'none' && <span className={styles.eye}><Eye size={11} /></span>}
            </button>
          );
        })}
      </div>

      {selected?.finishes && (
        <div className={styles.finishes}>
          <div className={styles.groupHead}>
            <strong>{slot === 'wheels' ? 'Wheel Colours' : 'Finish'}</strong>
            <span>{finish?.name}{finish?.price ? ` · +${formatINR(finish.price)}` : ''}</span>
          </div>
          <div className={styles.dots} role="radiogroup" aria-label={`${selected.name} finish`}>
            {selected.finishes.map((f) => (
              <button
                key={f.id}
                role="radio"
                aria-checked={finish?.id === f.id}
                title={f.name}
                className={`${styles.dot} ${finish?.id === f.id ? styles.dotOn : ''}`}
                style={{ background: `linear-gradient(135deg, ${f.color} 40%, #ffffff66 50%, ${f.color} 60%)` }}
                onClick={() => onFinish(slot, f.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
