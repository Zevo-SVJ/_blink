/**
 * Blink — "Add someone" to the leaderboard.
 *
 * Suggesting a profile, in as few decisions as possible. It is deliberately
 * *not* an analysis: no credit is spent, no score is produced, nothing is
 * uploaded to the model. The user is nominating a handle.
 *
 * ## The flow
 *
 *   pick → (reading) → confirm → sending → done
 *
 * Picking a screenshot is the first and usually only action. If the device can
 * read text out of an image, the handle is filled in for you and the field
 * shows where it came from; if it can't, the same field is simply empty and
 * you type. There is no separate "manual mode" — one screen, one field,
 * pre-filled when we can.
 *
 * You can also skip the screenshot entirely and just type a handle. Requiring
 * a capture to nominate someone whose username you already know would be
 * ceremony for its own sake.
 *
 * ## The confirmation
 *
 * A ring draws, a tick strokes itself in behind it, and the sheet leaves on
 * its own. It is the Apple Pay beat: the reward for finishing is that nothing
 * more is asked of you. No "OK" button to dismiss a success state.
 */

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ImagePlus, Sparkles, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { useAuth } from "@/hooks/useAuth";
import { canDetectHandle, detectHandle } from "@/lib/handle-detect";
import {
  normaliseHandle,
  suggestProfile,
  type SuggestionResult,
} from "@/lib/leaderboard-suggestions";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type Phase = "form" | "reading" | "sending" | "done";

const ACCEPTED = ["image/png", "image/jpeg", "image/webp", "image/heic"];
const MAX_MB = 10;

export function AddSomeoneSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const t = useT();
  const reduceMotion = useReducedMotion();
  const fileRef = useRef<HTMLInputElement>(null);

  const [phase, setPhase] = useState<Phase>("form");
  const [handle, setHandle] = useState("");
  const [note, setNote] = useState("");
  const [preview, setPreview] = useState<string>("");
  const [detected, setDetected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SuggestionResult | null>(null);

  const previewRef = useRef("");
  useEffect(() => {
    previewRef.current = preview;
  }, [preview]);

  const reset = useCallback(() => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    setPhase("form");
    setHandle("");
    setNote("");
    setPreview("");
    setDetected(false);
    setError(null);
    setResult(null);
  }, []);

  // Reset on open, not on close: resetting on close would blank the sheet
  // mid-exit-animation.
  useEffect(() => {
    if (open) reset();
  }, [open, reset]);

  useEffect(() => {
    return () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    };
  }, []);

  const onPick = useCallback(async (file: File) => {
    setError(null);

    if (!ACCEPTED.includes(file.type)) {
      setError(t.addSomeone.notImage);
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      setError(`That image is over ${MAX_MB}MB. Try a screenshot instead.`);
      return;
    }

    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    setPreview(URL.createObjectURL(file));

    // Only show the reading state where reading is actually possible —
    // a spinner that never had a chance is a lie.
    if (!canDetectHandle()) return;

    setPhase("reading");
    const guess = await detectHandle(file);
    setPhase("form");
    if (guess) {
      setHandle(guess.handle);
      setDetected(true);
    }
  }, []);

  const submit = useCallback(async () => {
    const clean = normaliseHandle(handle);
    if (!clean) {
      setError(t.addSomeone.notHandle);
      return;
    }

    setError(null);
    setPhase("sending");

    const res = await suggestProfile(
      {
        handle: clean,
        note,
        // The capture is not uploaded yet — see the storage note in the
        // migration. The handle is the payload that matters.
        evidencePath: null,
        source: detected ? "detected" : "typed",
      },
      user?.id ?? null,
    );

    setResult(res);
    setPhase("done");
  }, [handle, note, detected, user]);

  // The success state dismisses itself. Nothing to acknowledge.
  useEffect(() => {
    if (phase !== "done") return;
    if (result?.status === "error") return;
    const timer = window.setTimeout(onClose, 2200);
    return () => window.clearTimeout(timer);
  }, [phase, result, onClose]);

  // Escape closes, like every other sheet in the app.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const canSubmit = normaliseHandle(handle) !== null && phase === "form";

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={t.addSomeone.dialogTitle}
            initial={reduceMotion ? { opacity: 0 } : { y: "100%" }}
            animate={reduceMotion ? { opacity: 1 } : { y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="fixed inset-x-0 bottom-0 z-[71] mx-auto max-w-md rounded-t-[1.75rem] bg-blink-navy-2 pb-[max(env(safe-area-inset-bottom),1.25rem)] shadow-[0_-20px_60px_-20px_rgba(0,0,0,0.9)] ring-1 ring-white/[0.09]"
          >
            {/* Grabber, as on every iOS sheet. */}
            <div className="flex justify-center pt-2.5">
              <span aria-hidden className="h-1 w-9 rounded-full bg-white/20" />
            </div>

            <AnimatePresence mode="wait">
              {phase === "done" && result?.status !== "error" ? (
                <Confirmation key="done" result={result} handle={normaliseHandle(handle)} />
              ) : (
                <motion.div
                  key="form"
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  className="px-5 pb-2 pt-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-extrabold tracking-tight text-white">
                        Add someone
                      </h2>
                      <p className="mt-1 text-[0.8rem] leading-relaxed text-white/50">
                        Suggest a profile for the leaderboard. This doesn&rsquo;t run an
                        analysis and doesn&rsquo;t affect your score.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={onClose}
                      aria-label={t.app.close}
                      className="-mr-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/50 transition-colors hover:bg-white/[0.06] hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-5 space-y-4">
                    <ScreenshotField
                      preview={preview}
                      reading={phase === "reading"}
                      onPick={() => fileRef.current?.click()}
                    />

                    <div>
                      <label
                        htmlFor="suggest-handle"
                        className="flex items-center gap-2 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-white/40"
                      >
                        Instagram username
                        <AnimatePresence>
                          {detected && (
                            <motion.span
                              initial={{ opacity: 0, x: -4 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0 }}
                              className="flex items-center gap-1 rounded-full bg-blink-sky/15 px-2 py-0.5 text-[0.6rem] font-bold normal-case tracking-normal text-blink-sky"
                            >
                              <Sparkles className="h-2.5 w-2.5" />
                              Read from your screenshot
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </label>
                      <div className="mt-2 flex items-center gap-2 rounded-2xl bg-white/[0.05] px-3.5 ring-1 ring-white/[0.09] focus-within:ring-blink-sky/50">
                        <span className="text-sm font-semibold text-white/35">@</span>
                        <input
                          id="suggest-handle"
                          value={handle}
                          onChange={(e) => {
                            setHandle(e.target.value);
                            setDetected(false);
                          }}
                          placeholder="username"
                          autoComplete="off"
                          autoCapitalize="none"
                          spellCheck={false}
                          /* 16px minimum: anything smaller and iOS Safari zooms
                             the viewport on focus and never zooms back. */
                          className="min-h-[48px] w-full bg-transparent text-base text-white outline-none placeholder:text-white/25"
                        />
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="suggest-note"
                        className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-white/40"
                      >
                        Why them <span className="font-semibold normal-case tracking-normal text-white/25">· optional</span>
                      </label>
                      <input
                        id="suggest-note"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder={t.addSomeone.notePlaceholder}
                        maxLength={140}
                        className="mt-2 min-h-[48px] w-full rounded-2xl bg-white/[0.05] px-3.5 text-base text-white outline-none ring-1 ring-white/[0.09] placeholder:text-white/25 focus:ring-blink-sky/50"
                      />
                    </div>
                  </div>

                  <AnimatePresence>
                    {(error || result?.status === "error") && (
                      <motion.p
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden text-[0.78rem] font-medium text-red-300"
                      >
                        <span className="block pt-3">
                          {error ?? (result?.status === "error" ? result.message : "")}
                        </span>
                      </motion.p>
                    )}
                  </AnimatePresence>

                  <motion.button
                    type="button"
                    onClick={submit}
                    disabled={!canSubmit}
                    whileTap={canSubmit ? { scale: 0.98 } : undefined}
                    className={cn(
                      "mt-5 min-h-[52px] w-full rounded-2xl text-sm font-bold transition-colors",
                      canSubmit
                        ? "bg-blink-sky text-blink-navy"
                        : "bg-white/[0.06] text-white/30",
                    )}
                  >
                    {phase === "sending" ? t.addSomeone.adding : t.addSomeone.submit}
                  </motion.button>

                  <input
                    ref={fileRef}
                    type="file"
                    accept={ACCEPTED.join(",")}
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void onPick(file);
                      e.target.value = "";
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function ScreenshotField({
  preview,
  reading,
  onPick,
}: {
  preview: string;
  reading: boolean;
  onPick: () => void;
}) {
  const t = useT();

  return (
    <button
      type="button"
      onClick={onPick}
      className="flex w-full items-center gap-3.5 rounded-2xl bg-white/[0.04] p-3 text-left ring-1 ring-white/[0.08] transition-colors hover:bg-white/[0.07]"
    >
      <span className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/[0.06]">
        {preview ? (
          <img src={preview} alt="" className="h-full w-full object-cover" />
        ) : (
          <ImagePlus className="h-5 w-5 text-white/40" />
        )}

        {reading && (
          <motion.span
            aria-hidden
            className="absolute inset-x-0 h-6"
            initial={{ top: "-30%" }}
            animate={{ top: "110%" }}
            transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
            style={{
              background:
                "linear-gradient(to bottom, transparent, rgba(175,224,249,0.45), transparent)",
            }}
          />
        )}
      </span>

      <span className="min-w-0">
        <span className="block text-sm font-bold text-white">
          {reading ? t.addSomeone.reading : preview ? t.addSomeone.screenshotAdded : t.addSomeone.addScreenshot}
        </span>
        <span className="mt-0.5 block text-[0.75rem] leading-relaxed text-white/45">
          {reading
            ? t.addSomeone.lookingForHandle
            : preview
              ? t.addSomeone.tapToChange
              : t.addSomeone.screenshotHint}
        </span>
      </span>
    </button>
  );
}

/**
 * The Apple-Pay beat.
 *
 * A ring closes, a tick strokes in, the sheet leaves on its own. `pathLength`
 * is what makes the tick feel drawn rather than dropped in — it is the whole
 * effect, and it is one line.
 */
/**
 * Exported so the dev gallery can render the success beat on its own — it is
 * otherwise only reachable with working credentials and an applied migration,
 * which means the one animation most worth looking at would never be looked
 * at in this workspace.
 */
export function Confirmation({
  result,
  handle,
}: {
  result: SuggestionResult | null;
  handle: string | null;
}) {
  const t = useT();
  const reduceMotion = useReducedMotion();
  const pending = result?.status === "needs-setup";
  const duplicate = result?.status === "duplicate";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center px-6 pb-8 pt-8 text-center"
    >
      <motion.div
        className="relative flex h-20 w-20 items-center justify-center"
        initial={reduceMotion ? false : { scale: 0.6 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 18 }}
      >
        <svg viewBox="0 0 80 80" className="absolute inset-0" aria-hidden>
          <motion.circle
            cx="40"
            cy="40"
            r="36"
            fill="none"
            stroke="hsl(var(--blink-sky))"
            strokeWidth="3"
            strokeLinecap="round"
            initial={reduceMotion ? false : { pathLength: 0, rotate: -90 }}
            animate={{ pathLength: 1, rotate: -90 }}
            style={{ transformOrigin: "50% 50%" }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          />
          <motion.path
            d="M25 41 L35.5 51.5 L56 30"
            fill="none"
            stroke="hsl(var(--blink-sky))"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={reduceMotion ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.35, delay: 0.3, ease: "easeOut" }}
          />
        </svg>
      </motion.div>

      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        className="mt-5 text-lg font-extrabold tracking-tight text-white"
      >
        {duplicate ? t.addSomeone.already : t.addSomeone.added}
      </motion.p>

      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55 }}
        className="mt-1.5 max-w-[16rem] text-[0.85rem] leading-relaxed text-white/50"
      >
        {duplicate
          ? `@${handle} is already on the list. Thanks for looking out.`
          : pending
            ? `We've got @${handle}. Thanks — suggestions are reviewed before they appear.`
            : `Thanks. @${handle} goes into the queue for review.`}
      </motion.p>
    </motion.div>
  );
}
