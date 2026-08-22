/**
 * Scene 1 — the hook. 0.0s to 2.0s.
 *
 * Four blocks of type, crashing in on frames 0, 15, 30 and 45. Nothing else is
 * on screen: no logo, no profile, no eye. The claim is about the viewer rather
 * than about the product, and it is one they cannot verify — which is the
 * whole reason they stay for the next ten seconds.
 *
 * Each block arrives from 3× scale with a sub-bass hit and a camera shake on
 * the same frame. Two seconds, four impacts: the cadence *is* the hook.
 */

import { AbsoluteFill, useCurrentFrame } from "remotion";

import { Camera } from "../motion/Camera";
import { Crash } from "../motion/Kinetic";
import type { FilmCopy } from "../copy";
import { a, C, T, WIDTH } from "../theme";
import { HOOK_BEATS } from "../timeline";

export function Hook({ copy }: { copy: FilmCopy }) {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ background: C.bg }}>
      {/* A wash that grows with the block, so the frame is not flat navy
          behind flat white. */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(70% 46% at 50% 50%, ${a(C.bright, 0.18)}, transparent 74%)`,
        }}
      />

      <Camera
        drift={0.06}
        driftOver={60}
        shake={HOOK_BEATS.map((b) => ({ at: b, amount: 20, decay: 4 }))}
      >
        <AbsoluteFill
          style={{
            alignItems: "center",
            justifyContent: "center",
            padding: "0 48px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            {copy.hook.map((line, i) => {
              if (frame < HOOK_BEATS[i]) return null;
              /* The first block is the smaller framing device; the three that
                 follow are the claim, and they take the full width. */
              const lead = i === 0;
              return (
                <Crash
                  key={line}
                  start={HOOK_BEATS[i]}
                  from={3}
                  size={lead ? T.lead : T.huge}
                  column={WIDTH - 96}
                  color={lead ? C.sky : C.white}
                  style={lead ? { marginBottom: 14 } : undefined}
                >
                  {line}
                </Crash>
              );
            })}
          </div>
        </AbsoluteFill>
      </Camera>
    </AbsoluteFill>
  );
}
