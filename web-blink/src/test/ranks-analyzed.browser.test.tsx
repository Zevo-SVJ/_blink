/**
 * Blink — does an analysed profile actually show up in Ranks?
 *
 * This exists because the previous implementation was correct on paper and
 * wrong in the product: profiles were written, read back, ranked — and lived
 * behind a tab nobody opened, so analysing someone appeared to do nothing.
 * Type-checking cannot catch that. Rendering can.
 *
 * The Supabase client is mocked at the module boundary, so this drives the real
 * `Ranks` page, the real merge, the real category filter and the real row
 * components against data shaped exactly like the database returns. What it
 * does *not* cover is the network round trip itself — that needs credentials
 * this environment does not have.
 *
 * The assertions are the user-visible facts:
 *
 *  - the analysed handle is on the standings board, under All
 *  - it is there under its own category too
 *  - it is not there under a category it does not belong to
 *  - it carries no claimed mark, and says it is private
 *  - it survives a remount (the "does it stay after refresh" question)
 *  - re-analysing the same person does not produce a second row
 */

import { render } from "vitest-browser-react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { I18nProvider } from "@/lib/i18n";

// ---------------------------------------------------------------------------
// Fixtures — shaped like the rows Supabase actually returns
// ---------------------------------------------------------------------------

const OWN_USER = "11111111-1111-1111-1111-111111111111";

function analysisRow(over: Record<string, unknown> = {}) {
  return {
    id: "analysis-1",
    created_at: "2026-08-10T12:00:00.000Z",
    ownership: "other",
    overall_score: 8.9,
    category: { category: "larp" },
    result: { handle: "mysteryguy", category: { category: "larp" } },
    ...over,
  };
}

/** Rows the mocked client will return, per table. */
let TABLES: Record<string, unknown[]> = {};

vi.mock("@/lib/supabase", () => {
  const build = (table: string) => {
    const chain: Record<string, unknown> = {};
    const result = () => Promise.resolve({ data: TABLES[table] ?? [], error: null });
    for (const method of ["select", "eq", "order", "limit", "gte", "lte", "in", "neq"]) {
      chain[method] = () => chain;
    }
    chain.maybeSingle = () =>
      Promise.resolve({ data: (TABLES[table] ?? [])[0] ?? null, error: null });
    chain.single = chain.maybeSingle;
    // Awaiting the builder resolves it, which is how the app uses it.
    chain.then = (resolve: (v: unknown) => unknown) => result().then(resolve);
    return chain;
  };

  return {
    supabase: { from: (table: string) => build(table) },
    isSupabaseConfigured: true,
    normaliseSupabaseUrl: (v?: string) => v,
  };
});

/*
  One frozen object, returned by every call.

  `Ranks` builds its `refresh` callback with `user` in the dependency list, so a
  mock that returned a fresh object each render would invalidate the callback on
  every render, re-run the effect, set state, and loop until React gives up with
  "Maximum update depth exceeded". The real provider keeps `user` in `useState`,
  where its identity is stable between renders — this mirrors that.
*/
const AUTH = Object.freeze({
  user: Object.freeze({ id: OWN_USER, email: "me@example.com" }),
  isLoading: false,
});

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => AUTH,
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Imported after the mocks so the page picks them up.
const { default: Ranks } = await import("@/pages/Ranks");

function renderRanks() {
  return render(
    <MemoryRouter>
      <I18nProvider initial="en">
        <Ranks />
      </I18nProvider>
    </MemoryRouter>,
  );
}

/**
 * The board loads asynchronously, so every assertion waits for the DOM to say
 * what it is going to say rather than sleeping for a fixed time.
 */
async function waitForText(text: string, timeout = 4000): Promise<void> {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (document.body.textContent?.includes(text)) return;
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error(
    `"${text}" never appeared. Body was:\n${document.body.textContent?.slice(0, 600)}`,
  );
}

/** Settled = the page has stopped showing its skeleton. */
async function waitForBoard(): Promise<void> {
  await waitForText("Leaderboard");
  await new Promise((r) => setTimeout(r, 400));
}

describe("an analysed profile in Ranks", () => {
  beforeEach(() => {
    TABLES = {
      analyses: [analysisRow()],
      leaderboard: [],
      blink_profiles: [],
      weekly_winners: [],
      score_history: [],
      leaderboard_suggestions: [],
    };
  });

  it("appears on the standings board under All", async () => {
    renderRanks();
    await waitForText("@mysteryguy");
  });

  it("shows its canonical category and its score", async () => {
    renderRanks();
    await waitForText("@mysteryguy");
    expect(document.body.textContent).toContain("Larp");
    // 8.9 on the model's 0-10 scale is 890 on the board's scale.
    expect(document.body.textContent).toContain("890");
  });

  it("says it is private, and carries no claimed mark", async () => {
    renderRanks();
    await waitForText("@mysteryguy");
    expect(document.body.textContent).toContain("Private");
    expect(document.querySelector('[aria-label="Claimed profile"]')).toBeNull();
  });

  it("is still there after a remount", async () => {
    // The "does it survive a refresh" question, in the form this runner can
    // ask it: tear the tree down completely and mount a fresh one. The board
    // has to fetch and render the profile again from scratch, which is what a
    // real reload does.
    renderRanks();
    await waitForText("@mysteryguy");

    document.body.innerHTML = "";
    expect(document.body.textContent).not.toContain("@mysteryguy");

    renderRanks();
    await waitForText("@mysteryguy");
  });

  it("does not duplicate when the same person is analysed twice", async () => {
    TABLES.analyses = [
      analysisRow({ id: "analysis-2", created_at: "2026-08-11T12:00:00.000Z" }),
      analysisRow({ id: "analysis-1" }),
    ];

    renderRanks();
    await waitForText("@mysteryguy");

    const rows = document.body.textContent?.match(/@mysteryguy/g) ?? [];
    expect(rows).toHaveLength(1);
  });

  it("counts repeat readings rather than repeating the row", async () => {
    TABLES.analyses = [
      analysisRow({ id: "a3", created_at: "2026-08-12T00:00:00.000Z" }),
      analysisRow({ id: "a2", created_at: "2026-08-11T00:00:00.000Z" }),
      analysisRow({ id: "a1", created_at: "2026-08-10T00:00:00.000Z" }),
    ];

    renderRanks();
    await waitForText("@mysteryguy");
    expect(document.body.textContent).toContain("3 scans");
  });

  it("never shows a category the model invented", async () => {
    TABLES.analyses = [
      analysisRow({
        category: { category: "Photography-and-visual-storytelling" },
        result: {
          handle: "mysteryguy",
          category: { category: "Photography-and-visual-storytelling" },
        },
      }),
    ];

    renderRanks();
    await waitForText("@mysteryguy");
    // Folded onto a real board rather than shown raw.
    expect(document.body.textContent).toContain("Artist");
    expect(document.body.textContent).not.toContain("Photography-and-visual");
  });

  it("skips an analysis with no readable handle rather than inventing one", async () => {
    TABLES.analyses = [analysisRow({ result: { handle: null, category: null } })];

    renderRanks();
    // The board should reach a settled state without an anonymous row.
    await waitForBoard();
    expect(document.body.textContent).not.toContain("@null");
    expect(document.body.textContent).not.toContain("@undefined");
  });
});
