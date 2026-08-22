/**
 * Act 1 — the hook.
 *
 * Three seconds, four moments. The rules it is written against:
 *
 *  - **A profile is on screen at frame zero.** Not a logo, not a fade up, not
 *    an eye opening. The thing the ad is about is the first thing seen, and it
 *    is already moving.
 *  - **The claim is about the viewer, not the product.** "What other people
 *    see" is unverifiable by the person watching, which is exactly why they
 *    stay — the only way to find out is to keep watching.
 *  - **The last moment is a push, not a cut.** The camera drives into the
 *    avatar so the next act can open on an iris at the same size in the same
 *    place. The two shapes are the same object; that is the match cut.
 */

import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

import { ProfileCard } from "../elements/Profile";
import { Label, Stack } from "../motion/Kinetic";
import { Camera, easeInExpo } from "../motion/Camera";
import { springAt } from "../motion/springs";
import type { FilmCopy } from "../copy";
import { ACTIVE_HOOK } from "../copy";
import { C, T } from "../theme";
import { at, len } from "../timeline";

/**
 * Where the avatar's centre sits in film pixels — the match-cut anchor.
 *
 * Derived from the layout above rather than measured off a screenshot: the
 * card is 760 wide and centred, so its left edge is at 160; its padding is 44
 * and the avatar is 148 across, putting its centre 78 in from that edge. The
 * card's top is at 470 and the identity row starts one padding down.
 */
export const AVATAR = { x: 160 + 44 + 74, y: 470 + 44 + 74, r: 74 };

export function Hook({ copy }: { copy: FilmCopy }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const hook = copy.hooks[ACTIVE_HOOK];

  const T_HOOK = at("hookLine");
  const T_LOCK = at("lock");
  const T_PUSH = at("pushToEye");
  const PUSH_END = T_PUSH + len("pushToEye");

  /* The grid fills as the card settles — a profile loading, compressed into
     half a second. Starting at zero, not four: four frames of a card with an
     empty body is the first thing anyone sees, and an empty box does not read
     as a profile. */
  const gridIn = interpolate(frame, [0, 24], [0.12, 1.4], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  /* The scan runs a tile at a time under the reticle, so the lock has
     something to be looking *at*. */
  const litTile =
    frame >= T_LOCK + 6 && frame < T_PUSH
      ? Math.floor((frame - T_LOCK - 6) / 3) % 12
      : -1;

  /* Colour drains out of the profile as Blink takes over the reading. */
  const drain = interpolate(frame, [T_LOCK + 4, T_PUSH], [0, 0.7], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  /* The words push the card back into the frame — depth, so the type is not
     simply lying on top of a picture. */
  const recede = springAt({ frame, fps, start: T_HOOK, preset: "settle" });

  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Camera
        /* One continuous move: a slow settle for three seconds, then a hard
           acceleration into the avatar over the last twenty frames. The next
           act opens on an iris at the same size in the same place, so the two
           shapes are the same object across the cut. */
        zoom={[1, 5.2]}
        over={[T_PUSH, PUSH_END]}
        origin={[AVATAR.x, AVATAR.y]}
        easing={easeInExpo}
      >
        <AbsoluteFill
          style={{
            alignItems: "center",
            /* The card lives in the lower two thirds and slides further down
               as the type lands, so the two never share a band. The first cut
               centred both and the third line sat on the handle. */
            justifyContent: "flex-start",
            paddingTop: 470 + recede * 150,
            transform: `scale(${1 - recede * 0.14})`,
            transformOrigin: "50% 30%",
          }}
        >
          <ProfileCard
            start={0}
            gridIn={gridIn}
            litTile={litTile}
            drain={drain}
            handle={copy.appHandle}
            width={760}
            lockAt={T_LOCK}
          />
        </AbsoluteFill>
      </Camera>

      {/* A scrim under the type. Deep enough to cover the whole type band,
          because three white words over a lit grid are not readable and
          dimming the profile itself would waste the thing being advertised. */}
      {frame >= T_HOOK && frame < T_PUSH + 6 && (
        <AbsoluteFill
          style={{
            background: `linear-gradient(to bottom, ${C.bg} 20%, ${C.bg}e6 40%, ${C.bg}00 62%)`,
          }}
        />
      )}

      {/* The hook. Three impacts, alternating direction so the block builds
          rather than slides. */}
      {frame >= T_HOOK && (
        <AbsoluteFill style={{ padding: "116px 64px 0", justifyContent: "flex-start" }}>
          {/* Above the words, not below them. Under the block it landed in the
              same band as the card's handle row and the two overlapped; an
              eyebrow is also the stronger convention for a line that frames
              the claim rather than qualifying it. */}
          {hook.kicker && (
            <Label
              start={T_HOOK + 4}
              color={C.sky}
              size={T.micro}
              style={{ marginBottom: 26, opacity: 0.9 }}
            >
              {hook.kicker}
            </Label>
          )}
          <Stack
            words={hook.words}
            start={T_HOOK}
            stagger={8}
            size={T.huge}
            color={C.white}
            from={["left", "right", "in"]}
            highlight={2}
            highlightColor={C.sky}
            tilt={0.6}
            gap={0}
            exit={{ at: T_PUSH, to: "up" }}
          />
        </AbsoluteFill>
      )}

      {/* The push blows out to sky for the last two frames, which is what the
          next act cuts out of. */}
      {frame > PUSH_END - 3 && (
        <AbsoluteFill
          style={{
            background: C.sky,
            opacity: interpolate(frame, [PUSH_END - 3, PUSH_END], [0, 0.9], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        />
      )}
    </AbsoluteFill>
  );
}
