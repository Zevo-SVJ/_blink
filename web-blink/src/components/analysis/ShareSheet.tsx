/**
 * Share sheet — previews the generated card and hands it off.
 *
 * Native file sharing where the browser supports it (iOS/Android Safari and
 * Chrome), download everywhere else. The preview is the real rendered card
 * scaled down, so what the user sends is exactly what they saw.
 */

import { AnimatePresence, motion } from "framer-motion";
import { Check, Download, Share2, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import type { AnalysisResult } from "@/lib/analysis";
import {
  SHARE_FORMATS,
  canShareFiles,
  canvasToBlob,
  drawShareCard,
  toShareCardData,
  type ShareFormat,
} from "@/lib/share-card";
import { cn } from "@/lib/utils";

export function ShareSheet({
  open,
  onClose,
  result,
  rank = null,
}: {
  open: boolean;
  onClose: () => void;
  result: AnalysisResult;
  rank?: number | null;
}) {
  const [format, setFormat] = useState<ShareFormat>("story");
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const spec = SHARE_FORMATS.find((f) => f.id === format) ?? SHARE_FORMATS[0];

  // Redraw whenever the sheet opens or the format changes.
  useEffect(() => {
    if (!open) return;
    setError(null);
    try {
      const canvas = drawShareCard(toShareCardData(result, rank), spec);
      canvasRef.current = canvas;
      setPreview(canvas.toDataURL("image/png"));
    } catch (err) {
      console.error("[ShareSheet] draw failed", err);
      setError("Blink couldn't build the card. Try again.");
    }
  }, [open, spec, result, rank]);

  // Close on Escape, matching the dialog role.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const flash = (message: string) => {
    setDone(message);
    window.setTimeout(() => setDone(null), 2000);
  };

  const handleShare = useCallback(async () => {
    if (!canvasRef.current) return;
    setBusy(true);
    setError(null);
    try {
      const blob = await canvasToBlob(canvasRef.current);
      const file = new File([blob], `blink-${result.handle ?? "result"}.png`, {
        type: "image/png",
      });
      await navigator.share({ files: [file], title: "My Blink result" });
      flash("Shared");
    } catch (err) {
      // A user dismissing the OS sheet is not a failure.
      if (err instanceof DOMException && err.name === "AbortError") return;
      console.error("[ShareSheet] share failed", err);
      setError("Sharing isn't available here — try downloading instead.");
    } finally {
      setBusy(false);
    }
  }, [result.handle]);

  const handleDownload = useCallback(async () => {
    if (!canvasRef.current) return;
    setBusy(true);
    setError(null);
    try {
      const blob = await canvasToBlob(canvasRef.current);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `blink-${result.handle ?? "result"}-${format}.png`;
      a.click();
      URL.revokeObjectURL(url);
      flash("Saved");
    } catch (err) {
      console.error("[ShareSheet] download failed", err);
      setError("Blink couldn't save the card. Try again.");
    } finally {
      setBusy(false);
    }
  }, [format, result.handle]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Share your Blink result"
            initial={{ opacity: 0, y: 40, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 340, damping: 34 }}
            className="fixed inset-x-0 bottom-0 z-[71] mx-auto max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-[2rem] border border-white/[0.08] bg-blink-navy-2/95 p-5 backdrop-blur-2xl sm:inset-0 sm:m-auto sm:h-fit sm:rounded-[2rem]"
            style={{ paddingBottom: "max(env(safe-area-inset-bottom), 1.25rem)" }}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white">Share your result</h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="rounded-xl p-2 text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Format picker */}
            <div className="mt-4 flex gap-1 rounded-2xl border border-white/[0.07] bg-white/[0.03] p-1">
              {SHARE_FORMATS.map((f) => {
                const active = f.id === format;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFormat(f.id)}
                    className={cn(
                      "relative flex-1 rounded-xl px-3 py-2 text-xs font-semibold transition-colors",
                      active ? "text-blink-navy" : "text-white/55 hover:text-white",
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId="share-format"
                        className="absolute inset-0 rounded-xl bg-blink-sky"
                        transition={{ type: "spring", stiffness: 420, damping: 36 }}
                      />
                    )}
                    <span className="relative">{f.label}</span>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-center text-[0.7rem] text-white/35">{spec.hint}</p>

            {/* Preview */}
            <div className="mt-4 flex justify-center">
              {preview ? (
                <img
                  src={preview}
                  alt="Preview of your Blink share card"
                  className="w-auto rounded-2xl border border-white/[0.08] shadow-2xl"
                  style={{ maxHeight: "min(46dvh, 380px)" }}
                />
              ) : (
                <div
                  className="w-full animate-pulse rounded-2xl bg-white/[0.04]"
                  style={{ aspectRatio: `${spec.width}/${spec.height}`, maxHeight: 380 }}
                />
              )}
            </div>

            {error && (
              <p role="alert" className="mt-3 text-center text-xs font-medium text-red-400">
                {error}
              </p>
            )}

            <div className="mt-5 flex flex-col gap-2.5">
              {canShareFiles() && (
                <button
                  type="button"
                  onClick={handleShare}
                  disabled={busy || !preview}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blink-sky px-6 py-3.5 text-sm font-bold text-blink-navy transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                >
                  <Share2 className="h-4 w-4" />
                  Share
                </button>
              )}
              <button
                type="button"
                onClick={handleDownload}
                disabled={busy || !preview}
                className={cn(
                  "inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-bold transition-colors disabled:opacity-50",
                  canShareFiles()
                    ? "border border-white/10 bg-white/[0.04] text-white/80 hover:bg-white/[0.08]"
                    : "bg-blink-sky text-blink-navy hover:bg-[hsl(var(--blink-sky-2))]",
                )}
              >
                {done ? <Check className="h-4 w-4" /> : <Download className="h-4 w-4" />}
                {done ?? "Save image"}
              </button>
            </div>

            <p className="mt-3 text-center text-[0.7rem] leading-relaxed text-white/30">
              Cards show your score, rank and category — never your recommendations.
            </p>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
