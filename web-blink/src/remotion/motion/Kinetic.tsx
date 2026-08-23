/**
 * Kinetic typography.
 *
 * ## The rule
 *
 * A word never fades in. `Crash` throws it at the camera from 3× and lets the
 * spring settle it — the word overshoots *below* its resting size and comes
 * back, which is what reads as an impact. Opacity is used for two frames at
 * the very start of an arrival and nowhere else.
 *
 * ## Sized to fit
 *
 * Type size is derived from the string against the column it has, in
 * caps-aware advance widths. A film set in caps sized with a mixed-case
 * estimate is a film with words running off the frame — which is how the
 * previous cut shipped "LES AUTRES" hanging over the right edge.
 */

import type { CSSProperties } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";

import { FONT, WIDTH } from "../theme";
import { peakOf, springAt, type SpringName } from "./springs";

/** Inter's advance widths at 800 weight, in em. */
const W_CAP: Record<string, number> = {
  A: 0.7, B: 0.69, C: 0.71, D: 0.73, E: 0.63, F: 0.61, G: 0.75, H: 0.75,
  I: 0.32, J: 0.57, K: 0.69, L: 0.59, M: 0.91, N: 0.77, O: 0.79, P: 0.67,
  Q: 0.79, R: 0.69, S: 0.66, T: 0.63, U: 0.75, V: 0.69, W: 1.01, X: 0.67,
  Y: 0.65, Z: 0.63,
};

function charWidth(ch: string): number {
  if (ch === " ") return 0.27;
  if (ch === "." || ch === "," || ch === "'" || ch === "’") return 0.3;
  if (ch === ":" || ch === "!") return 0.34;
  if (ch === "-" || ch === "–") return 0.4;
  if (ch === "/") return 0.45;
  if (ch === "@") return 0.9;
  if (ch >= "0" && ch <= "9") return 0.62;
  const base = ch.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();
  if (W_CAP[base] !== undefined) {
    return ch === ch.toLowerCase() && ch !== ch.toUpperCase()
      ? W_CAP[base] * 0.82
      : W_CAP[base];
  }
  return 0.62;
}

/**
 * How wide `text` renders at `size`, in pixels.
 *
 * Exported so the tests can assert the inverse of `fitSize` — that the size it
 * hands back actually fits the column it was given — rather than restating the
 * arithmetic and agreeing with itself.
 */
export function measure(text: string, size: number, track = -0.045): number {
  let ems = 0;
  for (const ch of text) ems += charWidth(ch) + track;
  return ems * size * 1.16;
}

/**
 * The largest size at which `text` fits `column`.
 *
 * The 1.16 factor is measured, not guessed: advance widths are narrower than
 * the inked outline and the browser's hinting adds more, and every render of
 * this film that skipped it put type over the edge.
 */
export function fitSize(
  text: string,
  max: number,
  column = WIDTH - 130,
  track = -0.045,
): number {
  if (!text.length) return max;
  let ems = 0;
  for (const ch of text) ems += charWidth(ch) + track;
  return Math.max(24, Math.min(max, Math.floor(column / (ems * 1.16))));
}

/**
 * One size for a block of lines.
 *
 * Sizing each line to the column independently is what makes a two-line
 * statement look accidental: the short line comes back 30% larger than the
 * long one and the block reads as two unrelated captions. A block of type is
 * one object, so it gets one size — the largest at which every line fits.
 */
export function fitBlock(
  lines: string[],
  max: number,
  column = WIDTH - 130,
  track = -0.045,
): number {
  return Math.min(...lines.map((l) => fitSize(l, max, column, track)));
}

/**
 * A block of text that crashes onto the screen.
 *
 * `from` is where the scale starts. 3 throws it at the camera; 0.5 pops it up
 * from small. Either way the spring overshoots and settles, so it arrives
 * rather than appears.
 */
export function Crash({
  children,
  start = 0,
  from = 3,
  size,
  column,
  color,
  weight = 800,
  track = "-0.045em",
  preset = "crash" as SpringName,
  /** Degrees of tilt while it is still travelling. Settles to zero. */
  tilt = 0,
  /** Off when `size` was already solved for the block — see `fitBlock`. */
  fit = true,
  style,
}: {
  children: string;
  start?: number;
  from?: number;
  size: number;
  column?: number;
  color: string;
  weight?: number;
  track?: string;
  preset?: SpringName;
  tilt?: number;
  fit?: boolean;
  style?: CSSProperties;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = springAt({ frame, fps, start, preset });

  const scale = from + (1 - from) * s;
  /* Only divide by the overshoot when the word arrives from *below* its
     resting size — a crash from 3 overshoots downward and never gets wider
     than it ends up. */
  const head = from < 1 ? peakOf(preset) : 1;

  return (
    <div
      style={{
        fontFamily: FONT,
        fontSize: fit
          ? fitSize(children, size, (column ?? WIDTH - 130) / head, parseFloat(track))
          : size / head,
        fontWeight: weight,
        letterSpacing: track,
        // Roomy enough for É and È, which a tighter leading crops.
        lineHeight: 1.02,
        color,
        whiteSpace: "nowrap",
        /*
          A crash is visible on the frame it starts.

          Driving opacity off the spring means the impact frame itself — the
          one the sub-bass lands on — renders empty, because the spring is
          exactly zero there. A word thrown at the camera is *large* on that
          frame, not absent. Only the pop-ups, which start smaller than they
          end, get a two-frame ramp to take the hard edge off.
        */
        opacity: from > 1 ? 1 : Math.min(1, (frame - start) / 2),
        transform: `scale(${scale}) rotate(${(1 - s) * tilt}deg)`,
        transformOrigin: "center",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/**
 * Several blocks, staggered.
 *
 * The gap is in frames because that is what the ear hears between two
 * impacts — and the sound cues are written in frames too.
 */
export function Stagger({
  lines,
  starts,
  size,
  color,
  highlight,
  highlightColor,
  from = 3,
  gap = 4,
  align = "center",
}: {
  lines: string[];
  /** Absolute start frame per line. */
  starts: number[];
  size: number;
  color: string;
  highlight?: number;
  highlightColor?: string;
  from?: number;
  gap?: number;
  align?: "center" | "left";
}) {
  const frame = useCurrentFrame();

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap,
        alignItems: align === "center" ? "center" : "flex-start",
      }}
    >
      {lines.map((line, i) => {
        // Not mounted until its own frame: a line sitting at scale 3 behind
        // the others would be a wall of type nobody asked for.
        if (frame < starts[i]) return null;
        return (
          <Crash
            key={line}
            start={starts[i]}
            from={from}
            size={size}
            color={i === highlight && highlightColor ? highlightColor : color}
          >
            {line}
          </Crash>
        );
      })}
    </div>
  );
}

/** A small all-caps label. Secondary by construction. */
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
  const s = springAt({ frame, fps, start, preset: "tight" });

  return (
    <div
      style={{
        fontFamily: FONT,
        fontSize: size,
        fontWeight: 700,
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        color,
        // Ramped off the frame, not off the spring: a spring is exactly zero
        // on its own first frame, so driving opacity from it leaves the beat
        // frame blank — which is the frame the sound lands on.
        opacity: Math.min(1, (frame - start) / 2),
        transform: `translateY(${(1 - s) * 20}px)`,
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
