/**
 * Scene 6 — the product, and the ask. 10.0s to 12.0s.
 *
 * Somebody who has never heard of Blink has to finish this knowing what it
 * does, and claims do not achieve that — watching it be used does. So the last
 * two seconds are the actual interaction: a handle typed into a field, a
 * button pressed, and then the line.
 *
 * The typing is real frame work rather than a dissolve between empty and full:
 * a character every two frames, a caret on a two-thirds duty cycle, and a key
 * click per character in the cue sheet. The button has a genuine press state —
 * down to 0.95 and back — because a button that lights up without moving does
 * not read as having been pushed.
 */

import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

import { lids, CX, W, H, irisCentre, irisRadius, PUPIL_RATIO } from "@/components/blink/eye-geometry";
import { Camera } from "../motion/Camera";
import { Crash, Label } from "../motion/Kinetic";
import { springAt } from "../motion/springs";
import type { FilmCopy } from "../copy";
import { a, C, FONT, T, WIDTH } from "../theme";
import { at, KEY_EVERY, PRESS, SLOGAN, TYPE_FROM } from "../timeline";

/** The eye, cropped to itself so it works as a small mark. */
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

  const cardIn = springAt({ frame, fps, start: at("cta"), preset: "crash" });
  const typed = Math.max(
    0,
    Math.min(copy.typed.length, Math.floor((frame - TYPE_FROM) / KEY_EVERY)),
  );
  const caretOn = Math.floor(frame / 7) % 3 !== 2;
  const done = typed >= copy.typed.length;

  /* Down then back: 0.95 over three frames, released over five. */
  const press = interpolate(frame, [PRESS, PRESS + 3, PRESS + 8], [1, 0.95, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  /* The card gets out of the way for the slogan rather than cross-fading
     under it. */
  const clear = interpolate(frame, [SLOGAN - 4, SLOGAN + 6], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: (t) => 1 - Math.pow(1 - t, 3),
  });

  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(70% 46% at 50% 46%, ${a(C.bright, 0.19)}, transparent 74%)`,
        }}
      />

      <Camera drift={0.045} driftOver={60} shake={{ at: PRESS, amount: 9, decay: 3 }}>
        {/* The product. */}
        <AbsoluteFill
          style={{
            alignItems: "center",
            justifyContent: "center",
            /* All the way out of frame. At 420px it was still on screen and
               the opacity was doing the work, which is the one thing this
               film is not allowed to do. */
            transform: `translateY(${-clear * 1500}px) scale(${1 - clear * 0.2})`,
          }}
        >
          <div
            style={{
              width: 900,
              borderRadius: 52,
              background: `linear-gradient(170deg, ${C.bgLift}, ${C.navy})`,
              border: "2px solid rgba(255,255,255,0.11)",
              padding: 52,
              boxShadow: "0 60px 150px rgba(0,0,0,0.6)",
              transform: `scale(${0.86 + cardIn * 0.14})`,
              opacity: Math.min(1, cardIn * 4),
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 32 }}>
              <Mark width={108} />
              <div
                style={{
                  fontFamily: FONT,
                  fontSize: 42,
                  fontWeight: 800,
                  letterSpacing: "-0.02em",
                  color: C.white,
                }}
              >
                {copy.brand}
              </div>
            </div>

            <div
              style={{
                height: 126,
                borderRadius: 28,
                background: "rgba(255,255,255,0.07)",
                border: `3px solid ${typed > 0 ? `${a(C.sky, 0.67)}` : "rgba(255,255,255,0.13)"}`,
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
                marginTop: 28,
                height: 118,
                borderRadius: 28,
                background: done
                  ? `linear-gradient(100deg, ${C.sky}, ${C.white})`
                  : "rgba(255,255,255,0.07)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: FONT,
                fontSize: 46,
                fontWeight: 800,
                color: done ? C.navy : C.faint,
                transform: `scale(${press})`,
              }}
            >
              {copy.button}
            </div>
          </div>
        </AbsoluteFill>

        {/* The ask. */}
        {frame >= SLOGAN && (
          <AbsoluteFill
            style={{ alignItems: "center", justifyContent: "center", padding: "0 52px" }}
          >
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              {copy.slogan.map((line, i) => {
                const start = SLOGAN + i * 4;
                if (frame < start) return null;
                return (
                  <Crash
                    key={line}
                    start={start}
                    from={2.4}
                    size={T.big}
                    column={WIDTH - 104}
                    color={i === 2 ? C.sky : C.white}
                  >
                    {line}
                  </Crash>
                );
              })}
            </div>
          </AbsoluteFill>
        )}
      </Camera>

      {frame >= SLOGAN + 8 && (
        <AbsoluteFill
          style={{ alignItems: "center", justifyContent: "flex-end", paddingBottom: 200, gap: 18 }}
        >
          <Mark width={132} />
          <Label start={SLOGAN + 8} color={C.sky} size={38}>
            {copy.brand}
          </Label>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
}
