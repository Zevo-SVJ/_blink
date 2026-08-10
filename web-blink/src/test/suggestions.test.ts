import { describe, expect, it } from "vitest";

import { pickHandle } from "@/lib/handle-detect";
import { normaliseHandle } from "@/lib/leaderboard-suggestions";

describe("normaliseHandle", () => {
  it("accepts the three things people actually paste", () => {
    expect(normaliseHandle("mia.s")).toBe("mia.s");
    expect(normaliseHandle("@mia.s")).toBe("mia.s");
    expect(normaliseHandle("https://instagram.com/mia.s")).toBe("mia.s");
    expect(normaliseHandle("instagram.com/mia.s/")).toBe("mia.s");
    expect(normaliseHandle("https://www.instagram.com/mia.s?hl=en")).toBe("mia.s");
  });

  it("lowercases and trims", () => {
    expect(normaliseHandle("  @Mia.S  ")).toBe("mia.s");
  });

  it("rejects anything that isn't a plausible handle", () => {
    for (const bad of ["", "   ", "@", "a".repeat(31), "has space", "bad!char", ".leading", "trailing."]) {
      expect(normaliseHandle(bad), bad).toBeNull();
    }
  });
});

describe("pickHandle", () => {
  const line = (rawValue: string, y: number) => ({ rawValue, boundingBox: { y } });

  it("prefers an explicit @handle near the top", () => {
    const found = pickHandle(
      [line("Some Name", 40), line("@mia.s", 90), line("1,204 followers", 200)],
      1000,
    );
    expect(found?.handle).toBe("mia.s");
    expect(found!.confidence).toBeGreaterThan(0.8);
  });

  it("ignores profile chrome that looks like a word", () => {
    expect(pickHandle([line("followers", 90), line("following", 120)], 1000)).toBeNull();
  });

  it("ignores a plain display name with no handle punctuation", () => {
    expect(pickHandle([line("Sam", 90)], 1000)).toBeNull();
  });

  it("accepts a bare handle when it has handle-ish punctuation", () => {
    expect(pickHandle([line("mia.s", 90)], 1000)?.handle).toBe("mia.s");
  });

  it("distrusts text far down the image — that's a caption, not the header", () => {
    expect(pickHandle([line("@someone.else", 900)], 1000)).toBeNull();
  });

  it("returns null on empty input rather than throwing", () => {
    expect(pickHandle([], 1000)).toBeNull();
    expect(pickHandle([line("@ok.handle", 50)], 0)?.handle).toBe("ok.handle");
  });
});
