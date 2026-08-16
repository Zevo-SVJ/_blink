/**
 * Blink — "Add someone", from the tap to the row on the board.
 *
 * The claim being checked is not "the insert returned 201". It is: a person
 * you added is *visible*, on the board you filed them on, in the language you
 * are reading, and still there after a reload — with no score and no claimed
 * mark, because nothing has been analysed and nobody has proved anything.
 *
 *   node qa/add-someone.mjs          # English
 *   LANG_UI=fr node qa/add-someone.mjs
 *
 * Needs `qa/mock-backend.mjs` and the dev server running.
 */

import {
  bad,
  check,
  go,
  ok,
  openApp,
  report,
  resetDb,
  section,
  shot,
  text,
  waitForText,
} from "./drive.mjs";

const LANG = process.env.LANG_UI === "fr" ? "fr" : "en";
const tag = LANG === "en" ? "" : `-${LANG}`;

/** What each language calls the things this harness clicks. */
const WORDS = {
  en: {
    add: "Add someone",
    board: "Which board?",
    submit: "Add to leaderboard",
    fitness: "Fitness",
    creator: "Creator",
    all: "All",
    notAnalyzed: "Not analyzed yet",
    private: "Private",
  },
  fr: {
    add: "Ajouter quelqu'un",
    board: "Quel classement ?",
    submit: "Ajouter au classement",
    fitness: "Fitness",
    creator: "Créateur",
    all: "Tous",
    notAnalyzed: "Pas encore analysé",
    private: "Privé",
  },
}[LANG];

const HANDLE = "camille.dcx";
const CATEGORY = WORDS.fitness;

await resetDb("default");

const { browser, page, errors } = await openApp({ width: "390", lang: LANG });

section("1. the sheet asks for a screenshot, a handle and a board");
await go(page, "/ranks", { settle: 2500 });
await shot(page, `add-01-ranks-before${tag}`);

await page.getByRole("button", { name: WORDS.add }).first().click();
await page.waitForTimeout(900);
await shot(page, `add-02-sheet-empty${tag}`);

// Case-insensitively: these labels are uppercased in CSS, and `innerText`
// reports the transformed text.
const sheet = (await text(page)).toLowerCase();
check(/screenshot|capture/i.test(sheet), "the sheet offers a screenshot field");
check(
  sheet.includes(WORDS.board.toLowerCase()),
  `the sheet asks which board ("${WORDS.board}")`,
);

// The submit button must refuse a handle with no board — otherwise the
// category is decoration.
await page.locator("#suggest-handle").fill(HANDLE);
await page.waitForTimeout(400);
await shot(page, `add-03-handle-no-category${tag}`);

const disabledWithoutCategory = await page
  .getByRole("button", { name: WORDS.submit })
  .isDisabled();
check(
  disabledWithoutCategory,
  "submit stays disabled until a board is chosen",
  "submit was enabled with no board chosen — the category is not actually required",
);

section("2. choosing a board enables the action");
await page.getByRole("button", { name: CATEGORY, exact: true }).first().click();
await page.waitForTimeout(400);
await shot(page, `add-04-category-chosen${tag}`);

check(
  !(await page.getByRole("button", { name: WORDS.submit }).isDisabled()),
  "submit is enabled once a handle and a board are given",
);

section("3. the confirmation");
await page.getByRole("button", { name: WORDS.submit }).click();
await page.waitForTimeout(1400);
await shot(page, `add-05-confirmation${tag}`);
const confirmation = await text(page);
check(
  confirmation.includes(HANDLE),
  "the confirmation names the person who was added",
);

// The sheet dismisses itself; nothing to acknowledge.
await page.waitForTimeout(1800);
await shot(page, `add-06-after-sheet-closes${tag}`);

section("4. the person is on the board, under All");
await waitForText(page, `@${HANDLE}`);
await shot(page, `add-07-all${tag}`);
const all = await text(page);
check(all.includes(`@${HANDLE}`), "the added person is on the All board");
check(
  all.includes(WORDS.notAnalyzed),
  "the row says they have not been analysed",
);

section("5. …and under the board they were filed on");
await page.getByRole("button", { name: CATEGORY, exact: true }).first().click();
await page.waitForTimeout(1200);
await shot(page, `add-08-category${tag}`);
const inCategory = await text(page);
check(
  inCategory.includes(`@${HANDLE}`),
  `the added person is on the ${CATEGORY} board`,
);

section("6. …and not on a board they were not filed on");
await page.getByRole("button", { name: WORDS.creator, exact: true }).first().click();
await page.waitForTimeout(1200);
await shot(page, `add-09-other-category${tag}`);
check(
  !(await text(page)).includes(`@${HANDLE}`),
  `the added person is absent from ${WORDS.creator}`,
  `a person filed under ${CATEGORY} also appeared under ${WORDS.creator}`,
);

section("7. still there after a reload");
await go(page, "/ranks", { settle: 3000 });
await waitForText(page, `@${HANDLE}`);
await shot(page, `add-10-after-reload${tag}`);
ok("the added person survives a reload");

section("8. no invented score, no claimed mark");
const row = await page.evaluate((handle) => {
  const hit = [...document.querySelectorAll("div, button, a")].find(
    (el) =>
      el.textContent?.includes(`@${handle}`) &&
      el.className?.toString().includes("min-h-[64px]"),
  );
  if (!hit) return null;
  return {
    text: hit.innerText.replace(/\s+/g, " "),
    marks: hit.querySelectorAll('[aria-label="Claimed profile"], [data-verified-mark]').length,
    digits: (hit.innerText.match(/\b\d{2,4}\b/g) ?? []),
  };
}, HANDLE);

if (!row) {
  bad("could not isolate the added person's row to inspect it");
} else {
  check(row.marks === 0, "the row carries no claimed mark", `row showed ${row.marks} claimed mark(s)`);
  check(
    row.digits.length === 0,
    "the row shows no score",
    `row showed number(s) that read as a score: ${row.digits.join(", ")}`,
  );
  console.log(`    row: ${row.text}`);
}

const noisy = [...new Set(errors)].filter((e) => !/ERR_CONNECTION_RESET|fonts\.g/.test(e));
if (noisy.length) bad(`console errors: ${noisy.slice(0, 3).join(" | ")}`);

await browser.close();
process.exit(report() ? 1 : 0);
