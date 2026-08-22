/**
 * Act 3 — the perceptions, and the interrupt.
 *
 * ## Accumulation, not a card deck
 *
 * Each tag lands huge at the centre, then *demotes itself*: it shrinks and
 * slides into a growing stack while the next one arrives in its place. So the
 * screen is never one card replaced by another card — it is a list being
 * built, with the newest item enormous and the rest still visible as evidence.
 * That is what makes four adjectives feel like a verdict rather than a
 * carousel.
 *
 * ## The interrupt
 *
 * Everything established over four seconds is taken away in two frames of
 * black. The word that lands is at a scale nothing else in the film uses, the
 * camera shakes once, and the colour changes for the only time in the piece.
 * Amber rather than red: this is an observation, not an alarm, and it is what
 * the viewer actually wants to know about themselves.
 */

import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

import { HardCut } from "../motion/transitions";
import { fitSize, Label } from "../motion/Kinetic";
import { Camera } from "../motion/Camera";
import { peakOf, springAt } from "../motion/springs";
import type { FilmCopy } from "../copy";
import { C, FONT, HEIGHT, T, TRACK, WIDTH } from "../theme";
import { at, end, len } from "../timeline";

/** Where a demoted tag sits in the stack, by age. */
const STACK_Y = [1180, 1320, 1460, 1600];

export function Perceptions({ copy }: { copy: FilmCopy }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const STARTS = [at("tag1"), at("tag2"), at("tag3"), at("tag4")];
  const T_STACK = at("stack");
  const T_HIT = at("redFlagHit");
  const T_WORD = at("redFlagWord");
  const FLAG_END = end("redFlagWord");

  /* Everything from act three is gone the instant the interrupt lands. */
  const wiped = frame >= T_HIT + 2;

  /* The camera eases back as the stack builds, so the composition opens up to
     make room rather than getting crowded. */
  const pull = interpolate(frame, [STARTS[1], T_STACK], [1, 0.9], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ background: C.bg, overflow: "hidden" }}>
      {!wiped && (
        <>
          <AbsoluteFill
            style={{
              background: `radial-gradient(64% 44% at 50% 42%, ${C.bright}3a, transparent 74%)`,
            }}
          />

          {/* Held at whatever `pull` currently is — the easing is in `pull`
              itself, so the camera only has to apply it. */}
          <Camera zoom={[pull, pull]} over={[0, 1]}>
            {copy.tags.map((tag, i) => {
              const start = STARTS[i];
              if (frame < start - 4) return null;

              const s = springAt({ frame, fps, start, preset: "punch" });
              // Age in "how many tags have landed since this one".
              const next = STARTS[i + 1] ?? T_STACK + 6;
              const demote = interpolate(frame, [next - 2, next + 9], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: (t) => 1 - Math.pow(1 - t, 3),
              });

              // Hero position, then the seat it retires to.
              const heroY = 760;
              const seat = STACK_Y[i];
              const y = heroY + (seat - heroY) * demote;
              const scale = (0.5 + s * 0.5) * (1 - demote * 0.63);
              const x = (1 - s) * (i % 2 === 0 ? -300 : 300);

              const size = fitSize(tag, T.mega, (WIDTH - 130) / 1.16);

              return (
                <div
                  key={tag}
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    top: y,
                    display: "flex",
                    justifyContent: "center",
                    transform: `translate3d(${x}px,0,0) scale(${scale}) rotate(${(1 - s) * (i % 2 === 0 ? -5 : 5)}deg)`,
                    opacity: Math.min(1, s * 4) * (1 - demote * 0.45),
                  }}
                >
                  <div
                    style={{
                      fontFamily: FONT,
                      fontSize: size,
                      fontWeight: 800,
                      letterSpacing: TRACK.mega,
                      lineHeight: 0.9,
                      color: demote > 0.5 ? C.sky : C.white,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {tag}
                  </div>
                </div>
              );
            })}
          </Camera>

          {/* A quiet count, so four words read as a list rather than a loop. */}
          <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-start", paddingTop: 240 }}>
            <div style={{ display: "flex", gap: 14 }}>
              {copy.tags.map((tag, i) => {
                const on = frame >= STARTS[i];
                return (
                  <span
                    key={tag}
                    style={{
                      width: on ? 56 : 24,
                      height: 6,
                      borderRadius: 99,
                      background: on ? C.sky : C.hair,
                    }}
                  />
                );
              })}
            </div>
          </AbsoluteFill>
        </>
      )}

      {/* ── the interrupt ──────────────────────────────────────────── */}
      <HardCut at={T_HIT} frames={2} />

      {wiped && <FlagHit copy={copy} hit={T_HIT} word={T_WORD} until={FLAG_END} />}
    </AbsoluteFill>
  );
}

function FlagHit({
  copy,
  hit,
  word,
  until,
}: {
  copy: FilmCopy;
  hit: number;
  word: number;
  until: number;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  /* The label arrives at a scale nothing else uses, from a long way in front
     of the camera. */
  const slam = springAt({ frame, fps, start: hit + 2, preset: "slam" });
  const labelGone = interpolate(frame, [word - 4, word + 4], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const reveal = springAt({ frame, fps, start: word + 2, preset: "punch" });

  /* Warm, and only here. The film is cool blue for its whole length, so a
     single warm frame carries more than any amount of red would. */
  const warmth = interpolate(frame, [hit + 2, hit + 10], [0.95, 0.4], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <Camera shake={{ at: hit + 2, amount: 26, decay: 5 }}>
      <AbsoluteFill style={{ background: C.bg }} />
      <AbsoluteFill
        style={{
          background: `radial-gradient(66% 44% at 50% 46%, ${C.flagDeep}, transparent 72%)`,
          opacity: warmth,
        }}
      />

      {/* Two rules that snap out from the centre line — the composition
          changing, not just the word. */}
      {[0, 1].map((i) => {
        const w = interpolate(frame, [hit + 2, hit + 12], [0, WIDTH * 1.1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: (t) => 1 - Math.pow(1 - t, 4),
        });
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: "50%",
              top: i === 0 ? 700 : 1200,
              width: w,
              height: 5,
              marginLeft: -w / 2,
              background: C.flag,
              opacity: 0.9 - labelGone * 0.5,
            }}
          />
        );
      })}

      {labelGone < 1 && (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
          <div
            style={{
              fontFamily: FONT,
              /* Divided by the slam's actual peak, computed from its damping
                 rather than estimated. `slam` overshoots by 47%, so the widest
                 this word ever gets is 1.36× its resting width — a guess of
                 "about 20%" left it running off both edges for six frames. */
              fontSize: fitSize(
                copy.flagLabel,
                264,
                (WIDTH - 80) / (0.25 + peakOf("slam") * 0.75),
              ),
              fontWeight: 800,
              letterSpacing: TRACK.mega,
              color: C.flag,
              whiteSpace: "nowrap",
              transform: `scale(${0.25 + slam * 0.75}) rotate(${(1 - slam) * -7}deg)`,
              opacity: Math.min(1, slam * 6) * (1 - labelGone),
              textShadow: `0 0 90px ${C.flagDeep}aa`,
            }}
          >
            {copy.flagLabel}
          </div>
        </AbsoluteFill>
      )}

      {/* Then the read itself — the thing a viewer actually wants to know. */}
      {frame >= word && (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 30 }}>
          <Label start={word + 2} color={C.flag} size={T.label}>
            {copy.flagKicker}
          </Label>
          <div
            style={{
              fontFamily: FONT,
              fontSize: fitSize(copy.flagWord, T.mega, (WIDTH - 120) / 1.16),
              fontWeight: 800,
              letterSpacing: TRACK.mega,
              color: C.white,
              whiteSpace: "nowrap",
              transform: `scale(${0.62 + reveal * 0.38})`,
              opacity: Math.min(1, reveal * 5),
            }}
          >
            {copy.flagWord}
          </div>
        </AbsoluteFill>
      )}
    </Camera>
  );
}
