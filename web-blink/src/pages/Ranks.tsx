/**
 * Blink — leaderboards.
 *
 * The board ranks how well a profile is optimized. Follower count, reach and
 * fame are not inputs to the Blink Score and are not stored, so they cannot
 * buy a position here — a small account with a coherent profile outranks a
 * large one with a muddled profile whenever its score says so. That claim is
 * stated on the page because it is the whole premise.
 */

import { motion } from "framer-motion";
import { Crown, Info, Trophy, Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { AppShell } from "@/components/app/AppShell";
import { EmptyState, ErrorState, SkeletonList } from "@/components/app/states";
import { MovementIndicator } from "@/components/app/stats";
import { formatRank } from "@/lib/app-nav";
import { useAuth } from "@/hooks/useAuth";
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

    // The standings themselves are the page — a failure there is a real error.
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
    <AppShell
      title="Ranks"
      subtitle="Ranked by how optimized a profile is. Not by followers."
      wide
    >
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
              categories={load.data.categories}
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

function BoardTabs({
  board,
  onChange,
}: {
  board: Board;
  onChange: (board: Board) => void;
}) {
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

function CategoryPicker({
  categories,
  selected,
  onSelect,
}: {
  categories: string[];
  selected: string | null;
  onSelect: (category: string | null) => void;
}) {
  if (categories.length === 0) {
    return (
      <p className="text-sm text-white/40">
        No categories yet. They appear once profiles are analyzed and classified.
      </p>
    );
  }

  return (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
      <CategoryChip label="All" active={selected === null} onClick={() => onSelect(null)} />
      {categories.map((c) => (
        <CategoryChip
          key={c}
          label={c}
          active={selected === c}
          onClick={() => onSelect(c)}
        />
      ))}
    </div>
  );
}

function CategoryChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold capitalize transition-colors",
        active
          ? "bg-blink-sky text-blink-navy"
          : "border border-white/10 text-white/60 hover:text-white",
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
  if (entries.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No ranked profiles yet"
        description="Standings appear once people analyze their own profile and choose to go public. Be the first."
      />
    );
  }

  const inList = me ? entries.some((e) => e.id === me.id) : false;

  return (
    <div className="space-y-2.5">
      {entries.map((entry, i) => (
        <RankRow
          key={entry.id}
          entry={entry}
          position={byCategory ? entry.categoryRank : entry.rank}
          index={i}
          isMe={entry.id === currentUserId}
        />
      ))}

      {/* Your own position, when you're outside the visible page. */}
      {me && !inList && (
        <>
          <p className="pt-2 text-center text-xs font-semibold text-white/30">Your position</p>
          <RankRow
            entry={me}
            position={byCategory ? me.categoryRank : me.rank}
            index={0}
            isMe
          />
        </>
      )}
    </div>
  );
}

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
  const name = entry.displayName ?? (entry.handle ? `@${entry.handle}` : "Anonymous");

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 320, damping: 32, delay: Math.min(index * 0.03, 0.3) }}
      className={cn(
        "flex items-center gap-3 rounded-2xl border p-3.5 sm:gap-4 sm:p-4",
        isMe
          ? "border-blink-sky/35 bg-blink-sky/[0.07]"
          : "border-white/[0.07] bg-white/[0.03]",
      )}
    >
      <span
        className={cn(
          "w-10 shrink-0 text-center text-sm font-extrabold tabular-nums sm:w-12 sm:text-base",
          position <= 3 ? "text-blink-sky" : "text-white/45",
        )}
      >
        {formatRank(position)}
      </span>

      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 truncate text-sm font-bold text-white">
          <span className="truncate">{name}</span>
          {isMe && (
            <span className="shrink-0 rounded-full bg-blink-sky px-2 py-0.5 text-[0.6rem] font-bold text-blink-navy">
              You
            </span>
          )}
        </p>
        <p className="mt-0.5 truncate text-xs text-white/40">
          {tier.label}
          {entry.category && <span className="capitalize"> · {entry.category}</span>}
          {entry.streak > 0 && <span> · {entry.streak}w streak</span>}
        </p>
      </div>

      <div className="hidden shrink-0 text-right sm:block">
        <MovementIndicator movement={entry.movement} />
        <p className="mt-0.5 text-[0.65rem] text-white/25">peak {entry.peakScore}</p>
      </div>

      <span className="w-12 shrink-0 text-right text-base font-extrabold tabular-nums text-white sm:w-14 sm:text-lg">
        {entry.score}
      </span>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------

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

  // Newest week first; the overall winner (null category) leads its group.
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
              {new Date(week).toLocaleDateString(undefined, {
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
  const name = winner.displayName ?? (winner.handle ? `@${winner.handle}` : "Anonymous");

  return (
    <div
      className={cn(
        "flex items-center gap-4 rounded-2xl border p-4",
        overall
          ? "border-blink-sky/30 bg-blink-sky/[0.07]"
          : "border-white/[0.07] bg-white/[0.03]",
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
        <p className="mt-0.5 text-xs capitalize text-white/40">
          {overall ? "Overall winner" : `${winner.category} winner`}
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
