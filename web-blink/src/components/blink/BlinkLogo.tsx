import { cn } from "@/lib/utils";
import { BLINK_MARK, BRAND } from "@/lib/brand";

interface BlinkLogoProps {
  /** Width in px. Height is auto. */
  width?: number;
  /** Render the "Blink" wordmark next to the mark. */
  withWordmark?: boolean;
  /** Accessible label; defaults to brand name. */
  alt?: string;
  className?: string;
}

/** Official Blink logo — the provided white mark, never a redesign. */
export function BlinkLogo({
  width = 96,
  withWordmark = false,
  alt = BRAND.name,
  className,
}: BlinkLogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5 select-none", className)}>
      <img
        src={BLINK_MARK}
        alt={alt}
        width={width}
        draggable={false}
        className="h-auto object-contain"
        style={{ width }}
      />
      {withWordmark && (
        <span
          className="font-extrabold tracking-tight text-blink-navy"
          style={{ fontSize: width * 0.72, lineHeight: 1 }}
        >
          {BRAND.name}
        </span>
      )}
    </span>
  );
}
