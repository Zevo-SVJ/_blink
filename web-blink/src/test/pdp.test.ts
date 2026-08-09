import { describe, expect, it } from "vitest";

import { pdpAnchor } from "@/lib/pdp";

/** Screenshot shapes people actually upload. */
const SHAPES: Array<[string, number, number]> = [
  ["iPhone full screen", 1170, 2532],
  ["iPhone tall", 1290, 2796],
  ["Android full screen", 1080, 2400],
  ["cropped header", 1080, 620],
  ["square crop", 1000, 1000],
  ["desktop web", 1440, 900],
  ["ultrawide sliver", 1600, 300],
  ["narrow sliver", 300, 1600],
  ["tiny", 200, 400],
];

describe("pdpAnchor", () => {
  it.each(SHAPES)("keeps the circle inside the frame — %s", (_name, w, h) => {
    const { cx, cy, r } = pdpAnchor(w, h);
    // Radius is defined against width, so convert for the vertical check.
    const rY = (r * w) / h;

    expect(cx - r).toBeGreaterThanOrEqual(-1e-9);
    expect(cx + r).toBeLessThanOrEqual(1 + 1e-9);
    expect(cy - rY).toBeGreaterThanOrEqual(-1e-9);
    expect(cy + rY).toBeLessThanOrEqual(1 + 1e-9);
  });

  it.each(SHAPES)("stays in the left half — %s", (_name, w, h) => {
    // Instagram never puts the avatar right of centre, so neither do we.
    expect(pdpAnchor(w, h).cx).toBeLessThan(0.5);
  });

  it("targets the upper region on a full-screen phone capture", () => {
    const { cy } = pdpAnchor(1170, 2532);
    // The header occupies roughly the top eighth of a 9:19.5 capture.
    expect(cy).toBeGreaterThan(0.05);
    expect(cy).toBeLessThan(0.2);
  });

  it("is deterministic — the same input always gives the same anchor", () => {
    const a = pdpAnchor(1170, 2532);
    const b = pdpAnchor(1170, 2532);
    expect(a).toEqual(b);
  });

  it("uses the tighter web framing for landscape captures", () => {
    const mobile = pdpAnchor(1080, 2400);
    const desktop = pdpAnchor(1440, 900);
    expect(desktop.r).toBeLessThan(mobile.r);
  });

  it("survives degenerate dimensions without producing NaN", () => {
    for (const [w, h] of [
      [0, 0],
      [1, 1],
      [1, 10000],
      [10000, 1],
    ]) {
      const { cx, cy, r } = pdpAnchor(w, h);
      expect(Number.isFinite(cx)).toBe(true);
      expect(Number.isFinite(cy)).toBe(true);
      expect(Number.isFinite(r)).toBe(true);
      expect(cy).toBeGreaterThanOrEqual(0);
      expect(cy).toBeLessThanOrEqual(1);
    }
  });
});
