/**
 * Blink — the analysis result surface.
 *
 * Shared by the live analysis flow and by reopening a saved analysis from the
 * Library, so both render identically and the privacy rules can't drift apart.
 *
 * The own/other split is **structural**, not a set of conditionals sprinkled
 * through one tree: `OwnResult` and `PublicResult` are separate components and
 * the caller can only reach the private one when ownership is "own". A public
 * read therefore cannot leak the owner's improvement plan even if a future
 * edit forgets a guard — there is no branch that would render it.
 *
 * A public read shows: score, category, leaderboard position, the perception
 * signals, and one contextual crush lens. Nothing else.
 */

import { AnimatePresence, motion } from "framer-motion";
import { Info, Trophy } from "lucide-react";
import { useState, type ReactNode } from "react";

import { ScoreRing } from "@/components/blink/ScoreRing";
import type { AnalysisResult as Analysis, Perspective } from "@/lib/analysis";
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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center text-center"
    >
      <OwnershipBanner voice={voice} handle={result.handle} />

      {revealStage >= 1 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          className="mt-6"
        >
          <ScoreRing value={result.overallScore} size={170} light />
        </motion.div>
      )}

      {revealStage >= 2 && (
        <motion.p
          {...springUp}
          transition={{ delay: 0.1, ...springUp.transition }}
          className="mt-4 text-xs font-bold uppercase tracking-widest text-white/45"
        >
          {result.firstImpression}
        </motion.p>
      )}

      {revealStage >= 3 && result.traits.length > 0 && (
        <motion.div
          {...springUp}
          transition={{ delay: 0.1, ...springUp.transition }}
          className="mt-6 flex flex-wrap justify-center gap-2"
        >
          {result.traits.map((trait) => (
            <span
              key={trait}
              className="rounded-full bg-blink-sky px-4 py-1.5 text-sm font-semibold text-blink-navy"
            >
              {trait}
            </span>
          ))}
        </motion.div>
      )}

      {voice.isOwn ? (
        <OwnResult
          result={result}
          voice={voice}
          revealStage={revealStage}
          progression={progression}
          climb={climb}
        />
      ) : (
        <PublicResult
          result={result}
          voice={voice}
          revealStage={revealStage}
          standing={standing ?? null}
        />
      )}

      {revealStage >= 7 && actions && (
        <motion.div
          {...springUp}
          transition={{ delay: 0.2, ...springUp.transition }}
          className="mt-10 w-full max-w-md"
        >
          {actions}
        </motion.div>
      )}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Own profile — the full read, including everything owner-directed
// ---------------------------------------------------------------------------

function OwnResult({
  result,
  voice,
  revealStage,
  progression,
  climb,
}: {
  result: Analysis;
  voice: Voice;
  revealStage: number;
  progression?: ReactNode;
  climb?: ReactNode;
}) {
  return (
    <>
      {revealStage >= 4 && result.why && (
        <motion.p
          {...springUp}
          transition={{ delay: 0.1, ...springUp.transition }}
          className="mt-8 max-w-md text-lg leading-relaxed text-white/80"
        >
          {result.why}
        </motion.p>
      )}

      {revealStage >= 5 && (
        <Section title={voice.signalsHeading}>
          <div className="space-y-5">
            {result.signals.map((signal) => (
              <SignalBar key={signal.label} signal={signal} />
            ))}
          </div>
        </Section>
      )}

      {revealStage >= 6 && (
        <Section title={voice.perspectivesHeading}>
          <PerspectiveSelector perspectives={result.perspectives} voice={voice} />
        </Section>
      )}

      {revealStage >= 7 && (
        <motion.div
          {...springUp}
          transition={{ delay: 0.1, ...springUp.transition }}
          className="mt-12 w-full max-w-md space-y-3 text-left"
        >
          {result.strengths.map((text, i) => (
            <ResultBlock key={`s-${i}`} title={voice.strengthsLabel} text={text} tone="positive" />
          ))}
          {result.weaknesses.map((text, i) => (
            <ResultBlock key={`w-${i}`} title={voice.weaknessesLabel} text={text} tone="neutral" />
          ))}

          {result.nextMove && (
            <ResultBlock title="Your next move" text={result.nextMove} tone="action" />
          )}

          {/* `climb` carries the recommendations when stats are available, so
              the plain list is only a fallback for contexts without them. */}
          {climb ?? (result.recommendations.length > 0 && <ImprovementPlan result={result} />)}

          {progression}
        </motion.div>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Someone else's profile — public read only
// ---------------------------------------------------------------------------

function PublicResult({
  result,
  voice,
  revealStage,
  standing,
}: {
  result: Analysis;
  voice: Voice;
  revealStage: number;
  standing: PublicStanding | null;
}) {
  const score = computeBlinkScore(result).total;
  const tier = getTier(score);
  const category = result.category?.category;

  return (
    <>
      {revealStage >= 4 && (
        <motion.div
          {...springUp}
          transition={{ delay: 0.1, ...springUp.transition }}
          className="mt-8 w-full max-w-md"
        >
          <div className="grid grid-cols-2 gap-3">
            <PublicStat label="Blink Score" value={String(score)} sub={tier.label} accent />
            <PublicStat
              label="Leaderboard"
              value={standing ? `#${standing.rank}` : "—"}
              sub={standing ? `of ${standing.total} ranked` : "Not ranked yet"}
            />
          </div>
          {category && (
            <div className="mt-3 flex items-center justify-center gap-2 rounded-2xl border border-white/[0.07] bg-white/[0.03] px-4 py-3">
              <span className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-white/40">
                Category
              </span>
              <span className="text-sm font-bold capitalize text-blink-sky">{category}</span>
            </div>
          )}
        </motion.div>
      )}

      {revealStage >= 5 && (
        <Section title="Public perception signals">
          <div className="space-y-5">
            {result.signals.map((signal) => (
              <SignalBar key={signal.label} signal={signal} />
            ))}
          </div>
        </Section>
      )}

      {/* One contextual lens — the fun part of a public read. */}
      {revealStage >= 6 && <CrushLens result={result} voice={voice} />}

      {revealStage >= 7 && (
        <motion.div
          {...springUp}
          transition={{ delay: 0.1, ...springUp.transition }}
          className="mt-12 w-full max-w-md"
        >
          <PublicReadNote voice={voice} />
        </motion.div>
      )}
    </>
  );
}

function PublicStat({
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
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4 text-left">
      <p className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-white/40">{label}</p>
      <p
        className={cn(
          "mt-1.5 text-2xl font-extrabold tabular-nums tracking-tight",
          accent ? "text-blink-sky" : "text-white",
        )}
      >
        {value}
      </p>
      <p className="mt-0.5 text-[0.7rem] text-white/35">{sub}</p>
    </div>
  );
}

/**
 * The single perception lens a public read gets.
 *
 * Reads the crush perspective only, and never its `recommendation` field —
 * that one is written for the account's owner.
 */
function CrushLens({ result, voice }: { result: Analysis; voice: Voice }) {
  const crush = result.perspectives.crush;

  return (
    <Section title={`How a crush sees ${voice.object} 👀`}>
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        {crush.traits.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {crush.traits.map((trait) => (
              <span
                key={trait}
                className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/80"
              >
                {trait}
              </span>
            ))}
          </div>
        )}
        {crush.summary && (
          <p className="mt-3 text-sm leading-relaxed text-white/70">{crush.summary}</p>
        )}
        {crush.why && (
          <p className="mt-3 text-xs leading-relaxed text-white/45">{crush.why}</p>
        )}
      </div>
    </Section>
  );
}

function PublicReadNote({ voice }: { voice: Voice }) {
  return (
    <div className="flex gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 text-left">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-white/30" />
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

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <motion.div
      {...springUp}
      transition={{ delay: 0.1, ...springUp.transition }}
      className="mt-12 w-full max-w-md text-left"
    >
      <h3 className="text-xs font-bold uppercase tracking-widest text-white/45">{title}</h3>
      <div className="mt-4">{children}</div>
    </motion.div>
  );
}

export function OwnershipBanner({ voice, handle }: { voice: Voice; handle: string | null }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-4 py-1.5"
    >
      <span className="text-xs font-bold text-white/70">{voice.Subject}</span>
      {handle && <span className="text-xs font-medium text-white/35">@{handle}</span>}
    </motion.div>
  );
}

/**
 * The owner's improvement plan.
 *
 * Each recommendation carries the model's reasoning for why it moves the
 * score, so the list reads as a ranked set of opportunities rather than a
 * generic checklist.
 */
function ImprovementPlan({ result }: { result: Analysis }) {
  const score = computeBlinkScore(result).total;
  const tier = getTier(score);

  return (
    <div className="rounded-2xl border border-blink-sky/25 bg-blink-sky/[0.06] p-5">
      <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blink-sky">
        <Trophy className="h-3.5 w-3.5" />
        Your highest-impact next moves
      </p>
      <p className="mt-2 text-xs leading-relaxed text-white/50">
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
    </div>
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
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
        />
      </div>
      {signal.description && (
        <p className="mt-1.5 text-xs leading-relaxed text-white/50">{signal.description}</p>
      )}
    </div>
  );
}

const PERSPECTIVE_ORDER: Perspective["id"][] = ["crush", "stranger", "friends", "recruiter"];

function PerspectiveSelector({
  perspectives,
  voice,
}: {
  perspectives: Analysis["perspectives"];
  voice: Voice;
}) {
  const [selected, setSelected] = useState<Perspective["id"]>("crush");
  const current = perspectives[selected];

  return (
    <div>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
        {PERSPECTIVE_ORDER.map((id) => {
          const isActive = id === selected;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setSelected(id)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-2xl px-3.5 py-2 text-sm font-semibold transition-all",
                isActive
                  ? "bg-blink-sky text-blink-navy"
                  : "border border-white/10 text-white/60 hover:text-white/90",
              )}
            >
              <span>{perspectives[id].emoji}</span>
              <span className="capitalize">{id}</span>
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
          className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5"
        >
          <p className="text-base font-bold text-white">{voice.perspectiveTitle(selected)}</p>

          {current.traits.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {current.traits.map((trait) => (
                <span
                  key={trait}
                  className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/80"
                >
                  {trait}
                </span>
              ))}
            </div>
          )}

          {current.summary && (
            <p className="mt-3 text-sm leading-relaxed text-white/70">{current.summary}</p>
          )}

          {current.why && (
            <div className="mt-4">
              <p className="text-xs font-bold uppercase tracking-widest text-white/40">Why</p>
              <p className="mt-1 text-sm leading-relaxed text-white/70">{current.why}</p>
            </div>
          )}

          {/* Reached only from OwnResult, so this is always the owner's own advice. */}
          {current.recommendation && (
            <div className="mt-4">
              <p className="text-xs font-bold uppercase tracking-widest text-blink-sky/70">
                If you want to shift this
              </p>
              <p className="mt-1 text-sm leading-relaxed text-white/70">
                {current.recommendation}
              </p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

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
    positive: "border-emerald-400/20 bg-emerald-400/[0.06]",
    neutral: "border-amber-400/20 bg-amber-400/[0.06]",
    action: "border-blink-sky/30 bg-blink-sky/[0.08]",
  };
  const titleColors = {
    positive: "text-emerald-300/80",
    neutral: "text-amber-300/80",
    action: "text-blink-sky",
  };

  return (
    <div className={cn("rounded-2xl border p-4", toneClasses[tone])}>
      <p className={cn("text-xs font-bold uppercase tracking-widest", titleColors[tone])}>
        {title}
      </p>
      <p className="mt-1 text-sm font-medium leading-relaxed text-white/80 sm:text-base">{text}</p>
    </div>
  );
}
