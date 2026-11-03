import type { Product } from '@/types/product';
import styles from './ProductThumb.module.css';

/**
 * Vector product thumbnails. Wheel thumbnails are drawn from the same spoke
 * layouts as the generated 3D wheels, so the card matches what gets fitted.
 */

// Rounded so server- and client-rendered SVG coordinates match exactly (avoids hydration warnings).
const round = (n: number) => Math.round(n * 100) / 100;
const polar = (r: number, a: number) => [round(60 + r * Math.cos(a)), round(60 + r * Math.sin(a))] as const;

function bar(r1: number, a1: number, r2: number, a2: number, w: number, key: string | number) {
  const [x1, y1] = polar(r1, a1);
  const [x2, y2] = polar(r2, a2);
  return <line key={key} x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth={w} strokeLinecap="round" />;
}

const SPOKES: Record<string, () => JSX.Element[]> = {
  'multi-spoke': () => Array.from({ length: 10 }).flatMap((_, i) => {
    const a = (i / 10) * Math.PI * 2;
    return [bar(10, a - 0.05, 34, a - 0.075, 1.6, `${i}a`), bar(10, a + 0.05, 34, a + 0.075, 1.6, `${i}b`)];
  }),
  'amg-twin': () => Array.from({ length: 5 }).flatMap((_, i) => {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    return [bar(10, a - 0.12, 34, a - 0.17, 3.6, `${i}a`), bar(10, a + 0.12, 34, a + 0.17, 3.6, `${i}b`)];
  }),
  'racing-mesh': () => Array.from({ length: 10 }).flatMap((_, i) => {
    const a = (i / 10) * Math.PI * 2;
    return [bar(9, a, 34, a + 0.32, 1.5, `${i}a`), bar(9, a, 34, a - 0.32, 1.5, `${i}b`)];
  }),
  'sport-y': () => Array.from({ length: 5 }).flatMap((_, i) => {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    return [bar(10, a, 21, a, 4, `${i}s`), bar(20, a, 34, a - 0.2, 2.6, `${i}a`), bar(20, a, 34, a + 0.2, 2.6, `${i}b`)];
  }),
  'forged-turbine': () => Array.from({ length: 7 }).flatMap((_, i) => {
    const a = (i / 7) * Math.PI * 2;
    return [bar(10, a, 22, a + 0.12, 5.5, `${i}a`), bar(21, a + 0.12, 34, a + 0.3, 4.6, `${i}b`)];
  }),
};

function Wheel({ design, color }: { design: string; color: string }) {
  return (
    <>
      <circle cx="60" cy="60" r="46" fill="#0b0b0c" />
      <circle cx="60" cy="60" r="46" fill="none" stroke="#1d1d20" strokeWidth="2" />
      <circle cx="60" cy="60" r="36" fill="#111215" stroke="#cfd3da" strokeWidth="1.5" />
      <circle cx="60" cy="60" r="30" fill="none" stroke="#3a3f47" strokeWidth="5" opacity="0.6" />
      <g stroke={color}>{(SPOKES[design] ?? SPOKES['amg-twin'])()}</g>
      <circle cx="60" cy="60" r="10" fill={color} />
      <circle cx="60" cy="60" r="4.5" fill="#1b1d22" stroke="#3b82f6" strokeWidth="0.8" />
    </>
  );
}

const CARBON = 'url(#thumb-carbon)';

function Art({ product, finishColor }: { product: Product; finishColor?: string }) {
  const { kind, design } = product.thumb;
  switch (kind) {
    case 'wheel':
      return <Wheel design={design ?? 'amg-twin'} color={finishColor ?? '#c7cbd1'} />;
    case 'spoiler-lip':
      return <path d="M18 70 L96 66 Q104 64 102 58 L20 64 Z" fill="#8b93a1" />;
    case 'spoiler-blade':
      return (
        <g>
          <path d="M16 52 Q60 40 104 52 L104 57 Q60 48 16 57 Z" fill="#8b93a1" />
          <rect x="36" y="56" width="5" height="18" fill="#0d0d0f" />
          <rect x="79" y="56" width="5" height="18" fill="#0d0d0f" />
          <path d="M12 76 H108" stroke="#2a2f38" strokeWidth="3" />
        </g>
      );
    case 'spoiler-ducktail':
      return <path d="M14 74 L94 72 Q108 70 106 56 Q96 64 14 66 Z" fill={CARBON} stroke="#4b5260" strokeWidth="0.6" />;
    case 'spoiler-wing':
      return (
        <g>
          <path d="M12 40 Q60 30 108 40 L108 47 Q60 39 12 47 Z" fill={CARBON} stroke="#4b5260" strokeWidth="0.6" />
          <rect x="10" y="34" width="4" height="20" fill={CARBON} />
          <rect x="106" y="34" width="4" height="20" fill={CARBON} />
          <path d="M40 46 Q34 62 42 80 H48 Q42 62 46 46 Z" fill="#1b1c20" />
          <path d="M74 46 Q68 62 76 80 H82 Q76 62 80 46 Z" fill="#1b1c20" />
          <path d="M8 82 H112" stroke="#2a2f38" strokeWidth="3" />
        </g>
      );
    case 'front-lip':
    case 'front-aggressive':
    case 'front-amg':
      return (
        <g>
          <path d="M14 58 Q60 40 106 58 L104 72 Q60 64 16 72 Z" fill="#2a2f38" />
          <path d="M12 74 Q60 64 108 74 L106 80 Q60 72 14 80 Z" fill={kind === 'front-aggressive' ? CARBON : '#050505'} stroke="#4b5260" strokeWidth="0.5" />
          {kind === 'front-aggressive' && (<>
            <path d="M8 62 L20 58 L20 61 L8 66 Z" fill={CARBON} /><path d="M112 62 L100 58 L100 61 L112 66 Z" fill={CARBON} />
            <path d="M6 70 L18 66 L18 69 L6 74 Z" fill={CARBON} /><path d="M114 70 L102 66 L102 69 L114 74 Z" fill={CARBON} />
          </>)}
          {kind === 'front-amg' && <path d="M34 64 Q60 58 86 64 L86 67 Q60 62 34 67 Z" fill="#8b93a1" stroke="#e5e7eb" strokeWidth="0.6" />}
        </g>
      );
    case 'rear-bumper':
      return (
        <g>
          <path d="M14 56 Q60 50 106 56 L106 74 Q60 80 14 74 Z" fill="#8b93a1" />
          <rect x="20" y="62" width="20" height="6" rx="2" fill="#0a0a0a" />
          <rect x="80" y="62" width="20" height="6" rx="2" fill="#0a0a0a" />
        </g>
      );
    case 'diffuser':
      return (
        <g>
          <path d="M20 58 H100 L92 78 H28 Z" fill={CARBON} stroke="#4b5260" strokeWidth="0.6" />
          {[34, 46, 58, 70, 82].map((x) => <path key={x} d={`M${x} 58 V80`} stroke="#5a6170" strokeWidth="2" />)}
        </g>
      );
    case 'skirt':
      return (
        <g>
          <path d="M8 60 H112 L110 72 H10 Z" fill={design === 'racing' ? CARBON : '#8b93a1'} />
          {design !== 'standard' && <path d="M8 72 H112 L114 78 H6 Z" fill={design === 'racing' ? CARBON : '#050505'} stroke="#4b5260" strokeWidth="0.4" />}
        </g>
      );
    case 'grille':
      return (
        <g>
          <rect x="18" y="42" width="84" height="36" rx="10" fill={design === 'carbon' ? CARBON : design} stroke="#4b5260" />
          {[50, 58, 66].map((y) => <path key={y} d={`M26 ${y} H94`} stroke="#000" strokeOpacity="0.5" strokeWidth="2" />)}
        </g>
      );
    case 'mirror':
      return <path d="M24 70 Q22 44 54 42 H88 Q100 44 98 58 Q94 72 70 74 Z" fill={design === 'carbon' ? CARBON : design} stroke="#4b5260" />;
    case 'headlight':
      return (
        <g>
          <path d="M14 70 Q30 40 104 46 Q104 64 86 72 Z" fill="#14161b" stroke="#3a3f47" />
          <path d="M28 62 Q54 50 96 52" stroke={design} strokeWidth="3.5" fill="none" strokeLinecap="round" />
          <circle cx="76" cy="62" r="6" fill="#0a0b0d" stroke="#3a3f47" />
        </g>
      );
    case 'taillight':
      return (
        <g>
          <rect x="14" y="50" width="92" height="22" rx="8" fill={design} stroke="#3a3f47" />
          <path d="M22 61 H98" stroke="#ff4646" strokeWidth="2" opacity="0.8" />
        </g>
      );
    case 'roof-bars':
      return (
        <g>
          <path d="M14 76 Q60 56 106 76" fill="#2a2f38" />
          <rect x="22" y="56" width="76" height="4" rx="2" fill="#1b1c20" />
          <rect x="22" y="66" width="76" height="4" rx="2" fill="#1b1c20" />
        </g>
      );
    case 'roof-box':
      return (
        <g>
          <path d="M14 82 Q60 64 106 82" fill="#2a2f38" />
          <rect x="22" y="48" width="76" height="22" rx="11" fill="#0c0c0e" stroke="#3a3f47" />
        </g>
      );
    case 'shark-fin':
      return (
        <g>
          <path d="M10 80 Q60 66 110 80" fill="#2a2f38" />
          <path d="M44 74 Q58 44 80 72 Z" fill={CARBON} stroke="#4b5260" />
        </g>
      );
    case 'exhaust': {
      const fill = design === 'titanium' ? 'url(#thumb-ti)' : design === 'chrome' ? '#d9dde3' : '#0e0e10';
      return (
        <g>
          <ellipse cx="42" cy="60" rx={design === 'chrome' ? 22 : 16} ry="15" fill={fill} stroke="#4b5260" />
          <ellipse cx="42" cy="60" rx={design === 'chrome' ? 16 : 11} ry="10" fill="#050505" />
          <ellipse cx="80" cy="60" rx={design === 'chrome' ? 22 : 16} ry="15" fill={fill} stroke="#4b5260" />
          <ellipse cx="80" cy="60" rx={design === 'chrome' ? 16 : 11} ry="10" fill="#050505" />
        </g>
      );
    }
    case 'carbon':
      return <rect x="22" y="30" width="76" height="60" rx="10" fill={CARBON} stroke="#4b5260" />;
    default:
      return null;
  }
}

export function ProductThumb({ product, finishColor, size = 'md' }: { product: Product; finishColor?: string; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <div className={`${styles.thumb} ${styles[size]}`}>
      <svg viewBox="0 0 120 120" role="img" aria-label={product.name}>
        <defs>
          <pattern id="thumb-carbon" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="6" height="6" fill="#141518" />
            <rect width="3" height="3" fill="#2c2f35" />
            <rect x="3" y="3" width="3" height="3" fill="#2c2f35" />
          </pattern>
          <linearGradient id="thumb-ti" x1="0" x2="1">
            <stop offset="0" stopColor="#c7a35a" />
            <stop offset="0.5" stopColor="#7d6ab3" />
            <stop offset="1" stopColor="#3b82f6" />
          </linearGradient>
        </defs>
        <Art product={product} finishColor={finishColor} />
      </svg>
    </div>
  );
}
