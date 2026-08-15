/**
 * Blink — the language switch.
 *
 * Two letters, one control. A dropdown for a binary choice is a menu you have
 * to open to discover it only had two entries; this shows both states at once
 * and toggles between them, which is also why it needs no label — the two
 * options *are* the label.
 *
 * Accessibility, briefly:
 *  - a real `<button>`, so it is in the tab order and answers to Enter/Space;
 *  - `aria-label` names the action in the language being switched *to*, which
 *    is the convention that lets a French speaker find it in an English page;
 *  - `lang` on each half, so a screen reader pronounces "Français" in French
 *    rather than reading it as English;
 *  - 44px minimum hit area, matching every other control on a Blink page.
 */

import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function LanguageToggle({ className }: { className?: string }) {
  const { lang, t, setLang } = useI18n();
  const next = lang === "en" ? "fr" : "en";

  return (
    <button
      type="button"
      onClick={() => setLang(next)}
      aria-label={next === "fr" ? t.common.switchToFrench : t.common.switchToEnglish}
      className={cn(
        "inline-flex min-h-[44px] items-center gap-1 rounded-full px-2 text-xs font-bold uppercase tracking-wider",
        "text-white/40 transition-colors hover:text-white/70",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blink-sky focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
        className,
      )}
    >
      <span lang="en" className={cn(lang === "en" && "text-white")}>
        EN
      </span>
      <span aria-hidden className="text-white/20">
        /
      </span>
      <span lang="fr" className={cn(lang === "fr" && "text-white")}>
        FR
      </span>
    </button>
  );
}
