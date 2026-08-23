/**
 * Blink — who gets the mark, and does the board agree with itself?
 *
 * §5 The claimed/verified mark means one thing: the owner of this profile
 *    signed in and had an analysis of it verified. It must appear wherever
 *    such a profile is shown, and it must never appear on somebody who was
 *    analysed by a stranger or typed into "Add someone" — those are statements
 *    *about* a person, never *by* them.
 *
 * §6 Every combination of the board — All, each category, each tab, before and
 *    after a reload, in both languages — has to tell the same story. Nobody
 *    vanishes, nobody is duplicated, no rank number contradicts another, and
 *    no category exists that is not a real one.
 *
 *   node qa/badge-and-consistency.mjs
 */

import { check, go, ok, openApp, report, section, shot, waitForText } from "./drive.mjs";

/** The canonical boards, in both languages. Anything else is an invention. */
const CANONICAL = {
  en: ["Larp", "Creator", "Entrepreneur", "Artist", "Fitness", "Fashion", "Lifestyle", "Personal"],
  fr: ["Larp", "Créateur", "Entrepreneur", "Artiste", "Fitness", "Mode", "Lifestyle", "Personnel"],
};
const UNCATEGORISED = { en: "Uncategorized", fr: "Sans catégorie" };
const ALL = { en: "All", fr: "Tous" };

/**
 * Every row on the standings board, with what it claims about itself.
 *
 * Read off the rendered DOM rather than from the data, because the question is
 * what a reader sees — a mark that is in the markup but invisible, or visible
 * on the wrong row, is exactly the failure being looked for.
 */
const readBoard = (page) =>
  page.evaluate(() => {
    const rows = [...document.querySelectorAll("main [class*='min-h-[6'], main [class*='min-h-[5']")]
      .filter((el) => /@/.test(el.innerText ?? ""));

    return rows.map((el) => {
      const text = (el.innerText ?? "").replace(/\s+/g, " ").trim();
      const handle = text.match(/@[\w.]+/)?.[0] ?? null;
      return {
        handle,
        text,
        // The mark labels itself; that label is the contract with a screen
        // reader and is what makes it findable here.
        marked: el.querySelectorAll("[data-verified-mark]").length > 0,
        private: /(^|\W)(PRIVATE|PRIVÉ|PRIVE)(\W|$)/i.test(text),
        rank: text.match(/#\d+/)?.[0] ?? null,
        // Out of ten, one decimal — the unit every score in the product is
        // now written in. This used to look for three or four digits, which
        // silently matched nothing once the board started saying "8.1".
        score: text.match(/\b\d{1,2}\.\d\b/)?.[0] ?? null,
      };
    });
  });

// ---------------------------------------------------------------------------
// §5 — the mark
// ---------------------------------------------------------------------------

for (const lang of ["en", "fr"]) {
  const { browser, page } = await openApp({ width: "390", lang });

  section(`§5 the mark on the standings board · ${lang}`);
  await go(page, "/ranks", { settle: 2800 });
  await waitForText(page, "@amelie.rnd");
  await shot(page, `badge-${lang}-1-standings`);

  const rows = await readBoard(page);
  check(rows.length > 0, `read ${rows.length} rows off the board`);

  // Claimed public profiles carry it. `amelie.rnd` has verified analyses.
  const claimed = rows.find((r) => r.handle === "@amelie.rnd");
  check(claimed?.marked === true, "a claimed public profile carries the mark");

  // A public profile with no verified analysis does not.
  const unclaimed = rows.find((r) => r.handle === "@tomasz.b");
  check(
    unclaimed?.marked === false,
    "a public profile with no verified analysis carries no mark",
    "an unclaimed public profile was marked as claimed",
  );

  // Analysed strangers never do.
  const analysed = rows.filter((r) => r.private && r.score);
  check(analysed.length > 0, `${analysed.length} analysed profile(s) on the board`);
  const wronglyMarked = analysed.filter((r) => r.marked);
  check(
    wronglyMarked.length === 0,
    "no analysed stranger carries the mark",
    `analysed strangers marked as claimed: ${wronglyMarked.map((r) => r.handle).join(", ")}`,
  );

  // Nor do people added by hand.
  const added = rows.filter((r) => r.private && !r.score);
  check(added.length > 0, `${added.length} manually added person(s) on the board`);
  check(
    added.every((r) => !r.marked),
    "no manually added person carries the mark",
    `added people marked as claimed: ${added.filter((r) => r.marked).map((r) => r.handle).join(", ")}`,
  );

  section(`§5 the mark on your own profile · ${lang}`);
  await go(page, "/profile", { settle: 2800 });
  await shot(page, `badge-${lang}-2-own-profile`);
  const ownMarks = await page.evaluate(
    () => document.querySelectorAll("[data-verified-mark]").length,
  );
  check(
    ownMarks > 0,
    `your verified own profile carries the mark (${ownMarks} shown)`,
    "your own verified profile does not show the mark anywhere",
  );

  section(`§5 the mark on a public profile page · ${lang}`);
  await go(page, "/u/22222222-2222-2222-2222-222222222222", { settle: 2800 });
  await shot(page, `badge-${lang}-3-public-claimed`);
  check(
    (await page.evaluate(() => document.querySelectorAll("[data-verified-mark]").length)) > 0,
    "a claimed profile's own page carries the mark",
  );

  await go(page, "/u/33333333-3333-3333-3333-333333333333", { settle: 2800 });
  await shot(page, `badge-${lang}-4-public-unclaimed`);
  check(
    (await page.evaluate(() => document.querySelectorAll("[data-verified-mark]").length)) === 0,
    "an unclaimed profile's own page carries no mark",
    "an unclaimed profile page showed the claimed mark",
  );

  await browser.close();
}

// ---------------------------------------------------------------------------
// §6 — the board agrees with itself
// ---------------------------------------------------------------------------

for (const lang of ["en", "fr"]) {
  const { browser, page } = await openApp({ width: "390", lang });
  section(`§6 every category, in ${lang}`);

  await go(page, "/ranks", { settle: 2800 });
  await waitForText(page, "@amelie.rnd");

  const everywhere = new Map();
  const seenAll = await readBoard(page);
  await shot(page, `consistency-${lang}-all`);
  for (const row of seenAll) if (row.handle) everywhere.set(row.handle, row);

  // No handle twice on one view.
  const dupes = seenAll
    .map((r) => r.handle)
    .filter((h, i, a) => h && a.indexOf(h) !== i);
  check(dupes.length === 0, "no duplicated rows under All", `duplicated: ${dupes.join(", ")}`);

  // No two rows claiming the same rank.
  const ranks = seenAll.map((r) => r.rank).filter(Boolean);
  const rankDupes = ranks.filter((r, i) => ranks.indexOf(r) !== i);
  check(
    rankDupes.length === 0,
    "no two rows claim the same position",
    `two rows share a position: ${[...new Set(rankDupes)].join(", ")}`,
  );

  // Every category, one at a time.
  const perCategory = new Map();
  for (const label of CANONICAL[lang]) {
    await page.getByRole("button", { name: label, exact: true }).first().click();
    await page.waitForTimeout(900);
    const rows = await readBoard(page);
    perCategory.set(label, rows);
    await shot(page, `consistency-${lang}-${label.toLowerCase()}`);

    const dupe = rows.map((r) => r.handle).filter((h, i, a) => h && a.indexOf(h) !== i);
    check(dupe.length === 0, `${label}: no duplicated rows`, `${label}: duplicated ${dupe.join(", ")}`);

    // A row's own claims must not change between views.
    for (const row of rows) {
      const before = everywhere.get(row.handle);
      if (!before) continue;
      if (before.marked !== row.marked) {
        check(false, "", `${row.handle} is marked on one board and not on ${label}`);
      }
      if (before.score !== row.score) {
        check(
          false,
          "",
          `${row.handle} scores ${before.score} under All and ${row.score} under ${label}`,
        );
      }
    }
  }
  ok("every row keeps its mark and its score across every category");

  // Nobody disappears: every row seen under All is on exactly one category
  // board (or is uncategorised, which the strip does not offer).
  const placed = new Set([...perCategory.values()].flat().map((r) => r.handle));
  const lost = seenAll
    .filter((r) => r.handle && !placed.has(r.handle))
    .filter((r) => !r.text.includes(UNCATEGORISED[lang]));
  check(
    lost.length === 0,
    "everyone under All appears on a category board too",
    `present under All but on no category board: ${lost.map((r) => r.handle).join(", ")}`,
  );

  section(`§6 no invented categories · ${lang}`);
  const chips = await page.evaluate(() =>
    [...document.querySelectorAll("main [aria-pressed]")].map((el) => el.innerText.trim()),
  );
  const bogus = chips.filter((c) => c && c !== ALL[lang] && !CANONICAL[lang].includes(c));
  check(bogus.length === 0, "the strip offers only real boards", `invented chips: ${bogus.join(", ")}`);

  const labels = await page.evaluate(() =>
    [...document.querySelectorAll("main")].map((m) => m.innerText).join(" "),
  );
  const raw = labels.match(/[A-Za-z]+-and-[a-z-]+/g);
  check(!raw, "no raw model category text is rendered", `raw category text: ${raw?.join(", ")}`);

  section(`§6 survives a reload · ${lang}`);
  const beforeReload = await readBoard(page);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2800);
  const afterReload = await readBoard(page);
  await shot(page, `consistency-${lang}-after-reload`);
  check(
    JSON.stringify(afterReload.map((r) => [r.handle, r.marked, r.score, r.rank])) ===
      JSON.stringify(beforeReload.map((r) => [r.handle, r.marked, r.score, r.rank])),
    "the board is identical after a reload",
    "the board changed across a reload",
  );

  section(`§6 the Analyzed tab explains its own numbers · ${lang}`);
  await go(page, "/ranks?board=analyzed", { settle: 2800 });
  await shot(page, `consistency-${lang}-analyzed-tab`);

  /*
    A published profile you have also analysed legitimately carries two
    different numbers: the score its owner earned and verified, and your
    reading of one screenshot of it. Forcing them to agree would mean showing
    one of them as something it is not.

    So the requirement here is not equality — it is that the difference is
    stated on the screen where both can be seen, rather than left to look like
    a bug. The standings itself is deduplicated (checked above), so the two
    numbers never sit side by side; this is the tab that has to say why.
  */
  const analysedTab = await readBoard(page);
  const differing = analysedTab.filter((row) => {
    const onStandings = everywhere.get(row.handle);
    return onStandings && onStandings.score !== row.score;
  });

  const explanation = {
    en: "your own reading of one screenshot",
    fr: "ta lecture d'une seule capture",
  }[lang];

  const body = await page.evaluate(() => document.body.innerText.replace(/\s+/g, " "));
  check(
    body.includes(explanation),
    "the Analyzed tab says these scores are your readings, not published scores",
    "the Analyzed tab shows scores with no explanation of what they are",
  );
  ok(
    `${differing.length} profile(s) carry a published score and a reading; the page explains the difference`,
  );

  await browser.close();
}

process.exit(report() ? 1 : 0);
