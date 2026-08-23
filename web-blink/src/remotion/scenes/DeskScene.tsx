/**
 * 18–22s — everything at once.
 *
 * The scene that makes the film explain rather than merely impress. Up to
 * here the audience has seen six objects one at a time; the camera now pulls
 * all the way back and they are all on one desk, in the order they were used.
 * The process becomes legible in retrospect, which is the only moment in
 * twenty-five seconds where somebody can actually work out what Blink does.
 *
 * Four words are set under the row as it settles — the verbs, not the nouns.
 * The objects are already saying what the things are.
 */

import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

import { Desk } from "../objects/Desk";
import { Photo } from "../objects/Photo";
import { Card, Tag } from "../objects/Card";
import { Imprint } from "../objects/Stamp";
import { Projector } from "../objects/Projector";
import { Camera } from "../motion/Camera";
import { Label } from "../motion/Kinetic";
import { springAt } from "../motion/springs";
import type { FilmCopy } from "../copy";
import { a, C, FONT, HEIGHT, WIDTH } from "../theme";
import { LABEL_BEATS, PULL_FROM, PULL_TO, at } from "../timeline";

export function DeskScene({ copy }: { copy: FilmCopy }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  /* From inside the projector's slide, all the way out to the whole desk. */
  const pull = interpolate(frame, [PULL_FROM, PULL_TO], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: (t) => 1 - Math.pow(1 - t, 3.2),
  });

  /* The lamp opens out with the camera. The whole point of the shot is that
     the desk is legible, and the pull-back was landing on objects too dark to
     recognise as the ones the film had just used. */
  return (
    <Desk light={[0.5, 0.46]} spread={0.62 + pull * 0.72}>
      <Camera zoom={[3.4, 1]} over={[PULL_FROM, PULL_TO]} origin={[820, 1020]} drift={0.03} driftOver={120}>
        {/* The whole workflow, left to right, top to bottom — the order the
            film used them in. */}
        <AbsoluteFill>
          {/* 1 · the print */}
          <div style={{ position: "absolute", left: 82, top: 400, transform: "scale(0.40) rotate(-5deg)", transformOrigin: "0 0" }}>
            <Photo handle={copy.handle} />
          </div>

          {/* 2 · the loupe, at rest beside it */}
          <div style={{ position: "absolute", left: 448, top: 742 }}>
            <div
              style={{
                position: "relative",
                width: 190,
                height: 190,
                borderRadius: "50%",
                border: `16px solid ${C.brass}`,
                background: `linear-gradient(150deg, ${a(C.glass, 0.34)}, ${a("hsl(220 60% 8%)", 0.42)})`,
                boxShadow: `0 20px 44px ${a("hsl(0 0% 0%)", 0.6)}`,
                transform: "rotate(-18deg)",
              }}
            >
              {/* The same specular streak the loupe carries, so the object at
                  rest is recognisably the one that did the looking. */}
              <div
                style={{
                  position: "absolute",
                  left: 18,
                  top: 14,
                  width: 96,
                  height: 44,
                  borderRadius: "50%",
                  background: `linear-gradient(120deg, ${a("hsl(0 0% 100%)", 0.36)}, transparent 70%)`,
                  transform: "rotate(-30deg)",
                }}
              />
            </div>
          </div>

          {/* 3 · the cards, fanned */}
          {copy.cards.slice(0, 3).map((word, i) => (
            <div
              key={word}
              style={{
                position: "absolute",
                left: 636 + i * 32,
                top: 452 + i * 60,
                transform: `scale(0.52) rotate(${-8 + i * 7}deg)`,
                transformOrigin: "0 0",
              }}
            >
              <Card width={470}>{word}</Card>
            </div>
          ))}

          {/* 4 · the stamped sheet */}
          <div style={{ position: "absolute", left: 96, top: 1046 }}>
            <div
              style={{
                width: 520,
                height: 290,
                background: `linear-gradient(166deg, ${C.paper}, ${C.paperEdge})`,
                borderRadius: 4,
                boxShadow: `0 26px 60px ${a("hsl(0 0% 0%)", 0.5)}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transform: "rotate(3deg)",
              }}
            >
              <div style={{ transform: "scale(0.52)" }}>
                <Imprint width={860}>{copy.verdict}</Imprint>
              </div>
            </div>
          </div>

          {/* 5 · the projector and its slide */}
          {/* Clear of the stamped sheet. At 640 the machine's body lay across
              the word it was supposed to be reporting on. */}
          <div style={{ position: "absolute", left: 706, top: 1010, transform: "scale(0.58)", transformOrigin: "0 0" }}>
            <Projector lamp={1} />
          </div>
          <div
            style={{
              position: "absolute",
              left: 700,
              top: 1290,
              width: 330,
              padding: 18,
              background: `linear-gradient(160deg, hsl(38 20% 88%), hsl(34 16% 76%))`,
              borderRadius: 4,
              boxShadow: `0 22px 50px ${a("hsl(0 0% 0%)", 0.5)}`,
              transform: "rotate(-2deg)",
            }}
          >
            <div
              style={{
                background: `linear-gradient(170deg, ${a(C.lamp, 0.96)}, hsl(44 84% 68%))`,
                padding: "16px 12px",
                textAlign: "center",
                fontFamily: FONT,
                fontSize: 84,
                fontWeight: 800,
                letterSpacing: "-0.04em",
                color: "hsl(220 60% 12%)",
              }}
            >
              {copy.score}
            </div>
          </div>
        </AbsoluteFill>
      </Camera>

      {/* The four verbs, as the camera settles.

          On gummed labels, not on pills. Everything else on this desk is a
          thing you could pick up; four outlined capsules in a row were the one
          piece of interface in the film, and they read as a caption bar
          bolted onto a photograph of a desk. */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-end", paddingBottom: 178 }}>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center" }}>
          {copy.steps.map((step, i) => {
            if (frame < LABEL_BEATS[i]) return null;
            const s = springAt({ frame, fps, start: LABEL_BEATS[i], preset: "crash" });
            return (
              <Tag
                key={step}
                style={{
                  padding: "13px 20px",
                  fontSize: 38,
                  transform: `translateY(${(1 - s) * 34}px) scale(${0.8 + s * 0.2}) rotate(${i % 2 ? 1.8 : -2.1}deg)`,
                  opacity: Math.min(1, (frame - LABEL_BEATS[i]) / 2),
                }}
              >
                {step}
              </Tag>
            );
          })}
        </div>
      </AbsoluteFill>
    </Desk>
  );
}
