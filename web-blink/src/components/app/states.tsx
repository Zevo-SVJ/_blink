/**
 * Shared loading / error / empty states.
 *
 * Every data-backed screen renders one of these three rather than inventing
 * its own, so a slow network, a failed query and "nothing here yet" always
 * look and behave the same way.
 *
 * Surfaces use `ring-1` rather than `border`, matching the rest of the app: a
 * ring paints in the same place but takes no layout space, so a container's
 * inner width doesn't change by 2px depending on whether it has an outline.
 * Interactive elements are 48px tall — the comfortable target, not the 44px
 * floor.
 */

import { motion } from "framer-motion";
import { AlertCircle, RefreshCw, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";

export function Spinner({ className }: { className?: string }) {
  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      className={cn(
        "h-5 w-5 rounded-full border-2 border-blink-sky/30 border-t-blink-sky",
        className,
      )}
      aria-hidden
    />
  );
}

export function LoadingState({ label }: { label?: string }) {
  const t = useT();

  return (
    <div
      className="flex items-center gap-3 rounded-2xl bg-white/[0.035] p-5 ring-1 ring-white/[0.07]"
      role="status"
    >
      <Spinner />
      <span className="text-sm text-white/50">{label ?? t.app.loading}</span>
    </div>
  );
}

/** Skeleton rows for list screens, so the layout doesn't jump on load. */
export function SkeletonList({ rows = 3 }: { rows?: number }) {
  const t = useT();

  return (
    <div className="space-y-3" role="status" aria-label={t.app.loading}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-[4.5rem] animate-pulse rounded-2xl bg-white/[0.035] ring-1 ring-white/[0.06]"
        />
      ))}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div
      className="rounded-2xl bg-red-400/[0.06] p-6 text-center ring-1 ring-red-400/20"
      role="alert"
    >
      <AlertCircle className="mx-auto h-7 w-7 text-red-300/80" />
      <p className="mt-3 text-sm font-medium text-white/80">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 inline-flex min-h-[48px] items-center gap-2 rounded-2xl bg-white/10 px-5 text-sm font-semibold text-white transition-colors hover:bg-white/15"
        >
          <RefreshCw className="h-4 w-4" />
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-white/[0.035] p-8 text-center ring-1 ring-white/[0.07]">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.06]">
        <Icon className="h-6 w-6 text-white/40" />
      </div>
      <p className="mt-4 text-sm font-semibold text-white/75">{title}</p>
      <p className="mx-auto mt-1.5 max-w-xs text-xs leading-relaxed text-white/40">
        {description}
      </p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}
