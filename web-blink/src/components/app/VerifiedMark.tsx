/**
 * Blink — the claimed-profile mark.
 *
 * ## What it means, exactly
 *
 * The profile belongs to someone who signed in and analysed *their own*
 * account through Blink. That is a real claim with a real gate behind it:
 * `blink_profiles.verified_count` only moves when `score_history` records a
 * verified row, and a verified row only comes from a new screenshot of the
 * user's own profile — the one showing "Edit profile".
 *
 * It does **not** mean the profile is famous, endorsed, or checked by a human,
 * and it must never appear on a profile that merely got analysed by somebody
 * else. Being read by a stranger says nothing about who controls the account,
 * so `AnalyzedProfile` rows never carry this mark. `isClaimed` below is the
 * single rule; every surface asks it rather than deciding for itself.
 *
 * ## Why it looks like this
 *
 * A blue disc with a white tick is Instagram's mark, and borrowing it would
 * both look derivative and imply Instagram verified something — which Blink
 * cannot know. So this is drawn from Blink's own emblem vocabulary instead:
 * the `hex` plate that `BadgeEmblem` already uses for records, carrying the
 * same `verified` check glyph, in Blink sky.
 *
 * Small, flat, one colour, no ring, no gloss. At 14px next to a handle it
 * reads as a property of the name rather than a decoration beside it.
 */

import { cn } from "@/lib/utils";

/**
 * Does this profile carry the mark?
 *
 * One predicate, used by every surface, so Ranks, a public profile and a share
 * card cannot disagree about who is claimed. A profile with no verified
 * analysis behind it — including every stranger someone has analysed — is not.
 */
export function isClaimed(profile: { verifiedCount?: number | null } | null | undefined): boolean {
  return (profile?.verifiedCount ?? 0) > 0;
}

export function VerifiedMark({
  size = 14,
  className,
  /**
   * Marks in a dense row are decorative repetition for a screen reader; the
   * one on a profile header is information. Callers in lists pass `false`.
   */
  labelled = true,
  label = "Claimed profile",
}: {
  size?: number;
  className?: string;
  labelled?: boolean;
  label?: string;
}) {
  return (
    <svg
      viewBox="0 0 64 72"
      width={size}
      height={size * (72 / 64)}
      className={cn("shrink-0 text-blink-sky", className)}
      role={labelled ? "img" : undefined}
      aria-label={labelled ? label : undefined}
      aria-hidden={labelled ? undefined : true}
      focusable="false"
    >
      {/* The plate, from BadgeEmblem's `hex`. */}
      <path d="M32 3 L58 18 V54 L32 69 L6 54 V18 Z" fill="currentColor" fillOpacity={0.22} />
      <path
        d="M32 3 L58 18 V54 L32 69 L6 54 V18 Z"
        fill="none"
        stroke="currentColor"
        strokeOpacity={0.55}
        strokeWidth={3}
      />
      {/* The check, from BadgeEmblem's `verified` glyph, centred on the plate.
          Drawn on a 28-unit grid, so it is scaled and offset rather than
          redrawn — the two marks stay identical as either one changes. */}
      <g transform="translate(18.5 22) scale(1)">
        <path
          d="M4 13 L10.5 19.5 L23 6 L20.5 3.5 L10.5 14.5 L6.5 10.5 Z"
          fill="currentColor"
        />
      </g>
    </svg>
  );
}
