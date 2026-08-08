import { cn } from "@/lib/utils";

export type TagTone = "sky" | "navy" | "rose" | "amber" | "green" | "red" | "neutral";

interface PerceptionTagProps {
  label: string;
  tone?: TagTone;
  size?: "sm" | "md";
  className?: string;
}

const toneClasses: Record<TagTone, string> = {
  sky: "bg-blink-sky/30 text-blink-navy ring-blink-sky/40",
  navy: "bg-blink-navy text-white ring-blink-navy/20",
  rose: "bg-rose-100 text-rose-700 ring-rose-200",
  amber: "bg-amber-100 text-amber-800 ring-amber-200",
  green: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  red: "bg-red-100 text-red-700 ring-red-200",
  neutral: "bg-blink-cloud text-blink-gray ring-blink-cloud-2",
};

/** Minimal perception label (Confident, Mysterious, High-status, …). */
export function PerceptionTag({
  label,
  tone = "neutral",
  size = "md",
  className,
}: PerceptionTagProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-semibold ring-1 ring-inset",
        size === "sm" ? "px-2.5 py-0.5 text-[11px]" : "px-3.5 py-1 text-xs",
        toneClasses[tone],
        className,
      )}
    >
      {label}
    </span>
  );
}
