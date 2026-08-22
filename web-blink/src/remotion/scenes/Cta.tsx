/**
 * Act 5 — the product, then the ask.
 *
 * The most important correction in the brief: somebody who has never heard of
 * Blink has to finish knowing what it *does*. Claims do not achieve that;
 * watching it be used does. So this act is the actual interaction — an empty
 * field, a handle typed into it, a button pressed, a result — and only then
 * the line and the CTA.
 *
 * The typing is real frame work rather than a dissolve between empty and full:
 * a character every three frames, a caret that blinks on a two-thirds duty
 * cycle, and a key click per character in the cue sheet. It is the cheapest
 * possible demo and the most legible one.
 */

import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

import { Eye } from "../elements/Eye";
import { Label, Stack, Word } from "../motion/Kinetic";
import { Camera } from "../motion/Camera";
import { springAt } from "../motion/springs";
import type { FilmCopy } from "../copy";
import { SCORE } from "../copy";
import { C, FONT, HEIGHT, T, TRACK, WIDTH } from "../theme";
import { at, end } from "../timeline";

/** Frames per typed character. */
const KEY = 3;

export function Cta({ copy }: { copy: FilmCopy }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const T_APP = at("appOpen");
  const T_TYPE = at("typing");
  const T_SUB = at("submit");
  const T_RES = at("resultFlash");
  const T_LINE = at("ctaLine");
  const T_LOGO = at("logo");
  const FILM_END = end("logo");

  const typed = Math.max(
    0,
    Math.min(copy.appHandle.length, Math.floor((frame - T_TYPE - 2) / KEY)),
  );
  const caretOn = Math.floor(frame / 8) % 3 !== 2;

  const appIn = springAt({ frame, fps, start: T_APP, preset: "crisp" });
  const press = springAt({ frame, fps, start: T_SUB, preset: "crisp" });
  const showApp = frame >= T_APP && frame < T_LINE;
  const showResult = frame >= T_RES && frame < T_LINE;

  return (
    <AbsoluteFill style={{ background: C.bg }}>
      {/* ── the product ─────────────────────────────────────────────── */}
      {showApp && (
        <Camera
          zoom={[1, 1.06]}
          over={[T_RES, T_LINE]}
          origin={[WIDTH / 2, 900]}
          shake={{ at: T_SUB + 1, amount: 7, decay: 3 }}
        >
          <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: 76 }}>
            <div
              style={{
                width: 940,
                borderRadius: 56,
                background: `linear-gradient(170deg, ${C.bgLift}, ${C.navy})`,
                border: "2px solid rgba(255,255,255,0.1)",
                padding: 56,
                boxShadow: "0 70px 150px rgba(0,0,0,0.6)",
                transform: `translateY(${(1 - appIn) * 90}px) scale(${0.92 + appIn * 0.08})`,
                opacity: Math.min(1, appIn * 4),
              }}
            >
              {/* App chrome: the eye as the mark, and a title. */}
              <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                <Eye open={1} glow={0} strokeWidth={22} iris crop style={{ width: 116 }} />
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

              {/* The field. */}
              <div
                style={{
                  marginTop: 38,
                  height: 128,
                  borderRadius: 30,
                  background: "rgba(255,255,255,0.06)",
                  border: `3px solid ${frame >= T_TYPE ? `${C.sky}99` : "rgba(255,255,255,0.12)"}`,
                  display: "flex",
                  alignItems: "center",
                  padding: "0 34px",
                  gap: 4,
                }}
              >
                <span
                  style={{
                    fontFamily: FONT,
                    fontSize: 50,
                    fontWeight: 700,
                    color: typed > 0 ? C.white : C.faint,
                    whiteSpace: "pre",
                  }}
                >
                  {typed > 0 ? copy.appHandle.slice(0, typed) : copy.appPlaceholder}
                </span>
                {frame >= T_TYPE && frame < T_SUB + 4 && caretOn && (
                  <span style={{ width: 4, height: 56, background: C.sky, borderRadius: 2 }} />
                )}
              </div>

              {/* The button. */}
              <div
                style={{
                  marginTop: 30,
                  height: 116,
                  borderRadius: 30,
                  background:
                    frame >= T_SUB
                      ? `linear-gradient(100deg, ${C.sky}, ${C.white})`
                      : `${C.sky}2e`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: FONT,
                  fontSize: 44,
                  fontWeight: 800,
                  color: frame >= T_SUB ? C.navy : C.soft,
                  transform: `scale(${frame >= T_SUB ? 1 - press * 0.04 + 0.04 : 1})`,
                }}
              >
                {copy.appButton}
              </div>

              {/* The result, assembling in four quick beats. */}
              {showResult && (
                <div style={{ marginTop: 36 }}>
                  <ResultStrip copy={copy} start={T_RES} />
                </div>
              )}
            </div>
          </AbsoluteFill>
        </Camera>
      )}

      {/* ── the ask ─────────────────────────────────────────────────── */}
      {frame >= T_LINE && (
        <AbsoluteFill style={{ background: C.bg }}>
          <AbsoluteFill
            style={{
              background: `radial-gradient(64% 42% at 50% 44%, ${C.bright}26, transparent 74%)`,
            }}
          />

          {/* The eye opens behind the line, at the size it has on the landing
              page — the film ends on the brand's own gesture. */}
          <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
            {/* High in the frame, above the line rather than behind it. The
                first cut put both in the same band and the words sat on the
                lids — the eye is the brand's gesture, not a texture to set
                type over. */}
            <Eye
              open={springAt({ frame, fps, start: T_LINE, preset: "settle" })}
              glow={1.1}
              strokeWidth={8}
              style={{ position: "absolute", width: 1720, top: -190 }}
            />
          </AbsoluteFill>

          <AbsoluteFill style={{ padding: "0 56px", justifyContent: "center", paddingTop: 210 }}>
            <Stack
              words={copy.ctaWords}
              start={T_LINE}
              stagger={8}
              size={T.lead}
              color={C.white}
              from={["left", "right", "in"]}
              highlight={2}
              highlightColor={C.sky}
              align="center"
              gap={4}
            />
          </AbsoluteFill>

          {/* The CTA pill and the wordmark. */}
          {frame >= T_LOGO && (
            <AbsoluteFill
              style={{
                alignItems: "center",
                justifyContent: "flex-end",
                paddingBottom: 210,
                gap: 44,
              }}
            >
              <div
                style={{
                  transform: `scale(${0.84 + springAt({ frame, fps, start: T_LOGO, preset: "punch" }) * 0.16})`,
                  background: `linear-gradient(100deg, ${C.sky}, ${C.white})`,
                  color: C.navy,
                  fontFamily: FONT,
                  fontSize: 46,
                  fontWeight: 800,
                  letterSpacing: "-0.01em",
                  padding: "36px 66px",
                  borderRadius: 999,
                  boxShadow: `0 30px 90px ${C.bright}44`,
                  whiteSpace: "nowrap",
                }}
              >
                {copy.cta}
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 18,
                  opacity: interpolate(frame, [T_LOGO + 18, T_LOGO + 30], [0, 1], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  }),
                }}
              >
                <Eye open={1} glow={0} strokeWidth={26} iris={false} crop style={{ width: 96 }} />
                <div
                  style={{
                    fontFamily: FONT,
                    fontSize: 62,
                    fontWeight: 800,
                    letterSpacing: "-0.03em",
                    color: C.white,
                  }}
                >
                  {copy.brand}
                </div>
              </div>
            </AbsoluteFill>
          )}
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
}

/** The result: a score and two reads, landing one piece at a time. */
function ResultStrip({ copy, start }: { copy: FilmCopy; start: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const items = [
    { text: SCORE.toFixed(1) + copy.scoreOutOf, tone: "score" as const },
    { text: copy.tags[0], tone: "good" as const },
    { text: copy.tags[1], tone: "good" as const },
    { text: copy.flagWord, tone: "flag" as const },
  ];

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
      {items.map((item, i) => {
        const s = springAt({ frame, fps, start: start + 2 + i * 5, preset: "punch" });
        if (s <= 0) return null;
        return (
          <div
            key={item.text}
            style={{
              padding: item.tone === "score" ? "18px 34px" : "16px 30px",
              borderRadius: 22,
              background:
                item.tone === "score"
                  ? `${C.sky}1f`
                  : item.tone === "flag"
                    ? "rgba(60,32,8,0.7)"
                    : "rgba(255,255,255,0.06)",
              border: `2px solid ${item.tone === "flag" ? `${C.flag}66` : `${C.sky}3a`}`,
              fontFamily: FONT,
              fontSize: item.tone === "score" ? 46 : 34,
              fontWeight: 800,
              letterSpacing: item.tone === "score" ? "-0.02em" : "0.06em",
              color: item.tone === "flag" ? C.flag : item.tone === "score" ? C.white : C.sky,
              transform: `scale(${0.6 + s * 0.4}) translateY(${(1 - s) * 22}px)`,
              opacity: Math.min(1, s * 4),
              whiteSpace: "nowrap",
            }}
          >
            {item.text}
          </div>
        );
      })}
    </div>
  );
}
