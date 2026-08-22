# qa/

Browser harnesses. They drive the real app in a real browser and take
screenshots, because the failures they exist to catch are visual: a board that
renders nothing, a page that opens halfway down itself, a badge on the wrong
row. A passing unit test says none of those things.

Screenshots land in `qa/shots/` (gitignored). **They are the point.** A harness
reporting `PROBLEMS: none` is a reason to open the screenshots, not a substitute
for it — every check here is written against what the DOM says, and the DOM can
be right while the page looks wrong.

## Signed-out harnesses

These need only a served build:

```sh
npm run build && npx vite preview --port 4173
node qa/paint.mjs           # first paint is the real landing, not a placeholder
node qa/animations.mjs      # nothing shifts the page height or the scroll
node qa/toast-position.mjs  # the activity notification stays centred
node qa/language-leaks.mjs  # no English in the French app, or the reverse
node qa/legal-assert.mjs    # the legal pages render, link and translate
node qa/eye.mjs            # the scroll-driven eye: geometry, pinning, reversal
```

`qa/eye.mjs` takes the widths to test and writes one screenshot per stage:

```sh
WIDTHS=320,375,390,430,768,1280,1920 node qa/eye.mjs
node qa/eye-sheet.mjs 390   # the six stages side by side
node qa/eye-small.mjs 390   # the final frame at 100%, 50% and 25%
```

Look at the strip, not just the stills. Uneven pacing is invisible frame by
frame — each still looks fine on its own — and it is what the strip is for.

`eye-small.mjs` is the atmosphere's test. Shrink the final frame to a
thumbnail: if nothing is visibly happening around the eye at 25%, the material
is too weak, however refined it looks at full size. That is how the first
version failed — hairlines at a third opacity, which read as craft close up
and as an empty frame from any distance.

`qa/animations.mjs` also checks the analysis reticle, which only exists behind
`?mock=own` on the dev server:

```sh
DEV=1 BASE=http://127.0.0.1:8080 node qa/animations.mjs
```

## Signed-in harnesses

Ranks, Library, Profile and a saved analysis all need a session and data.
`qa/mock-backend.mjs` stands in for Supabase — it serves the two APIs
supabase-js talks to, well enough for the real client and the real pages to run
against fixtures. See its header for what is real and what is not; in
particular it has **no RLS**, so it cannot and does not verify any privacy
guarantee. Those live in the migrations and the unit tests.

```sh
# 1. point the app at the mock (gitignored)
cat > .env.local <<'EOF'
EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=mock-anon-key
EOF

# 2. three processes
node qa/mock-backend.mjs &
npm run dev                      # or: npm run build && npx vite preview --port 4173

# 3. the harnesses
APP_URL=http://localhost:8080 node qa/add-someone.mjs
APP_URL=http://localhost:8080 LANG_UI=fr node qa/add-someone.mjs
APP_URL=http://localhost:8080 node qa/home-buttons.mjs
APP_URL=http://localhost:8080 node qa/nav-scroll.mjs
APP_URL=http://localhost:8080 node qa/badge-and-consistency.mjs
```

Run them against the **preview** build too, not just the dev server — that is
the artefact that ships, and it is the one that can differ.

| harness | asks |
| --- | --- |
| `add-someone.mjs` | Does adding a person put them on the board you filed them on, immediately and after a reload, with no invented score and no claimed mark? |
| `home-buttons.mjs` | Is there exactly one way Home, and is it the navigation? |
| `nav-scroll.mjs` | Does a profile open at its top, and does Back return you exactly where you were? |
| `badge-and-consistency.mjs` | Who carries the claimed mark, and does every view of the board agree with every other? |
| `eye.mjs` | Does the eye stay pinned and centred, open evenly, reverse exactly, and hold the document still while it plays? |

## Reproducing an unapplied migration

The client degrades rather than crashing when a migration has not been run, and
that path needs testing too — it is what production looks like between a deploy
and a visit to the SQL editor.

```sh
DROP_COLUMNS=leaderboard_suggestions.category node qa/mock-backend.mjs
```

Table-qualified on purpose: a bare column name would pretend every table is
missing it, which is not a state a real database has ever been in.

## Notes for writing new ones

- **Wait on `domcontentloaded`.** The app requests Google Fonts; where that host
  is unreachable, `load` waits for the timeout and `networkidle` never fires.
- **Never `locator.click()` when the scroll offset is part of the assertion.**
  Playwright scrolls the target into view first, which moves the page before the
  navigation — see `clickInPage` in `nav-scroll.mjs`.
- **`innerText` is the transformed text.** A label styled `uppercase` reads back
  uppercase, so compare case-insensitively.
- **`\b` is ASCII-only in JavaScript regex.** `/\bPRIVÉ\b/` never matches.
- **`overflow-x: hidden` defeats `position: sticky`.** `hidden` on one axis
  coerces the other to `auto`, making the element a scroll container. Use
  `clip`, which does not.
- **Scroll the page yourself, instantly.** `scrollIntoView` inherits
  `scroll-behavior: smooth` from `html`, so a harness that samples too soon
  measures its own glide and reports it as the page moving on its own.
- Set `CHROME=/path/to/chrome` if Playwright's pinned build is not the one
  installed.
