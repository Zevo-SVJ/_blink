/**
 * Blink — the analysed-profile stream.
 *
 * A quiet row under the hero showing the range of profiles Blink reads: every
 * category, every kind of score, not just polished ones.
 *
 * ## Why these profiles are anonymous
 *
 * The obvious version of this component uses real Instagram handles and real
 * profile pictures. It isn't shippable, for two independent reasons:
 *
 *  1. **It would fabricate claims about real people.** Putting a real handle
 *     next to a Blink Score states that Blink analysed that person and that
 *     this is what it found. Neither is true, and the person never agreed to
 *     appear in an ad.
 *  2. **The pictures wouldn't load anyway.** Instagram's CDN blocks
 *     hotlinking, its URLs are signed and expire within hours, and the only
 *     stable route is an authenticated Graph API call the profile owner has to
 *     approve. A landing page whose hero depends on that is a landing page
 *     that breaks quietly.
 *
 * So the row shows what it can honestly show: an abstract avatar, a category,
 * and a score. That is the same approach the leaderboard showcase takes with
 * its anonymous rows, and it makes the real point — *every kind of profile has
 * a reading, and a small account can score higher than a big one* — without
 * borrowing anyone's face to do it.
 */

import { Marquee } from "@/components/blink/Marquee";
import { cn } from "@/lib/utils";

interface StreamProfile {
  id: string;
  category: string;
  score: number;
  hue: number;
  /** Abstract avatar treatment, so the row doesn't look like one template. */
  variant: "solid" | "duo" | "ring";
}

/**
 * Deliberately spread across the score range and across categories.
 *
 * A row of 8s would say "everyone does well here", which is both untrue and
 * uninteresting. The spread is the message.
 */
const PROFILES: StreamProfile[] = [
  { id: "p1", category: "Larp", score: 8.6, hue: 210, variant: "duo" },
  { id: "p2", category: "Creator", score: 7.4, hue: 28, variant: "solid" },
  { id: "p3", category: "Fashion", score: 9.1, hue: 320, variant: "ring" },
  { id: "p4", category: "Personal", score: 5.8, hue: 150, variant: "solid" },
  { id: "p5", category: "Fitness", score: 8.0, hue: 45, variant: "duo" },
  { id: "p6", category: "Artist", score: 8.8, hue: 265, variant: "ring" },
  { id: "p7", category: "Lifestyle", score: 6.5, hue: 190, variant: "solid" },
  { id: "p8", category: "Entrepreneur", score: 7.9, hue: 85, variant: "duo" },
  { id: "p9", category: "Creator", score: 6.1, hue: 340, variant: "ring" },
  { id: "p10", category: "Larp", score: 9.3, hue: 230, variant: "solid" },
  { id: "p11", category: "Personal", score: 7.2, hue: 12, variant: "duo" },
  { id: "p12", category: "Artist", score: 5.4, hue: 170, variant: "ring" },
];

export function ProfileStream() {
  return (
    <div className="w-full">
      <p className="mb-3 text-center text-[0.62rem] font-bold uppercase tracking-[0.2em] text-white/25">
        Every kind of profile gets a reading
      </p>
      <Marquee
        items={PROFILES}
        keyFor={(p) => p.id}
        renderItem={(p) => <ProfileChip profile={p} />}
        speed={26}
        gap={10}
      />
    </div>
  );
}

function ProfileChip({ profile }: { profile: StreamProfile }) {
  return (
    <div className="flex items-center gap-2.5 rounded-full bg-white/[0.04] py-1.5 pl-1.5 pr-3.5 ring-1 ring-white/[0.06]">
      <Avatar hue={profile.hue} variant={profile.variant} />
      <span className="whitespace-nowrap text-[0.7rem] font-semibold text-white/50">
        {profile.category}
      </span>
      <span className="text-[0.7rem] font-extrabold tabular-nums text-blink-sky">
        {profile.score.toFixed(1)}
      </span>
    </div>
  );
}

/** Three abstract treatments, so the row reads as different accounts. */
function Avatar({ hue, variant }: { hue: number; variant: StreamProfile["variant"] }) {
  const base = `hsl(${hue} 58% 46%)`;
  const deep = `hsl(${hue} 66% 26%)`;

  return (
    <span
      aria-hidden
      className={cn(
        "block h-7 w-7 shrink-0 rounded-full",
        variant === "ring" && "ring-2 ring-white/20",
      )}
      style={{
        background:
          variant === "duo"
            ? `linear-gradient(135deg, ${base} 0%, ${base} 50%, ${deep} 50%, ${deep} 100%)`
            : `linear-gradient(140deg, ${base}, ${deep})`,
      }}
    />
  );
}
