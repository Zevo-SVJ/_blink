/**
 * The profile, as a source of data.
 *
 * The whole experience rests on this reading as somewhere real that a profile
 * came from — not as a dashboard widget illustrating the idea of a profile. So
 * it carries the things an actual account carries and nothing it does not: a
 * portrait, a handle, three counts, a bio, a grid. No score, no verdict, no
 * Blink chrome. Blink's reading happens *to* this, on top, later.
 *
 * The Instagram mark identifies where it came from — see `InstagramMark`.
 *
 * `regions` is what lets the analysis pass target real parts of it rather than
 * sweeping a bar across the whole card: each named region publishes its own box
 * so the reticle can be placed on the portrait, the bio and the grid in turn.
 */

import { motion } from "framer-motion";
import { useCallback, useEffect, useRef } from "react";

import { InstagramMark } from "@/components/blink/InstagramMark";
import { useT } from "@/lib/i18n";
import { SUBJECT } from "./demo";

export type RegionName = "avatar" | "bio" | "grid";
export type Regions = Partial<Record<RegionName, DOMRect>>;

/** Deterministic tile tones — a re-render is the same profile. */
const TILES = [0.62, 0.88, 0.44, 0.95, 0.55, 0.72, 0.4, 0.8, 0.6];

export function ProfileCard({
  onRegions,
  className,
}: {
  /** Called with each region's box, relative to the card. */
  onRegions?: (r: Regions) => void;
  className?: string;
}) {
  const t = useT();
  const host = useRef<HTMLDivElement>(null);
  const marks = useRef<Partial<Record<RegionName, HTMLElement | null>>>({});

  const measure = useCallback(() => {
    const box = host.current?.getBoundingClientRect();
    if (!box || !onRegions) return;
    const out: Regions = {};
    for (const [name, el] of Object.entries(marks.current)) {
      if (!el) continue;
      const r = el.getBoundingClientRect();
      out[name as RegionName] = new DOMRect(
        r.left - box.left,
        r.top - box.top,
        r.width,
        r.height,
      );
    }
    onRegions(out);
  }, [onRegions]);

  /* Re-measured on resize, because the reticle is placed in pixels and a card
     that reflows would otherwise leave it pointing at where the bio used to
     be. */
  useEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    if (host.current) ro.observe(host.current);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [measure]);

  const region = (name: RegionName) => (el: HTMLElement | null) => {
    marks.current[name] = el;
  };

  return (
    <div
      ref={host}
      className={`elev-2 relative overflow-hidden rounded-[var(--r-lg)] ${className ?? ""}`}
    >
      {/* Where this came from. A label, not decoration. */}
      <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-2.5">
        <InstagramMark size={13} className="text-white/40" title={null} />
        <span className="t-caption text-white/[var(--ink-3)]">instagram.com/{SUBJECT.handle}</span>
      </div>

      <div className="p-4">
        <div className="flex items-center gap-3.5">
          <div ref={region("avatar")} className="relative shrink-0">
            {/* A portrait, abstracted: a real face here would be either a
                stock photo or an invented person, and neither belongs in a
                product about how people read faces. */}
            <div className="h-[52px] w-[52px] overflow-hidden rounded-full bg-[linear-gradient(150deg,hsl(var(--blink-sky)),hsl(var(--blink-sky-bright)))]">
              <div className="h-full w-full bg-[radial-gradient(60%_55%_at_50%_38%,hsl(0_0%_100%/0.45),transparent_70%)]" />
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[0.95rem] font-bold leading-tight text-white">
              {SUBJECT.handle}
            </p>
          </div>
        </div>

        {/*
          The counts get their own row, stacked, because "abonnements" is not
          "following".

          Beside the portrait there are 150px to work with on a phone, and
          three counts written inline need 292px in French — so "386
          abonneme" ran under the card's own `overflow-hidden` and was cut
          mid-word. English overflowed too, just less legibly. Full width and
          number-over-label needs 160px in both languages, which leaves real
          slack instead of a layout that happens to fit one dictionary.
        */}
        <div className="mt-3 flex gap-5">
          {[
            [SUBJECT.posts, t.experience.demo.stats.posts],
            [SUBJECT.followers, t.experience.demo.stats.followers],
            [SUBJECT.following, t.experience.demo.stats.following],
          ].map(([n, label]) => (
            <span key={label as string} className="leading-tight">
              <span className="t-numeric block text-[0.8rem] font-bold text-white">{n}</span>
              <span className="block text-[0.68rem] text-white/[var(--ink-3)]">{label}</span>
            </span>
          ))}
        </div>

        <div ref={region("bio")} className="mt-3">
          <p className="text-[0.8rem] font-semibold text-white/90">{SUBJECT.name}</p>
          {t.experience.demo.bio.map((line) => (
            <p key={line} className="text-[0.78rem] leading-snug text-white/[var(--ink-2)]">
              {line}
            </p>
          ))}
        </div>

        {/*
          Three tiles on a phone, nine on a laptop.

          A full 3×3 grid is 190px of card, and on a 844px-tall phone the
          pinned stage then cannot hold the profile *and* what Blink says
          about it — the caption fell off the top and the score off the
          bottom. One row still reads as "recent posts", which is all this
          region has to say for the analysis pass to point at it.
        */}
        <div ref={region("grid")} className="mt-3.5 grid grid-cols-3 gap-[3px]">
          {TILES.map((tone, i) => (
            <motion.div
              key={i}
              className={`aspect-square rounded-[3px] ${i > 2 ? "hidden lg:block" : ""}`}
              style={{
                background: `hsl(${206 + (i % 3) * 6} ${22 + tone * 26}% ${16 + tone * 22}%)`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
