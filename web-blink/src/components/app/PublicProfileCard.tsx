/**
 * Blink — the public profile presentation.
 *
 * One component for your own profile and for anyone you open from the
 * leaderboard, so the two can't drift apart.
 *
 * **This is a profile, not a dashboard.** The previous version stacked three
 * bordered panels and a grid of six identical tiles, which is what a database
 * record looks like when you print it. Everything here now sits directly on the
 * page: the identity block has no container, the standing is a line of facts
 * separated by rules rather than boxed tiles, and the record is a shelf of
 * drawn emblems. Exactly one element keeps a border — the Instagram button —
 * because it is the only thing on the page you can press to leave.
 *
 * Rank claims are the delicate part. A stored `category` string is not
 * evidence of a category standing — the profile may be private, may have no
 * verified analysis, or may simply not be in that board. So every claim here
 * is driven by a real leaderboard row, and anything we don't have is omitted
 * rather than shown as a placeholder. The same rule governs perception: it is
 * only rendered when the caller actually has the analysis, which is why the
 * field is optional and never invented for someone else's profile.
 */

import { motion } from "framer-motion";
import { Instagram } from "lucide-react";

import { AvatarPreview } from "@/components/app/IdentityForm";
import { BadgeShelf } from "@/components/app/BadgeEmblem";
import { formatRank } from "@/lib/app-nav";
import { buildBadges } from "@/lib/badges";
import { categoryLabel } from "@/lib/categories";
import { countryName, flagEmoji } from "@/lib/countries";
import type { LeaderboardEntry } from "@/lib/leaderboard";
import { MAX_SCORE, getTier } from "@/lib/ranking";
import { cn } from "@/lib/utils";

export interface PublicProfileView {
  displayName: string | null;
  handle: string | null;
  avatarUrl: string | null;
  country: string | null;
  instagramUrl: string | null;
  score: number;
  peakScore: number;
  verifiedCount: number;
  streak: number;
  /** The user's real row on the global board, or null if they aren't on it. */
  standing: LeaderboardEntry | null;
  bestRank: number | null;
  /** Points since the previous verified analysis. */
  momentumDelta: number;
  /**
   * How the profile reads, from the most recent analysis.
   *
   * Only supplied where the caller genuinely has it — your own profile. It is
   * never derived for someone else, because the leaderboard row doesn't carry
   * an analysis and guessing one would be fiction.
   */
  perception?: {
    firstImpression: string | null;
    traits: string[];
  } | null;
}

export function PublicProfileCard({
  view,
  isMe = false,
}: {
  view: PublicProfileView;
  isMe?: boolean;
}) {
  const name = view.displayName || (view.handle ? `@${view.handle}` : "Anonymous");
  const tier = getTier(view.score);
  const progress = Math.min(100, (view.score / MAX_SCORE) * 100);

  // Only claim a category standing when there is an actual row in that board.
  const categoryClaim =
    view.standing?.category && view.standing.categoryRank > 0
      ? { label: categoryLabel(view.standing.category)!, rank: view.standing.categoryRank }
      : null;

  const badges = buildBadges(
    {
      bestRank: view.bestRank,
      peakScore: view.peakScore,
      movement: view.standing?.movement ?? null,
      momentumDelta: view.momentumDelta,
      streak: view.streak,
      verifiedCount: view.verifiedCount,
    },
    isMe,
  );

  return (
    <div className="space-y-9">
      {/* Identity — on the page, not in a box. */}
      <section className="flex items-center gap-4">
        <AvatarPreview url={view.avatarUrl} name={name} size={72} />

        <div className="min-w-0 flex-1">
          <h2 className="flex items-center gap-2 text-xl font-extrabold leading-tight tracking-tight text-white">
            <span className="truncate">{name}</span>
            {view.country && (
              <span
                className="shrink-0 text-base"
                title={countryName(view.country) ?? view.country}
                aria-label={countryName(view.country) ?? view.country}
              >
                {flagEmoji(view.country)}
              </span>
            )}
          </h2>

          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            {view.handle && (
              <span className="text-sm font-semibold text-white/45">@{view.handle}</span>
            )}
            {categoryClaim && (
              <span className="rounded-full bg-blink-sky/12 px-2.5 py-0.5 text-[0.68rem] font-bold text-blink-sky">
                {categoryClaim.label}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Standing — the numbers, as a headline plus a rule-separated row. */}
      <section>
        <p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-white/35">
          Blink Score
        </p>
        <div className="mt-1 flex items-baseline gap-3">
          <span className="text-[3.25rem] font-extrabold leading-[0.9] tabular-nums tracking-tight text-white">
            {view.score}
          </span>
          <span className="text-sm font-bold uppercase tracking-[0.12em] text-blink-sky">
            {tier.label}
          </span>
        </div>

        <div className="mt-4 h-1 overflow-hidden rounded-full bg-white/[0.08]">
          <motion.div
            className="h-full rounded-full bg-blink-sky"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>

        <dl className="mt-4 flex items-stretch">
          <Fact
            label="Global"
            /* Never "#—": if they aren't ranked, say so plainly. */
            value={view.standing ? formatRank(view.standing.rank) : "Unranked"}
            muted={!view.standing}
          />
          {categoryClaim && (
            <Fact
              label={categoryClaim.label}
              value={formatRank(categoryClaim.rank)}
            />
          )}
          <Fact
            label="Verified"
            value={String(view.verifiedCount)}
            muted={view.verifiedCount === 0}
          />
        </dl>
      </section>

      {view.perception && <Perception perception={view.perception} isMe={isMe} />}

      {/* The only bordered control on the page, because it's the only exit. */}
      {view.instagramUrl && (
        <a
          href={view.instagramUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-white/[0.06] text-sm font-bold text-white ring-1 ring-white/[0.12] transition-colors hover:bg-white/[0.11]"
        >
          <Instagram className="h-4 w-4" />
          {isMe ? "Your Instagram" : `View on Instagram`}
        </a>
      )}

      <BadgeShelf badges={badges} title={isMe ? "Your record" : "Record"} />
    </div>
  );
}

/** One number in the standing row, separated by a rule rather than a border. */
function Fact({
  label,
  value,
  muted = false,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex-1 border-l border-white/[0.08] px-3 first:border-l-0 first:pl-0">
      <dt className="text-[0.62rem] font-bold uppercase tracking-[0.12em] text-white/35">
        {label}
      </dt>
      <dd
        className={cn(
          "mt-1 text-lg font-extrabold tabular-nums leading-none",
          muted ? "text-white/35" : "text-white",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

/**
 * How the profile reads.
 *
 * This is the part that makes the page a Blink profile rather than a scoreboard
 * entry — the score says how well it reads, this says what it reads *as*.
 */
function Perception({
  perception,
  isMe,
}: {
  perception: NonNullable<PublicProfileView["perception"]>;
  isMe: boolean;
}) {
  if (!perception.firstImpression && perception.traits.length === 0) return null;

  return (
    <section>
      <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-white/40">
        {isMe ? "How you read" : "How they read"}
      </h3>
      {perception.firstImpression && (
        <p className="mt-3 text-[1.35rem] font-extrabold leading-snug tracking-tight text-white">
          {perception.firstImpression}
        </p>
      )}
      {perception.traits.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {perception.traits.map((trait) => (
            <span
              key={trait}
              className="rounded-full bg-white/[0.07] px-3 py-1 text-xs font-semibold text-white/70"
            >
              {trait}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}
