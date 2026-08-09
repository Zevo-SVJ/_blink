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
 */

import { motion } from "framer-motion";
import { Crown, Info, Rocket, Trophy } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { AppShell } from "@/components/app/AppShell";
import { EmptyState, ErrorState, SkeletonList } from "@/components/app/states";
import { useAuth } from "@/hooks/useAuth";
import { formatRank } from "@/lib/app-nav";
import { categoryBlurb, categoryLabel, orderCategories } from "@/lib/categories";
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

type Board = "global" | "category" | "winners";

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
  const [board, setBoard] = useState<Board>("global");
  const [category, setCategory] = useState<string | null>(null);
  const [load, setLoad] = useState<Load>({ state: "loading" });

  const refresh = useCallback(async () => {
    setLoad({ state: "loading" });

    const [entriesRes, categoriesRes, winnersRes, meRes] = await Promise.all([
      fetchLeaderboard(board === "category" ? category : null),
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
  }, [board, category, user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <AppShell title="Ranks" subtitle="Ranked by how optimized a profile is. Not by followers." wide>
      <BoardTabs
        board={board}
        onChange={(next) => {
          setBoard(next);
          if (next !== "category") setCategory(null);
        }}
      />

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
        <div className="mt-6 space-y-6">
          {board === "category" && (
            <CategoryPicker
              present={load.data.categories}
              selected={category}
              onSelect={setCategory}
            />
          )}

          {board === "winners" ? (
            <WinnersBoard winners={load.data.winners} />
          ) : (
            <StandingsBoard
              entries={load.data.entries}
              me={load.data.me}
              byCategory={board === "category"}
              currentUserId={user?.id}
            />
          )}

          <FairnessNote />
        </div>
      )}
    </AppShell>
  );
}

// ---------------------------------------------------------------------------

function BoardTabs({ board, onChange }: { board: Board; onChange: (b: Board) => void }) {
  const tabs: Array<{ id: Board; label: string }> = [
    { id: "global", label: "Global" },
    { id: "category", label: "Categories" },
    { id: "winners", label: "Winners" },
  ];

  return (
    <div className="flex gap-1 rounded-2xl border border-white/[0.07] bg-white/[0.03] p-1">
      {tabs.map((tab) => {
        const active = board === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              "relative flex-1 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
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

/** Full archetype list, with the ones that actually have profiles listed first. */
function CategoryPicker({
  present,
  selected,
  onSelect,
}: {
  present: string[];
  selected: string | null;
  onSelect: (category: string | null) => void;
}) {
  const ordered = orderCategories(present);
  const presentSet = new Set(present.map((c) => c.toLowerCase()));
  const blurb = categoryBlurb(selected);

  return (
    <div>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        <CategoryChip label="All" active={selected === null} onClick={() => onSelect(null)} />
        {ordered.map((c) => (
          <CategoryChip
            key={c.id}
            label={c.label}
            active={selected === c.id}
            dim={!presentSet.has(c.id)}
            onClick={() => onSelect(c.id)}
          />
        ))}
      </div>
      {blurb && <p className="mt-3 px-1 text-xs leading-relaxed text-white/40">{blurb}</p>}
    </div>
  );
}

function CategoryChip({
  label,
  active,
  dim = false,
  onClick,
}: {
  label: string;
  active: boolean;
  dim?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold transition-colors",
        active
          ? "bg-blink-sky text-blink-navy"
          : dim
            ? "border border-white/[0.07] text-white/35 hover:text-white/60"
            : "border border-white/10 text-white/70 hover:text-white",
      )}
    >
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------

function StandingsBoard({
  entries,
  me,
  byCategory,
  currentUserId,
}: {
  entries: LeaderboardEntry[];
  me: LeaderboardEntry | null;
  byCategory: boolean;
  currentUserId?: string;
}) {
  if (entries.length === 0) return <LaunchState byCategory={byCategory} />;

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
        />
      ))}

      {me && !inList && (
        <>
          <p className="pt-2 text-center text-xs font-semibold text-white/30">Your position</p>
          <RankRow entry={me} position={byCategory ? me.categoryRank : me.rank} index={0} isMe />
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
}: {
  entry: LeaderboardEntry;
  position: number;
  index: number;
  isMe: boolean;
}) {
  const tier = getTier(entry.score);
  const name = entry.handle ? `@${entry.handle}` : (entry.displayName ?? "Anonymous");
  const secondary = entry.handle ? entry.displayName : null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 320, damping: 32, delay: Math.min(index * 0.03, 0.25) }}
      className={cn(
        "flex items-center gap-3 rounded-2xl border p-3",
        isMe ? "border-blink-sky/35 bg-blink-sky/[0.07]" : "border-white/[0.07] bg-white/[0.03]",
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
    </motion.div>
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
function LaunchState({ byCategory }: { byCategory: boolean }) {
  const navigate = useNavigate();

  return (
    <div className="rounded-3xl border border-white/[0.07] bg-white/[0.03] p-7 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blink-sky/15">
        <Rocket className="h-6 w-6 text-blink-sky" />
      </div>
      <p className="mt-4 text-base font-bold text-white">
        {byCategory ? "Nobody ranked here yet" : "The board is still filling up"}
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
        className="mt-6 rounded-2xl bg-blink-sky px-6 py-3 text-sm font-bold text-blink-navy transition-transform hover:scale-[1.02]"
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
        "flex items-center gap-4 rounded-2xl border p-4",
        overall ? "border-blink-sky/30 bg-blink-sky/[0.07]" : "border-white/[0.07] bg-white/[0.03]",
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
    <div className="flex gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
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
