/**
 * Blink — the surface the film is composed on.
 *
 * Everything inside is authored at 1080×1920 and scaled as one block. That is
 * the only way type, spacing and motion stay in the proportions they were
 * designed in: a headline tuned at 96px on a phone-sized preview would be a
 * different design at 300px on a desktop, and "responsive" for a film means
 * the same picture at a different size, not a different picture.
 *
 * It also means the composition is already the shape it ships in. 9:16 is not
 * a crop applied afterwards — it is what was framed.
 */

import { useEffect, useRef, useState, type ReactNode } from "react";

export const FILM_W = 1080;
export const FILM_H = 1920;

/** The film's own palette, in the brand's tokens. */
export const ink = {
  bg: "hsl(220 84% 7%)",
  sky: "hsl(var(--blink-sky))",
  sky2: "hsl(var(--blink-sky-2))",
  bright: "hsl(var(--blink-sky-bright))",
  white: "hsl(var(--blink-white))",
  navy: "hsl(var(--blink-navy))",
  /* Readable secondary. 0.42 tested as decoration rather than copy: a line
     that has one second to be read cannot be a whisper. */
  soft: "hsl(210 40% 96% / 0.66)",
  dim: "hsl(210 40% 96% / 0.42)",
} as const;

export function Stage({ children }: { children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  /*
    Measured rather than derived from the viewport: the film sits inside a
    section whose width is decided by the page's own layout, and guessing at
    that with viewport units is how a preview ends up a few pixels wider than
    its frame.
  */
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const fit = () => setScale(el.clientWidth / FILM_W);
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={box}
      className="relative w-full overflow-hidden rounded-[1.75rem]"
      /* The frame reserves its shape before anything is measured, so the page
         never reflows when the film mounts. */
      style={{ aspectRatio: `${FILM_W} / ${FILM_H}`, background: ink.bg }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: FILM_W,
          height: FILM_H,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          // Hidden until measured, so the first paint is never a giant
          // unscaled frame flashing at 1080px wide.
          visibility: scale ? "visible" : "hidden",
        }}
      >
        {children}
      </div>
    </div>
  );
}

/** Absolute placement in film pixels. Every scene lays out this way. */
export function Layer({
  children,
  style,
}: {
  children?: ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div style={{ position: "absolute", inset: 0, ...style }}>{children}</div>
  );
}
