import type { CSSProperties } from 'react';

/**
 * Splits a headline into words, each inside its own clipping mask, for the `words` reveal
 * (globals.css). Line breaks in the text ("\n") become <br />. Server-safe: no client JS.
 */
export function SplitWords({ text, offset = 0 }: { text: string; offset?: number }) {
  let i = offset;
  return (
    <>
      {text.split('\n').map((line, l) => (
        <span key={l}>
          {l > 0 && <br />}
          {line.split(' ').filter(Boolean).map((word, w) => (
            <span key={w}>
              {w > 0 && ' '}
              <span className="w">
                <span style={{ '--i': i++ } as CSSProperties}>{word}</span>
              </span>
            </span>
          ))}
        </span>
      ))}
    </>
  );
}

/** Words for a scroll-scrubbed paragraph: each word lights up as the section scrolls past. */
export function ScrubWords({ text }: { text: string }) {
  const words = text.split(' ').filter(Boolean);
  return (
    <>
      {words.map((word, i) => (
        <span key={i} data-word style={{ '--i': i, '--n': words.length } as CSSProperties}>
          {word}{i < words.length - 1 ? ' ' : ''}
        </span>
      ))}
    </>
  );
}
