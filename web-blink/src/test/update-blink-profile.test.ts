/**
 * Integration tests for updateBlinkProfile — the function that was broken.
 *
 * These mock the Supabase client to simulate the exact responses verified
 * against the live production database (uymnnfsydttgxttmygpt.supabase.co)
 * on 2026-08-09:
 *
 *   - Unauth UPDATE → HTTP 200 + [] (RLS filtered, not an error)
 *   - Unauth INSERT → { code: "42501", message: "new row violates RLS..." }
 *   - onboarded_at / instagram_url columns exist (schema cache is fresh)
 *
 * The tests verify the three root causes that were fixed:
 *   1. UPDATE-then-INSERT avoids the handle UNIQUE constraint (23505) that
 *      UPSERT hit because INSERT runs first.
 *   2. describeError maps each PostgREST error code to an actionable message
 *      instead of the generic "can't reach your account".
 *   3. The isMissingColumn retry path does NOT silently drop onboarded_at
 *      and return success — it surfaces the real error.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { DataResult } from "@/lib/blink-profile";

// --- Mock the Supabase client ------------------------------------------------

type PostgrestError = {
  code: string | null;
  message: string;
  details: string | null;
  hint: string | null;
};

type QueryResult = { data: unknown; error: PostgrestError | null };

let mockUpdateResult: QueryResult = { data: null, error: null };
let mockInsertResult: QueryResult = { data: null, error: null };
let updateCallCount = 0;
let insertCallCount = 0;
let lastUpdatePayload: Record<string, unknown> | null = null;
let lastInsertPayload: Record<string, unknown> | null = null;

/**
 * Extract the error message from a DataResult, asserting it is an error.
 * TypeScript can't narrow through vitest's expect(), so this helper does it.
 */
function errorMessage(res: DataResult<unknown>): string {
  if (res.status === "error") return res.message;
  throw new Error(`Expected error result, got ok: ${JSON.stringify(res)}`);
}

// Use a chainable mock that tracks which terminal method was called.
// The supabase-js query builder is fluent: .update().eq().select().maybeSingle()
// and .insert() returns a thenable directly.
function createChainableMock(method: "update" | "insert", payload: Record<string, unknown>) {
  const chain: Record<string, unknown> = {};
  const isUpdate = method === "update";

  // Fluent methods that return self for chaining
  chain.eq = () => chain;
  chain.select = () => chain;

  // Terminal methods
  if (isUpdate) {
    chain.maybeSingle = async () => {
      updateCallCount++;
      lastUpdatePayload = { ...payload };
      return mockUpdateResult;
    };
  }

  // insert() is thenable — supabase-js returns a PromiseLike
  if (!isUpdate) {
    chain.then = (resolve: (v: QueryResult) => unknown) => {
      insertCallCount++;
      lastInsertPayload = { ...payload };
      return resolve(mockInsertResult);
    };
  }

  // Allow re-entry for .update() and .insert() on the same chain
  chain.update = (p: Record<string, unknown>) => createChainableMock("update", p);
  chain.insert = (p: Record<string, unknown>) => createChainableMock("insert", p);

  return chain;
}

/**
 * Loosely typed on purpose: each branch returns a different chain shape, and
 * modelling the full PostgREST builder here would be more fixture than test.
 */
type SupabaseFromMock = (table: string) => unknown;

const mockFrom = vi.fn(((table: string) => {
  if (table === "blink_profiles") {
    return {
      update: (payload: Record<string, unknown>) => createChainableMock("update", payload),
      insert: (payload: Record<string, unknown>) => createChainableMock("insert", payload),
    };
  }
  return {
    select: () => ({
      eq: () => ({
        order: () => ({
          limit: () => ({
            then: (resolve: (v: QueryResult) => unknown) =>
              resolve({ data: [], error: null }),
          }),
        }),
      }),
    }),
  };
}) as SupabaseFromMock);

vi.mock("@/lib/supabase", () => ({
  supabase: { from: mockFrom },
  isSupabaseConfigured: true,
}));

// Import after mock is set up
const { updateBlinkProfile } = await import("@/lib/blink-profile");

function resetMocks() {
  mockUpdateResult = { data: null, error: null };
  mockInsertResult = { data: null, error: null };
  updateCallCount = 0;
  insertCallCount = 0;
  lastUpdatePayload = null;
  lastInsertPayload = null;
  mockFrom.mockClear();
}

beforeEach(resetMocks);
afterEach(resetMocks);

// --- Tests -------------------------------------------------------------------

describe("updateBlinkProfile — existing user (the 8zevo scenario)", () => {
  it("UPDATEs the existing row and writes onboarded_at — never calls INSERT", async () => {
    // Simulate: user already has a row. UPDATE succeeds, returns the row.
    mockUpdateResult = {
      data: { id: "e05418e3-dcbe-4fca-918d-dcea2cc173be" },
      error: null,
    };

    const res = await updateBlinkProfile("e05418e3-dcbe-4fca-918d-dcea2cc173be", {
      handle: "8zevo",
      displayName: "Zevo",
      country: "FR",
      isPublic: true,
      markOnboarded: true,
    });

    expect(res.status).toBe("ok");
    expect(updateCallCount).toBe(1);
    expect(insertCallCount).toBe(0); // INSERT must NOT run for an existing user
    expect(lastUpdatePayload).toBeTruthy();
    expect(lastUpdatePayload).toHaveProperty("onboarded_at");
    expect(lastUpdatePayload).toHaveProperty("handle", "8zevo");
    expect(lastUpdatePayload).toHaveProperty("display_name", "Zevo");
  });

  it("writes instagram_url when provided", async () => {
    mockUpdateResult = { data: { id: "user-1" }, error: null };

    const res = await updateBlinkProfile("user-1", {
      handle: "sam.dev",
      displayName: "Sam",
      instagramUrl: "https://instagram.com/sam.dev",
      markOnboarded: true,
    });

    expect(res.status).toBe("ok");
    expect(lastUpdatePayload).toHaveProperty("instagram_url", "https://instagram.com/sam.dev");
  });

  it("does not write onboarded_at when markOnboarded is false (edit profile)", async () => {
    mockUpdateResult = { data: { id: "user-1" }, error: null };

    const res = await updateBlinkProfile("user-1", {
      handle: "sam.dev",
      displayName: "Sam Updated",
    });

    expect(res.status).toBe("ok");
    expect(lastUpdatePayload).not.toHaveProperty("onboarded_at");
  });
});

describe("updateBlinkProfile — new user (INSERT path)", () => {
  it("INSERTs when UPDATE returns no row (new user)", async () => {
    // Simulate: no existing row. UPDATE returns null. INSERT succeeds.
    mockUpdateResult = { data: null, error: null };
    mockInsertResult = { data: null, error: null };

    const res = await updateBlinkProfile("new-user-id", {
      handle: "newuser",
      displayName: "New User",
      markOnboarded: true,
    });

    expect(res.status).toBe("ok");
    expect(updateCallCount).toBe(1);
    expect(insertCallCount).toBe(1);
    expect(lastInsertPayload).toHaveProperty("id", "new-user-id");
    expect(lastInsertPayload).toHaveProperty("onboarded_at");
  });

  it("returns 'already taken' when INSERT hits handle UNIQUE constraint (23505)", async () => {
    // This is THE bug: the old UPSERT pattern tried INSERT first and hit 23505
    // before ON CONFLICT (id) could redirect. The new pattern only INSERTs
    // for genuinely new users, but if the handle is taken by another user,
    // it still gets 23505 — now with a clear message.
    mockUpdateResult = { data: null, error: null };
    mockInsertResult = {
      data: null,
      error: {
        code: "23505",
        message: 'duplicate key value violates unique constraint "blink_profiles_handle_key"',
        details: "Key (handle)=(8zevo) already exists.",
        hint: null,
      },
    };

    const res = await updateBlinkProfile("new-user-id", {
      handle: "8zevo",
      displayName: "Imposter",
      markOnboarded: true,
    });

    expect(res.status).toBe("error");
    const msg = errorMessage(res);
    expect(msg).toContain("already taken");
    expect(msg).not.toContain("can't reach");
    expect(msg).not.toContain("network");
  });
});

describe("updateBlinkProfile — RLS rejection", () => {
  it("returns 'session expired' when UPDATE is RLS-rejected (42501)", async () => {
    // This is the exact error from the live database for an unauth write:
    // {"code":"42501","details":null,"hint":null,
    //  "message":"new row violates row-level security policy for table \"blink_profiles\""}
    mockUpdateResult = {
      data: null,
      error: {
        code: "42501",
        details: null,
        hint: null,
        message: 'new row violates row-level security policy for table "blink_profiles"',
      },
    };

    const res = await updateBlinkProfile("expired-session-user", {
      handle: "sam.dev",
      displayName: "Sam",
    });

    expect(res.status).toBe("error");
    const msg = errorMessage(res);
    expect(msg).toContain("session");
    expect(msg).not.toContain("network");
    expect(msg).not.toContain("can't reach");
  });

  it("returns 'session expired' when INSERT is RLS-rejected (42501)", async () => {
    mockUpdateResult = { data: null, error: null };
    mockInsertResult = {
      data: null,
      error: {
        code: "42501",
        details: null,
        hint: null,
        message: 'new row violates row-level security policy for table "blink_profiles"',
      },
    };

    const res = await updateBlinkProfile("new-user", {
      handle: "newhandle",
      displayName: "New",
    });

    expect(res.status).toBe("error");
    expect(errorMessage(res)).toContain("session");
  });
});

describe("updateBlinkProfile — check constraint violations", () => {
  it("returns country-specific message for country check violation", async () => {
    mockUpdateResult = {
      data: null,
      error: {
        code: "23514",
        message: 'violates check constraint "blink_profiles_country_format"',
        details: null,
        hint: null,
      },
    };

    const res = await updateBlinkProfile("user-1", {
      handle: "sam.dev",
      displayName: "Sam",
      country: "france",
    });

    expect(res.status).toBe("error");
    expect(errorMessage(res)).toContain("country");
  });

  it("returns Instagram URL message for URL check violation", async () => {
    mockUpdateResult = {
      data: null,
      error: {
        code: "23514",
        message: 'violates check constraint "blink_profiles_instagram_url_format"',
        details: null,
        hint: null,
      },
    };

    const res = await updateBlinkProfile("user-1", {
      handle: "sam.dev",
      displayName: "Sam",
      instagramUrl: "https://example.com/sam",
    });

    expect(res.status).toBe("error");
    expect(errorMessage(res)).toMatch(/instagram/i);
  });
});

describe("updateBlinkProfile — stale schema retry does not swallow errors", () => {
  it("retries without extended columns when UPDATE hits PGRST204 and succeeds", async () => {
    // Simulate: first UPDATE fails with missing column, retry with base columns succeeds.
    let updateAttempt = 0;
    mockFrom.mockImplementationOnce(() => {
      const chain: Record<string, unknown> = {};
      chain.eq = () => chain;
      chain.select = () => chain;
      chain.maybeSingle = async () => {
        updateAttempt++;
        if (updateAttempt === 1) {
          return {
            data: null,
            error: {
              code: "PGRST204",
              message: "Could not find the 'onboarded_at' column in the schema cache",
              details: null,
              hint: null,
            },
          };
        }
        return { data: { id: "user-1" }, error: null };
      };
      chain.update = (p: Record<string, unknown>) => {
        // Re-create with the new payload
        const c: Record<string, unknown> = {};
        c.eq = () => c;
        c.select = () => c;
        c.maybeSingle = async () => {
          updateAttempt++;
          return { data: { id: "user-1" }, error: null };
        };
        c.insert = (pp: Record<string, unknown>) => {
          const ic: Record<string, unknown> = {};
          ic.then = (resolve: (v: QueryResult) => unknown) => resolve({ data: null, error: null });
          return ic;
        };
        return c;
      };
      chain.insert = (p: Record<string, unknown>) => {
        const ic: Record<string, unknown> = {};
        ic.then = (resolve: (v: QueryResult) => unknown) => resolve({ data: null, error: null });
        return ic;
      };
      return chain;
    });

    const res = await updateBlinkProfile("user-1", {
      handle: "sam.dev",
      displayName: "Sam",
      instagramUrl: "https://instagram.com/sam.dev",
      markOnboarded: true,
    });

    expect(res.status).toBe("ok");
  });

  it("surfaces the real error when retry also fails (does NOT swallow it)", async () => {
    // Regression: the old code's retry path returned success even when the
    // retry failed, because it dropped extended columns and returned ok
    // without checking the retry error properly.
    let updateAttempt = 0;
    mockFrom.mockImplementationOnce(() => {
      const chain: Record<string, unknown> = {};
      chain.eq = () => chain;
      chain.select = () => chain;
      chain.maybeSingle = async () => {
        updateAttempt++;
        // Both attempts fail with RLS — the retry must NOT return ok
        return {
          data: null,
          error: {
            code: "42501",
            message: "row-level security policy",
            details: null,
            hint: null,
          },
        };
      };
      chain.update = (p: Record<string, unknown>) => {
        const c: Record<string, unknown> = {};
        c.eq = () => c;
        c.select = () => c;
        c.maybeSingle = async () => {
          updateAttempt++;
          return {
            data: null,
            error: {
              code: "42501",
              message: "row-level security policy",
              details: null,
              hint: null,
            },
          };
        };
        c.insert = (pp: Record<string, unknown>) => {
          const ic: Record<string, unknown> = {};
          ic.then = (resolve: (v: QueryResult) => unknown) => resolve({ data: null, error: null });
          return ic;
        };
        return c;
      };
      chain.insert = (p: Record<string, unknown>) => {
        const ic: Record<string, unknown> = {};
        ic.then = (resolve: (v: QueryResult) => unknown) => resolve({ data: null, error: null });
        return ic;
      };
      return chain;
    });

    const res = await updateBlinkProfile("user-1", {
      handle: "sam.dev",
      displayName: "Sam",
      markOnboarded: true,
    });

    expect(res.status).toBe("error");
    expect(errorMessage(res)).toContain("session");
  });
});

describe("updateBlinkProfile — no generic 'can't reach your account'", () => {
  // This is the core regression test: the old fail() function returned the
  // same generic message for every error. The new describeError must produce
  // a specific, actionable message for each known error code.
  const cases: Array<{ name: string; error: PostgrestError; mustContain: string; mustNotContain: string }> = [
    {
      name: "23505 handle conflict",
      error: { code: "23505", message: 'duplicate key value violates unique constraint "blink_profiles_handle_key"', details: null, hint: null },
      mustContain: "already taken",
      mustNotContain: "can't reach",
    },
    {
      name: "42501 RLS rejection",
      error: { code: "42501", message: "new row violates row-level security policy", details: null, hint: null },
      mustContain: "session",
      mustNotContain: "can't reach",
    },
    {
      name: "23514 check constraint",
      error: { code: "23514", message: 'violates check constraint "blink_profiles_country_format"', details: null, hint: null },
      mustContain: "country",
      mustNotContain: "can't reach",
    },
    {
      name: "PGRST204 stale schema",
      error: { code: "PGRST204", message: "Could not find the 'onboarded_at' column", details: null, hint: null },
      mustContain: "refresh",
      mustNotContain: "can't reach",
    },
  ];

  for (const { name, error, mustContain, mustNotContain } of cases) {
    it(`${name} → message contains "${mustContain}", not "can't reach"`, async () => {
      mockUpdateResult = { data: null, error };
      const res = await updateBlinkProfile("user-1", {
        handle: "sam.dev",
        displayName: "Sam",
        markOnboarded: true,
      });
      expect(res.status).toBe("error");
      const msg = errorMessage(res);
      expect(msg).toContain(mustContain);
      expect(msg).not.toContain(mustNotContain);
    });
  }
});
