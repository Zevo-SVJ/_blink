/**
 * A targeting reticle that snaps onto something.
 *
 * Four corner brackets that fly in from outside the frame and lock, rather
 * than a box that fades up. The snap is the whole point: it is the moment the
 * ad stops being a profile and starts being a profile *being looked at*, and
 * it has to feel mechanical and certain.
 *
 * Deliberately not a sci-fi HUD — no ticks, no readouts, no rotating rings, no
 * monospace telemetry. Four hairlines and a corner radius.
 */

import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";

import { springAt } from "../motion/springs";
import { C } from "../theme";

export function Reticle({
  start,
  width,
  height,
  thickness = 5,
  arm = 58,
  color = C.sky,
  /** Frame the brackets tighten on, giving the lock a second beat. */
  tighten,
}: {
  start: number;
  width: number;
  height: number;
  thickness?: number;
  arm?: number;
  color?: string;
  tighten?: number;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const snap = springAt({ frame, fps, start, preset: "crisp" });
  // A second, smaller inward move — the difference between "a box appeared"
  // and "something locked on".
  const grip = tighten
    ? interpolate(frame, [tighten, tighten + 5], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 0;

  // Corners start well outside and converge.
  const spread = (1 - snap) * 130 - grip * 14;

  const corners = [
    { x: -1, y: -1 },
    { x: 1, y: -1 },
    { x: -1, y: 1 },
    { x: 1, y: 1 },
  ];

  return (
    <div
      style={{
        position: "absolute",
        width,
        height,
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%)",
        opacity: Math.min(1, snap * 4),
      }}
    >
      {corners.map((c, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: c.x < 0 ? -spread : undefined,
            right: c.x > 0 ? -spread : undefined,
            top: c.y < 0 ? -spread : undefined,
            bottom: c.y > 0 ? -spread : undefined,
            width: arm,
            height: arm,
            borderTop: c.y < 0 ? `${thickness}px solid ${color}` : undefined,
            borderBottom: c.y > 0 ? `${thickness}px solid ${color}` : undefined,
            borderLeft: c.x < 0 ? `${thickness}px solid ${color}` : undefined,
            borderRight: c.x > 0 ? `${thickness}px solid ${color}` : undefined,
            borderTopLeftRadius: c.x < 0 && c.y < 0 ? 14 : 0,
            borderTopRightRadius: c.x > 0 && c.y < 0 ? 14 : 0,
            borderBottomLeftRadius: c.x < 0 && c.y > 0 ? 14 : 0,
            borderBottomRightRadius: c.x > 0 && c.y > 0 ? 14 : 0,
          }}
        />
      ))}
    </div>
  );
}

/**
 * A line of light passing down something.
 *
 * `p` is 0 at the top and 1 at the bottom, so the caller owns the timing and
 * can run it twice, hold it, or reverse it.
 */
export function ScanLine({
  p,
  width,
  height,
  color = C.sky,
}: {
  p: number;
  width: number;
  height: number;
  color?: string;
}) {
  if (p <= 0 || p >= 1) return null;
  const y = p * height;
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", width, height }}>
      {/* The trail behind it does the work — a bare line reads as a scratch. */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: y - 190,
          height: 190,
          background: `linear-gradient(to bottom, transparent, ${color}26)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: y,
          height: 4,
          background: color,
          boxShadow: `0 0 40px ${color}, 0 0 90px ${color}88`,
        }}
      />
    </div>
  );
}
