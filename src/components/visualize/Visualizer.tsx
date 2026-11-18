'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Download, ImagePlus, Loader2, Sparkles } from 'lucide-react';
import { Button, LinkButton } from '@/components/ui/Button';
import { photoUrl } from '@/data/photos';
import { getVehicle, vehicleTitle } from '@/data/vehicles';
import { resizeForUpload } from '@/lib/resizeImage';
import { VISUALIZE_HANDOFF_KEY, describeChanges } from '@/lib/visualize/changes';
import type { IdentifyImage } from '@/types/identify';
import type { Configuration } from '@/types/product';
import styles from './Visualizer.module.css';

type Photo = IdentifyImage & { previewUrl: string; own: boolean };

async function loadStockPhoto(url: string): Promise<Photo> {
  const blob = await (await fetch(url)).blob();
  const data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
  return { mediaType: 'image/jpeg', data, previewUrl: url, own: false };
}

export function Visualizer() {
  const params = useSearchParams();
  const vehicle = getVehicle(params.get('vehicle') ?? '');
  const [config, setConfig] = useState<Pick<Configuration, 'paint' | 'selections'> | null>(null);
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [show, setShow] = useState<'after' | 'before'>('after');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // The build chosen in the configurator.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(VISUALIZE_HANDOFF_KEY);
      const saved = raw ? (JSON.parse(raw) as Configuration) : null;
      if (saved && saved.vehicleId === vehicle?.id) setConfig({ paint: saved.paint, selections: saved.selections ?? {} });
    } catch {
      /* storage unavailable */
    }
  }, [vehicle?.id]);

  // Start from our photograph of this model; the customer can swap in their own.
  const stock = vehicle ? photoUrl(vehicle.id) : null;
  useEffect(() => {
    if (!stock) return;
    let cancelled = false;
    loadStockPhoto(stock).then((p) => { if (!cancelled) setPhoto((cur) => cur ?? p); }).catch(() => {});
    return () => { cancelled = true; };
  }, [stock]);

  const changes = useMemo(() => (config ? describeChanges(config) : []), [config]);

  if (!vehicle) {
    return (
      <main className={styles.page}>
        <h1>See it for real</h1>
        <p className={styles.lead}>Choose a model and build it in the configurator first.</p>
        <LinkButton href="/vehicles" variant="primary">Model overview</LinkButton>
      </main>
    );
  }

  const configuratorHref = `/configurator/${vehicle.id}`;

  const chooseFile = async (file?: File) => {
    if (!file) return;
    setError(null);
    try {
      const resized = await resizeForUpload(file);
      setPhoto({ mediaType: resized.mediaType, data: resized.data, previewUrl: resized.previewUrl, own: true });
      setResult(null);
    } catch {
      setError('This photo could not be opened. Try a JPEG or PNG.');
    }
  };

  const generate = async () => {
    if (!photo || !config || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/visualize', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ image: { mediaType: photo.mediaType, data: photo.data }, vehicleId: vehicle.id, config }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      setResult(`data:${json.image.mediaType};base64,${json.image.data}`);
      setShow('after');
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const shown = result && show === 'after' ? result : photo?.previewUrl;

  return (
    <main className={styles.page}>
      <LinkButton href={configuratorHref} variant="subtle" size="sm" className={styles.back}>Back to configurator</LinkButton>
      <h1>See it for real</h1>
      <p className={styles.lead}>
        Your build, applied to a real photograph of the {vehicleTitle(vehicle)}. The picture is edited by AI, so small
        details can differ from the fitted parts.
      </p>

      <div className={styles.layout}>
        <div className={styles.stage}>
          {shown ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shown} alt={result && show === 'after' ? 'Your build on the real car' : 'Original photograph'} />
          ) : (
            <p className={styles.empty}>Add a photo of the car to begin.</p>
          )}
          {busy && (
            <div className={styles.working} role="status">
              <Loader2 size={28} className={styles.spin} />
              <span>Applying your build to the photo. This takes 10 to 30 seconds.</span>
            </div>
          )}
          {result && !busy && (
            <div className={styles.toggle}>
              <button className={show === 'before' ? styles.on : ''} onClick={() => setShow('before')}>Before</button>
              <button className={show === 'after' ? styles.on : ''} onClick={() => setShow('after')}>After</button>
            </div>
          )}
        </div>

        <aside className={styles.panel}>
          <h2>Your changes</h2>
          {changes.length ? (
            <ul className={styles.changes}>
              {changes.map((c) => (
                <li key={c.label}><span>{c.label}</span><strong>{c.name}</strong></li>
              ))}
            </ul>
          ) : (
            <p className={styles.none}>
              Nothing chosen yet. Pick a colour, wheels or parts in the configurator, then press “See it for real”.
            </p>
          )}

          <h2>Photo</h2>
          <p className={styles.photoNote}>{photo?.own ? 'Using your own photo.' : stock ? 'Using our photo of this model.' : 'No photo yet.'}</p>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => { chooseFile(e.target.files?.[0]); e.target.value = ''; }} />
          <Button variant="ghost" size="sm" icon={<ImagePlus size={16} />} onClick={() => fileRef.current?.click()}>
            Use my own photo
          </Button>

          {error && <p className={styles.error} role="alert">{error}</p>}

          <div className={styles.actions}>
            <Button variant="primary" size="lg" disabled={!photo || !changes.length || busy} onClick={generate} icon={<Sparkles size={18} />}>
              {result ? 'Generate again' : 'Generate photo'}
            </Button>
            {result && (
              <a className={styles.download} href={result} download={`${vehicle.id}-build.png`}>
                <Download size={16} /> Download
              </a>
            )}
            {!changes.length && (
              <LinkButton href={configuratorHref} variant="ghost" size="lg" icon={<ArrowLeft size={18} />}>Open configurator</LinkButton>
            )}
          </div>
          <small className={styles.cost}>Each generated photo uses the paid Gemini image model.</small>
        </aside>
      </div>
    </main>
  );
}
