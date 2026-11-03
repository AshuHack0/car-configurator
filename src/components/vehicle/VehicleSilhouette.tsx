import type { BodyStyle } from '@/types/vehicle';

const PATHS: Record<BodyStyle, string> = {
  sedan: 'M14 74 Q14 64 26 62 L58 58 Q78 42 104 40 L150 40 Q170 42 190 58 L222 62 Q236 64 236 74 L236 80 L14 80 Z',
  suv: 'M14 76 Q14 60 28 58 L56 54 Q70 34 96 32 L168 32 Q190 34 204 54 L224 58 Q236 62 236 74 L236 80 L14 80 Z',
  coupe: 'M14 76 Q14 66 28 64 L70 58 Q96 40 126 40 L150 42 Q178 48 204 62 L226 66 Q236 68 236 76 L236 80 L14 80 Z',
};

/** Side-profile silhouette used on vehicle cards (illustration only — the configurator is 3D). */
export function VehicleSilhouette({ body, accent }: { body: BodyStyle; accent: string }) {
  const id = `glow-${body}-${accent.replace('#', '')}`;
  return (
    <svg viewBox="0 0 250 100" aria-hidden style={{ width: '100%', height: '100%' }}>
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#e9ecf0" />
          <stop offset="1" stopColor="#b4bcc7" />
        </linearGradient>
      </defs>
      <ellipse cx="125" cy="84" rx="110" ry="5" fill="#0f172a" opacity="0.12" />
      <path d={PATHS[body]} fill={`url(#${id})`} stroke="rgba(15,23,42,0.22)" strokeWidth="0.8" />
      <path d={PATHS[body]} fill="none" stroke={accent} strokeWidth="1" opacity="0.5" strokeDasharray="0 400 120 600" />
      {[62, 188].map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy="80" r="15" fill="#0b0c0f" stroke="#2c313b" strokeWidth="2" />
          <circle cx={cx} cy="80" r="9" fill="none" stroke="#9aa1ad" strokeWidth="1.5" />
          <circle cx={cx} cy="80" r="2.5" fill={accent} />
        </g>
      ))}
    </svg>
  );
}
