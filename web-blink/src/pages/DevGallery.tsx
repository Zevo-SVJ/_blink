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

import { useEffect, useState } from "react";

import { PageBackground } from "@/components/blink/PageBackground";
import { Film } from "@/video/Film";
import { DURATION, SHOTS } from "@/video/timeline";
import type { Lang } from "@/lib/i18n";
import { FPS } from "@/video/frame";
import { AddSomeoneSheet, Confirmation } from "@/components/app/AddSomeoneSheet";
import { TabBar } from "@/components/app/TabBar";
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
  categoryRank: 1,
  movement: 6,
};

const STATS: ProfileStats = {
  score: 812,
  tier: getTier(812),
  peakScore: 840,
  rank: 7,
  bestRank: 7,
  category: "larp",
  momentum: { key: "delta" as const, direction: "up", delta: 44, label: "+44 since last update" },
  streak: 5,
  weeklyWins: 3,
  verifiedCount: 11,
};

export default function DevGallery() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const publicRead =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).has("public");

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

  // `has-app-tabbar` mirrors the app shell, so bottom-fixed UI is offset above
  // the tab bar here exactly as it is in the real app.
  return (
    <div className="has-app-tabbar relative min-h-screen overflow-x-hidden pb-24">
      <PageBackground />

      <div className="mx-auto w-full max-w-2xl space-y-14 px-4 pt-10 sm:px-6">
        <Block id="film" title="The film — every frame, on demand">
          <FilmScrubber />
        </Block>

        <Block id="add-someone" title="Add someone — suggestion sheet">
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="min-h-[44px] rounded-2xl bg-blink-sky px-5 text-sm font-bold text-blink-navy"
          >
            Open the sheet
          </button>
          <AddSomeoneSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />

          {/* The success beat, on its own: it is otherwise only reachable with
              live credentials and an applied migration. */}
          <div className="mt-5 rounded-[1.75rem] bg-blink-navy-2 ring-1 ring-white/[0.09]">
            <Confirmation result={{ status: "ok" }} handle="mia.s" />
          </div>
        </Block>

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
            identity={{ category: "larp", strongestSignal: "Visual Identity" }}
          />
        </Block>

        {/* One analysis at a time: the section bar is fixed, so rendering both
            reads would stack two bars and neither could be inspected. Add
            `?public=1` to see the third-party read instead. */}
        {publicRead ? (
          <Block id="analysis-other" title="Analysis — someone else">
            <AnalysisResult
              result={{ ...SAMPLE_ANALYSIS, ownership: "other" } as Analysis}
              standing={{ rank: 42, total: 1280 }}
            />
          </Block>
        ) : (
          <Block id="analysis-own" title="Analysis — own profile">
            <AnalysisResult result={SAMPLE_ANALYSIS as Analysis} />
          </Block>
        )}
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

/**
 * The film, seekable.
 *
 * A twenty-three second ad has beats that exist for six frames. Watching it
 * back at speed is how those go unexamined — you see that something happened,
 * not what it looked like. Because every scene is a pure function of its
 * frame, any one of them can simply be asked for.
 *
 * `?frame=` makes that addressable from outside the page, which is what lets
 * the screenshot harness photograph an exact beat instead of guessing at a
 * wall-clock moment and hoping.
 */
function FilmScrubber() {
  const initial = (() => {
    if (typeof window === "undefined") return 0;
    const q = Number(new URLSearchParams(window.location.search).get("frame"));
    return Number.isFinite(q) ? Math.min(DURATION - 1, Math.max(0, Math.round(q))) : 0;
  })();

  const initialLang: Lang =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("lang") === "fr"
      ? "fr"
      : "en";

  const [frame, setFrame] = useState(initial);
  const [lang, setLang] = useState<Lang>(initialLang);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    const started = performance.now();
    const from = frame;
    const tick = (now: number) => {
      const f = from + Math.round(((now - started) / 1000) * FPS);
      if (f >= DURATION) {
        setFrame(DURATION - 1);
        setPlaying(false);
        return;
      }
      setFrame(f);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // Restarting on every frame would reset the clock; this runs once per play.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  const shot = SHOTS.find((s) => frame >= s.from && frame < s.from + s.duration);

  return (
    <div className="space-y-3">
      <div className="mx-auto w-full max-w-[300px]" data-film-scrubber>
        <Film frame={frame} lang={lang} />
      </div>

      <div className="flex items-center gap-3 text-xs font-semibold text-white/60">
        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          className="min-h-[36px] rounded-full bg-blink-sky px-4 font-bold text-blink-navy"
        >
          {playing ? "Pause" : "Play"}
        </button>
        <button
          type="button"
          onClick={() => {
            setPlaying(false);
            setFrame(0);
          }}
          className="min-h-[36px] rounded-full bg-white/10 px-4"
        >
          Reset
        </button>
        <button
          type="button"
          onClick={() => setLang((l) => (l === "en" ? "fr" : "en"))}
          className="min-h-[36px] rounded-full bg-white/10 px-4 uppercase"
        >
          {lang}
        </button>
        <span className="tabular-nums" data-film-readout>
          {frame} / {DURATION - 1} · {(frame / FPS).toFixed(2)}s · {shot?.id ?? "—"}
        </span>
      </div>

      <input
        type="range"
        min={0}
        max={DURATION - 1}
        value={frame}
        onChange={(e) => {
          setPlaying(false);
          setFrame(Number(e.target.value));
        }}
        className="w-full"
      />

      {/* Jump straight to the head of any scene. */}
      <div className="flex flex-wrap gap-1.5">
        {SHOTS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => {
              setPlaying(false);
              setFrame(s.from);
            }}
            className="rounded-full bg-white/[0.07] px-2.5 py-1 text-[0.65rem] font-bold text-white/70"
          >
            {s.id}
          </button>
        ))}
      </div>
    </div>
  );
}
