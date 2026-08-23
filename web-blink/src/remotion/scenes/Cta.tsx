/**
 * 22–25s — the app, and the ask.
 *
 * Everything before this has been metaphor. The last three seconds are the
 * literal thing: a field, a handle typed into it, a button pressed. Somebody
 * who has followed the objects still needs to be told what to *do*, and the
 * only honest way to show that is to show the product.
 *
 * The typing is nervous on purpose — a character every two frames with the
 * caret blinking on its own cycle, not a dissolve between empty and full.
 */

import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

import { lids, CX, irisCentre, irisRadius, PUPIL_RATIO } from "@/components/blink/eye-geometry";
import { Camera } from "../motion/Camera";
import { Crash, fitBlock } from "../motion/Kinetic";
import { springAt } from "../motion/springs";
import type { FilmCopy } from "../copy";
import { a, C, FONT, T, WIDTH } from "../theme";
import {
  APP_EXIT,
  APP_IN,
  CTA_BUTTON,
  KEY_EVERY,
  PRESS,
  SLOGAN,
  SLOGAN_LINES,
  TYPE_FROM,
  at,
} from "../timeline";

/** The eye, cropped to itself so it works as a mark beside a line of type. */
function Mark({ width }: { width: number }) {
  return (
    <svg viewBox="400 430 600 290" style={{ width }} fill="none">
      <path d={lids(1)} fill="none" stroke={C.sky} strokeWidth={22} strokeLinecap="round" />
      <circle cx={CX} cy={irisCentre(1)} r={irisRadius(1)} fill="none" stroke={C.sky} strokeWidth={20} />
      <circle cx={CX} cy={irisCentre(1)} r={irisRadius(1) * PUPIL_RATIO} fill={C.sky} />
    </svg>
  );
}

export function Cta({ copy }: { copy: FilmCopy }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const arrive = springAt({ frame, fps, start: APP_IN, preset: "crash" });
  const typed = Math.max(
    0,
    Math.min(copy.typed.length, Math.floor((frame - TYPE_FROM) / KEY_EVERY)),
  );
  const done = typed >= copy.typed.length;
  const caretOn = Math.floor(frame / 7) % 3 !== 2;

  /* Down and back. A button that lights up without moving has not been
     pushed. */
  const press = interpolate(frame, [PRESS, PRESS + 3, PRESS + 8], [1, 0.95, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  /* One size for the three slogan lines, and the ask arriving under them. */
  const sloganSize = fitBlock(copy.slogan, T.big, WIDTH - 104);
  const ask = springAt({ frame, fps, start: CTA_BUTTON, preset: "slam" });
  /* Never a still last frame: the button keeps breathing after it lands. */
  const breathe = Math.sin((frame - CTA_BUTTON) / 6.5) * 0.5 + 0.5;

  /* The card leaves the frame rather than dissolving under the slogan. */
  const clear = interpolate(frame, [APP_EXIT, SLOGAN + 6], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: (t) => 1 - Math.pow(1 - t, 3),
  });

  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(70% 46% at 50% 46%, ${a(C.bright, 0.2)}, transparent 74%)`,
        }}
      />

      <Camera
        drift={0.045}
        driftOver={90}
        /* Settles at 1.14, not 1. The panel is 920px in a 1920-tall frame, so
           at rest it filled less than a quarter of the height and the product
           — the one literal thing in the film — read as a small card floating
           in a lot of nothing. Not more than that: at 1.14 the 920px card
           reaches past both edges of the frame and loses its corners. The
           rest of the height comes from the card itself. */
        zoom={[1.55, 1.04]}
        over={[APP_IN, APP_IN + 14]}
        shake={{ at: PRESS, amount: 10, decay: 3 }}
      >
        <AbsoluteFill
          style={{
            alignItems: "center",
            justifyContent: "center",
            transform: `translateY(${-clear * 1500}px) scale(${1 - clear * 0.2})`,
          }}
        >
          <div
            style={{
              width: 920,
              borderRadius: 52,
              background: `linear-gradient(170deg, ${C.bgLift}, ${C.navy})`,
              border: `2px solid ${a(C.white, 0.11)}`,
              padding: 62,
              boxShadow: `0 60px 150px ${a("hsl(0 0% 0%)", 0.6)}`,
              transform: `scale(${0.88 + arrive * 0.12})`,
              opacity: Math.min(1, (frame - APP_IN) / 3),
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 38 }}>
              <Mark width={106} />
              <div
                style={{
                  fontFamily: FONT,
                  fontSize: 40,
                  fontWeight: 800,
                  letterSpacing: "-0.02em",
                  color: C.white,
                }}
              >
                {copy.appTitle}
              </div>
            </div>

            <div
              style={{
                height: 142,
                borderRadius: 30,
                background: a(C.white, 0.07),
                border: `3px solid ${typed > 0 ? a(C.sky, 0.7) : a(C.white, 0.13)}`,
                display: "flex",
                alignItems: "center",
                padding: "0 34px",
                gap: 5,
              }}
            >
              <span
                style={{
                  fontFamily: FONT,
                  fontSize: 50,
                  fontWeight: 700,
                  color: C.white,
                  whiteSpace: "pre",
                }}
              >
                {copy.typed.slice(0, typed)}
              </span>
              {!done && caretOn && (
                <span style={{ width: 5, height: 58, background: C.sky, borderRadius: 3 }} />
              )}
            </div>

            <div
              style={{
                marginTop: 32,
                height: 136,
                borderRadius: 30,
                background: done
                  ? `linear-gradient(100deg, ${C.sky}, ${C.white})`
                  : a(C.white, 0.07),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: FONT,
                fontSize: 46,
                fontWeight: 800,
                color: done ? C.navy : C.faint,
                transform: `scale(${press})`,
                boxShadow: done ? `0 24px 70px ${a(C.bright, 0.35)}` : undefined,
              }}
            >
              {copy.button}
            </div>
          </div>
        </AbsoluteFill>

        {frame >= SLOGAN && (
          <AbsoluteFill
            style={{
              alignItems: "center",
              justifyContent: "center",
              padding: "0 52px",
              gap: 8,
              /* Lifted, so the ask below it has somewhere to be. */
              transform: "translateY(-120px)",
            }}
          >
            {copy.slogan.map((line, i) => {
              const start = SLOGAN_LINES[i];
              if (frame < start) return null;
              return (
                <Crash
                  key={line}
                  start={start}
                  from={2.4}
                  size={sloganSize}
                  fit={false}
                  color={i === copy.slogan.length - 1 ? C.sky : C.white}
                >
                  {line}
                </Crash>
              );
            })}
          </AbsoluteFill>
        )}
      </Camera>

      {/* The ask.

          The film used to end on the slogan with a small mark under it and
          then hold that same frame for three quarters of a second — a logo
          placed in the middle of the screen, which is the one ending the
          brief rules out. This is the thing to *do*, on a button that arrives
          on a spring and keeps breathing, with the mark reduced to a
          signature beside it. */}
      {frame >= CTA_BUTTON && (
        <AbsoluteFill
          style={{ alignItems: "center", justifyContent: "center", transform: "translateY(200px)" }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 22,
              padding: "30px 62px",
              borderRadius: 999,
              background: `linear-gradient(100deg, ${C.sky}, ${C.white})`,
              boxShadow: `0 26px 90px ${a(C.bright, 0.42 + breathe * 0.16)}`,
              transform: `scale(${(0.72 + ask * 0.28) * (1 + breathe * 0.022)})`,
              opacity: Math.min(1, (frame - CTA_BUTTON) / 3),
            }}
          >
            <Mark width={78} />
            <div
              style={{
                fontFamily: FONT,
                fontSize: 52,
                fontWeight: 800,
                letterSpacing: "-0.01em",
                color: C.navy,
                whiteSpace: "nowrap",
              }}
            >
              {copy.cta}
            </div>
          </div>
        </AbsoluteFill>
      )}

      {frame >= CTA_BUTTON + 6 && (
        <AbsoluteFill
          style={{ alignItems: "center", justifyContent: "flex-end", paddingBottom: 118 }}
        >
          <div
            style={{
              fontFamily: FONT,
              fontSize: 36,
              fontWeight: 800,
              letterSpacing: "0.34em",
              textTransform: "uppercase",
              color: a(C.sky, 0.72),
              opacity: Math.min(1, (frame - CTA_BUTTON - 6) / 4),
            }}
          >
            {copy.brand}
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
}
