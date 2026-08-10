import { describe, expect, it } from "vitest";

import { pickHandle } from "@/lib/handle-detect";
import { normaliseHandle } from "@/lib/leaderboard-suggestions";
import { normaliseSupabaseUrl } from "@/lib/supabase";

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

describe("normaliseSupabaseUrl", () => {
  it("strips the paths the dashboard hands you", () => {
    // The Data API panel offers this one, and pasting it makes every query
    // resolve to /rest/v1/rest/v1/… while the analysis endpoint 401s.
    expect(normaliseSupabaseUrl("https://abc.supabase.co/rest/v1/")).toBe(
      "https://abc.supabase.co",
    );
    expect(normaliseSupabaseUrl("https://abc.supabase.co/rest/v1")).toBe(
      "https://abc.supabase.co",
    );
    expect(normaliseSupabaseUrl("https://abc.supabase.co/graphql/v1")).toBe(
      "https://abc.supabase.co",
    );
  });

  it("leaves a correct project URL alone", () => {
    expect(normaliseSupabaseUrl("https://abc.supabase.co")).toBe("https://abc.supabase.co");
    expect(normaliseSupabaseUrl("https://abc.supabase.co/")).toBe("https://abc.supabase.co");
  });

  it("trims whitespace, which .env files collect", () => {
    expect(normaliseSupabaseUrl("  https://abc.supabase.co/rest/v1  ")).toBe(
      "https://abc.supabase.co",
    );
  });

  it("passes through undefined and empty rather than inventing a value", () => {
    expect(normaliseSupabaseUrl(undefined)).toBeUndefined();
    expect(normaliseSupabaseUrl("   ")).toBeUndefined();
  });

  it("does not throw on a value that isn't a URL", () => {
    expect(normaliseSupabaseUrl("not-a-url/")).toBe("not-a-url");
  });
});
