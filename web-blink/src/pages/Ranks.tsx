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
import { Crown, Info, Rocket, Trophy, UserPlus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { AddSomeoneSheet } from "@/components/app/AddSomeoneSheet";
import { AppShell } from "@/components/app/AppShell";
import { EmptyState, ErrorState, SkeletonList } from "@/components/app/states";
import { useAuth } from "@/hooks/useAuth";
import { formatRank } from "@/lib/app-nav";
import { categoryBlurb, categoryLabel, pickerCategories } from "@/lib/categories";
import { countryName, flagEmoji } from "@/lib/countries";
import {
  fetchCategories,
  fetchLeaderboard,
  fetchMyStanding,
  fetchWeeklyWinners,
  type LeaderboardEntry,
  type WeeklyWinner,
} from "@/lib/leaderboard";
import { getTier } from "@/lib/ranking";
import { cn } from "@/lib/utils";

type Board = "standings" | "winners";

interface BoardData {
  entries: LeaderboardEntry[];
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

  const refresh = useCallback(async () => {
    setLoad({ state: "loading" });

    const [entriesRes, categoriesRes, winnersRes, meRes] = await Promise.all([
      fetchLeaderboard(category),
      fetchCategories(),
      fetchWeeklyWinners(),
      user ? fetchMyStanding(user.id) : Promise.resolve({ status: "ok" as const, data: null }),
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
      },
    });
  }, [category, user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <AppShell
      title="Leaderboard"
      subtitle="Ranked by how optimized a profile is. Not by followers."
      wide
      action={
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full bg-white/[0.06] px-3.5 text-xs font-bold text-white/80 ring-1 ring-white/10 transition-colors hover:bg-white/[0.11]"
        >
          <UserPlus className="h-3.5 w-3.5" />
          Add someone
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
              <CategoryPicker
                present={load.data.categories}
                selected={category}
                onSelect={setCategory}
              />
              <StandingsBoard
                entries={load.data.entries}
                me={load.data.me}
                category={category}
                currentUserId={user?.id}
              />
            </>
          )}

          {board === "winners" && <WinnersBoard winners={load.data.winners} />}

          <FairnessNote />
        </div>
      )}
    </AppShell>
  );
}

// ---------------------------------------------------------------------------

function BoardTabs({ board, onChange }: { board: Board; onChange: (b: Board) => void }) {
  const tabs: Array<{ id: Board; label: string }> = [
    { id: "standings", label: "Standings" },
    { id: "winners", label: "Weekly winners" },
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
  const categories = pickerCategories(present);
  const populated = new Set(present.map((c) => c.toLowerCase()));
  const blurb = categoryBlurb(selected);

  return (
    <div>
      {/* Edge fades signal there is more to scroll without a scrollbar. */}
      <div className="relative">
        <div className="scrollbar-none -mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          <CategoryChip
            label="All"
            active={selected === null}
            populated
            onClick={() => onSelect(null)}
          />
          {categories.map((c) => (
            <CategoryChip
              key={c.id}
              label={c.label}
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
  me,
  category,
  currentUserId,
}: {
  entries: LeaderboardEntry[];
  me: LeaderboardEntry | null;
  category: string | null;
  currentUserId?: string;
}) {
  const navigate = useNavigate();
  const byCategory = category !== null;
  if (entries.length === 0) return <LaunchState category={category} />;

  const inList = me ? entries.some((e) => e.id === me.id) : false;

  return (
    <div className="space-y-2">
      {entries.map((entry, i) => (
        <RankRow
          key={entry.id}
          entry={entry}
          position={byCategory ? entry.categoryRank : entry.rank}
          index={i}
          isMe={entry.id === currentUserId}
          onOpen={() =>
            navigate(entry.id === currentUserId ? "/profile" : `/u/${entry.id}`)
          }
        />
      ))}

      {me && !inList && (
        <>
          <p className="pt-2 text-center text-xs font-semibold text-white/30">Your position</p>
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
  const tier = getTier(entry.score);
  const name = entry.handle ? `@${entry.handle}` : (entry.displayName ?? "Anonymous");
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
              You
            </span>
          )}
        </p>
        <p className="mt-0.5 truncate text-xs text-white/40">
          {secondary ? `${secondary} · ` : ""}
          {tier.label}
          {entry.category ? ` · ${categoryLabel(entry.category)}` : ""}
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
  if (movement === null) {
    return (
      <span className="w-8 shrink-0 text-center text-xs text-white/20" title="No movement recorded yet">
        —
      </span>
    );
  }
  if (movement === 0) {
    return (
      <span className="w-8 shrink-0 text-center text-xs text-white/30" title="Held position">
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
      title={`${up ? "Up" : "Down"} ${Math.abs(movement)} ${
        Math.abs(movement) === 1 ? "place" : "places"
      } since the last snapshot`}
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
  const label = categoryLabel(category);

  return (
    <div className="rounded-3xl bg-white/[0.035] p-7 text-center ring-1 ring-white/[0.07]">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blink-sky/15">
        <Rocket className="h-6 w-6 text-blink-sky" />
      </div>
      <p className="mt-4 text-base font-bold text-white">
        {label ? `Nobody is ranked in ${label} yet` : "The board is still filling up"}
      </p>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-white/50">
        Blink only ranks real, verified profiles — so the board starts empty rather than
        with placeholder names.
      </p>

      <ol className="mx-auto mt-5 max-w-xs space-y-2.5 text-left">
        {[
          "Analyze your own profile to get a Blink Score.",
          "Turn on leaderboard visibility in your profile.",
          "Improve, re-upload, and climb as changes are verified.",
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
  if (winners.length === 0) {
    return (
      <EmptyState
        icon={Trophy}
        title="No winners yet"
        description="Each week Blink crowns the biggest verified improvement overall and in every category. The first results land after a full week of analyses."
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
              Week of{" "}
              {new Date(week).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
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
  const name = winner.handle ? `@${winner.handle}` : (winner.displayName ?? "Anonymous");

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
          {overall ? "Overall winner" : `${categoryLabel(winner.category)} winner`}
        </p>
      </div>

      <div className="shrink-0 text-right">
        <p className="text-sm font-extrabold tabular-nums text-emerald-300">
          +{winner.improvement}
        </p>
        <p className="text-[0.65rem] text-white/30">score {winner.score}</p>
      </div>
    </div>
  );
}

function FairnessNote() {
  return (
    <div className="flex gap-3 rounded-2xl bg-white/[0.02] p-4 ring-1 ring-white/[0.06]">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-white/30" />
      <p className="text-xs leading-relaxed text-white/40">
        Blink ranks profile optimization and perception — never follower count, reach or
        fame. A 200-follower account can sit above a celebrity if its profile reads more
        clearly. Positions only move on a verified analysis of a new screenshot, so
        opening the app never earns progress.
      </p>
    </div>
  );
}
