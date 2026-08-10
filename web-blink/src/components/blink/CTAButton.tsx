import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";

interface CTAButtonProps {
  label: string;
  onClick?: () => void;
  /**
   * Render as a link to this path instead of a bare button.
   *
   * The landing is prerendered, so its CTA is on screen roughly a second
   * before the bundle that would attach an onClick handler. As a `<button>`
   * that meant the most important control on the page looked ready and did
   * nothing if tapped early. An anchor navigates with no JavaScript at all,
   * and `onClick` still takes over once React has hydrated — so the control is
   * genuinely live from the first paint and upgrades silently.
   */
  href?: string;
  size?: "md" | "lg";
  variant?: "solid" | "ghost" | "dark";
  className?: string;
}

/**
 * Primary Blink CTA — refined, tactile, minimal.
 * A continuous, subtle reflection travels across the surface at rest.
 * Rounded corners that feel premium without being overly pill-shaped.
 */
export function CTAButton({
  label,
  onClick,
  href,
  size = "md",
  variant = "solid",
  className,
}: CTAButtonProps) {
  const Tag = href ? motion.a : motion.button;
  const nav = href
    ? {
        href,
        // Before hydration the browser follows the href. After it, this runs
        // and keeps the navigation client-side — same destination, no reload.
        onClick: (e: React.MouseEvent) => {
          if (!onClick) return;
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
          e.preventDefault();
          onClick();
        },
      }
    : { type: "button" as const, onClick };

  return (
    <Tag
      {...nav}
      whileHover={{ scale: 1.02, y: -1.5 }}
      whileTap={{ scale: 0.96, y: 0 }}
      transition={{ type: "spring", stiffness: 520, damping: 26 }}
      className={cn(
        "group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-2xl font-semibold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blink-sky/80 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
        size === "lg" ? "px-8 py-4 text-base sm:text-lg" : "px-6 py-3.5 text-sm sm:text-base",
        variant === "solid" &&
          "bg-blink-sky text-blink-navy shadow-[0_1px_2px_rgba(4,16,45,0.04)] hover:bg-[hsl(var(--blink-sky-2))]",
        variant === "dark" &&
          "bg-blink-navy text-white shadow-[0_1px_2px_rgba(4,16,45,0.08)] hover:bg-blink-navy-2",
        variant === "ghost" &&
          "border border-blink-navy/15 text-blink-navy hover:border-blink-navy/30 hover:bg-blink-navy/[0.02]",
        "transition-colors duration-200",
        className,
      )}
    >
      {/* Continuous, subtle reflection — always moving, never neon. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -translate-x-full animate-cta-shine"
        style={{
          background:
            "linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.18) 45%, rgba(255,255,255,0.28) 55%, transparent 70%)",
        }}
      />
      <span className="relative z-10">{label}</span>
      <ArrowRight
        className={cn(
          "relative z-10 transition-transform duration-300 group-hover:translate-x-0.5",
          size === "lg" ? "h-5 w-5" : "h-4 w-4",
        )}
      />
    </Tag>
  );
}
