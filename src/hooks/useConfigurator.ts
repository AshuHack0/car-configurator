'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CUSTOM_PAINT_FINISHES, CUSTOM_PAINT_PRICE, PAINTS, SLOT_LABELS, getProduct, productFinish,
} from '@/data/products';
import type { Configuration, Product, SavedConfiguration, SlotId } from '@/types/product';

const STORAGE_PREFIX = 'dream-machine:config:';

export interface ResolvedPaint {
  id: string;
  name: string;
  color: string;
  metalness: number;
  roughness: number;
  clearcoat: number;
  clearcoatRoughness: number;
  price: number;
}

export interface LineItem {
  slot: SlotId | 'paint';
  label: string;
  name: string;
  finish?: string;
  price: number;
  productId?: string;
}

export function resolvePaint(paint: Configuration['paint']): ResolvedPaint {
  if (paint.id === 'custom') {
    const f = CUSTOM_PAINT_FINISHES.find((x) => x.id === paint.finish) ?? CUSTOM_PAINT_FINISHES[0];
    return {
      id: 'custom', name: `Custom ${f.name}`, color: paint.color ?? '#3b82f6',
      metalness: f.metalness, roughness: f.roughness, clearcoat: f.clearcoat, clearcoatRoughness: 0.06, price: CUSTOM_PAINT_PRICE,
    };
  }
  const p = PAINTS.find((x) => x.id === paint.id) ?? PAINTS[0];
  return { clearcoatRoughness: 0.06, ...p };
}

const emptyConfig = (vehicleId: string, year?: number, generation?: string): Configuration => ({
  vehicleId, year, generation, selections: {}, paint: { id: 'factory' },
});

function readSaved(vehicleId: string): SavedConfiguration | null {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + vehicleId);
    return raw ? (JSON.parse(raw) as SavedConfiguration) : null;
  } catch {
    return null;
  }
}

export function useConfigurator(vehicleId: string, year?: number, generation?: string) {
  const [config, setConfig] = useState<Configuration>(() => emptyConfig(vehicleId, year, generation));
  const [saved, setSaved] = useState<SavedConfiguration | null>(null);
  /** The most recent preview-only product, so the viewer can show its labelled illustration. */
  const [previewProduct, setPreviewProduct] = useState<Product | null>(null);

  useEffect(() => {
    setConfig(emptyConfig(vehicleId, year, generation));
    setSaved(readSaved(vehicleId));
    setPreviewProduct(null);
  }, [vehicleId, year, generation]);

  /** `previewOnly`: the vehicle's 3D asset cannot show this product, so show the labelled preview instead. */
  const select = useCallback((product: Product, finishId?: string, previewOnly = false) => {
    setConfig((c) => ({
      ...c,
      selections: { ...c.selections, [product.slot]: { productId: product.id, finishId: finishId ?? product.defaultFinish } },
    }));
    setPreviewProduct(previewOnly ? product : null);
  }, []);

  const remove = useCallback((slot: SlotId) => {
    setConfig((c) => {
      const selections = { ...c.selections };
      delete selections[slot];
      return { ...c, selections };
    });
    setPreviewProduct((p) => (p?.slot === slot ? null : p));
  }, []);

  const setFinish = useCallback((slot: SlotId, finishId: string) => {
    setConfig((c) => {
      const current = c.selections[slot];
      if (!current) return c;
      return { ...c, selections: { ...c.selections, [slot]: { ...current, finishId } } };
    });
  }, []);

  const setPaint = useCallback((paint: Configuration['paint']) => setConfig((c) => ({ ...c, paint })), []);

  const reset = useCallback(() => {
    setConfig((c) => emptyConfig(c.vehicleId, c.year, c.generation));
    setPreviewProduct(null);
  }, []);

  const paint = useMemo(() => resolvePaint(config.paint), [config.paint]);

  const lineItems = useMemo<LineItem[]>(() => {
    const items: LineItem[] = [];
    if (paint.id !== 'factory') items.push({ slot: 'paint', label: 'Paint', name: paint.name, price: paint.price });
    for (const [slot, sel] of Object.entries(config.selections) as [SlotId, { productId: string; finishId?: string }][]) {
      const product = getProduct(sel.productId);
      if (!product) continue;
      const finish = productFinish(product, sel.finishId);
      items.push({
        slot, label: SLOT_LABELS[slot], name: product.name, finish: finish?.name,
        price: product.price + (finish?.price ?? 0), productId: product.id,
      });
    }
    return items;
  }, [config.selections, paint]);

  const total = useMemo(() => lineItems.reduce((s, i) => s + i.price, 0), [lineItems]);

  const save = useCallback(() => {
    const entry: SavedConfiguration = { ...config, savedAt: new Date().toISOString(), total };
    try {
      localStorage.setItem(STORAGE_PREFIX + config.vehicleId, JSON.stringify(entry));
      setSaved(entry);
      return true;
    } catch {
      return false;
    }
  }, [config, total]);

  const restore = useCallback(() => {
    const entry = readSaved(config.vehicleId);
    if (!entry) return false;
    setConfig({ vehicleId: entry.vehicleId, year: entry.year, generation: entry.generation, selections: entry.selections, paint: entry.paint });
    setPreviewProduct(null);
    return true;
  }, [config.vehicleId]);

  return {
    config, paint, lineItems, total, saved, previewProduct,
    select, remove, setFinish, setPaint, reset, save, restore, dismissPreview: () => setPreviewProduct(null),
  };
}

export type ConfiguratorApi = ReturnType<typeof useConfigurator>;
