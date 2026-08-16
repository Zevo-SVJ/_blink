/**
 * Blink — leaderboards.
 *
 * Ordered by Blink Score alone. Follower count, reach and verification are not
 * columns in this system, so they cannot buy a position: a small account with a
 * coherent profile sits above a celebrity with a muddled one whenever its score
 * says so.
 *
 * There is no seed data anywhere in this file. An empty board renders a launch
 * state explaining how standings fill up — inventing plausible-looking rivals
 * would make the one number users are trying to beat a fiction.
 *
 * The board and its categories are **one surface**, not two tabs. Splitting
 * them meant the first question a user has — "where do I rank?" — was answered
 * by a global list, and finding your own category took a deliberate detour
 * into what read as a database filter. Now the category strip sits directly
 * above the standings and switching it re-ranks in place.
 */

import { AnimatePresence, motion } from "framer-motion";
import { Crown, Info, Rocket, ScanLine, Trophy, UserPlus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { AddSomeoneSheet } from "@/components/app/AddSomeoneSheet";
import { AppShell } from "@/components/app/AppShell";
import { EmptyState, ErrorState, SkeletonList } from "@/components/app/states";
import { useAuth } from "@/hooks/useAuth";
import { formatRank } from "@/lib/app-nav";
import { isClaimed, VerifiedMark } from "@/components/app/VerifiedMark";
import { useI18n, useT } from "@/lib/i18n";
import { categoryBlurb, categoryLabel, pickerCategories } from "@/lib/categories";
import {
  analyzedCategories,
  fetchAnalyzedProfiles,
  rankAnalyzed,
  type AnalyzedProfile,
} from "@/lib/analyzed-profiles";
import { countryName, flagEmoji } from "@/lib/countries";
import { fetchMySuggestions, type PendingSuggestion } from "@/lib/leaderboard-suggestions";
import {
  fetchCategories,
  fetchLeaderboard,
  fetchMyStanding,
  fetchWeeklyWinners,
  type LeaderboardEntry,
  type WeeklyWinner,
} from "@/lib/leaderboard";
import { getTier, tierLabel } from "@/lib/ranking";
import { cn } from "@/lib/utils";

type Board = "standings" | "winners" | "analyzed";

interface BoardData {
  entries: LeaderboardEntry[];
  /** Profiles this user has analysed. Private to them. */
  analyzed: AnalyzedProfile[];
  /** Handles suggested but not yet analysed. Also private to this user. */
  pending: PendingSuggestion[];
  categories: string[];
  winners: WeeklyWinner[];
  me: LeaderboardEntry | null;
}

type Load =
  | { state: "loading" }
  | { state: "error"; message: string }
  | { state: "ready"; data: BoardData };

export default function Ranks() {
  const { user } = useAuth();
  const [board, setBoard] = useState<Board>("standings");
  const [adding, setAdding] = useState(false);
  const [category, setCategory] = useState<string | null>(null);
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const t = useT();

  const refresh = useCallback(async () => {
    setLoad({ state: "loading" });

    const [entriesRes, categoriesRes, winnersRes, meRes, analyzedRes, pendingRes] =
      await Promise.all([
      fetchLeaderboard(category),
      fetchCategories(),
      fetchWeeklyWinners(),
      user ? fetchMyStanding(user.id) : Promise.resolve({ status: "ok" as const, data: null }),
      // Private to this user — see `analyzed-profiles`. A failure here must not
      // take down the public board, so it degrades to an empty list.
      user
        ? fetchAnalyzedProfiles(user.id)
        : Promise.resolve({ status: "ok" as const, data: [] as AnalyzedProfile[] }),
      user
        ? fetchMySuggestions(user.id)
        : Promise.resolve({ status: "ok" as const, data: [] as PendingSuggestion[] }),
    ]);

    // The standings are the page — a failure there is a real error.
    if (entriesRes.status === "error") {
      setLoad({ state: "error", message: entriesRes.message });
      return;
    }

    setLoad({
      state: "ready",
      data: {
        entries: entriesRes.data,
        categories: categoriesRes.status === "ok" ? categoriesRes.data : [],
        winners: winnersRes.status === "ok" ? winnersRes.data : [],
        me: meRes.status === "ok" ? meRes.data : null,
        analyzed: analyzedRes.status === "ok" ? analyzedRes.data : [],
        pending: pendingRes.status === "ok" ? pendingRes.data : [],
      },
    });
  }, [category, user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <AppShell
      title={t.ranksPage.title}
      subtitle={t.ranksPage.subtitle}
      wide
      action={
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full bg-white/[0.06] px-3.5 text-xs font-bold text-white/80 ring-1 ring-white/10 transition-colors hover:bg-white/[0.11]"
        >
          <UserPlus className="h-3.5 w-3.5" aria-hidden />
          {t.ranksPage.addSomeone}
        </button>
      }
    >
      <AddSomeoneSheet open={adding} onClose={() => setAdding(false)} />

      <BoardTabs board={board} onChange={setBoard} />

      {load.state === "loading" && (
        <div className="mt-6">
          <SkeletonList rows={6} />
        </div>
      )}

      {load.state === "error" && (
        <div className="mt-6">
          <ErrorState message={load.message} onRetry={() => void refresh()} />
        </div>
      )}

      {load.state === "ready" && (
        <div className="mt-5 space-y-5">
          {board === "standings" && (
            <>
              {/* A category holding only profiles you analysed still has
                  something in it, so it counts as "present" — otherwise the
                  board you can actually fill would look permanently empty. */}
              <CategoryPicker
                present={[
                  ...load.data.categories,
                  ...analyzedCategories(load.data.analyzed),
                ]}
                selected={category}
                onSelect={setCategory}
              />
              <StandingsBoard
                entries={load.data.entries}
                analyzed={load.data.analyzed}
                me={load.data.me}
                category={category}
                currentUserId={user?.id}
              />
            </>
          )}

          {board === "analyzed" && (
            <AnalyzedBoard
              profiles={load.data.analyzed}
              pending={load.data.pending}
              category={category}
              onSelectCategory={setCategory}
            />
          )}

          {board === "winners" && <WinnersBoard winners={load.data.winners} />}

          <FairnessNote />
        </div>
      )}
    </AppShell>
  );
}

// ---------------------------------------------------------------------------

/**
 * The people this user has analysed.
 *
 * Same row language as the public standings so it reads as one product, with
 * one deliberate difference: a line saying who can see it. These profiles are
 * registered in Ranks but not published — being analysed does not put anyone
 * on the public board — and that distinction has to be visible rather than
 * merely true.
 */
function AnalyzedBoard({
  profiles,
  pending,
  category,
  onSelectCategory,
}: {
  profiles: AnalyzedProfile[];
  pending: PendingSuggestion[];
  category: string | null;
  onSelectCategory: (c: string | null) => void;
}) {
  const t = useT();
  const ranked = rankAnalyzed(profiles, category);
  // Someone already analysed is ranked; the suggestion is spent.
  const known = new Set(profiles.map((p) => p.handle));
  const waiting = pending.filter((s) => !known.has(s.handle));

  if (profiles.length === 0 && waiting.length === 0) {
    return (
      <EmptyState
        icon={ScanLine}
        title={t.ranksPage.emptyAnalyzedTitle}
        description={t.ranksPage.analyzedEmptyBody}
      />
    );
  }

  return (
    <div className="space-y-5">
      <CategoryPicker
        present={analyzedCategories(profiles)}
        selected={category}
        onSelect={onSelectCategory}
      />

      <p className="text-[0.7rem] leading-relaxed text-white/35">
        Only you can see these. Analyzing a profile ranks it for you — it does
        not add anyone to the public leaderboard.
      </p>

      {ranked.length === 0 ? (
        <EmptyState
          icon={ScanLine}
          title={t.ranksPage.emptyCategoryTitle}
          description={t.ranksPage.emptyCategoryBody}
        />
      ) : (
        <ul className="space-y-2">
          {ranked.map((p, i) => (
            <li key={p.handle}>
              <Link
                to={`/library/${p.analysisId}`}
                className="flex min-h-[64px] items-center gap-3 rounded-2xl bg-white/[0.04] px-3.5 py-3 ring-1 ring-white/[0.07] transition-colors hover:bg-white/[0.07]"
              >
                <span className="w-7 shrink-0 text-center text-sm font-extrabold tabular-nums text-white/45">
                  {i + 1}
                </span>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blink-sky/15 text-sm font-extrabold text-blink-sky">
                  {p.handle.charAt(0).toUpperCase()}
                </span>
                {/* No `VerifiedMark` here, and there must never be one.
                    These rows are people someone *analysed*; nobody has
                    proved they control the account. The mark means "the owner
                    claimed this profile through Blink", which is exactly what
                    an analysed stranger has not done. */}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-white">
                    @{p.handle}
                  </span>
                  <span className="block truncate text-[0.7rem] text-white/40">
                    {categoryLabel(p.category, t) ?? t.ranksPage.uncategorized}
                    {p.runs > 1 ? ` · ${p.runs} ${t.ranksPage.scans}` : ""}
                  </span>
                </span>
                <span className="shrink-0 text-base font-extrabold tabular-nums text-white">
                  {p.score}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {waiting.length > 0 && (
        <div>
          <p className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-white/35">
            {t.ranksPage.suggested}
          </p>
          <ul className="mt-2.5 space-y-2">
            {waiting.map((s) => (
              <li
                key={s.handle}
                className="flex min-h-[52px] items-center gap-3 rounded-2xl bg-white/[0.025] px-3.5 py-2.5 ring-1 ring-dashed ring-white/[0.09]"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-xs font-extrabold text-white/45">
                  {s.handle.charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-bold text-white/70">
                  @{s.handle}
                </span>
                <span className="shrink-0 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-white/30">
                  Pending
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[0.7rem] leading-relaxed text-white/30">
            A suggestion has no score until the profile is analyzed. Run an
            analysis on their screenshot to rank them.
          </p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function BoardTabs({ board, onChange }: { board: Board; onChange: (b: Board) => void }) {
  const t = useT();
  const tabs: Array<{ id: Board; label: string }> = [
    { id: "standings", label: t.ranksPage.tabStandings },
    { id: "analyzed", label: t.ranksPage.tabAnalyzed },
    { id: "winners", label: t.ranksPage.tabWinners },
  ];

  return (
    <div className="flex gap-1 rounded-2xl bg-white/[0.05] p-1 ring-1 ring-white/[0.07]">
      {tabs.map((tab) => {
        const active = board === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              "relative min-h-[44px] flex-1 rounded-xl px-3 text-sm font-semibold transition-colors",
              active ? "text-blink-navy" : "text-white/55 hover:text-white",
            )}
          >
            {active && (
              <motion.span
                layoutId="ranks-tab"
                className="absolute inset-0 rounded-xl bg-blink-sky"
                transition={{ type: "spring", stiffness: 420, damping: 36 }}
              />
            )}
            <span className="relative">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * The category strip.
 *
 * Every canonical category is always offered — see `pickerCategories`. The
 * strip scrolls horizontally on a phone rather than wrapping to three rows,
 * and the active pill is a shared `layoutId` so switching reads as one object
 * moving rather than two colours swapping.
 *
 * `present` still matters: a category nobody is ranked in yet is dimmed, so
 * the strip tells you where the population is without hiding anywhere you
 * might belong.
 */
function CategoryPicker({
  present,
  selected,
  onSelect,
}: {
  present: string[];
  selected: string | null;
  onSelect: (category: string | null) => void;
}) {
  const t = useT();
  const categories = pickerCategories(present);
  const populated = new Set(present.map((c) => c.toLowerCase()));
  const blurb = categoryBlurb(selected, t);

  return (
    <div>
      {/* Edge fades signal there is more to scroll without a scrollbar. */}
      <div className="relative">
        <div className="scrollbar-none -mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          <CategoryChip
            label={t.ranksPage.all}
            active={selected === null}
            populated
            onClick={() => onSelect(null)}
          />
          {categories.map((c) => (
            <CategoryChip
              key={c.id}
              label={categoryLabel(c.id, t) ?? c.label}
              active={selected === c.id}
              populated={populated.has(c.id)}
              onClick={() => onSelect(c.id)}
            />
          ))}
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-blink-navy to-transparent sm:hidden"
        />
      </div>

      <AnimatePresence mode="wait">
        {blurb && (
          <motion.p
            key={selected}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden text-xs leading-relaxed text-white/40"
          >
            <span className="block pt-3">{blurb}</span>
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

function CategoryChip({
  label,
  active,
  populated,
  onClick,
}: {
  label: string;
  active: boolean;
  populated: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "relative shrink-0 snap-start whitespace-nowrap rounded-full px-4 py-2.5 text-xs font-bold transition-colors",
        active
          ? "text-blink-navy"
          : populated
            ? "text-white/70 ring-1 ring-white/10 hover:text-white"
            : "text-white/35 ring-1 ring-white/[0.06] hover:text-white/60",
      )}
    >
      {active && (
        <motion.span
          layoutId="ranks-category-pill"
          className="absolute inset-0 rounded-full bg-blink-sky"
          transition={{ type: "spring", stiffness: 420, damping: 36 }}
        />
      )}
      <span className="relative">{label}</span>
    </button>
  );
}

// ---------------------------------------------------------------------------

function StandingsBoard({
  entries,
  analyzed,
  me,
  category,
  currentUserId,
}: {
  entries: LeaderboardEntry[];
  /** Profiles this user analysed. Visible to them, and to nobody else. */
  analyzed: AnalyzedProfile[];
  me: LeaderboardEntry | null;
  category: string | null;
  currentUserId?: string;
}) {
  const navigate = useNavigate();
  const t = useT();
  const byCategory = category !== null;

  /*
    People you analysed belong on the board you actually look at.

    They used to live only behind the "Analyzed" tab, which made the whole
    feature effectively invisible: you analysed someone, went to Ranks, and
    they were not there. So they are merged into the standings — under All and
    inside their category — and ordered by the same score.

    This does not publish anyone. These rows come from `analyses`, which is
    self-read under RLS: they are in *your* board because you created them, and
    another user's board cannot contain them. The row says so, carries no
    claimed mark, and opens the analysis rather than a public profile.
  */
  const mine = rankAnalyzed(analyzed, category);
  const isEmpty = entries.length === 0 && mine.length === 0;
  if (isEmpty) return <LaunchState category={category} />;

  const inList = me ? entries.some((e) => e.id === me.id) : false;

  /**
   * One list, ordered by score, with each row remembering what it is.
   *
   * Merging on score rather than concatenating is the point: a profile you
   * analysed at 890 sits above a public one at 700, which is what makes the
   * board readable as a single ranking instead of two lists stapled together.
   */
  const rows = [
    ...entries.map((entry) => ({ kind: "public" as const, score: entry.score, entry })),
    ...mine.map((profile) => ({ kind: "mine" as const, score: profile.score, profile })),
  ].sort((a, b) => b.score - a.score);

  return (
    <div className="space-y-2">
      {rows.map((row, i) =>
        row.kind === "public" ? (
          <RankRow
            key={row.entry.id}
            entry={row.entry}
            position={byCategory ? row.entry.categoryRank : row.entry.rank}
            index={i}
            isMe={row.entry.id === currentUserId}
            onOpen={() =>
              navigate(row.entry.id === currentUserId ? "/profile" : `/u/${row.entry.id}`)
            }
          />
        ) : (
          <AnalyzedRow
            key={`analyzed-${row.profile.handle}`}
            profile={row.profile}
            position={i + 1}
            index={i}
          />
        ),
      )}

      {me && !inList && (
        <>
          <p className="pt-2 text-center text-xs font-semibold text-white/30">{t.ranksPage.yourPosition}</p>
          <RankRow
            entry={me}
            position={byCategory ? me.categoryRank : me.rank}
            index={0}
            isMe
            onOpen={() => navigate("/profile")}
          />
        </>
      )}
    </div>
  );
}

/**
 * A profile *you* analysed, on the standings board.
 *
 * Deliberately the same row language as `RankRow` — same height, same rhythm,
 * same score treatment — because it is the same ranking. Three things differ,
 * and each is load-bearing:
 *
 *  - **No claimed mark, ever.** Nobody has proved they control this account.
 *  - **A "private" chip**, because this row is in your board only. Without it
 *    a user would reasonably read a stranger as publicly ranked, which would
 *    be a claim Blink cannot make about someone who never opted in.
 *  - **It opens the analysis**, not a public profile, since there is no public
 *    profile to open.
 */
function AnalyzedRow({
  profile,
  position,
  index,
}: {
  profile: AnalyzedProfile;
  position: number;
  index: number;
}) {
  const t = useT();

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        type: "spring",
        stiffness: 320,
        damping: 32,
        delay: Math.min(index * 0.03, 0.25),
      }}
    >
      <Link
        to={`/library/${profile.analysisId}`}
        className="flex min-h-[64px] w-full items-center gap-3 rounded-2xl bg-white/[0.03] px-3 py-2.5 ring-1 ring-white/[0.06] transition-colors hover:bg-white/[0.06] sm:gap-4 sm:px-4"
      >
        <span className="w-7 shrink-0 text-center text-sm font-extrabold tabular-nums text-white/45">
          {position}
        </span>

        <span
          aria-hidden
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blink-sky/12 text-sm font-extrabold text-blink-sky"
        >
          {profile.handle.charAt(0).toUpperCase()}
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-sm font-bold text-white">@{profile.handle}</span>
            {/* Never a VerifiedMark here — see the note above. */}
            <span className="shrink-0 rounded-full bg-white/[0.07] px-1.5 py-0.5 text-[0.55rem] font-bold uppercase tracking-[0.08em] text-white/40">
              {t.ranksPage.privateRow}
            </span>
          </span>
          <span className="mt-0.5 block truncate text-xs text-white/40">
            {categoryLabel(profile.category, t) ?? t.ranksPage.uncategorized}
            {profile.runs > 1 ? ` · ${profile.runs} ${t.ranksPage.scans}` : ""}
          </span>
        </span>

        <span className="w-11 shrink-0 text-right text-base font-extrabold tabular-nums text-white sm:w-14 sm:text-lg">
          {profile.score}
        </span>
      </Link>
    </motion.div>
  );
}

/**
 * Leaderboard row.
 *
 * Reads left to right as: where they sit, who they are, how they're moving,
 * what they scored.
 */
function RankRow({
  entry,
  position,
  index,
  isMe,
  onOpen,
}: {
  entry: LeaderboardEntry;
  position: number;
  index: number;
  isMe: boolean;
  onOpen: () => void;
}) {
  const t = useT();
  const tier = getTier(entry.score);
  const name = entry.handle ? `@${entry.handle}` : (entry.displayName ?? t.publicProfile.anonymous);
  const secondary = entry.handle ? entry.displayName : null;

  return (
    <motion.button
      type="button"
      onClick={onOpen}
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.99 }}
      transition={{ type: "spring", stiffness: 320, damping: 32, delay: Math.min(index * 0.03, 0.25) }}
      aria-label={`Open ${entry.handle ? `@${entry.handle}` : "profile"}`}
      className={cn(
        "flex min-h-[60px] w-full items-center gap-3 rounded-2xl p-3 text-left ring-1 transition-colors",
        isMe
          ? "bg-blink-sky/[0.08] ring-blink-sky/35 hover:bg-blink-sky/[0.12]"
          : "bg-white/[0.035] ring-white/[0.07] hover:bg-white/[0.06]",
      )}
    >
      <span
        className={cn(
          "w-7 shrink-0 text-center text-sm font-extrabold tabular-nums sm:w-9",
          position <= 3 ? "text-blink-sky" : "text-white/40",
        )}
      >
        {formatRank(position)}
      </span>

      <RowAvatar url={entry.avatarUrl} name={name} />

      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 truncate text-sm font-bold text-white">
          <span className="truncate">{name}</span>
          {/* Every row on this board is a profile whose owner claimed it — the
              `leaderboard` view filters to `verified_count > 0` — so the mark
              is driven by the same predicate rather than assumed from the
              board. Unlabelled: in a list of fifty rows the mark is repetition
              for a screen reader, and the row's own label already names the
              profile. */}
          {isClaimed(entry) && <VerifiedMark size={12} labelled={false} />}
          {entry.country && (
            <span
              className="shrink-0"
              title={countryName(entry.country) ?? entry.country}
              aria-label={countryName(entry.country) ?? entry.country}
            >
              {flagEmoji(entry.country)}
            </span>
          )}
          {isMe && (
            <span className="shrink-0 rounded-full bg-blink-sky px-1.5 py-0.5 text-[0.58rem] font-bold text-blink-navy">
              {t.ranksPage.you}
            </span>
          )}
        </p>
        <p className="mt-0.5 truncate text-xs text-white/40">
          {secondary ? `${secondary} · ` : ""}
          {tierLabel(tier, t)}
          {entry.category ? ` · ${categoryLabel(entry.category, t)}` : ""}
        </p>
      </div>

      <Movement movement={entry.movement} />

      <span className="w-11 shrink-0 text-right text-base font-extrabold tabular-nums text-white sm:w-14 sm:text-lg">
        {entry.score}
      </span>
    </motion.button>
  );
}

function RowAvatar({ url, name }: { url: string | null; name: string }) {
  const [failed, setFailed] = useState(false);

  if (url && !failed) {
    return (
      <img
        src={url}
        alt=""
        width={36}
        height={36}
        loading="lazy"
        onError={() => setFailed(true)}
        className="h-9 w-9 shrink-0 rounded-full object-cover"
      />
    );
  }

  return (
    <div
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[0.08] text-xs font-bold text-white/50"
      aria-hidden
    >
      {name.replace(/^@/, "").charAt(0).toUpperCase() || "?"}
    </div>
  );
}

/** ↑ / ↓ / — places moved since the last rank snapshot. */
function Movement({ movement }: { movement: number | null }) {
  const t = useT();
  if (movement === null) {
    return (
      <span className="w-8 shrink-0 text-center text-xs text-white/20" title={t.ranksPage.noMovement}>
        —
      </span>
    );
  }
  if (movement === 0) {
    return (
      <span className="w-8 shrink-0 text-center text-xs text-white/30" title={t.ranksPage.heldPosition}>
        —
      </span>
    );
  }

  const up = movement > 0;
  // A jump of several places is the signal worth surfacing loudly.
  const surging = Math.abs(movement) >= 3;

  return (
    <span
      className={cn(
        "flex w-8 shrink-0 items-center justify-center gap-0.5 rounded-full py-0.5 text-xs font-bold tabular-nums",
        up ? "text-emerald-300" : "text-amber-300",
        surging && (up ? "bg-emerald-400/12" : "bg-amber-400/12"),
      )}
      title={(up ? t.ranksPage.movedUp : t.ranksPage.movedDown).replace(
        "{n}",
        String(Math.abs(movement)),
      )}
    >
      {up ? "↑" : "↓"}
      {Math.abs(movement)}
    </span>
  );
}

// ---------------------------------------------------------------------------

/** Shown instead of a board when nobody is ranked yet. */
function LaunchState({ category }: { category: string | null }) {
  const navigate = useNavigate();
  const t = useT();
  const label = categoryLabel(category, t);

  return (
    <div className="rounded-3xl bg-white/[0.035] p-7 text-center ring-1 ring-white/[0.07]">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blink-sky/15">
        <Rocket className="h-6 w-6 text-blink-sky" />
      </div>
      <p className="mt-4 text-base font-bold text-white">
        {label
          ? t.ranksPage.launchTitleCategory.replace("{category}", label)
          : t.ranksPage.launchTitle}
      </p>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-white/50">
        {t.ranksPage.launchBody}
      </p>

      <ol className="mx-auto mt-5 max-w-xs space-y-2.5 text-left">
        {[
          t.ranksPage.launchStep1,
          t.ranksPage.launchStep2,
          t.ranksPage.launchStep3,
        ].map((step, i) => (
          <li key={i} className="flex gap-3">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blink-sky/20 text-[0.65rem] font-bold text-blink-sky">
              {i + 1}
            </span>
            <span className="text-xs leading-relaxed text-white/60">{step}</span>
          </li>
        ))}
      </ol>

      <button
        type="button"
        onClick={() => navigate("/analyze")}
        className="mt-6 min-h-[48px] rounded-2xl bg-blink-sky px-6 text-sm font-bold text-blink-navy transition-transform hover:scale-[1.02]"
      >
        Analyze your profile
      </button>
    </div>
  );
}

function WinnersBoard({ winners }: { winners: WeeklyWinner[] }) {
  const { lang, t } = useI18n();
  if (winners.length === 0) {
    return (
      <EmptyState
        icon={Trophy}
        title={t.ranksPage.noWinnersTitle}
        description={t.ranksPage.noWinnersBody}
      />
    );
  }

  const weeks = Array.from(new Set(winners.map((w) => w.weekStart)));

  return (
    <div className="space-y-6">
      {weeks.map((week) => {
        const group = winners.filter((w) => w.weekStart === week);
        const overall = group.find((w) => w.category === null);
        const categoryWinners = group.filter((w) => w.category !== null);

        return (
          <section key={week}>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-white/40">
              {t.ranksPage.weekOf}{" "}
              {new Date(week).toLocaleDateString(lang === "fr" ? "fr-FR" : "en-US", {
                month: "short",
                day: "numeric",
              })}
            </h3>
            {overall && <WinnerCard winner={overall} overall />}
            {categoryWinners.length > 0 && (
              <div className="mt-2.5 space-y-2.5">
                {categoryWinners.map((w) => (
                  <WinnerCard key={w.id} winner={w} />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

function WinnerCard({ winner, overall = false }: { winner: WeeklyWinner; overall?: boolean }) {
  const t = useT();
  const name = winner.handle ? `@${winner.handle}` : (winner.displayName ?? t.publicProfile.anonymous);

  return (
    <div
      className={cn(
        "flex items-center gap-4 rounded-2xl p-4 ring-1",
        overall ? "bg-blink-sky/[0.08] ring-blink-sky/30" : "bg-white/[0.035] ring-white/[0.07]",
      )}
    >
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
          overall ? "bg-blink-sky/20" : "bg-white/[0.05]",
        )}
      >
        <Crown className={cn("h-5 w-5", overall ? "text-blink-sky" : "text-white/40")} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-white">{name}</p>
        <p className="mt-0.5 text-xs text-white/40">
          {overall
            ? t.ranksPage.overallWinner
            : t.ranksPage.categoryWinner.replace("{category}", categoryLabel(winner.category, t) ?? "")}
        </p>
      </div>

      <div className="shrink-0 text-right">
        <p className="text-sm font-extrabold tabular-nums text-emerald-300">
          +{winner.improvement}
        </p>
        <p className="text-[0.65rem] text-white/30">{t.ranksPage.score} {winner.score}</p>
      </div>
    </div>
  );
}

function FairnessNote() {
  const t = useT();

  return (
    <div className="flex gap-3 rounded-2xl bg-white/[0.02] p-4 ring-1 ring-white/[0.06]">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-white/30" />
      <p className="text-xs leading-relaxed text-white/40">
        {t.ranksPage.fairness}
      </p>
    </div>
  );
}
