/**
 * Kinetic typography.
 *
 * ## The rule this enforces
 *
 * A word never fades in. It arrives — from a direction, past its mark, and
 * back — or it is revealed by something moving across it. Opacity is used only
 * to take the edge off the first two frames of an arrival, never as the
 * arrival itself. The previous cut was built almost entirely on opacity, which
 * is why it read as a slideshow.
 *
 * ## Sized to fit, not to a number
 *
 * `Word` derives its face size from its own length against the width it has.
 * A fixed size means either the long words clip or the short ones waste half
 * the frame — and in a bilingual film the same slot holds "SOIGNÉ" and
 * "MYSTÉRIEUX". The constant is measured: Inter at 800 weight with tight
 * tracking averages ~0.58em per character.
 */

import type { CSSProperties, ReactNode } from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";

import { FONT, TRACK, WIDTH } from "../theme";
import { springAt, type SpringName } from "./springs";

export type Dir = "up" | "down" | "left" | "right" | "in" | "out";

const OFFSET: Record<Dir, { x: number; y: number; scale: number }> = {
  up: { x: 0, y: 120, scale: 1 },
  down: { x: 0, y: -120, scale: 1 },
  left: { x: 220, y: 0, scale: 1 },
  right: { x: -220, y: 0, scale: 1 },
  /** Thrown at the camera: starts small and rushes forward. */
  in: { x: 0, y: 0, scale: 0.42 },
  /** Starts oversized and settles back, as if the camera pulled away. */
  out: { x: 0, y: 0, scale: 1.75 },
};

/**
 * Width-aware type size.
 *
 * ## Why this is a table and not a constant
 *
 * The first cut estimated 0.58em per character, measured on mixed-case text.
 * Almost every word in this film is set in caps, where Inter averages nearer
 * 0.70em and "W" is a full em — so "LES AUTRES", "RED FLAG" and "MYSTÉRIEUX"
 * all ran off the frame at a size the estimate said would fit. Caps are wider
 * than lowercase by about a fifth, and a single constant cannot be right for
 * both.
 *
 * The widths below are Inter's advance widths at 800 weight, in em. They do
 * not have to be exact — they have to be *not systematically low*, because
 * every error in this function shows up as type touching the edge of frame.
 */
const W_CAP: Record<string, number> = {
  A: 0.7, B: 0.69, C: 0.71, D: 0.73, E: 0.63, F: 0.61, G: 0.75, H: 0.75,
  I: 0.32, J: 0.57, K: 0.69, L: 0.59, M: 0.91, N: 0.77, O: 0.79, P: 0.67,
  Q: 0.79, R: 0.69, S: 0.66, T: 0.63, U: 0.75, V: 0.69, W: 1.01, X: 0.67,
  Y: 0.65, Z: 0.63,
};

/** Advance width of one character, in em. */
function charWidth(ch: string): number {
  if (ch === " ") return 0.27;
  if (ch === "." || ch === "," || ch === "’" || ch === "'") return 0.3;
  if (ch === ":" || ch === "!") return 0.34;
  if (ch === "-" || ch === "–") return 0.4;
  if (ch === "/") return 0.45;
  if (ch === "@") return 0.9;
  if (ch >= "0" && ch <= "9") return 0.62;

  // Accented capitals carry the width of their base letter.
  const base = ch
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
  if (W_CAP[base] !== undefined) {
    // Lowercase is narrower than the capital it folds to.
    return ch === ch.toLowerCase() && ch !== ch.toUpperCase()
      ? W_CAP[base] * 0.82
      : W_CAP[base];
  }
  return 0.62;
}

/**
 * The largest size at which `text` fits `column`.
 *
 * `track` is the letter-spacing in em, which is negative for the display
 * sizes and is worth roughly a whole character across a long word.
 */
export function fitSize(
  text: string,
  max: number,
  column = WIDTH - 160,
  track = -0.05,
): number {
  if (!text.length) return max;
  let ems = 0;
  for (const ch of text) ems += charWidth(ch) + track;
  /*
    The safety factor is not decoration.

    Measured against renders, the table above comes out about fourteen per
    cent narrow — advance widths are not the same as the inked outline, and
    the browser's own hinting adds more. 1.16 was arrived at by rendering the
    widest strings in both languages ("LES AUTRES", "RED FLAG", "MYSTÉRIEUX",
    "COMME LES AUTRES") and checking they clear both edges. Erring wide costs
    a few points of size; erring narrow puts type off the frame, which is what
    the first three cuts did.
  */
  return Math.max(24, Math.min(max, Math.floor(column / (ems * 1.16))));
}

export function Word({
  children,
  start = 0,
  from = "in",
  preset = "punch",
  size,
  column,
  color,
  weight = 800,
  track = TRACK.huge,
  /** Degrees of tilt at rest. Small numbers only — this is not a sticker. */
  tilt = 0,
  exit,
  overshoot = 1.16,
  style,
}: {
  children: string;
  start?: number;
  from?: Dir;
  preset?: SpringName;
  size: number;
  column?: number;
  color: string;
  weight?: number;
  track?: string;
  tilt?: number;
  /** `{ at, to }` — frame the word leaves on, and which way. */
  exit?: { at: number; to?: Dir };
  /**
   * How far past its resting size the spring throws the word.
   *
   * The whole point of a punch is that it overshoots, which means the widest
   * the word ever gets is *not* its resting width — and the frame does not
   * care that the extra 14% only lasts three frames. Type sized to fit at
   * rest is type that clips at the peak, which is what "RED FLAG" did.
   */
  overshoot?: number;
  style?: CSSProperties;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = springAt({ frame, fps, start, preset });
  const o = OFFSET[from];

  /* Leaving is motion too: a whip out, not a dissolve. */
  const leaving = exit
    ? interpolate(frame, [exit.at, exit.at + 8], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 0;
  const away = OFFSET[exit?.to ?? "left"];

  const x = (1 - enter) * o.x - leaving * away.x * 1.6;
  const y = (1 - enter) * o.y - leaving * away.y * 1.6;
  const scale = (o.scale + (1 - o.scale) * enter) * (1 - leaving * 0.18);
  const rot = tilt * enter - leaving * 4;

  return (
    <div
      style={{
        fontFamily: FONT,
        fontSize: fitSize(
          children,
          size,
          (column ?? WIDTH - 160) / overshoot,
          parseFloat(track),
        ),
        fontWeight: weight,
        letterSpacing: track,
        // 1.06 rather than 0.94: at a tighter leading the box crops the
        // accents off É and È, and this film is half French.
        lineHeight: 1.06,
        color,
        whiteSpace: "nowrap",
        // Only the very start of the arrival is softened, so a word is never
        // *only* fading — by frame three it is fully opaque and still moving.
        opacity: Math.min(1, enter * 4) * (1 - leaving),
        transform: `translate3d(${x}px, ${y}px, 0) scale(${scale}) rotate(${rot}deg)`,
        transformOrigin: "center",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/**
 * Several words, landing one after another.
 *
 * The stagger is in frames rather than a fraction of the moment, because what
 * matters is the gap the ear hears between two impacts — and the sound cues
 * are written in frames too.
 */
export function Stack({
  words,
  start = 0,
  stagger = 6,
  size,
  color,
  align = "left",
  from = "in",
  preset = "punch",
  tilt = 0,
  exit,
  gap = 8,
  highlight,
  highlightColor,
  overshoot,
}: {
  words: string[];
  start?: number;
  stagger?: number;
  size: number;
  color: string;
  align?: "left" | "center";
  from?: Dir | Dir[];
  preset?: SpringName;
  tilt?: number;
  exit?: { at: number; to?: Dir };
  gap?: number;
  /** Index of the word that carries the emphasis colour. */
  highlight?: number;
  highlightColor?: string;
  overshoot?: number;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap,
        alignItems: align === "center" ? "center" : "flex-start",
      }}
    >
      {words.map((w, i) => (
        <Word
          key={`${w}-${i}`}
          start={start + i * stagger}
          from={Array.isArray(from) ? (from[i] ?? from[0]) : from}
          preset={preset}
          size={size}
          overshoot={overshoot}
          color={i === highlight && highlightColor ? highlightColor : color}
          tilt={i % 2 === 0 ? tilt : -tilt}
          exit={exit ? { at: exit.at + i * 2, to: exit.to } : undefined}
        >
          {w}
        </Word>
      ))}
    </div>
  );
}

/**
 * Type revealed by a bar sweeping across it.
 *
 * The mask is the animation — the text itself never moves and never changes
 * opacity, so it reads as being uncovered rather than as appearing. Used where
 * a word has to arrive without competing with something else already moving.
 */
export function Reveal({
  children,
  start = 0,
  duration = 12,
  direction = "left",
  style,
}: {
  children: ReactNode;
  start?: number;
  duration?: number;
  direction?: "left" | "right" | "up";
  style?: CSSProperties;
}) {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [start, start + duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: (t) => 1 - Math.pow(1 - t, 3),
  });

  const inset =
    direction === "left"
      ? `0 ${(1 - p) * 100}% 0 0`
      : direction === "right"
        ? `0 0 0 ${(1 - p) * 100}%`
        : `${(1 - p) * 100}% 0 0 0`;

  return (
    <div style={{ clipPath: `inset(${inset})`, ...style }}>{children}</div>
  );
}

/** A small all-caps label. Secondary by construction — never the subject. */
export function Label({
  children,
  start = 0,
  color,
  size = 34,
  style,
}: {
  children: string;
  start?: number;
  color: string;
  size?: number;
  style?: CSSProperties;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = springAt({ frame, fps, start, preset: "crisp" });

  return (
    <div
      style={{
        fontFamily: FONT,
        fontSize: size,
        fontWeight: 700,
        letterSpacing: TRACK.label,
        textTransform: "uppercase",
        color,
        opacity: Math.min(1, s * 3),
        transform: `translateY(${(1 - s) * 18}px)`,
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
