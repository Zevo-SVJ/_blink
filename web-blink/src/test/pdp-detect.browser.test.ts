/**
 * Tests for locating the profile picture in a screenshot.
 *
 * These run in the browser project because the detector needs a real canvas —
 * mocking `getImageData` would only test the mock.
 */

import { describe, expect, it } from "vitest";

import { detectPdp } from "@/lib/pdp-detect";
import { pdpAnchor } from "@/lib/pdp";

interface Shot {
  w: number;
  h: number;
  bg: string;
  /** Avatar, in fractions of width/height. */
  avatar?: { cx: number; cy: number; r: number; fill: string };
  /** Full-width bars above the avatar — status bar, nav bar. */
  bars?: Array<{ top: number; height: number; fill: string }>;
  /** Grid of post thumbnails below the header. */
  grid?: { top: number; fill: string };
}

function draw(shot: Shot): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = shot.w;
  c.height = shot.h;
  const x = c.getContext("2d")!;
  x.fillStyle = shot.bg;
  x.fillRect(0, 0, shot.w, shot.h);

  for (const bar of shot.bars ?? []) {
    x.fillStyle = bar.fill;
    x.fillRect(0, bar.top * shot.h, shot.w, bar.height * shot.h);
  }

  if (shot.grid) {
    x.fillStyle = shot.grid.fill;
    for (let i = 0; i < 9; i++) {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const size = shot.w / 3 - 2;
      x.fillRect(col * (shot.w / 3), shot.grid.top * shot.h + row * (size + 2), size, size);
    }
  }

  if (shot.avatar) {
    x.fillStyle = shot.avatar.fill;
    x.beginPath();
    x.arc(shot.avatar.cx * shot.w, shot.avatar.cy * shot.h, shot.avatar.r * shot.w, 0, Math.PI * 2);
    x.fill();
  }

  return c;
}

/** How far off the detected centre is, in fractions of width. */
function error(found: { cx: number; cy: number }, want: { cx: number; cy: number }): number {
  return Math.hypot(found.cx - want.cx, found.cy - want.cy);
}

describe("detectPdp", () => {
  it("finds the avatar on a light-theme phone capture", () => {
    const want = { cx: 0.19, cy: 0.12, r: 0.11 };
    const found = detectPdp(draw({
      w: 540, h: 1170, bg: "#ffffff",
      avatar: { ...want, fill: "#c2410c" },
      grid: { top: 0.3, fill: "#e5e7eb" },
    }), 540, 1170);

    expect(found).not.toBeNull();
    expect(error(found!, want)).toBeLessThan(0.04);
  });

  it("finds it on a dark-theme capture too", () => {
    const want = { cx: 0.2, cy: 0.13, r: 0.115 };
    const found = detectPdp(draw({
      w: 540, h: 1170, bg: "#000000",
      avatar: { ...want, fill: "#38bdf8" },
      grid: { top: 0.32, fill: "#1f2937" },
    }), 540, 1170);

    expect(found).not.toBeNull();
    expect(error(found!, want)).toBeLessThan(0.04);
  });

  it("is not fooled by a status bar or a nav bar above the avatar", () => {
    // The exact failure the fixed fraction has: extra chrome pushes the real
    // avatar down, and a full-width bar is the first non-background thing.
    const want = { cx: 0.19, cy: 0.2, r: 0.11 };
    const found = detectPdp(draw({
      w: 540, h: 1170, bg: "#ffffff",
      bars: [
        { top: 0.0, height: 0.03, fill: "#111827" },
        { top: 0.05, height: 0.04, fill: "#f3f4f6" },
      ],
      avatar: { ...want, fill: "#c2410c" },
      grid: { top: 0.4, fill: "#e5e7eb" },
    }), 540, 1170);

    expect(found).not.toBeNull();
    expect(error(found!, want)).toBeLessThan(0.05);

    // And it beats the layout fraction on this capture, which is the point.
    const fixed = pdpAnchor(540, 1170);
    expect(error(found!, want)).toBeLessThan(error(fixed, want));
  });

  it("returns null rather than guessing when there is no avatar", () => {
    expect(
      detectPdp(draw({ w: 540, h: 1170, bg: "#ffffff", grid: { top: 0.1, fill: "#e5e7eb" } }), 540, 1170),
    ).toBeNull();
  });

  it("ignores faces in the grid — they are outside the search band", () => {
    const found = detectPdp(draw({
      w: 540, h: 1170, bg: "#ffffff",
      avatar: { cx: 0.5, cy: 0.75, r: 0.12, fill: "#c2410c" },
    }), 540, 1170);
    expect(found).toBeNull();
  });

  it("never returns a circle that falls outside the frame", () => {
    const found = detectPdp(draw({
      w: 540, h: 1170, bg: "#ffffff",
      avatar: { cx: 0.14, cy: 0.09, r: 0.12, fill: "#c2410c" },
    }), 540, 1170);
    if (found) {
      expect(found.cx - found.r).toBeGreaterThanOrEqual(-0.02);
      expect(found.cy).toBeGreaterThan(0);
      expect(found.cy).toBeLessThan(1);
    }
  });
});
