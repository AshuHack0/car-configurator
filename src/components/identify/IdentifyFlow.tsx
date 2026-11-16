'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, ArrowRight, Camera, Check, ImagePlus, Images, Lightbulb, Loader2, RotateCcw, ScanSearch, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { CUSTOM_PAINT_FINISHES } from '@/data/products';
import { IDENTIFY_BRANDS, VEHICLES, getBrand, getVehicle } from '@/data/vehicles';
import { resizeForUpload, type LocalPhotoIssue } from '@/lib/resizeImage';
import type { IdentifyImage, IdentifyResponse, IdentifyResult, PaintFinish, PhotoProblem } from '@/types/identify';
import { PHOTO_ISSUE_TEXT, PHOTO_TIPS } from './photoGuide';
import styles from './IdentifyFlow.module.css';

/** One clear photo is enough to identify a car; more angles raise confidence. */
const MIN_PHOTOS = 1;
const RECOMMENDED_PHOTOS = 3;
const MAX_PHOTOS = 8;

const SHOTS = [
  { title: 'Front three-quarter', hint: 'Headlights and grille in view' },
  { title: 'Rear three-quarter', hint: 'Taillights and badges in view' },
  { title: 'Side profile', hint: 'The whole car, wheels included' },
  { title: 'Wheel close-up', hint: 'Optional, helps with wheel and paint' },
];

const SUPPORTED = VEHICLES.filter((v) => IDENTIFY_BRANDS.includes(v.brand));
const brandList = IDENTIFY_BRANDS.map((b) => getBrand(b).name).join(' & ');

const CONFIDENCE_LABEL = { high: 'High confidence', medium: 'Medium confidence', low: 'Low confidence' } as const;

interface Photo extends IdentifyImage {
  id: string;
  previewUrl: string;
  /** Problems found in the browser before upload. */
  issues: LocalPhotoIssue[];
}

type PhotoIssue = LocalPhotoIssue | PhotoProblem;

/** One alert line: which photo, what is wrong, how to fix it. */
interface IssueLine {
  photo: number;
  issue: PhotoIssue;
}

type Phase =
  | { name: 'select' }
  | { name: 'analysing' }
  | { name: 'result'; result: IdentifyResult }
  | { name: 'error'; message: string };

export function IdentifyFlow() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [phase, setPhase] = useState<Phase>({ name: 'select' });
  const [notice, setNotice] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  /** Problems the AI reported, keyed by photo id so they survive edits to the photo list. */
  const [aiIssues, setAiIssues] = useState<Record<string, PhotoProblem>>({});
  const inputRef = useRef<HTMLInputElement>(null);
  const photosRef = useRef(photos);
  photosRef.current = photos;

  // Free preview blobs when the page goes away.
  useEffect(() => () => photosRef.current.forEach((p) => URL.revokeObjectURL(p.previewUrl)), []);

  const addFiles = async (files: FileList | File[]) => {
    const room = MAX_PHOTOS - photos.length;
    const list = Array.from(files).filter((f) => f.type.startsWith('image/') || /\.(heic|heif)$/i.test(f.name));
    if (!list.length) return;
    if (list.length > room) setNotice(`Up to ${MAX_PHOTOS} photos — the first ${room} were added.`);
    else setNotice(null);

    const added: Photo[] = [];
    let failed = 0;
    for (const file of list.slice(0, room)) {
      try {
        const img = await resizeForUpload(file);
        added.push({ ...img, id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2, 7)}` });
      } catch {
        failed++;
      }
    }
    if (failed) setNotice(`${failed} photo${failed > 1 ? 's' : ''} could not be read. Use JPEG or PNG (iPhone: set Camera → Formats → Most Compatible).`);
    setPhotos((p) => [...p, ...added]);
  };

  const removePhoto = (id: string) => {
    setPhotos((p) => {
      const gone = p.find((x) => x.id === id);
      if (gone) URL.revokeObjectURL(gone.previewUrl);
      return p.filter((x) => x.id !== id);
    });
  };

  const identify = async () => {
    setPhase({ name: 'analysing' });
    try {
      const res = await fetch('/api/identify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: photos.map(({ mediaType, data }) => ({ mediaType, data })) }),
      });
      const json = (await res.json()) as IdentifyResponse;
      if (!json.ok) {
        setPhase({ name: 'error', message: json.error });
        return;
      }
      const flagged: Record<string, PhotoProblem> = {};
      for (const p of json.result.photoProblems) {
        const photo = photos[p.photo - 1];
        if (photo) flagged[photo.id] = p.problem;
      }
      setAiIssues(flagged);
      setPhase({ name: 'result', result: json.result });
    } catch {
      setPhase({ name: 'error', message: 'Could not reach the server. Check your connection and try again.' });
    }
  };

  const startOver = () => {
    photos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    setPhotos([]);
    setNotice(null);
    setAiIssues({});
    setPhase({ name: 'select' });
  };

  /** Every problem on the current photos: the browser's checks first, then the AI's verdict. */
  const issueLines: IssueLine[] = photos.flatMap((p, i) => {
    const ai = aiIssues[p.id];
    // If the photo is the wrong subject altogether, its brightness or sharpness no longer matters.
    if (ai === 'not_a_car' || ai === 'interior_only' || ai === 'other_car') return [{ photo: i + 1, issue: ai }];
    const lines: IssueLine[] = p.issues.map((issue) => ({ photo: i + 1, issue }));
    if (ai && !p.issues.includes(ai as LocalPhotoIssue)) lines.push({ photo: i + 1, issue: ai });
    return lines;
  });

  return (
    <main className={styles.page}>
      <header className={styles.head}>
        <span className={styles.step}>Your car, in 3D</span>
        <h1>Show us your car.</h1>
        <p>
          One clear photo is enough — add front, rear and side views for the most accurate result. We recognise the exact
          model, generation and paint, then open your car in the 3D configurator so you can try parts on it.
        </p>
        <span className={styles.pilot}>Pilot: {brandList}</span>
      </header>

      {phase.name === 'result' ? (
        <ResultView
          result={phase.result} photos={photos} issueLines={issueLines}
          onStartOver={startOver} onEditPhotos={() => setPhase({ name: 'select' })}
        />
      ) : (
        <>
          <ol className={styles.shots}>
            {SHOTS.map((s, i) => (
              <li key={s.title}>
                <span className={styles.shotIndex}>{i + 1}</span>
                <div><strong>{s.title}</strong><small>{s.hint}</small></div>
              </li>
            ))}
          </ol>

          <section
            className={`${styles.drop} ${dragging ? styles.dragging : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); if (phase.name !== 'analysing') void addFiles(e.dataTransfer.files); }}
          >
            {photos.length > 0 && (
              <div className={styles.thumbs}>
                {photos.map((p, i) => {
                  const ai = aiIssues[p.id];
                  const decisive = ai === 'not_a_car' || ai === 'interior_only' || ai === 'other_car';
                  const issue: PhotoIssue | undefined = decisive ? ai : p.issues[0] ?? ai;
                  return (
                    <figure
                      key={p.id}
                      className={`${styles.thumb} ${issue ? styles.thumbBad : ''} ${phase.name === 'analysing' ? styles.scanning : ''}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
                      <img src={p.previewUrl} alt={`Car photo ${i + 1}`} />
                      <span className={styles.thumbNumber}>{i + 1}</span>
                      {issue && (
                        <span className={styles.thumbIssue}><AlertTriangle size={12} /> {PHOTO_ISSUE_TEXT[issue].label}</span>
                      )}
                      {phase.name !== 'analysing' && (
                        <button className={styles.remove} onClick={() => removePhoto(p.id)} aria-label={`Remove photo ${i + 1}`}><X size={14} /></button>
                      )}
                    </figure>
                  );
                })}
                {photos.length < MAX_PHOTOS && phase.name !== 'analysing' && (
                  <button className={styles.addTile} onClick={() => inputRef.current?.click()}>
                    <ImagePlus size={20} /><span>Add photo</span>
                  </button>
                )}
              </div>
            )}
            {photos.length === 0 && (
              <button className={styles.empty} onClick={() => inputRef.current?.click()}>
                <Camera size={28} />
                <strong>Drop photos here or click to choose</strong>
                <span>JPEG, PNG or WebP · up to {MAX_PHOTOS} photos · daylight works best</span>
              </button>
            )}
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => { if (e.target.files) void addFiles(e.target.files); e.target.value = ''; }}
            />
          </section>

          {issueLines.length > 0 && phase.name !== 'analysing' && (
            <PhotoAlert
              title={issueLines.length === 1 ? 'One photo needs attention' : `${issueLines.length} photo problems found`}
              lines={issueLines}
              footer="You can still continue, but clearer photos give a more accurate result."
            />
          )}
          {notice && <p className={styles.notice}><AlertTriangle size={15} /> {notice}</p>}
          {phase.name === 'error' && <p className={styles.error}><AlertTriangle size={15} /> {phase.message}</p>}

          <div className={styles.actions}>
            <span className={styles.count}>
              {photos.length} of {MAX_PHOTOS} photos
              {photos.length > 0 && photos.length < RECOMMENDED_PHOTOS && ' · add a rear and side view for a more accurate match'}
            </span>
            {phase.name === 'analysing' ? (
              <Button variant="primary" size="lg" disabled icon={<Loader2 size={18} className={styles.spin} />}>
                Analysing photos… up to a minute
              </Button>
            ) : (
              <Button
                variant="primary" size="lg" disabled={photos.length < MIN_PHOTOS} onClick={identify}
                icon={<ScanSearch size={18} />}
              >
                {phase.name === 'error' ? 'Try again' : 'Identify my car'}
              </Button>
            )}
          </div>
          <p className={styles.privacy}>
            Photos are resized and stripped of location data in your browser, sent once for analysis, and not stored.
          </p>
        </>
      )}
    </main>
  );
}

/** Alert listing what is wrong with which photo and how to fix it, plus the photo guide. */
function PhotoAlert({ title, lines, footer }: { title: string; lines: IssueLine[]; footer?: string }) {
  return (
    <section className={styles.photoAlert} role="alert">
      <h3><AlertTriangle size={17} /> {title}</h3>
      {lines.length > 0 && (
        <ul className={styles.issueList}>
          {lines.map((l) => (
            <li key={`${l.photo}-${l.issue}`}>
              <strong>Photo {l.photo} · {PHOTO_ISSUE_TEXT[l.issue].label}.</strong> {PHOTO_ISSUE_TEXT[l.issue].fix}
            </li>
          ))}
        </ul>
      )}
      <div className={styles.tips}>
        <span><Lightbulb size={14} /> How to take a good photo</span>
        <ul>{PHOTO_TIPS.map((t) => <li key={t}>{t}</li>)}</ul>
      </div>
      {footer && <p className={styles.alertFooter}>{footer}</p>}
    </section>
  );
}

function ResultView({ result, photos, issueLines, onStartOver, onEditPhotos }: {
  result: IdentifyResult;
  photos: Photo[];
  issueLines: IssueLine[];
  onStartOver: () => void;
  onEditPhotos: () => void;
}) {
  const router = useRouter();
  const initial = result.match ? getVehicle(result.match.vehicleId) : undefined;
  const [vehicleId, setVehicleId] = useState(initial?.id ?? SUPPORTED[0].id);
  const vehicle = getVehicle(vehicleId)!;
  const [genCode, setGenCode] = useState(result.match?.generation ?? vehicle.generation);
  const generation = vehicle.generations.find((g) => g.code === genCode) ?? vehicle.generations[0];
  const [year, setYear] = useState<number>(result.match?.year ?? generation.years[0]);
  const [paintHex, setPaintHex] = useState(result.paint.hex);
  const [paintName, setPaintName] = useState(result.paint.name);
  const [finish, setFinish] = useState<PaintFinish>(result.paint.finish);

  const chooseVehicle = (id: string) => {
    const v = getVehicle(id)!;
    setVehicleId(id);
    setGenCode(v.generation);
    setYear(v.generations.find((g) => g.code === v.generation)!.years[0]);
  };
  const chooseGeneration = (code: string) => {
    setGenCode(code);
    const g = vehicle.generations.find((x) => x.code === code)!;
    if (!g.years.includes(year)) setYear(g.years[0]);
  };

  const edited = useMemo(() => !result.match || result.match.vehicleId !== vehicleId || result.match.generation !== genCode,
    [result.match, vehicleId, genCode]);

  const open = () => {
    const q = new URLSearchParams({
      gen: generation.code, year: String(year), paint: paintHex.replace('#', ''), finish, pname: paintName,
    });
    router.push(`/configurator/${vehicle.id}?${q}`);
  };

  if (!result.isCar) {
    return (
      <section className={styles.resultEmpty}>
        <PhotoAlert
          title="We couldn't recognise a car in these photos"
          lines={issueLines}
          footer="Upload at least one clear photo of the outside of your car and try again."
        />
        <div className={styles.resultActions}>
          <Button variant="ghost" onClick={onStartOver} icon={<RotateCcw size={16} />}>Start over</Button>
          <Button variant="primary" onClick={onEditPhotos} icon={<Images size={16} />}>Change photos</Button>
        </div>
      </section>
    );
  }

  const d = result.detected;
  // Models sometimes repeat the model name in the variant ("M4" / "M4 Competition"); show it once.
  const variant = d.variant.trim();
  const title = !variant || variant.toLowerCase() === d.model.toLowerCase()
    ? [d.make, d.model]
    : variant.toLowerCase().startsWith(d.model.toLowerCase()) ? [d.make, variant] : [d.make, d.model, variant];
  return (
    <section className={styles.result}>
      <div className={styles.resultMedia}>
        {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
        {photos[0] && <img src={photos[0].previewUrl} alt="Your car" />}
        <div className={styles.resultStrip}>
          {photos.slice(1, 6).map((p) => (
            // eslint-disable-next-line @next/next/no-img-element -- local blob preview
            <img key={p.id} src={p.previewUrl} alt="" />
          ))}
        </div>
      </div>

      <div className={styles.resultBody}>
        <small className={styles.eyebrow}>We think this is</small>
        <h2>{title.filter(Boolean).join(' ')}</h2>
        <p className={styles.sub}>
          {[d.generation, d.yearEstimate && `around ${d.yearEstimate}`].filter(Boolean).join(' · ')}
          <span className={`${styles.badge} ${styles[result.confidence]}`}>{CONFIDENCE_LABEL[result.confidence]}</span>
        </p>

        <dl className={styles.facts}>
          <div>
            <dt>Paint</dt>
            <dd><span className={styles.swatch} style={{ background: result.paint.hex }} /> {result.paint.name}</dd>
          </div>
          {result.wheels && <div><dt>Wheels</dt><dd>{result.wheels}</dd></div>}
          <div>
            <dt>Existing mods</dt>
            <dd>
              {result.existingMods.length
                ? <span className={styles.mods}>{result.existingMods.map((m) => <span key={m}>{m}</span>)}</span>
                : 'Looks stock'}
            </dd>
          </div>
        </dl>

        {result.unsupportedReason && <p className={styles.notice}><AlertTriangle size={15} /> {result.unsupportedReason}</p>}
        {result.photoAdvice && <p className={styles.advice}><Camera size={15} /> {result.photoAdvice}</p>}
        {issueLines.length > 0 && (
          <PhotoAlert
            title="Some photos made this harder"
            lines={issueLines}
            footer="If the result looks wrong, replace these photos and identify again."
          />
        )}

        <div className={styles.confirm}>
          <h3>{result.match && !edited ? <><Check size={16} /> Confirm your car</> : 'Choose your car'}</h3>
          <div className={styles.fields}>
            <label>
              <span>Model</span>
              <select value={vehicleId} onChange={(e) => chooseVehicle(e.target.value)}>
                {IDENTIFY_BRANDS.map((b) => (
                  <optgroup key={b} label={getBrand(b).name}>
                    {SUPPORTED.filter((v) => v.brand === b).map((v) => <option key={v.id} value={v.id}>{getBrand(v.brand).name} {v.model}</option>)}
                  </optgroup>
                ))}
              </select>
            </label>
            <label>
              <span>Generation</span>
              <select value={generation.code} onChange={(e) => chooseGeneration(e.target.value)}>
                {vehicle.generations.map((g) => <option key={g.code} value={g.code}>{g.label}</option>)}
              </select>
            </label>
            <label>
              <span>Year</span>
              <select value={year} onChange={(e) => setYear(Number(e.target.value))}>
                {generation.years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </label>
          </div>
          <div className={styles.fields}>
            <label className={styles.paintField}>
              <span>Paint</span>
              <span className={styles.paintRow}>
                <input type="color" value={paintHex} onChange={(e) => setPaintHex(e.target.value)} aria-label="Paint colour" />
                <input type="text" value={paintName} maxLength={60} onChange={(e) => setPaintName(e.target.value)} aria-label="Paint name" />
              </span>
            </label>
            <label>
              <span>Finish</span>
              <select value={finish} onChange={(e) => setFinish(e.target.value as PaintFinish)}>
                {CUSTOM_PAINT_FINISHES.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </label>
          </div>
        </div>

        <div className={styles.resultActions}>
          <Button variant="ghost" onClick={onEditPhotos} icon={<Images size={16} />}>Change photos</Button>
          <Button variant="primary" size="lg" onClick={open} icon={<ArrowRight size={18} />}>Open my car in 3D</Button>
        </div>
      </div>
    </section>
  );
}
