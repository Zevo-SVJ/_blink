/**
 * The Blink eye, from the landing page's own geometry.
 *
 * `eye-geometry.ts` is what draws the eye on the landing: the same lid curves,
 * the same iris containment, the same proportions. Importing it rather than
 * redrawing is the difference between the film using the brand's eye and the
 * film inventing a second one — and it means the two can never drift, which is
 * exactly what "reste cohérent avec l'œil premium déjà présent" requires.
 *
 * Only the colour is restated, because the landing's eye takes its palette
 * from CSS custom properties and Remotion renders with no stylesheet.
 */

import {
  CX,
  H,
  W,
  irisCentre,
  irisRadius,
  lids,
  PUPIL_RATIO,
} from "@/components/blink/eye-geometry";
import { C } from "../theme";

export { CX, H, W };

/**
 * `open` 0 is shut, 1 is fully open.
 *
 * `glow` scales the outer bloom, so the same component is both the quiet eye
 * behind a scene and the one that fills the frame on an impact.
 */
/**
 * The lids only occupy the middle band of the geometry's 1400×1200 box, so
 * drawing the eye at a small width leaves it a sliver in a mostly empty
 * square. `crop` tightens the viewBox to the shape itself, which is what makes
 * it usable as a mark next to a line of type.
 */
const CROP = { x: 400, y: 420, w: 600, h: 300 };

export function Eye({
  open,
  glow = 1,
  stroke = C.white,
  strokeWidth = 9,
  iris = true,
  crop = false,
  fill = "rgba(120,190,240,0.07)",
  style,
}: {
  open: number;
  glow?: number;
  stroke?: string;
  strokeWidth?: number;
  iris?: boolean;
  /** Tighten the viewBox to the eye, for small marks. */
  crop?: boolean;
  fill?: string;
  style?: React.CSSProperties;
}) {
  const p = Math.max(0, Math.min(1, open));
  const d = lids(p);
  const box = crop
    ? `${CROP.x} ${CROP.y} ${CROP.w} ${CROP.h}`
    : `0 0 ${W} ${H}`;

  return (
    <svg viewBox={box} style={style} fill="none">
      {p > 0.02 && <path d={d} fill={fill} />}
      {/* Outer bloom, as a wide soft stroke rather than a blur filter: a
          Gaussian would be re-rasterised on every one of six hundred frames. */}
      {glow > 0.01 && (
        <path
          d={d}
          fill="none"
          stroke={C.bright}
          strokeOpacity={0.3 * glow}
          strokeWidth={30 * glow}
          strokeLinecap="round"
        />
      )}
      {iris && p > 0.12 && (
        <>
          <circle cx={CX} cy={irisCentre(p)} r={irisRadius(p)} fill={`${C.sky}22`} />
          <circle
            cx={CX}
            cy={irisCentre(p)}
            r={irisRadius(p)}
            fill="none"
            stroke={C.sky}
            strokeOpacity={0.8}
            strokeWidth={7}
          />
          <circle
            cx={CX}
            cy={irisCentre(p)}
            r={irisRadius(p) * PUPIL_RATIO}
            fill={C.bg}
          />
        </>
      )}
      <path d={d} fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />
    </svg>
  );
}

/** The aperture as a clip path, so a scene can be seen *through* the eye. */
export function EyeAperture({
  open,
  id,
  children,
  style,
}: {
  open: number;
  id: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  const d = lids(Math.max(0, Math.min(1, open)));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={style} fill="none">
      <defs>
        <clipPath id={id}>
          <path d={d} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id})`}>{children}</g>
      <path
        d={d}
        fill="none"
        stroke={C.bright}
        strokeOpacity={0.24}
        strokeWidth={26}
        strokeLinecap="round"
      />
      <path d={d} fill="none" stroke={C.white} strokeWidth={7} strokeLinecap="round" />
    </svg>
  );
}
