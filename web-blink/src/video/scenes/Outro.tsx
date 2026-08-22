/**
 * Scene 7 — the line, and the way in.
 *
 * The eye opens for the last time and stays open. It has been shut, blinked,
 * and used as an instrument; here it finally does the thing the product
 * promises, and the tagline arrives inside it rather than beside it.
 *
 * Both strings are the brand's own — `BRAND.tagline` and `BRAND.cta` — so the
 * ad cannot drift from the button it is pointing at.
 */

import { CX, irisCentre, irisRadius, lids, PUPIL_RATIO } from "@/components/blink/eye-geometry";
import { BRAND } from "@/lib/brand";
import { useFilmCopy } from "@/video/copy-context";
import { interpolate, outExpo, spring } from "@/video/frame";
import { ink, Layer } from "@/video/Stage";

export function Outro({ frame }: { frame: number }) {
  const { tagline, cta: ctaLabel } = useFilmCopy();
  const open = interpolate(frame, [2, 30], [0, 1], { easing: outExpo });
  const line = spring({ frame: frame - 28, config: { stiffness: 180, damping: 16 } });
  const cta = spring({ frame: frame - 56, config: { stiffness: 240, damping: 15 } });

  return (
    <Layer style={{ background: ink.bg }}>
      {/* Light gathering behind the eye as it opens — the same restrained
          diffusion the landing's eye uses, not a new effect. */}
      <div
        style={{
          position: "absolute",
          left: -160,
          right: -160,
          top: 420,
          height: 700,
          background: `radial-gradient(60% 52% at 50% 50%, hsl(var(--blink-sky-bright) / ${0.3 * open}), transparent 70%)`,
        }}
      />

      <svg
        viewBox="0 0 1400 1200"
        style={{ position: "absolute", left: -520, top: 60, width: 2120 }}
        fill="none"
      >
        <path d={lids(open)} fill="hsl(var(--blink-sky) / 0.06)" />
        <path d={lids(open)} fill="none" stroke={ink.bright} strokeOpacity={0.2} strokeWidth={34} strokeLinecap="round" />
        <path d={lids(open)} fill="none" stroke={ink.white} strokeWidth={7} strokeLinecap="round" />
        {/* The iris comes from the same geometry the landing's eye uses, which
            is what guarantees the lids can never be smaller than it. Hand
            numbers here had it bulging through both lids at full open. */}
        <circle cx={CX} cy={irisCentre(open)} r={irisRadius(open)} fill="hsl(var(--blink-sky) / 0.2)" />
        <circle
          cx={CX}
          cy={irisCentre(open)}
          r={irisRadius(open)}
          fill="none"
          stroke={ink.sky}
          strokeWidth={7 * open}
        />
        <circle cx={CX} cy={irisCentre(open)} r={irisRadius(open) * PUPIL_RATIO} fill={ink.bg} />
      </svg>

      <div
        style={{
          position: "absolute",
          left: 84,
          right: 84,
          top: 1120,
          textAlign: "center",
          fontSize: 84,
          lineHeight: 1.06,
          fontWeight: 800,
          letterSpacing: "-0.04em",
          color: ink.white,
          opacity: Math.min(line * 1.5, 1),
          transform: `translateY(${(1 - line) * 34}px)`,
        }}
      >
        {tagline}
      </div>

      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 1470,
          display: "flex",
          justifyContent: "center",
          opacity: Math.min(cta * 1.6, 1),
          transform: `scale(${0.88 + cta * 0.12})`,
        }}
      >
        <div
          style={{
            background: `linear-gradient(100deg, ${ink.sky}, ${ink.white})`,
            color: "hsl(220 84% 10%)",
            fontSize: 46,
            fontWeight: 800,
            letterSpacing: "-0.01em",
            padding: "34px 62px",
            borderRadius: 999,
          }}
        >
          {ctaLabel}
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 1650,
          textAlign: "center",
          fontSize: 52,
          fontWeight: 800,
          letterSpacing: "-0.02em",
          color: ink.white,
          opacity: interpolate(frame, [70, 84], [0, 0.85], { easing: outExpo }),
        }}
      >
        {BRAND.name}
      </div>
    </Layer>
  );
}
