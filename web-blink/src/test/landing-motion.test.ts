/**
 * Regression tests for the landing page's motion contracts.
 *
 * These are the failures that have shipped more than once: a radial layout
 * with one label jammed against the centre, and a sequence that stops on its
 * last frame. Both are cheap to assert and expensive to notice by eye.
 */

import { describe, expect, it } from "vitest";

import { PERCEPTIONS, TESTIMONIALS } from "@/lib/blink-data";
import {
  FAN_CLEARANCE,
  FAN_SLOTS,
  edgeClearance,
  estimateHalfWidth,
  nodeOffset,
} from "@/lib/perception-fan";

const SHORT: Record<string, string> = {
  crush: "crush",
  stranger: "stranger",
  friends: "friends",
  recruiter: "recruiter",
  "green-flag": "green flag",
  "red-flag": "red flag",
};

describe("perception fan geometry", () => {
  const labels = PERCEPTIONS.map((p) => SHORT[p.id] ?? p.id);

  it("has a slot for every perspective", () => {
    expect(FAN_SLOTS).toHaveLength(PERCEPTIONS.length);
  });

  it("gives every node the same visible gap regardless of label width", () => {
    const gaps = labels.map((label, i) =>
      edgeClearance(FAN_SLOTS[i], estimateHalfWidth(label)),
    );
    for (const gap of gaps) expect(gap).toBeCloseTo(FAN_CLEARANCE, 5);
  });

  it("would NOT be even on a single radius — the bug this guards", () => {
    // Reproduce the old approach: one radius to each node's centre.
    const radius = 104;
    const gaps = labels.map((label, i) => {
      const rad = (FAN_SLOTS[i] * Math.PI) / 180;
      const halfAlong =
        Math.abs(Math.cos(rad)) * estimateHalfWidth(label) + Math.abs(Math.sin(rad)) * 13;
      return radius - 34 - halfAlong;
    });
    const spread = Math.max(...gaps) - Math.min(...gaps);
    // The old layout varied by tens of pixels; the fix must beat it decisively.
    expect(spread).toBeGreaterThan(15);
  });

  it("keeps the widest node inside a 320px column", () => {
    const half = 320 / 2 - 16; // viewport half, less the section padding
    for (const [i, label] of labels.entries()) {
      const halfW = estimateHalfWidth(label);
      const { x } = nodeOffset(FAN_SLOTS[i], halfW);
      expect(Math.abs(x) + halfW).toBeLessThanOrEqual(half);
    }
  });
});

describe("reaction stream data", () => {
  it("carries enough reactions that the loop is not obvious", () => {
    expect(TESTIMONIALS.length).toBeGreaterThanOrEqual(20);
    expect(TESTIMONIALS.length).toBeLessThanOrEqual(40);
  });

  it("has no duplicate text and no duplicate handle", () => {
    expect(new Set(TESTIMONIALS.map((t) => t.text)).size).toBe(TESTIMONIALS.length);
    expect(new Set(TESTIMONIALS.map((t) => t.handle)).size).toBe(TESTIMONIALS.length);
  });

  it("varies identity shape rather than using one template", () => {
    const withAge = TESTIMONIALS.filter((t) => t.age !== undefined).length;
    expect(withAge).toBeGreaterThan(0);
    expect(withAge).toBeLessThan(TESTIMONIALS.length);
  });

  it("keeps reactions short enough to read while moving", () => {
    for (const t of TESTIMONIALS) expect(t.text.length).toBeLessThanOrEqual(90);
  });
});
