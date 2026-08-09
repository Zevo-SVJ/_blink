/**
 * Development-only component gallery.
 *
 * Every authenticated screen sits behind Supabase, and this workspace has no
 * live credentials — so the app's own surfaces cannot be opened in a browser
 * to check how they actually render. Reviewing them by reading JSX is how
 * spacing bugs, collisions and clipped cards ship.
 *
 * This route mounts the real components with representative props so they can
 * be looked at, measured and iterated on at every width. It is registered only
 * under `import.meta.env.DEV` and is lazily imported, so it never reaches a
 * production bundle.
 *
 * It is a mirror, not a source of truth: everything here imports the shipping
 * component. If a component changes, this page changes with it.
 */

import { PageBackground } from "@/components/blink/PageBackground";
import { TabBar } from "@/components/app/AppShell";
import { BadgeShelf } from "@/components/app/BadgeEmblem";
import { ClimbSection } from "@/components/app/ClimbSection";
import { PublicProfileCard } from "@/components/app/PublicProfileCard";
import { AnalysisResult } from "@/components/analysis/AnalysisResult";
import { buildBadges } from "@/lib/badges";
import type { AnalysisResult as Analysis } from "@/lib/analysis";
import type { LeaderboardEntry } from "@/lib/leaderboard";
import { getTier, type ProfileStats } from "@/lib/ranking";
import { SAMPLE_ANALYSIS } from "@/lib/dev-mock";

const STANDING: LeaderboardEntry = {
  id: "u1",
  handle: "sam.dev",
  displayName: "Sam Devlin",
  avatarUrl: null,
  country: "FR",
  instagramUrl: "https://instagram.com/sam.dev",
  score: 812,
  peakScore: 840,
  category: "larp",
  streak: 5,
  verifiedCount: 11,
  rank: 7,
  categoryRank: 2,
  movement: 6,
};

const STATS: ProfileStats = {
  score: 812,
  tier: getTier(812),
  peakScore: 840,
  rank: 7,
  bestRank: 7,
  category: "larp",
  momentum: { direction: "up", delta: 44, label: "+44 since last update" },
  streak: 5,
  weeklyWins: 3,
  verifiedCount: 11,
};

export default function DevGallery() {
  // Deliberately mixed: two elite, three earned, one locked — the state a
  // real profile is actually in, and the only way to see the grades compared.
  const badges = buildBadges(
    {
      bestRank: 7,
      peakScore: 612,
      movement: 2,
      momentumDelta: 0,
      streak: 5,
      verifiedCount: 4,
    },
    true,
  );

  const lockedBadges = buildBadges(
    {
      bestRank: null,
      peakScore: 0,
      movement: null,
      momentumDelta: 0,
      streak: 0,
      verifiedCount: 0,
    },
    false,
  );

  return (
    <div className="relative min-h-screen overflow-x-hidden pb-24">
      <PageBackground />

      <div className="mx-auto w-full max-w-2xl space-y-14 px-4 pt-10 sm:px-6">
        <Block id="badges-earned" title="Badges — earned and elite">
          <BadgeShelf badges={badges} title="Record" />
        </Block>

        <Block id="badges-locked" title="Badges — locked">
          <BadgeShelf badges={lockedBadges} title="Record" />
        </Block>

        <Block id="profile-full" title="Public profile — full">
          <PublicProfileCard
            view={{
              displayName: "Sam Devlin",
              handle: "sam.dev",
              avatarUrl: null,
              country: "FR",
              instagramUrl: "https://instagram.com/sam.dev",
              score: 812,
              peakScore: 840,
              verifiedCount: 11,
              streak: 5,
              standing: STANDING,
              bestRank: 7,
              momentumDelta: 44,
              perception: {
                firstImpression: SAMPLE_ANALYSIS.firstImpression,
                traits: SAMPLE_ANALYSIS.traits,
              },
            }}
            isMe={false}
          />
        </Block>

        <Block id="profile-bare" title="Public profile — no Instagram, unranked">
          <PublicProfileCard
            view={{
              displayName: null,
              handle: "quiet.one",
              avatarUrl: null,
              country: null,
              instagramUrl: null,
              score: 0,
              peakScore: 0,
              verifiedCount: 0,
              streak: 0,
              standing: null,
              bestRank: null,
              momentumDelta: 0,
            }}
            isMe
          />
        </Block>

        <Block id="climb" title="How to climb — swipe deck">
          <ClimbSection
            stats={STATS}
            rank={7}
            recommendations={SAMPLE_ANALYSIS.recommendations}
          />
        </Block>

        <Block id="analysis-own" title="Analysis — own profile">
          <AnalysisResult result={SAMPLE_ANALYSIS as Analysis} />
        </Block>

        <Block id="analysis-other" title="Analysis — someone else">
          <AnalysisResult
            result={{ ...SAMPLE_ANALYSIS, ownership: "other" } as Analysis}
            standing={{ rank: 42, total: 1280 }}
          />
        </Block>
      </div>

      <TabBar />
    </div>
  );
}

function Block({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-6">
      <p className="mb-4 text-[0.6rem] font-bold uppercase tracking-[0.2em] text-blink-sky/50">
        {title}
      </p>
      {children}
    </section>
  );
}
