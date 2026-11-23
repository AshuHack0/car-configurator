'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Bookmark, Info, RotateCcw, RotateCw, Ruler, Search, Sparkles } from 'lucide-react';
import { Logo } from '@/components/layout/SiteHeader';
import { PRODUCTS, formatINR } from '@/data/products';
import { useConfigurator, type OwnPaint } from '@/hooks/useConfigurator';
import { useVehicle } from '@/hooks/useVehicle';
import { VISUALIZE_HANDOFF_KEY } from '@/lib/visualize/changes';
import { preloadModels } from '@/three/loaders';
import type { CameraPreset } from '@/three/CameraController';
import type { StageLighting } from '@/three/VehicleScene';
import type { VehicleRig } from '@/three/rig';
import type { CategoryId, Product, SlotId } from '@/types/product';
import type { OpeningPart } from '@/types/vehicle';
import { OptionSections } from './OptionSections';
import { SummaryDialog } from './SummaryDialog';
import { ViewerOverlay } from './ViewerOverlay';
import styles from './Configurator.module.css';

const OPENING_PARTS: OpeningPart[] = ['doors', 'boot', 'fuel'];

/** Extra tile for cars whose 3D model has a cabin to sit in. */
const CABIN_VIEW: { id: CameraPreset; label: string; icon: JSX.Element } = {
  id: 'interior', label: 'Interior',
  icon: <><path d="M11 20v-9a3 3 0 0 1 6 0v6h5a3 3 0 0 1 3 3v1H11Z" /><path d="M9 24h17" /></>,
};

const VehicleScene = dynamic(() => import('@/three/VehicleScene'), { ssr: false });

const CATEGORY_VIEW: Record<CategoryId, CameraPreset> = {
  wheels: 'wheel',
  spoilers: 'rearQuarter',
  bumpers: 'frontLow',
  skirts: 'side',
  paint: 'threeQuarter',
  lighting: 'front',
  accessories: 'rearQuarter',
  interior: 'interior',
};

const SLOT_VIEW: Partial<Record<SlotId, CameraPreset>> = {
  frontBumper: 'frontLow',
  rearBumper: 'rear',
  diffuser: 'rear',
  exhaust: 'rear',
  taillights: 'rear',
  headlights: 'front',
  grille: 'front',
  roof: 'threeQuarter',
  mirrors: 'threeQuarter',
  carbonTrim: 'threeQuarter',
};

/** The view strip under the viewer: each tile moves the camera to a preset. */
const VIEWS: { id: CameraPreset; label: string; icon: JSX.Element }[] = [
  { id: 'threeQuarter', label: 'Front 3/4', icon: <path d="M4 17h3m10 0h7M6 17l1-5 5-4h8l5 4 2 1v4M12 8l-2 4h14" /> },
  { id: 'wheel', label: 'Wheel', icon: <><circle cx="16" cy="13" r="8" /><circle cx="16" cy="13" r="2.5" /><path d="M16 5v5.5M16 15.5V21M8 13h5.5M18.5 13H24" /></> },
  { id: 'side', label: 'Side', icon: <><path d="M3 17h3m6 0h8m6 0h3v-3l-5-2-4-4h-8l-5 4-4 1v4" /><circle cx="9" cy="17" r="3" /><circle cx="23" cy="17" r="3" /></> },
  { id: 'rearQuarter', label: 'Rear 3/4', icon: <path d="M28 17h-3m-10 0H8m18 0-1-5-5-4h-8l-5 4-2 1v4M20 8l2 4H8" /> },
  { id: 'top', label: 'Top', icon: <><rect x="5" y="7" width="22" height="12" rx="5" /><path d="M11 9v8M20 9v8" /></> },
  { id: 'front', label: 'Front', icon: <><path d="M6 20v-6l2-5h16l2 5v6M6 15h20" /><circle cx="9.5" cy="17.5" r="1.5" /><circle cx="22.5" cy="17.5" r="1.5" /></> },
  { id: 'rear', label: 'Rear', icon: <><path d="M6 20v-6l2-5h16l2 5v6M6 14h20" /><path d="M8 17h5M19 17h5" /></> },
];

interface Props {
  vehicleId: string;
  generation: string;
  year?: number;
  /** Paint detected from the customer's photos (the /identify flow). */
  ownPaint?: OwnPaint;
}

export function Configurator({ vehicleId, generation, year, ownPaint }: Props) {
  const v = useVehicle(vehicleId)!;
  const cfg = useConfigurator(vehicleId, year, generation, ownPaint);
  const router = useRouter();
  const [measured, setMeasured] = useState<VehicleRig['dimensions'] | null>(null);
  const [open, setOpen] = useState<Set<CategoryId>>(() => new Set<CategoryId>(['paint', 'wheels']));
  const [query, setQuery] = useState('');
  const [camera, setCamera] = useState<{ preset: CameraPreset; nonce: number }>({ preset: 'threeQuarter', nonce: 0 });
  const [lighting, setLighting] = useState<StageLighting>('courtyard');
  const [autoRotate, setAutoRotate] = useState(false);
  /** Hinge nodes (each door, the boot, each flap) that are open. */
  const [openNodes, setOpenNodes] = useState<ReadonlySet<string>>(() => new Set());
  const toggleNode = useCallback((node: string) => setOpenNodes((prev) => {
    const next = new Set(prev);
    if (!next.delete(node)) next.add(node);
    return next;
  }), []);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [mode, setMode] = useState<'photo' | '3d'>('photo');
  const stageRef = useRef<HTMLDivElement>(null);

  const goTo = useCallback((preset: CameraPreset) => setCamera((c) => ({ preset, nonce: c.nonce + 1 })), []);

  const toggleSection = (id: CategoryId) => {
    const opening = !open.has(id);
    setOpen((prev) => {
      const next = new Set(prev);
      if (opening) next.add(id); else next.delete(id);
      return next;
    });
    if (opening) goTo(CATEGORY_VIEW[id]);
  };

  // Lazy-load: only fetch part models for the sections the customer has opened.
  useEffect(() => {
    const urls = PRODUCTS.filter((p) => open.has(p.category) && v.supportFor(p) !== 'none')
      .map((p) => (p.impl.kind === 'wheels' || p.impl.kind === 'attach' ? p.impl.model : null))
      .filter((u): u is string => !!u);
    preloadModels(urls);
  }, [open, v]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const select = (product: Product, finishId?: string) => {
    cfg.select(product, finishId, v.supportFor(product) === 'none');
    const view = SLOT_VIEW[product.slot] ?? CATEGORY_VIEW[product.category];
    if (view !== camera.preset) goTo(view);
  };

  const supported = useCallback((p: Product) => v.supportFor(p) !== 'none', [v]);
  const removeItem = (slot: SlotId | 'paint') => (slot === 'paint' ? cfg.setPaint({ id: 'factory' }) : cfg.remove(slot));
  const title = `${v.brand.name} ${v.vehicle.model}`;

  const enquire = () => {
    const lines = cfg.lineItems.map((i) => `- ${i.label}: ${i.name}${i.finish ? ` (${i.finish})` : ''} — ${formatINR(i.price)}`);
    const body = [`Vehicle: ${title} ${generation}${year ? ` (${year})` : ''}`, '', ...lines, '', `Estimated total: ${formatINR(cfg.total)}`].join('\n');
    window.location.href = `mailto:?subject=${encodeURIComponent(`Enquiry: ${title} build`)}&body=${encodeURIComponent(body)}`;
  };

  /** Hands the current build to the "See it for real" page, which edits a real photograph with AI. */
  const seeForReal = () => {
    try {
      sessionStorage.setItem(VISUALIZE_HANDOFF_KEY, JSON.stringify(cfg.config));
    } catch {
      /* storage unavailable: the page opens without a build */
    }
    router.push(`/visualize?vehicle=${v.vehicle.id}`);
  };

  const { asset } = v;
  /** Toolbar buttons act on every hinge of a kind: all doors, the boot, both flaps. */
  const nodesOf = (part: OpeningPart) => (asset.doors ?? []).filter((d) => d.part === part).map((d) => d.node);
  const togglePart = (part: OpeningPart) => setOpenNodes((prev) => {
    const nodes = nodesOf(part);
    const next = new Set(prev);
    const allOpen = nodes.every((n) => next.has(n));
    nodes.forEach((n) => (allOpen ? next.delete(n) : next.add(n)));
    return next;
  });

  // Photo view: offline renders exist for the standard car in each listed paint. Anything
  // they cannot show (parts, wheels, a custom colour) falls back to the live 3D viewer.
  const renders = asset.renders;
  const hasParts = Object.keys(cfg.config.selections).length > 0;
  const photoAvailable = !!renders && !hasParts && !ownPaint && renders.paints.includes(cfg.config.paint.id);
  const showPhoto = mode === 'photo' && photoAvailable;
  const photoView = renders?.views.includes(camera.preset) ? camera.preset : 'threeQuarter';
  const photoSrc = renders ? `${renders.base}/${cfg.config.paint.id}-${photoView}.jpg` : '';
  const paintId = cfg.config.paint.id;

  // Warm the browser cache so switching angle is instant.
  useEffect(() => {
    if (!renders || !showPhoto) return;
    renders.views.forEach((view) => { new window.Image().src = `${renders.base}/${paintId}-${view}.jpg`; });
  }, [renders, showPhoto, paintId]);

  const bodyNote = asset.standIn
    ? { label: 'Demo 3D body', tip: `3D body: ${asset.credit}. Add a licensed GLB for this exact model in src/data/demoAssets.ts.` }
    : asset.vehicles && !asset.vehicles.includes(v.vehicle.id)
      ? { label: `3D body: ${asset.shortLabel ?? asset.label}`, tip: `A 3D model of the ${title} is not in the library yet, so the closest ${v.brand.name} body (${asset.label}) is shown. Paint, wheels and parts still preview on it.` }
      : asset.generations && !asset.generations.includes(generation)
        ? { label: `3D body: ${asset.generations.join('/')}`, tip: `The 3D body shown is the ${asset.label}. A ${generation} model is not in the library yet.` }
        : null;

  return (
    <div className={styles.page}>
      <header className={styles.brandBar}><Logo /></header>

      <div className={styles.actionBar}>
        <nav className={styles.links}>
          <Link href="/vehicles"><ArrowLeft size={18} /> <span>Change model</span></Link>
          <button onClick={() => setToast(cfg.save() ? 'Configuration saved on this device' : 'Could not save — storage unavailable')}>
            <Bookmark size={18} /> <span>Save configuration</span>
          </button>
          <button
            disabled={!cfg.saved}
            title={cfg.saved ? 'Load your saved configuration' : 'No saved configuration yet'}
            onClick={() => setToast(cfg.restore() ? 'Saved configuration loaded' : 'No saved configuration found')}
          >
            <RotateCw size={18} /> <span>Load configuration</span>
          </button>
          <button onClick={() => { cfg.reset(); goTo('threeQuarter'); setToast('Configuration reset to standard'); }}>
            <RotateCcw size={18} /> <span>Reset</span>
          </button>
        </nav>
        <div className={styles.cta}>
          <div className={styles.price}>
            <strong>{formatINR(cfg.total)}</strong>
            <small>Estimated customisation · demo prices</small>
          </div>
          <button className={styles.summary} onClick={() => setSummaryOpen(true)}>Summary</button>
          <button className={styles.enquire} onClick={enquire}>Enquire about this build</button>
        </div>
      </div>

      <main className={styles.main}>
        <div className={styles.left}>
          <div className={styles.stage} ref={stageRef}>
            {showPhoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className={styles.photo} src={photoSrc} alt={`${title} in ${cfg.paint.name}, ${photoView} view`} draggable={false} />
            ) : (
            <VehicleScene
              asset={asset}
              config={cfg.config}
              paint={cfg.paint}
              supported={supported}
              preset={camera.preset}
              presetNonce={camera.nonce}
              lighting={lighting}
              autoRotate={autoRotate}
              retryKey={retryKey}
              onError={(e) => setLoadError(e.message)}
              onMeasured={setMeasured}
              openNodes={openNodes}
              onToggleNode={toggleNode}
            />
            )}
            <ViewerOverlay
              mode={showPhoto ? 'photo' : '3d'}
              photoNote={!renders ? null : photoAvailable ? null : 'Photo view shows the standard car in a listed paint. Parts and custom colours are previewed in live 3D.'}
              onMode={renders ? setMode : undefined}
              asset={asset}
              lighting={lighting}
              onLighting={setLighting}
              autoRotate={autoRotate}
              onAutoRotate={() => setAutoRotate((a) => !a)}
              openable={OPENING_PARTS.filter((p) => asset.doors?.some((d) => d.part === p))}
              openParts={new Set(OPENING_PARTS.filter((p) => nodesOf(p).length > 0 && nodesOf(p).every((n) => openNodes.has(n))))}
              onTogglePart={togglePart}
              onFullscreen={() => (document.fullscreenElement ? document.exitFullscreen() : stageRef.current?.requestFullscreen?.())}
              loadError={loadError}
              onRetry={() => { setLoadError(null); setRetryKey((k) => k + 1); }}
              previewProduct={cfg.previewProduct}
              previewReason={cfg.previewProduct && (
                asset.unsupportedNotes?.[cfg.previewProduct.component]
                ?? (cfg.previewProduct.impl.kind === 'preview' ? cfg.previewProduct.impl.reason : 'This part is not available in 3D for this vehicle yet.')
              )}
              onDismissPreview={cfg.dismissPreview}
              toast={toast}
            />
          </div>

          <div className={styles.views} role="toolbar" aria-label="Camera views">
            {[...VIEWS, ...(asset.cabin ? [CABIN_VIEW] : [])].map((view) => (
              <button
                key={view.id}
                className={camera.preset === view.id ? styles.viewOn : ''}
                onClick={() => goTo(view.id)}
                aria-pressed={camera.preset === view.id}
              >
                <svg viewBox="0 0 32 26" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{view.icon}</svg>
                <span>{view.label}</span>
              </button>
            ))}
          </div>
        </div>

        <aside className={styles.right}>
          <div className={styles.title}>
            <h1>{v.vehicle.model}</h1>
            <span className={styles.pill}>{year ?? generation}</span>
          </div>
          <p className={styles.sub}>
            {v.brand.name} · {generation} · {v.vehicle.power}
            {bodyNote && <span className={styles.bodyNote} title={bodyNote.tip}><Info size={12} /> {bodyNote.label}</span>}
          </p>

          {measured && (
            <p className={styles.fitment} title="Measured from the 3D body. Spoilers, bumpers, skirts and wheels are scaled to these dimensions.">
              <Ruler size={14} />
              Parts fitted to this body: {measured.length.toFixed(2)} m long · {measured.width.toFixed(2)} m wide ·{' '}
              {measured.wheelbase.toFixed(2)} m wheelbase · {Math.round(measured.wheelDiameter * 1000)} mm wheels
            </p>
          )}

          <button className={styles.real} onClick={seeForReal}>
            <Sparkles size={20} />
            <span>
              <strong>See it for real</strong>
              <small>Apply this build to a real photograph</small>
            </span>
          </button>

          <label className={styles.search}>
            <Search size={20} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search equipment options" aria-label="Search equipment options" />
          </label>

          <OptionSections
            config={cfg.config}
            paint={cfg.paint}
            ownPaint={ownPaint}
            factoryColor={asset.vehicles?.includes(vehicleId) ? asset.factoryPaint?.color : undefined}
            query={query}
            open={open}
            onToggle={toggleSection}
            supportFor={v.supportFor}
            onSelect={select}
            onRemove={cfg.remove}
            onFinish={cfg.setFinish}
            onPaint={cfg.setPaint}
          />
          <p className={styles.legal}>
            Prices are illustrative demo estimates in INR. Parts shown may differ from the fitted product.
          </p>
        </aside>
      </main>

      {summaryOpen && (
        <SummaryDialog
          title={`${title} ${generation}`}
          items={cfg.lineItems}
          total={cfg.total}
          onRemove={removeItem}
          onClose={() => setSummaryOpen(false)}
          onEnquire={enquire}
        />
      )}
    </div>
  );
}
