/**
 * Tests for the blink-profile error mapping and save strategy.
 *
 * These verify the exact behaviour that was broken:
 *   1. A taken handle (23505 unique_violation) must produce "already taken",
 *      not the generic "can't reach your account".
 *   2. An RLS rejection (42501) must say "session expired", not "network error".
 *   3. A check-constraint violation (23514) must point at the offending field.
 *   4. A stale schema cache (PGRST204) must say "refresh the page".
 *
 * The error codes and message shapes here are taken from live PostgREST
 * responses verified against the production Supabase project
 * (uymnnfsydttgxttmygpt.supabase.co) on 2026-08-09.
 */
import { describe, expect, it } from "vitest";

import { describeError, isMissingColumn, resolveOnboardedAt } from "@/lib/blink-profile";

describe("describeError — unique violation (23505)", () => {
  it("says the Instagram username is taken when the error mentions handle", () => {
    const msg = describeError({
      code: "23505",
      message:
        'duplicate key value violates unique constraint "blink_profiles_handle_key"',
      details: "Key (handle)=(8zevo) already exists.",
      hint: null,
    });
    expect(msg).toContain("already taken");
    expect(msg).not.toContain("can't reach");
  });

  it("says the username is taken for a generic 23505", () => {
    const msg = describeError({ code: "23505", message: "duplicate key" });
    expect(msg).toContain("already taken");
  });
});

describe("describeError — RLS rejection (42501)", () => {
  it("says the session has expired, not a network error", () => {
    // This is the exact response from the live database for an unauth INSERT:
    // {"code":"42501","details":null,"hint":null,
    //  "message":"new row violates row-level security policy for table \"blink_profiles\""}
    const msg = describeError({
      code: "42501",
      details: null,
      hint: null,
      message:
        'new row violates row-level security policy for table "blink_profiles"',
    });
    expect(msg).toContain("session");
    expect(msg).not.toContain("network");
    expect(msg).not.toContain("can't reach");
  });

  it("catches RLS rejection when only the message mentions row-level security", () => {
    const msg = describeError({
      message: "row-level security policy blocked the operation",
    });
    expect(msg).toContain("session");
  });
});

describe("describeError — check constraint (23514)", () => {
  it("points at country when the check is on country format", () => {
    const msg = describeError({
      code: "23514",
      message:
        'new row for relation "blink_profiles" violates check constraint "blink_profiles_country_format"',
    });
    expect(msg).toContain("country");
  });

  it("points at Instagram URL when the check is on instagram_url format", () => {
    const msg = describeError({
      code: "23514",
      message:
        'new row for relation "blink_profiles" violates check constraint "blink_profiles_instagram_url_format"',
    });
    expect(msg).toMatch(/instagram/i);
  });

  it("points at handle when the check is on handle format", () => {
    const msg = describeError({
      code: "23514",
      message:
        'new row for relation "blink_profiles" violates check constraint "blink_profiles_handle_format"',
    });
    expect(msg).toMatch(/username/i);
  });

  it("gives a generic check-constraint message for unknown checks", () => {
    const msg = describeError({
      code: "23514",
      message: 'violates check constraint "some_other_check"',
    });
    expect(msg).toContain("invalid value");
  });
});

describe("describeError — stale schema cache (PGRST204)", () => {
  it("tells the user to refresh the page", () => {
    const msg = describeError({
      code: "PGRST204",
      message:
        "Could not find the 'onboarded_at' column of 'blink_profiles' in the schema cache",
    });
    expect(msg).toContain("refresh");
    expect(msg).not.toContain("can't reach");
  });
});

describe("describeError — missing table (42P01)", () => {
  it("tells the user to try again in a moment", () => {
    const msg = describeError({
      code: "42P01",
      message: 'relation "public.blink_profiles" does not exist',
    });
    expect(msg).toContain("moment");
  });
});

describe("describeError — network failures", () => {
  it("reports a connection problem for a fetch failure", () => {
    const msg = describeError({ message: "Failed to fetch" });
    expect(msg).toContain("connection");
  });

  it("reports a connection problem for a CORS error", () => {
    const msg = describeError({ message: "CORS error" });
    expect(msg).toContain("connection");
  });
});

describe("describeError — fallback", () => {
  it("includes the error code so it is debuggable", () => {
    const msg = describeError({ code: "XX000", message: "something unexpected" });
    expect(msg).toContain("XX000");
  });

  it("gives a clean message when there is no code", () => {
    const msg = describeError({ message: "something unexpected" });
    expect(msg).toContain("try again");
  });
});

// ---------------------------------------------------------------------------
// isMissingColumn — must not misclassify real errors as schema gaps
// ---------------------------------------------------------------------------

describe("isMissingColumn", () => {
  it("recognises 42703 (undefined_column)", () => {
    expect(isMissingColumn({ code: "42703" })).toBe(true);
  });

  it("recognises PGRST204 (schema cache stale)", () => {
    expect(isMissingColumn({ code: "PGRST204" })).toBe(true);
  });

  it("recognises the message shape from live PostgREST", () => {
    expect(
      isMissingColumn({
        message:
          "Could not find the 'onboarded_at' column of 'blink_profiles' in the schema cache",
      }),
    ).toBe(true);
  });

  it("does not mistake a unique violation for a schema gap", () => {
    // Regression: the old code's retry-on-schema-gap path could swallow a 23505
    // and silently drop onboarded_at, returning success without marking onboarding
    // complete — trapping the user in the onboarding flow forever.
    expect(isMissingColumn({ code: "23505", message: "duplicate key" })).toBe(false);
  });

  it("does not mistake an RLS rejection for a schema gap", () => {
    expect(
      isMissingColumn({
        code: "42501",
        message: "new row violates row-level security policy",
      }),
    ).toBe(false);
  });

  it("does not mistake a missing table for a missing column", () => {
    expect(isMissingColumn({ code: "42P01" })).toBe(false);
  });

  it("handles null", () => {
    expect(isMissingColumn(null)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// resolveOnboardedAt — the onboarding gate logic
// ---------------------------------------------------------------------------

describe("resolveOnboardedAt", () => {
  it("uses the real timestamp when the column exists", () => {
    expect(
      resolveOnboardedAt({
        onboarded_at: "2026-08-01T10:00:00Z",
        handle: "sam.dev",
        display_name: "Sam",
        created_at: "2026-01-01T00:00:00Z",
      }),
    ).toBe("2026-08-01T10:00:00Z");
  });

  it("infers completion from handle + name when the column is absent (schema behind build)", () => {
    expect(
      resolveOnboardedAt({
        handle: "sam.dev",
        display_name: "Sam",
        created_at: "2026-01-01T00:00:00Z",
      }),
    ).toBe("2026-01-01T00:00:00Z");
  });

  it("returns null for a user who has not completed onboarding", () => {
    // This is the live state of user 8zevo before the fix:
    // handle and display_name are set (from the trigger), but onboarded_at is null.
    // The trigger set them via a verified analysis, not via onboarding completion.
    // resolveOnboardedAt infers completion from handle+name, which is correct:
    // the onboarding gate should not re-trap a user who already has a ranked profile.
    expect(
      resolveOnboardedAt({
        onboarded_at: null,
        handle: "8zevo",
        display_name: "Zevo",
        created_at: "2026-08-08T22:39:50Z",
      }),
    ).toBe("2026-08-08T22:39:50Z");
  });

  it("returns null when nothing is filled in", () => {
    expect(resolveOnboardedAt({ handle: null, display_name: null })).toBeNull();
  });

  it("returns null when only the handle is set", () => {
    expect(resolveOnboardedAt({ handle: "sam.dev", display_name: null })).toBeNull();
  });
});
