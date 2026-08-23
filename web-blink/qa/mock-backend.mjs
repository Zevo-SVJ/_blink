/**
 * Blink — a stand-in Supabase, so the signed-in product can be *looked at*.
 *
 * ## Why this exists
 *
 * Everything interesting in Blink is behind a login: Ranks, Library, an
 * analysis, your own profile. Without credentials none of it renders, so every
 * check on those screens had to be argued from the source instead of seen —
 * and "the code looks right" is exactly how a board that renders nothing, or a
 * page that opens halfway down itself, survives review.
 *
 * This serves the two APIs supabase-js talks to — GoTrue and PostgREST — well
 * enough for the real client, the real pages and the real CSS to run against
 * fixtures. It is a test double, not a database: no RLS, no SQL, no
 * durability. The point is pixels.
 *
 * ## What is real and what is not
 *
 * Real: the app bundle, the routing, the React tree, the styles, supabase-js
 * itself, the shape of every row, and the fact that a write is read back on
 * the next request.
 *
 * Not real: authorisation. RLS is the thing that makes "only you can see
 * these" true, and it lives in Postgres — this file cannot prove it and does
 * not try. Those guarantees are asserted by the migrations and by the unit
 * tests, not here.
 *
 * ## Usage
 *
 *   node qa/mock-backend.mjs            # :54321, default fixtures
 *   PORT=54321 SEED=empty node ...      # a board with nothing on it
 *
 * Point `.env.local` at it:
 *
 *   EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
 *   EXPO_PUBLIC_SUPABASE_ANON_KEY=mock-anon-key
 */

import http from "node:http";

const PORT = Number(process.env.PORT ?? 54321);

// ---------------------------------------------------------------------------
// Identities
// ---------------------------------------------------------------------------

export const OWN_USER = "11111111-1111-1111-1111-111111111111";
const RIVAL_A = "22222222-2222-2222-2222-222222222222";
const RIVAL_B = "33333333-3333-3333-3333-333333333333";
const RIVAL_C = "44444444-4444-4444-4444-444444444444";

const USER = {
  id: OWN_USER,
  aud: "authenticated",
  role: "authenticated",
  email: "sam@example.com",
  email_confirmed_at: "2026-01-04T10:00:00Z",
  phone: "",
  confirmed_at: "2026-01-04T10:00:00Z",
  last_sign_in_at: "2026-08-16T09:00:00Z",
  app_metadata: { provider: "email", providers: ["email"] },
  user_metadata: { full_name: "Sam" },
  identities: [],
  created_at: "2026-01-04T10:00:00Z",
  updated_at: "2026-08-16T09:00:00Z",
};

/**
 * A structurally valid JWT with a garbage signature.
 *
 * supabase-js reads the payload to decide whether a stored session has
 * expired; nothing on this side verifies it, and nothing should — a mock that
 * signed tokens properly would imply an authorisation model it does not have.
 */
function jwt(expiresAt) {
  const b64 = (o) =>
    Buffer.from(JSON.stringify(o)).toString("base64url");
  return [
    b64({ alg: "HS256", typ: "JWT" }),
    b64({ sub: OWN_USER, aud: "authenticated", role: "authenticated", exp: expiresAt }),
    "mock-signature-not-verified",
  ].join(".");
}

export function session() {
  const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60;
  return {
    access_token: jwt(expiresAt),
    token_type: "bearer",
    expires_in: 3600,
    expires_at: expiresAt,
    refresh_token: "mock-refresh-token",
    user: USER,
  };
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/**
 * One analysis row, shaped like the real table.
 *
 * `ownership: "own"` is the user reading their own profile; anything else is
 * a person they looked up. Both shapes exist here because the difference
 * drives which board a row lands on.
 */
function analysis(over = {}) {
  const handle = over.handle ?? "someone";
  const category = over.category ?? "creator";
  const score = over.overall_score ?? 7;
  // `category` is a *column* on this table and holds an object, so the
  // shorthand above must not leak through the spread as a bare string — the
  // app reads `row.category.category` and would see nothing.
  const { category: _category, handle: _handle, result: _result, ...rest } = over;
  return {
    id: over.id ?? `analysis-${handle}`,
    user_id: OWN_USER,
    created_at: over.created_at ?? "2026-08-10T12:00:00.000Z",
    ownership: over.ownership ?? "other",
    overall_score: score,
    category: { category },
    image_url: null,
    result: {
      handle,
      category: { category },
      overallScore: score,
      // Enough of a result for the detail page to have something to lay out.
      summary:
        "The grid reads as one idea rather than a feed of unrelated posts, and the bio says what that idea is without explaining it twice.",
      strengths: [
        "The first three posts agree with each other.",
        "The bio names the thing instead of gesturing at it.",
        "One accent colour, used consistently.",
      ],
      weaknesses: [
        "The highlight covers are doing nothing.",
        "No link, so the profile is a dead end.",
      ],
      perception: {
        firstImpression: "Deliberate. Someone is choosing what goes up.",
        archetype: category,
      },
      ...(over.result ?? {}),
    },
    ...rest,
  };
}

/** A row of the `leaderboard` view. */
function board(over = {}) {
  return {
    id: over.id,
    handle: over.handle ?? null,
    display_name: over.display_name ?? null,
    avatar_url: null,
    country: over.country ?? null,
    instagram_url: over.instagram_url ?? null,
    score: over.score ?? 0,
    peak_score: over.peak_score ?? over.score ?? 0,
    category: over.category ?? null,
    streak: over.streak ?? 0,
    verified_count: over.verified_count ?? 0,
    rank: over.rank ?? 0,
    category_rank: over.category_rank ?? 0,
    movement: over.movement ?? null,
    ...over,
  };
}

/**
 * The default world.
 *
 * Chosen so that one screenshot can answer several questions at once: a
 * verified own profile, public rivals both claimed and not, two analysed
 * strangers in different categories, and one person added by hand who has no
 * score at all.
 */
/**
 * Filler rows, so the pages are actually taller than a phone.
 *
 * Not decoration: "the analysis opens at its top" and "Back restores where you
 * were" are both unfalsifiable on a page that fits on screen, because there is
 * no scroll position to get wrong. The board has to be long enough to scroll
 * before those checks mean anything.
 */
const FILLER = [
  { handle: "noor.aziz", country: "MA", category: "artist", score: 662 },
  { handle: "dorian.v", country: "BE", category: "larp", score: 640 },
  { handle: "priya.n", country: "IN", category: "entrepreneur", score: 615 },
  { handle: "matteo.rc", country: "IT", category: "fashion", score: 601 },
  { handle: "eli.ross", country: "US", category: "fitness", score: 588 },
  { handle: "hana.s", country: "JP", category: "lifestyle", score: 559 },
  { handle: "kwame.o", country: "GH", category: "creator", score: 534 },
  { handle: "ines.mrq", country: "PT", category: "personal", score: 512 },
];

function seedDefault() {
  return {
    leaderboard: [
      board({
        id: RIVAL_A,
        handle: "amelie.rnd",
        display_name: "Amélie",
        country: "FR",
        score: 934,
        category: "larp",
        streak: 6,
        verified_count: 4,
        rank: 1,
        category_rank: 1,
        movement: 2,
      }),
      board({
        id: OWN_USER,
        handle: "sam.dev",
        display_name: "Sam",
        country: "FR",
        score: 812,
        category: "creator",
        streak: 3,
        verified_count: 3,
        rank: 2,
        category_rank: 1,
        movement: 0,
      }),
      board({
        id: RIVAL_B,
        handle: "tomasz.b",
        display_name: "Tomasz",
        country: "PL",
        score: 705,
        category: "entrepreneur",
        streak: 1,
        // Zero verified analyses: on the board, but never claimed.
        verified_count: 0,
        rank: 3,
        category_rank: 1,
        movement: -1,
      }),
      board({
        id: RIVAL_C,
        handle: "june.k",
        display_name: "June",
        country: "KR",
        score: 688,
        category: "creator",
        streak: 2,
        verified_count: 2,
        rank: 4,
        category_rank: 2,
        movement: 1,
      }),
      ...FILLER.map((f, i) =>
        board({
          id: `55555555-0000-0000-0000-${String(i).padStart(12, "0")}`,
          handle: f.handle,
          display_name: f.handle.split(".")[0],
          country: f.country,
          score: f.score,
          category: f.category,
          streak: i % 4,
          // Alternating, so one screenshot shows both a claimed profile and an
          // unclaimed one on the same board.
          verified_count: i % 2 === 0 ? 2 : 0,
          rank: 5 + i,
          category_rank: 1 + (i % 3),
          movement: i % 3 === 0 ? null : (i % 3) - 1,
        }),
      ),
    ],

    analyses: [
      analysis({
        id: "an-mystery",
        handle: "mysteryguy",
        category: "larp",
        overall_score: 8.9,
        created_at: "2026-08-14T09:00:00.000Z",
      }),
      analysis({
        id: "an-mystery-old",
        handle: "mysteryguy",
        category: "larp",
        overall_score: 8.4,
        created_at: "2026-08-02T09:00:00.000Z",
      }),
      analysis({
        id: "an-lea",
        handle: "lea.paris",
        category: "creator",
        overall_score: 6.4,
        created_at: "2026-08-12T09:00:00.000Z",
      }),
      analysis({
        id: "an-own",
        handle: "sam.dev",
        category: "creator",
        ownership: "own",
        overall_score: 8.12,
        created_at: "2026-08-15T09:00:00.000Z",
      }),
      ...FILLER.map((f, i) =>
        analysis({
          id: `an-${f.handle}`,
          handle: f.handle,
          category: f.category,
          overall_score: f.score / 100,
          created_at: `2026-07-${String(10 + i).padStart(2, "0")}T09:00:00.000Z`,
        }),
      ),
    ],

    blink_profiles: [
      {
        id: OWN_USER,
        handle: "sam.dev",
        display_name: "Sam",
        avatar_url: null,
        country: "FR",
        instagram_url: "https://instagram.com/sam.dev",
        score: 812,
        peak_score: 830,
        category: "creator",
        streak: 3,
        verified_count: 3,
        is_public: true,
        created_at: "2026-02-01T10:00:00.000Z",
        updated_at: "2026-08-15T09:00:00.000Z",
      },
    ],

    profiles: [
      { id: OWN_USER, email: "sam@example.com", created_at: "2026-01-04T10:00:00Z" },
    ],

    // Every column the app selects has to be here: a fixture missing one is
    // indistinguishable from an unapplied migration, and the page renders a
    // real error state that has nothing to do with what is being tested.
    score_history: [
      {
        id: "sh-1",
        user_id: OWN_USER,
        score: 740,
        rank: 4,
        category: "creator",
        image_hash: "hash-1",
        verified: true,
        created_at: "2026-07-20T09:00:00.000Z",
      },
      {
        id: "sh-2",
        user_id: OWN_USER,
        score: 786,
        rank: 3,
        category: "creator",
        image_hash: "hash-2",
        verified: true,
        created_at: "2026-08-01T09:00:00.000Z",
      },
      {
        id: "sh-3",
        user_id: OWN_USER,
        score: 812,
        rank: 2,
        category: "creator",
        image_hash: "hash-3",
        verified: true,
        created_at: "2026-08-15T09:00:00.000Z",
      },
    ],

    weekly_winners: [],

    leaderboard_suggestions: [
      {
        id: "sug-1",
        handle: "noah.k",
        category: "fitness",
        note: null,
        evidence_path: null,
        source: "typed",
        suggested_by: OWN_USER,
        created_at: "2026-08-15T18:00:00.000Z",
      },
    ],
  };
}

/**
 * A brand new account, the moment after signing up.
 *
 * Distinct from `empty`: there *is* a board, with other people on it, but this
 * user has analysed nothing, has no public profile and holds no position. That
 * is the state every real first-run is in, and it is the one where an empty
 * state either explains itself or leaves someone staring at a blank screen
 * wondering whether the product is broken.
 */
function seedNew() {
  const base = seedDefault();
  return {
    ...base,
    analyses: [],
    blink_profiles: [],
    score_history: [],
    leaderboard_suggestions: [],
    // Everyone else's standings stay: a new arrival should see a live board.
    // Keyed by `id`, which is the user id on this view — filtering on a
    // `user_id` that does not exist silently kept the row and made the new
    // account look like it was already ranked second.
    leaderboard: base.leaderboard.filter((r) => r.id !== OWN_USER),
  };
}

/** Nothing anywhere — for the empty states. */
function seedEmpty() {
  return {
    leaderboard: [],
    analyses: [],
    blink_profiles: [],
    profiles: [{ id: OWN_USER, email: "sam@example.com" }],
    score_history: [],
    weekly_winners: [],
    leaderboard_suggestions: [],
  };
}

const SEEDS = { default: seedDefault, empty: seedEmpty, new: seedNew };

let db = (SEEDS[process.env.SEED] ?? seedDefault)();

// ---------------------------------------------------------------------------
// PostgREST, the parts that are used
// ---------------------------------------------------------------------------

/** `eq.foo`, `is.null`, `in.(a,b)`, `not.is.null` → a predicate on one column. */
function predicate(column, expression) {
  // `not.<op>.<value>` inverts whatever follows it.
  if (expression.startsWith("not.")) {
    const inner = predicate(column, expression.slice(4));
    return (row) => !inner(row);
  }

  const at = expression.indexOf(".");
  const op = expression.slice(0, at);
  const raw = expression.slice(at + 1);

  const value = (v) => {
    if (v === "null") return null;
    if (v === "true") return true;
    if (v === "false") return false;
    const n = Number(v);
    return v !== "" && !Number.isNaN(n) ? n : v;
  };

  switch (op) {
    case "eq":
      return (row) => String(row[column]) === String(value(raw));
    case "neq":
      return (row) => String(row[column]) !== String(value(raw));
    case "gt":
      return (row) => row[column] > value(raw);
    case "gte":
      return (row) => row[column] >= value(raw);
    case "lt":
      return (row) => row[column] < value(raw);
    case "lte":
      return (row) => row[column] <= value(raw);
    case "is":
      return (row) => row[column] === value(raw);
    case "in": {
      const set = new Set(raw.replace(/^\(|\)$/g, "").split(",").map((v) => String(value(v))));
      return (row) => set.has(String(row[column]));
    }
    default:
      // An operator this double doesn't know must not silently filter nothing
      // out — that would make a test pass for the wrong reason.
      throw new Error(`mock-backend: unsupported PostgREST operator "${op}"`);
    }
}

/**
 * Return only the selected columns, as PostgREST does.
 *
 * Without this the double handed back whole rows whatever the select list
 * said, which quietly made the "migration not applied" path look healthier
 * than it is: a client that retried its query *without* the missing column
 * still received that column in the response, so a feature that depends on it
 * appeared to work. Projecting is what makes the fallback path testable.
 */
function project(rows, params) {
  const select = params.get("select");
  if (!select || select.includes("*")) return rows;

  const columns = select.split(",").map((s) => s.trim()).filter(Boolean);
  return rows.map((row) => {
    const out = {};
    for (const column of columns) if (column in row) out[column] = row[column];
    return out;
  });
}

function applyQuery(rows, params) {
  let out = [...rows];

  for (const [key, raw] of params) {
    if (["select", "order", "limit", "offset", "on_conflict", "columns"].includes(key)) continue;
    out = out.filter(predicate(key, raw));
  }

  const order = params.get("order");
  if (order) {
    for (const clause of order.split(",").reverse()) {
      const [column, ...rest] = clause.split(".");
      const descending = rest.includes("desc");
      out.sort((a, b) => {
        const x = a[column];
        const y = b[column];
        if (x === y) return 0;
        if (x === null || x === undefined) return 1;
        if (y === null || y === undefined) return -1;
        return (x < y ? -1 : 1) * (descending ? -1 : 1);
      });
    }
  }

  const limit = params.get("limit");
  if (limit) out = out.slice(0, Number(limit));

  return out;
}

/**
 * Reject a column the fixtures don't have, the way PostgREST would.
 *
 * This is what lets the harness exercise the "migration 0007 hasn't been
 * applied" path deliberately, instead of only ever seeing the happy one.
 */
function missingColumn(table, params) {
  const select = params.get("select");
  if (!select || select === "*") return null;

  const known = new Set(Object.keys(db[table]?.[0] ?? {}));
  if (known.size === 0) return null;

  /*
    `DROP_COLUMNS=leaderboard_suggestions.category` — table-qualified, because
    a bare column name pretends every table is missing it, which is not a state
    any real database has ever been in. The point of this switch is to
    reproduce one unapplied migration, not a broken schema.
  */
  const dropped = (process.env.DROP_COLUMNS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((entry) => entry.startsWith(`${table}.`))
    .map((entry) => entry.slice(table.length + 1));

  for (const column of select.split(",").map((s) => s.trim())) {
    if (dropped.includes(column)) {
      return {
        code: "42703",
        message: `column ${table}.${column} does not exist`,
        details: null,
        hint: null,
      };
    }
    if (!known.has(column) && column !== "*") {
      return {
        code: "42703",
        message: `column ${table}.${column} does not exist`,
        details: null,
        hint: null,
      };
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,PATCH,PUT,DELETE,OPTIONS,HEAD",
  "access-control-allow-headers": "*",
  "access-control-expose-headers": "content-range, x-total-count",
};

function send(res, status, body, extra = {}) {
  const payload = body === null ? "" : JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    ...CORS,
    ...extra,
  });
  res.end(payload);
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (chunks.length === 0) return null;
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return null;
  }
}

/*
  Every request is wrapped.

  An unsupported query used to throw out of the handler and take the whole
  process down mid-run, which surfaced as "connection refused" in a harness —
  a symptom that points at the app rather than at this file. A 500 with the
  reason in it points where it belongs.
*/
const server = http.createServer((req, res) => {
  handle(req, res).catch((err) => {
    console.error("mock-backend:", err.message);
    try {
      send(res, 500, { code: "mock", message: String(err.message) });
    } catch {
      /* response already sent */
    }
  });
});

async function handle(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;

  if (req.method === "OPTIONS") {
    res.writeHead(204, CORS);
    return res.end();
  }

  // -- control plane, for the harnesses ------------------------------------
  if (path === "/__mock/reset") {
    const which = url.searchParams.get("seed") ?? "default";
    db = (SEEDS[which] ?? seedDefault)();
    return send(res, 200, { ok: true, seed: which });
  }
  if (path === "/__mock/db") {
    if (req.method === "POST") {
      const patch = await readBody(req);
      if (patch) for (const [table, rows] of Object.entries(patch)) db[table] = rows;
      return send(res, 200, { ok: true });
    }
    return send(res, 200, db);
  }
  if (path === "/__mock/session") return send(res, 200, session());

  // -- GoTrue --------------------------------------------------------------
  if (path.startsWith("/auth/v1/")) {
    if (path === "/auth/v1/token") return send(res, 200, session());
    /*
      Signing up.

      GoTrue returns the same session shape as a sign-in when confirmation is
      off, which is what `autoconfirm: true` below advertises. Modelled so the
      first-run experience can be walked from the landing page's own CTA rather
      than by injecting a session into storage — the two take different paths
      through the app, and the one a real person takes is the one worth
      looking at.
    */
    if (path === "/auth/v1/signup") {
      db = seedNew();
      return send(res, 200, session());
    }
    if (path === "/auth/v1/user") return send(res, 200, USER);
    if (path === "/auth/v1/logout") return send(res, 204, null);
    if (path === "/auth/v1/settings")
      return send(res, 200, { external: {}, disable_signup: false, autoconfirm: true });
    return send(res, 200, {});
  }

  // -- Edge functions ------------------------------------------------------
  if (path.startsWith("/functions/v1/")) {
    return send(res, 501, { error: "mock-backend does not run edge functions" });
  }

  // -- PostgREST -----------------------------------------------------------
  if (path.startsWith("/rest/v1/")) {
    const table = path.slice("/rest/v1/".length).split("/")[0];

    if (table.startsWith("rpc")) return send(res, 200, null);

    if (!(table in db)) {
      return send(res, 404, {
        code: "42P01",
        message: `relation "public.${table}" does not exist`,
        details: null,
        hint: null,
      });
    }

    // `maybeSingle` / `single` ask for an object rather than an array.
    const wantsObject = String(req.headers.accept ?? "").includes("pgrst.object");

    if (req.method === "GET" || req.method === "HEAD") {
      const bad = missingColumn(table, url.searchParams);
      if (bad) return send(res, 400, bad);

      const rows = project(applyQuery(db[table], url.searchParams), url.searchParams);
      if (wantsObject) return send(res, 200, rows[0] ?? null);
      return send(res, 200, rows);
    }

    if (req.method === "POST") {
      const body = await readBody(req);
      const incoming = Array.isArray(body) ? body : [body];

      for (const row of incoming) {
        for (const column of Object.keys(row ?? {})) {
          const bad = missingColumn(table, new URLSearchParams({ select: column }));
          if (bad) return send(res, 400, bad);
        }
      }

      const inserted = incoming.map((row) => ({
        id: row.id ?? `${table}-${Math.random().toString(36).slice(2, 10)}`,
        created_at: new Date().toISOString(),
        ...row,
      }));

      // `upsert` on a conflicting id replaces rather than duplicates.
      for (const row of inserted) {
        const at = db[table].findIndex((existing) => existing.id === row.id);
        if (at >= 0) db[table][at] = { ...db[table][at], ...row };
        else db[table].push(row);
      }

      return send(res, 201, wantsObject ? inserted[0] : inserted);
    }

    if (req.method === "PATCH") {
      const body = (await readBody(req)) ?? {};
      const matches = applyQuery(db[table], url.searchParams);
      for (const row of matches) Object.assign(row, body);
      return send(res, 200, wantsObject ? (matches[0] ?? null) : matches);
    }

    if (req.method === "DELETE") {
      const matches = new Set(applyQuery(db[table], url.searchParams));
      db[table] = db[table].filter((row) => !matches.has(row));
      return send(res, 200, wantsObject ? null : [...matches]);
    }
  }

  send(res, 404, { error: `mock-backend: no route for ${req.method} ${path}` });
}

server.listen(PORT, "127.0.0.1", () => {
  console.log(`mock-backend listening on http://127.0.0.1:${PORT} (seed: ${process.env.SEED ?? "default"})`);
});
