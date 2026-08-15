/**
 * Blink — the analysis result surface.
 *
 * Shared by the live analysis flow and by reopening a saved analysis from the
 * Library, so both render identically and the privacy rules can't drift apart.
 *
 * ## Structure
 *
 * The old version was one continuous column: score, impression, traits, a
 * paragraph, six signal bars with descriptions, a perspective card, three
 * tone-coloured blocks, a plan, a progression card. Every word was worth
 * reading and almost none of it was read, because reaching the interesting
 * part meant scrolling past everything else.
 *
 * So the answer is split from the evidence:
 *
 *  - **The verdict** — score, first impression, traits and the one paragraph
 *    that explains them — is the whole first screen and needs no scrolling.
 *  - **Everything else** sits behind a segmented control: Perception, Signals,
 *    and (own reads only) Actions. Nothing was deleted; each pane is now a
 *    short read instead of the third of a very long one.
 *  - A **thin section pill is fixed to the bottom of the viewport**, so "what
 *    else is here" is answerable at any scroll position. See `Segments` for
 *    why it is fixed rather than sticky.
 *
 * ## Privacy
 *
 * The own/other split is **structural**, not a set of conditionals sprinkled
 * through one tree: `OwnResult` and `PublicResult` are separate components and
 * the caller can only reach the private one when ownership is "own". A public
 * read therefore cannot leak the owner's improvement plan even if a future
 * edit forgets a guard — there is no branch that would render it. The Actions
 * segment does not exist in the public component.
 *
 * A public read shows: score, category, leaderboard position, the perception
 * signals, and one contextual crush lens. Nothing else.
 */

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Info, Sparkles } from "lucide-react";
import { useState, type ReactNode } from "react";

import { PerceptionCard, LENS_TINT } from "@/components/blink/PerceptionCard";
import { PerceptionReveal } from "@/components/analysis/PerceptionReveal";
import { buildRead } from "@/lib/perception-read";
import { ScoreRing } from "@/components/blink/ScoreRing";
import type { AnalysisResult as Analysis, Perspective } from "@/lib/analysis";
import { useT } from "@/lib/i18n";
import { getVoice, type Voice } from "@/lib/ownership";
import { computeBlinkScore, getTier } from "@/lib/ranking";
import { cn } from "@/lib/utils";

export interface PublicStanding {
  rank: number;
  total: number;
}

const springUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { type: "spring" as const, stiffness: 300, damping: 30 },
};

const ease = [0.22, 1, 0.36, 1] as const;

/** Staged reveal in the live flow; saved analyses pass `ALL_REVEALED`. */
export const ALL_REVEALED = 99;

export function AnalysisResult({
  result,
  revealStage = ALL_REVEALED,
  standing,
  progression,
  climb,
  actions,
}: {
  result: Analysis;
  revealStage?: number;
  /** Where this score sits publicly — shown on third-party reads. */
  standing?: PublicStanding | null;
  /** Own-profile verification card. Omitted when reopening from the Library. */
  progression?: ReactNode;
  /** Own-profile "how to climb" block, supplied once stats are known. */
  climb?: ReactNode;
  actions?: ReactNode;
}) {
  const voice = getVoice(result.ownership, result.subjectGender);
  const score = computeBlinkScore(result).total;

  return (
    <div className="w-full">
      <Verdict result={result} voice={voice} revealStage={revealStage} />

      {revealStage >= 5 &&
        (voice.isOwn ? (
          <OwnResult
            result={result}
            voice={voice}
            score={score}
            revealStage={revealStage}
            progression={progression}
            climb={climb}
          />
        ) : (
          <PublicResult
            result={result}
            voice={voice}
            score={score}
            standing={standing ?? null}
          />
        ))}

      {revealStage >= 7 && actions && (
        <motion.div
          {...springUp}
          transition={{ delay: 0.2, ...springUp.transition }}
          className="mx-auto mt-12 w-full max-w-md"
        >
          {actions}
        </motion.div>
      )}

      {revealStage >= 5 && <AiNotice isOwn={voice.isOwn} />}
    </div>
  );
}

/**
 * Who wrote this, said once, where the result ends.
 *
 * Article 50 of the AI Act — applicable since 2 August 2026 — requires that a
 * person be informed when they are interacting with, or receiving output from,
 * an AI system, in a clear and distinguishable way. Blink's entire output is
 * model-generated, so this is not a disclaimer to bury.
 *
 * It is also not a banner to repeat on every card. Placed at the foot of the
 * result it is read at the moment it means something — after the score, when
 * the reader is deciding how much to believe it — and it says the two things
 * that actually matter: a model wrote this, and it read one image.
 */
function AiNotice({ isOwn }: { isOwn: boolean }) {
  const t = useT();

  return (
    <div className="mx-auto mt-10 flex w-full max-w-md items-start gap-2.5 rounded-2xl border border-white/[0.07] bg-white/[0.02] px-4 py-3 text-left">
      <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/35" aria-hidden />
      <p className="text-[0.78rem] leading-relaxed text-white/45">
        <span className="font-bold text-white/60">{t.analysis.aiGenerated}</span> ·{" "}
        {isOwn ? t.analysis.aiNotice : t.analysis.aiNoticeOther}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// The verdict — everything the user came for, above the fold
// ---------------------------------------------------------------------------

function Verdict({
  result,
  voice,
  revealStage,
}: {
  result: Analysis;
  voice: Voice;
  revealStage: number;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <OwnershipBanner voice={voice} handle={result.handle} />

      {revealStage >= 1 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          className="mt-6"
        >
          <ScoreRing value={result.overallScore} size={158} light />
        </motion.div>
      )}

      {/* The first impression is the headline, not a caption. It was set in
          11px uppercase under the ring, which buried the single sentence the
          whole product exists to deliver. */}
      {revealStage >= 2 && (
        <motion.h2
          {...springUp}
          transition={{ delay: 0.1, ...springUp.transition }}
          className="mt-6 max-w-sm text-[1.6rem] font-extrabold leading-[1.15] tracking-tight text-white sm:text-3xl"
        >
          {result.firstImpression}
        </motion.h2>
      )}

      {revealStage >= 3 && result.traits.length > 0 && (
        <motion.div
          {...springUp}
          transition={{ delay: 0.12, ...springUp.transition }}
          className="mt-4 flex flex-wrap justify-center gap-1.5"
        >
          {result.traits.map((trait) => (
            <span
              key={trait}
              className="rounded-full bg-blink-sky px-3.5 py-1.5 text-[0.8rem] font-bold text-blink-navy"
            >
              {trait}
            </span>
          ))}
        </motion.div>
      )}

      {revealStage >= 4 && result.why && (
        <motion.p
          {...springUp}
          transition={{ delay: 0.14, ...springUp.transition }}
          className="mt-6 max-w-md text-[0.95rem] leading-relaxed text-white/65 sm:text-base"
        >
          {result.why}
        </motion.p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Segmented navigation
// ---------------------------------------------------------------------------

interface Segment {
  id: string;
  label: string;
  render: () => ReactNode;
}

/**
 * The segmented control plus its pane.
 *
 * **Why the bar is fixed, not sticky.** It was `sticky top-64` and it did not
 * stick: both surfaces that render this — the analysis flow and the Library
 * detail route — sit inside an ancestor with `overflow-x: hidden`, which makes
 * that ancestor the scroll container. The bar dutifully stuck to a box that
 * never scrolls, so it slid away with the page and the user lost their
 * navigation the moment they started reading. Removing the overflow guard
 * would reintroduce horizontal scrolling, so the bar is fixed to the viewport
 * instead, where no ancestor can take it away.
 *
 * It clears the app tab bar via `--blink-app-nav`, which the shell publishes
 * and which is zero everywhere else — so the same component is correct on
 * `/analyze` (no tab bar) and in the Library (tab bar present).
 */
function Segments({ segments }: { segments: Segment[] }) {
  const [active, setActive] = useState(segments[0]?.id);
  const reduceMotion = useReducedMotion();

  const current = segments.find((s) => s.id === active) ?? segments[0];

  return (
    <div className="mx-auto mt-10 w-full max-w-md">
      <div className="text-left">
        <AnimatePresence mode="wait">
          <motion.div
            key={current?.id}
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease }}
          >
            {current?.render()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Room for the bar, so the last line of a pane is never underneath it. */}
      <div aria-hidden className="h-24" />

      {/*
        A single thin pill, not a panel.

        It used to be a full-width card carrying the score, the first
        impression and the segments — three rows of chrome permanently parked
        over the content, which is a lot of furniture to answer "what else is
        here". The score and the impression are already the largest things on
        the screen a swipe away, so repeating them bought nothing. What is left
        is the one control that can't be inferred: where you are, and where
        else you can go.
      */}
      <nav
        aria-label="Analysis sections"
        className="pointer-events-none fixed inset-x-0 z-40 flex justify-center px-4"
        style={{
          bottom: "calc(var(--blink-app-nav, 0px) + max(env(safe-area-inset-bottom), 0.75rem))",
        }}
      >
        <div className="pointer-events-auto flex gap-0.5 rounded-full bg-blink-navy-2/80 p-1 shadow-[0_10px_34px_-10px_rgba(0,0,0,0.8)] ring-1 ring-white/[0.09] backdrop-blur-2xl">
          {segments.map((segment) => {
            const isActive = segment.id === current?.id;
            return (
              <button
                key={segment.id}
                type="button"
                onClick={() => setActive(segment.id)}
                aria-current={isActive ? "true" : undefined}
                className={cn(
                  "relative min-h-[38px] rounded-full px-4 text-[0.78rem] font-bold transition-colors",
                  isActive ? "text-blink-navy" : "text-white/55 hover:text-white",
                )}
              >
                {isActive && (
                  <motion.span
                    layoutId="analysis-segment"
                    className="absolute inset-0 rounded-full bg-blink-sky"
                    transition={{ type: "spring", stiffness: 420, damping: 36 }}
                  />
                )}
                <span className="relative">{segment.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

/** A titled group inside a pane. Spacing and type do the work, not borders. */
function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-7 first:mt-0">
      <h3 className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-white/40">
        {title}
      </h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Own profile — the full read, including everything owner-directed
// ---------------------------------------------------------------------------

function OwnResult({
  result,
  voice,
  score,
  revealStage,
  progression,
  climb,
}: {
  result: Analysis;
  voice: Voice;
  score: number;
  revealStage: number;
  progression?: ReactNode;
  climb?: ReactNode;
}) {
  const segments: Segment[] = [
    {
      id: "perception",
      label: "Perception",
      render: () => (
        <PerspectiveSelector
          perspectives={result.perspectives}
          signals={result.signals}
          voice={voice}
        />
      ),
    },
    {
      id: "signals",
      label: "Signals",
      render: () => (
        <>
          <Group title={voice.signalsHeading}>
            <div className="space-y-5">
              {result.signals.map((signal) => (
                <SignalBar key={signal.label} signal={signal} />
              ))}
            </div>
          </Group>

          {result.strengths.length > 0 && (
            <Group title={voice.strengthsLabel}>
              <PointList points={result.strengths} tone="positive" />
            </Group>
          )}

          {result.weaknesses.length > 0 && (
            <Group title={voice.weaknessesLabel}>
              <PointList points={result.weaknesses} tone="neutral" />
            </Group>
          )}
        </>
      ),
    },
  ];

  // Actions only exists on the own component — see the privacy note at the top.
  if (revealStage >= 7) {
    segments.push({
      id: "actions",
      label: "Actions",
      render: () => (
        <div className="space-y-8">
          {result.nextMove && (
            <Group title="Your next move">
              <p className="text-[0.95rem] font-medium leading-relaxed text-white/85">
                {result.nextMove}
              </p>
            </Group>
          )}

          {/* `climb` carries the recommendations when stats are available, so
              the plain list is only a fallback for contexts without them. */}
          {climb ?? (result.recommendations.length > 0 && <ImprovementPlan result={result} />)}

          {progression}
        </div>
      ),
    });
  }

  return <Segments segments={segments} />;
}

// ---------------------------------------------------------------------------
// Someone else's profile — public read only
// ---------------------------------------------------------------------------

function PublicResult({
  result,
  voice,
  score,
  standing,
}: {
  result: Analysis;
  voice: Voice;
  score: number;
  standing: PublicStanding | null;
}) {
  const tier = getTier(score);
  const category = result.category?.category;

  const segments: Segment[] = [
    {
      id: "perception",
      label: "Perception",
      render: () => (
        <>
          <Group title={`How a crush sees ${voice.object} 👀`}>
            <CrushLens result={result} />
          </Group>
          <Group title="Standing">
            <div className="flex items-stretch">
              <Fact label="Blink Score" value={String(score)} sub={tier.label} accent />
              <Fact
                label="Leaderboard"
                value={standing ? `#${standing.rank}` : "—"}
                sub={standing ? `of ${standing.total} ranked` : "Not ranked yet"}
              />
              {category && (
                <Fact label="Category" value={categoryTitle(category)} sub="Archetype" />
              )}
            </div>
          </Group>
        </>
      ),
    },
    {
      id: "signals",
      label: "Signals",
      render: () => (
        <Group title="Public perception signals">
          <div className="space-y-5">
            {result.signals.map((signal) => (
              <SignalBar key={signal.label} signal={signal} />
            ))}
          </div>
        </Group>
      ),
    },
  ];

  return (
    <>
      <Segments segments={segments} />
      <div className="mx-auto mt-10 w-full max-w-md">
        <PublicReadNote voice={voice} />
      </div>
    </>
  );
}

function categoryTitle(category: string): string {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

/** One number in a row, separated by a rule rather than boxed in a tile. */
function Fact({
  label,
  value,
  sub,
  accent = false,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: boolean;
}) {
  return (
    <div className="min-w-0 flex-1 border-l border-white/[0.08] px-3 first:border-l-0 first:pl-0">
      <p className="text-[0.6rem] font-bold uppercase tracking-[0.12em] text-white/35">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 truncate text-xl font-extrabold tabular-nums tracking-tight",
          accent ? "text-blink-sky" : "text-white",
        )}
      >
        {value}
      </p>
      <p className="mt-0.5 truncate text-[0.65rem] text-white/35">{sub}</p>
    </div>
  );
}

/**
 * The single perception lens a public read gets.
 *
 * Reads the crush perspective only, and never its `recommendation` field —
 * that one is written for the account's owner.
 */
function CrushLens({ result }: { result: Analysis }) {
  const crush = result.perspectives.crush;

  return (
    <div>
      {crush.traits.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {crush.traits.map((trait) => (
            <span
              key={trait}
              className="rounded-full bg-white/[0.08] px-3 py-1 text-xs font-semibold text-white/80"
            >
              {trait}
            </span>
          ))}
        </div>
      )}
      {crush.summary && (
        <p className="mt-3 text-[0.95rem] leading-relaxed text-white/75">{crush.summary}</p>
      )}
      {crush.why && (
        <p className="mt-2.5 text-xs leading-relaxed text-white/45">{crush.why}</p>
      )}
    </div>
  );
}

function PublicReadNote({ voice }: { voice: Voice }) {
  return (
    <div className="flex gap-3 text-left">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-white/25" />
      <p className="text-xs leading-relaxed text-white/40">
        This is a public read of {voice.subject} — what it signals to people who land on it.
        Improvement actions belong to whoever runs the account, so Blink keeps them private.
        Analyzing someone else never affects your own score or rank.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared pieces
// ---------------------------------------------------------------------------

export function OwnershipBanner({ voice, handle }: { voice: Voice; handle: string | null }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="inline-flex items-center gap-2 rounded-full bg-white/[0.05] px-4 py-1.5 ring-1 ring-white/[0.08]"
    >
      <span className="text-xs font-bold text-white/70">{voice.Subject}</span>
      {handle && <span className="text-xs font-medium text-white/35">@{handle}</span>}
    </motion.div>
  );
}

/**
 * Strengths and weaknesses, as a list rather than tone-coloured cards.
 *
 * Three coloured panels stacked read as an alert log. A marker plus the
 * sentence keeps the tone distinction and drops the boxes.
 */
function PointList({
  points,
  tone,
}: {
  points: string[];
  tone: "positive" | "neutral";
}) {
  return (
    <ul className="space-y-3">
      {points.map((text, i) => (
        <li key={i} className="flex gap-3">
          <span
            aria-hidden
            className={cn(
              "mt-[0.45rem] h-3 w-[3px] shrink-0 rounded-full",
              tone === "positive" ? "bg-emerald-400/70" : "bg-amber-400/70",
            )}
          />
          <span className="text-[0.9rem] leading-relaxed text-white/75">{text}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * The owner's improvement plan.
 *
 * Only reached when the caller has no stats to build the climb deck from —
 * reopening from the Library, for instance.
 */
function ImprovementPlan({ result }: { result: Analysis }) {
  const score = computeBlinkScore(result).total;
  const tier = getTier(score);

  return (
    <Group title="Your highest-impact next moves">
      <p className="text-xs leading-relaxed text-white/50">
        You&rsquo;re at <span className="font-bold text-white/80">{score}</span> — {tier.label}.
        Make these changes on Instagram, then upload a fresh screenshot so Blink can verify
        them and move your rank.
      </p>
      <ol className="mt-4 space-y-3">
        {result.recommendations.map((rec, i) => (
          <li key={i} className="flex gap-3">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blink-sky/20 text-[0.65rem] font-bold text-blink-sky">
              {i + 1}
            </span>
            <span className="text-sm leading-relaxed text-white/80">{rec}</span>
          </li>
        ))}
      </ol>
    </Group>
  );
}

function signalLabel(score: number): string {
  if (score >= 7.5) return "Strong";
  if (score >= 5.5) return "Moderate";
  if (score >= 3.5) return "Developing";
  return "Low";
}

function SignalBar({ signal }: { signal: { label: string; score: number; description: string } }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-white/90">{signal.label}</span>
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-xs font-medium text-white/45">{signalLabel(signal.score)}</span>
          <span className="text-sm font-bold tabular-nums text-blink-sky">
            {signal.score.toFixed(1)}
          </span>
        </div>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
        <motion.div
          className="h-full rounded-full bg-blink-sky"
          initial={{ width: 0 }}
          animate={{ width: `${signal.score * 10}%` }}
          transition={{ duration: 0.8, ease, delay: 0.1 }}
        />
      </div>
      {signal.description && (
        <p className="mt-1.5 text-xs leading-relaxed text-white/50">{signal.description}</p>
      )}
    </div>
  );
}

const PERSPECTIVE_ORDER: Perspective["id"][] = ["crush", "stranger", "friends", "recruiter"];

const LENS_KICKER: Record<Perspective["id"], string> = {
  crush: "The one you actually wanted",
  stranger: "Three seconds, cold",
  friends: "People who know you",
  recruiter: "Someone checking you out",
};

function PerspectiveSelector({
  perspectives,
  signals,
  voice,
}: {
  perspectives: Analysis["perspectives"];
  signals: Analysis["signals"];
  voice: Voice;
}) {
  const [selected, setSelected] = useState<Perspective["id"]>("crush");
  const current = perspectives[selected];
  // Recomputed per perspective on purpose: which signals matter, and which of
  // them is loudest, is the whole point — a crush and a recruiter reading the
  // same profile do not arrive at the same beat.
  const beats = buildRead(selected, current, signals, voice.isOwn);

  return (
    <div>
      <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {PERSPECTIVE_ORDER.map((id) => {
          const isActive = id === selected;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setSelected(id)}
              aria-pressed={isActive}
              className={cn(
                "relative flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold transition-colors",
                isActive ? "text-blink-navy" : "text-white/60 ring-1 ring-white/10 hover:text-white",
              )}
            >
              {isActive && (
                <motion.span
                  layoutId="perspective-pill"
                  className="absolute inset-0 rounded-full bg-blink-sky"
                  transition={{ type: "spring", stiffness: 420, damping: 36 }}
                />
              )}
              <span className="relative">{perspectives[id].emoji}</span>
              <span className="relative capitalize">{id}</span>
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={selected}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="mt-5"
        >
          {/*
            This one *is* a card, deliberately, while the rest of the result is
            not. "How your crush sees you" is the line people screenshot and
            send to a friend, and a screenshot needs an edge — a crop of
            unbounded text on a dark page is not a thing anyone sends.

            The component is shared with the landing page's How It Works
            sequence, so what a visitor was shown before signing up is
            literally the object they get afterwards.
          */}
          <PerceptionCard
            lensId={selected}
            emoji={current.emoji}
            kicker={LENS_KICKER[selected]}
            title={voice.perspectiveTitle(selected)}
            traits={[]}
            // Both now belong to the reveal: the summary is its first beat and
            // the traits are its last, so showing either here would spoil the
            // ending before the sequence starts.
          >
            <PerceptionReveal beats={beats} lensId={selected} />
          </PerceptionCard>

          {/* Reached only from OwnResult, so this is always the owner's own advice. */}
          {current.recommendation && (
            <div className="mt-5">
              <p className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-blink-sky/70">
                If you want to shift this
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-white/65">
                {current.recommendation}
              </p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/**
 * Kept for callers that still render a standalone tone block.
 *
 * Nothing in this file uses it any more — the result surface expresses tone
 * through `PointList` — but `Product` imports it for the locked-result teaser.
 */
export function ResultBlock({
  title,
  text,
  tone,
}: {
  title: string;
  text: string;
  tone: "positive" | "neutral" | "action";
}) {
  const toneClasses = {
    positive: "ring-emerald-400/20 bg-emerald-400/[0.06]",
    neutral: "ring-amber-400/20 bg-amber-400/[0.06]",
    action: "ring-blink-sky/30 bg-blink-sky/[0.08]",
  };
  const titleColors = {
    positive: "text-emerald-300/80",
    neutral: "text-amber-300/80",
    action: "text-blink-sky",
  };

  return (
    <div className={cn("rounded-2xl p-4 ring-1", toneClasses[tone])}>
      <p className={cn("text-xs font-bold uppercase tracking-widest", titleColors[tone])}>
        {title}
      </p>
      <p className="mt-1 text-sm font-medium leading-relaxed text-white/80 sm:text-base">{text}</p>
    </div>
  );
}
