/**
 * Scene 1 — the hook.
 *
 * Three seconds, three beats, one idea: you have looked at your profile
 * hundreds of times, and every stranger who judged it looked once. The gap
 * between those two facts is the whole product, so the hook states it and
 * stops. It makes a claim about the viewer rather than about the app, which is
 * the difference between a reason to keep watching and an advertisement.
 *
 * Lines come from the active hook in `copy.ts`, so a different opening is a
 * different entry there rather than a different component — and it exists in
 * both languages, cut to the same frames.
 *
 * The punctuation is a blink. Brand marks in ads are usually the last frame;
 * here the gesture the product is named after does narrative work — the eye
 * opens a sliver on "once" and shuts, which is exactly as long as a stranger
 * looks.
 */

import { lids } from "@/components/blink/eye-geometry";
import { interpolate, outExpo, spring, window_ } from "@/video/frame";
import { ink, Layer } from "@/video/Stage";
import { ACTIVE_HOOK_ID } from "@/video/copy";
import { useFilmCopy } from "@/video/copy-context";

export function Hook({ frame }: { frame: number }) {
  const hook = useFilmCopy().hooks[ACTIVE_HOOK_ID];

  /*
    The line is already drawing on frame zero.

    The first cut opened on an empty field for four frames while the first
    spring wound up. Four frames is an eighth of a second of nothing, and in a
    feed that is the eighth of a second in which the viewer decides. Something
    has to be moving before the first word arrives.

    Starting at 0.2 rather than 0 for the same reason one step further in:
    interpolating from zero means frame zero itself is still an empty frame,
    which is exactly the frame a thumbnail is taken from.
  */
  const draw = interpolate(frame, [0, 7], [0.2, 1], { easing: outExpo });

  /* The blink: open a sliver, hold two frames, shut. Fast, because the point
     is how little time a stranger gives you. */
  const b = frame - hook.blink;
  const openness =
    b < 0 ? 0 : b < 5 ? interpolate(b, [0, 5], [0, 0.34], { easing: outExpo }) : b < 9 ? 0.34 : interpolate(b, [9, 15], [0.34, 0], { easing: outExpo });

  return (
    <Layer style={{ background: ink.bg }}>
      {/* The eye, shut, sitting under the words like a rule. */}
      {/* Anchors the lower third, and heavy enough to read on a phone held at
          arm's length — the first pass drew it at 7px on a 1080 frame, which
          is a hairline nobody sees. */}
      <svg
        viewBox="0 0 1400 1200"
        style={{
          position: "absolute",
          left: -240,
          top: 980,
          width: 1560,
          opacity: 0.95,
          transform: `scaleX(${draw})`,
          transformOrigin: "center",
        }}
        fill="none"
      >
        <path d={lids(openness)} fill="none" stroke={ink.bright} strokeOpacity={0.26} strokeWidth={44} strokeLinecap="round" />
        <path d={lids(openness)} fill="none" stroke={ink.sky} strokeOpacity={0.5} strokeWidth={22} strokeLinecap="round" />
        <path d={lids(openness)} fill="none" stroke={ink.white} strokeWidth={13} strokeLinecap="round" />
      </svg>

      <div
        style={{
          position: "absolute",
          left: 90,
          right: 90,
          top: 560,
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
      >
        {hook.lines.map((line, i) => {
          const beat = hook.beats[i];
          const enter = spring({
            frame: frame - beat,
            config: { stiffness: 190, damping: 15 },
          });
          /* Earlier lines recede as the next lands: the eye is told where to
             look rather than left to choose between three equal shouts. */
          const next = hook.beats[i + 1];
          const recede = next === undefined ? 0 : interpolate(frame, [next, next + 10], [0, 1]);
          const last = i === hook.lines.length - 1;

          return (
            <div
              key={i}
              style={{
                opacity: enter * (1 - recede * 0.62),
                transform: `translateY(${(1 - enter) * 46}px) scale(${0.94 + enter * 0.06 - recede * 0.05})`,
                transformOrigin: "left center",
                fontSize: last ? 152 : 88,
                lineHeight: 1.02,
                fontWeight: 800,
                letterSpacing: "-0.04em",
                color: last ? ink.white : ink.dim,
                marginTop: last ? 26 : 0,
              }}
            >
              {line}
            </div>
          );
        })}
      </div>

      {/* Leaves on a whip, so the cut into the profile is a move rather than
          a dissolve. */}
      <Layer
        style={{
          background: ink.bg,
          opacity: window_(frame, 84, 90, 4, 0),
        }}
      />
    </Layer>
  );
}
