import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ImagePlus, Lock, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { AuthModal } from "@/components/blink/AuthModal";
import { CTAButton } from "@/components/blink/CTAButton";
import { ScoreRing } from "@/components/blink/ScoreRing";
import { BLINK_LOGO, BRAND } from "@/lib/brand";
import {
  type AnalysisErrorCode,
  type AnalysisResult,
  type Perspective,
  type ProfileOwnership,
  AnalysisError,
  ERROR_MESSAGES,
  analyzeProfile,
  getAnalysisMessages,
  saveAnalysis,
} from "@/lib/analysis";
import { resizeForUpload } from "@/lib/resize";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_SIZE_MB = 20;

// ---------------------------------------------------------------------------
// Analysis stages — progress with mid-point transformation at ~50%
// ---------------------------------------------------------------------------

interface StageDef {
  target: number;
  messageKey: number;
  duration: number;
}

const STAGES: StageDef[] = [
  { target: 14, messageKey: 0, duration: 900 },
  { target: 27, messageKey: 1, duration: 1300 },
  { target: 41, messageKey: 2, duration: 1300 },
  { target: 50, messageKey: 3, duration: 1000 }, // ← transformation triggers at 50%
  { target: 65, messageKey: 4, duration: 1300 },
  { target: 80, messageKey: 5, duration: 1200 },
  { target: 93, messageKey: 6, duration: 1100 },
  { target: 100, messageKey: 7, duration: 900 },
];

const TRANSFORM_PROGRESS = 50;

// ---------------------------------------------------------------------------
// Screen type
// ---------------------------------------------------------------------------

type Screen = "upload" | "preview" | "analyzing" | "result";

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function Product() {
  const [screen, setScreen] = useState<Screen>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [revealStage, setRevealStage] = useState(0);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  const clearImage = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl("");
    setError(null);
  }, [previewUrl]);

  const validateAndSetImage = useCallback(
    (selectedFile: File) => {
      setError(null);
      if (!ACCEPTED_TYPES.includes(selectedFile.type)) {
        setError(ERROR_MESSAGES.INVALID_IMAGE);
        return;
      }
      if (selectedFile.size > MAX_SIZE_MB * 1024 * 1024) {
        setError(ERROR_MESSAGES.IMAGE_TOO_LARGE);
        return;
      }
      const url = URL.createObjectURL(selectedFile);
      const img = new Image();
      img.onload = () => {
        clearImage();
        setFile(selectedFile);
        setPreviewUrl(url);
        setScreen("preview");
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        setError(ERROR_MESSAGES.INVALID_IMAGE);
      };
      img.src = url;
    },
    [clearImage],
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) validateAndSetImage(selected);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) validateAndSetImage(dropped);
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setScreen("analyzing");
    setError(null);
    setResult(null);
    setUnlocked(false);
    setRevealStage(0);

    try {
      const { base64, mimeType } = await resizeForUpload(file);
      console.log("[handleAnalyze] image resized, starting analysis");
      const analysisResult = await analyzeProfile(base64, mimeType);
      console.log("[handleAnalyze] analysis complete", { score: analysisResult.overallScore, ownership: analysisResult.ownership });
      setResult(analysisResult);
    } catch (err) {
      // Log the real error for development diagnostics
      if (err instanceof AnalysisError) {
        console.error("[handleAnalyze] AnalysisError:", err.code, err.debugDetail ?? err.message);
      } else {
        console.error("[handleAnalyze] unexpected error:", err);
      }
      const code: AnalysisErrorCode =
        err instanceof AnalysisError
          ? err.code
          : err instanceof Error && err.message === "IMAGE_TOO_LARGE"
            ? "IMAGE_TOO_LARGE"
            : "ANALYSIS_FAILED";
      setError(ERROR_MESSAGES[code]);
      setScreen("preview");
    }
  };

  const handleAnalysisComplete = useCallback(() => {
    setScreen("result");
    setRevealStage(1);
    const timers = [500, 900, 1300, 1800, 2300, 2800].map((ms, i) =>
      window.setTimeout(() => setRevealStage(i + 2), ms),
    );
    return () => timers.forEach(window.clearTimeout);
  }, []);

  // After auth succeeds, unlock results and save
  useEffect(() => {
    if (user && result && !unlocked && screen === "result") {
      setUnlocked(true);
      setAuthModalOpen(false);
      setRevealStage(1);
      const timers = [500, 900, 1300, 1800, 2300, 2800].map((ms, i) =>
        window.setTimeout(() => setRevealStage(i + 2), ms),
      );
      // Save analysis to account
      if (file) {
        resizeForUpload(file).then(({ base64, mimeType }) => {
          saveAnalysis(result, base64, mimeType);
        }).catch(() => {});
      }
      return () => timers.forEach(window.clearTimeout);
    }
  }, [user, result, unlocked, screen, file]);

  const handleRetry = () => {
    setError(null);
    setScreen("preview");
  };

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, []);

  // Determine if we're in the blue "analysis mode"
  const inAnalysisMode = screen === "analyzing" || screen === "result";

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* Continuous page-level background — same environment as landing */}
      <div
        className="fixed inset-0 -z-10"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 0%, hsl(220 70% 14%) 0%, hsl(220 84% 10%) 40%, hsl(220 80% 8%) 100%)",
        }}
      />

      {/* Top navigation */}
      {inAnalysisMode ? (
        <header className="fixed inset-x-0 top-0 z-50">
          <div className="mx-auto flex max-w-6xl items-center justify-center px-4 py-4 sm:py-5">
            <span className="text-lg font-bold tracking-tight text-white">{BRAND.name}</span>
          </div>
        </header>
      ) : (
        <header className="fixed inset-x-0 top-0 z-50 bg-white/[0.03] shadow-[0_1px_0_rgba(175,224,249,0.06)] backdrop-blur-xl">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="group flex items-center gap-2 text-sm font-semibold text-white/60 transition-colors hover:text-white"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
              Back
            </button>
            <img
              src={BLINK_LOGO}
              alt={BRAND.name}
              className="h-8 w-8 select-none rounded-lg sm:h-9 sm:w-9"
              draggable={false}
            />
            <div className="w-10" />
          </div>
        </header>
      )}

      <main className={cn("px-4 pb-20 sm:px-6", inAnalysisMode ? "pt-20 sm:pt-24" : "pt-28 sm:pt-32")}>
        <div className="mx-auto max-w-2xl">
          <AnimatePresence mode="wait">
            {screen === "upload" && (
              <UploadScreen
                key="upload"
                fileInputRef={fileInputRef}
                error={error}
                isDragging={isDragging}
                onFileInput={handleFileInput}
                onDrop={handleDrop}
                onDragOver={() => setIsDragging(true)}
                onDragLeave={() => setIsDragging(false)}
              />
            )}
            {screen === "preview" && (
              <PreviewScreen
                key="preview"
                previewUrl={previewUrl}
                error={error}
                onAnalyze={handleAnalyze}
                onRetry={handleRetry}
                onChange={() => {
                  clearImage();
                  setScreen("upload");
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
              />
            )}
            {screen === "analyzing" && (
              <AnalysisScreen
                key="analyzing"
                previewUrl={previewUrl}
                onComplete={handleAnalysisComplete}
                hasResult={!!result}
                ownership={result?.ownership ?? "uncertain"}
              />
            )}
            {screen === "result" && result && (
              <ResultScreen
                key="result"
                result={result}
                revealStage={revealStage}
                unlocked={unlocked || !!user}
                onUnlock={() => {
                  if (user) {
                    setUnlocked(true);
                    setRevealStage(1);
                    const timers = [500, 900, 1300, 1800, 2300, 2800].map((ms, i) =>
                      window.setTimeout(() => setRevealStage(i + 2), ms),
                    );
                    if (file) {
                      resizeForUpload(file).then(({ base64, mimeType }) => {
                        saveAnalysis(result, base64, mimeType);
                      }).catch(() => {});
                    }
                    return () => timers.forEach(window.clearTimeout);
                  }
                  // Not authenticated — show auth modal
                  setAuthModalOpen(true);
                }}
              />
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Auth modal for unlock flow */}
      <AuthModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        title="Unlock your Blink results"
        subtitle="Create your account to see your complete analysis."
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Upload screen
// ---------------------------------------------------------------------------

function UploadScreen({
  fileInputRef,
  error,
  isDragging,
  onFileInput,
  onDrop,
  onDragOver,
  onDragLeave,
}: {
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  error: string | null;
  isDragging: boolean;
  onFileInput: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragOver: () => void;
  onDragLeave: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="flex flex-col items-center pt-8 text-center sm:pt-16"
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/8">
        <ImagePlus className="h-8 w-8 text-blink-sky" />
      </div>
      <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
        Show us a profile.
      </h1>
      <p className="mt-4 max-w-sm text-base leading-relaxed text-white/55">
        Upload a screenshot of an Instagram profile and Blink will analyze the first impression it gives.
      </p>

      <div className="mt-10 w-full max-w-sm">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={onFileInput}
        />
        <div
          role="button"
          tabIndex={0}
          onClick={() => fileInputRef.current?.click()}
          onDrop={onDrop}
          onDragOver={(e) => {
            e.preventDefault();
            onDragOver();
          }}
          onDragLeave={onDragLeave}
          onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
          className={cn(
            "group cursor-pointer rounded-2xl border-2 border-dashed p-6 transition-colors sm:p-8",
            isDragging
              ? "border-blink-sky-bright bg-blink-sky/10"
              : "border-white/15 bg-white/[0.03] hover:border-blink-sky-bright hover:bg-blink-sky/5",
          )}
        >
          <div className="flex flex-col items-center">
            <ProfilePlaceholder />
            <p className="mt-5 text-sm font-bold text-white">Upload profile screenshot</p>
            <p className="mt-1 text-xs font-medium text-white/45">PNG, JPG, JPEG, WEBP — max 20MB</p>
          </div>
        </div>

        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              className="mt-4 rounded-xl bg-red-500/10 px-4 py-3 text-sm font-medium text-red-400"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        <div className="mt-6 flex items-center justify-center gap-2 text-xs font-medium text-white/40">
          <Lock className="h-3.5 w-3.5" />
          <span>Your screenshot is analyzed and deleted. Never stored or shared.</span>
        </div>
      </div>
    </motion.div>
  );
}

function ProfilePlaceholder() {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-white/8 bg-white/[0.04] p-4">
      <div className="h-12 w-12 rounded-full bg-white/10" />
      <div className="mt-2 h-2 w-16 rounded-full bg-white/10" />
      <div className="mt-3 grid grid-cols-3 gap-1">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-7 w-7 rounded bg-white/8" />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Preview screen
// ---------------------------------------------------------------------------

function PreviewScreen({
  previewUrl,
  error,
  onAnalyze,
  onRetry,
  onChange,
}: {
  previewUrl: string;
  error: string | null;
  onAnalyze: () => void;
  onRetry: () => void;
  onChange: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="flex flex-col items-center pt-4 text-center sm:pt-10"
    >
      <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">Your screenshot</h1>
      <p className="mt-2 text-sm text-white/50">Looks good?</p>

      <div className="mt-6 w-full max-w-sm overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-xl">
        <img
          src={previewUrl}
          alt="Your profile screenshot"
          className="h-auto max-h-[420px] w-full object-contain"
        />
      </div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="mt-6 w-full max-w-sm rounded-2xl bg-red-500/10 px-5 py-4"
          >
            <p className="text-sm font-medium text-red-400">{error}</p>
            <button
              type="button"
              onClick={onRetry}
              className="mt-3 inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700"
            >
              <RefreshCw className="h-4 w-4" />
              Try again
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {!error && (
        <div className="mt-8 flex w-full max-w-sm flex-col gap-3">
          <CTAButton label="Analyze my profile" onClick={onAnalyze} size="lg" className="w-full" />
          <button
            type="button"
            onClick={onChange}
            className="inline-flex items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-semibold text-white/60 transition-colors hover:text-white"
          >
            <RefreshCw className="h-4 w-4" />
            Change screenshot
          </button>
        </div>
      )}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Analysis screen — mid-analysis transformation at ~50%
// The circle originates from the profile picture, NOT a Blink logo.
// ---------------------------------------------------------------------------

function AnalysisScreen({
  previewUrl,
  onComplete,
  hasResult,
  ownership,
}: {
  previewUrl: string;
  onComplete: () => (() => void) | void;
  hasResult: boolean;
  ownership: ProfileOwnership;
}) {
  const [progress, setProgress] = useState(0);
  const [messageIdx, setMessageIdx] = useState(0);
  const [scanY, setScanY] = useState(0);
  const [transformed, setTransformed] = useState(false);
  const [signalsVisible, setSignalsVisible] = useState(false);
  const [pdpOffset, setPdpOffset] = useState({ x: 0, y: 0 });
  const screenshotRef = useRef<HTMLDivElement>(null);
  const screenshotDims = useRef({ w: 0, h: 0 });
  const messages = getAnalysisMessages(ownership);

  // Measure screenshot dimensions continuously while visible
  useEffect(() => {
    if (transformed) return;
    const el = screenshotRef.current;
    if (!el) return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      screenshotDims.current = { w: rect.width, h: rect.height };
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [transformed]);

  // Calculate PDP offset when transformation begins
  // Instagram PDP is approximately at 18% from left, 15% from top
  useEffect(() => {
    if (transformed && screenshotDims.current.w > 0) {
      setPdpOffset({
        x: (0.18 - 0.5) * screenshotDims.current.w,
        y: (0.15 - 0.5) * screenshotDims.current.h,
      });
    }
  }, [transformed]);

  // Progress through stages with varying timing
  useEffect(() => {
    const timers: number[] = [];

    const runStage = (stageIdx: number) => {
      if (stageIdx >= STAGES.length) return;

      const stage = STAGES[stageIdx];
      setMessageIdx(stage.messageKey);

      const startProgress = stageIdx === 0 ? 0 : STAGES[stageIdx - 1].target;
      const steps = 8;
      const stepDuration = stage.duration / steps;
      const increment = (stage.target - startProgress) / steps;

      for (let s = 0; s < steps; s++) {
        const t = window.setTimeout(() => {
          setProgress(startProgress + increment * (s + 1));
        }, s * stepDuration);
        timers.push(t);
      }

      const t = window.setTimeout(() => {
        setProgress(stage.target);
        // Trigger transformation at the mid-point stage
        if (stage.target >= TRANSFORM_PROGRESS && !transformed) {
          setTransformed(true);
          // Signals appear shortly after transformation
          window.setTimeout(() => setSignalsVisible(true), 800);
        }
        runStage(stageIdx + 1);
      }, stage.duration);
      timers.push(t);
    };

    runStage(0);
    return () => timers.forEach(window.clearTimeout);
  }, [transformed]);

  // Scanning line — only active before transformation
  useEffect(() => {
    if (transformed) return;
    let frame: number;
    let startTime: number | null = null;
    const period = 2800;

    const animate = (time: number) => {
      if (startTime === null) startTime = time;
      const elapsed = time - startTime;
      const cycle = (elapsed % period) / period;
      const pos = cycle < 0.5 ? cycle * 2 : (1 - cycle) * 2;
      setScanY(pos);
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [transformed]);

  // When result arrives AND progress reaches 100, transition
  useEffect(() => {
    if (hasResult && progress >= 100) {
      const t = window.setTimeout(onComplete, 600);
      return () => window.clearTimeout(t);
    }
  }, [hasResult, progress, onComplete]);

  // If result arrives before progress hits 100, fast-forward
  useEffect(() => {
    if (hasResult && progress < 100) {
      setProgress(100);
      setMessageIdx(messages.length - 1);
      if (!transformed) {
        setTransformed(true);
        setSignalsVisible(true);
      }
    }
  }, [hasResult, progress, transformed, messages.length]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center pt-8 sm:pt-12"
    >
      {/* Central area — screenshot OR transformed circle */}
      <div className="relative flex h-[340px] w-full items-center justify-center sm:h-[400px]">
        {/* Subtle blue glow behind */}
        <div
          className={cn(
            "pointer-events-none absolute rounded-full bg-blink-sky/8 blur-2xl transition-all duration-1000",
            transformed ? "h-[200px] w-[200px]" : "h-full w-full max-w-[300px]",
          )}
          aria-hidden
        />

        {/* Screenshot — stays in flow, fades out during transformation */}
        <motion.div
          ref={screenshotRef}
          className="relative w-full max-w-[260px] sm:max-w-[300px]"
          animate={transformed ? { opacity: 0, scale: 0.88 } : { opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
          style={{ pointerEvents: transformed ? "none" : "auto" }}
        >
          <div className="relative overflow-hidden rounded-2xl border border-blink-sky/30 bg-white/5 shadow-[0_0_30px_-8px_rgba(175,224,249,0.15)]">
            <img
              src={previewUrl}
              alt="Your profile being analyzed"
              className="w-full opacity-95"
              draggable={false}
            />
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-b from-blink-sky/5 via-transparent to-blink-sky/5"
              aria-hidden
            />
            {/* Scanning line — only visible before transformation */}
            {!transformed && (
              <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
                <div
                  className="absolute left-0 right-0"
                  style={{
                    top: `${scanY * 100}%`,
                    height: "2px",
                    background:
                      "linear-gradient(90deg, transparent, rgba(175,224,249,0.6) 30%, rgba(175,224,249,0.9) 50%, rgba(175,224,249,0.6) 70%, transparent)",
                    boxShadow: "0 0 12px 2px rgba(175,224,249,0.3)",
                  }}
                />
                <div
                  className="absolute left-0 right-0"
                  style={{
                    top: `${scanY * 100}%`,
                    height: "60px",
                    transform: "translateY(-30px)",
                    background:
                      "linear-gradient(to bottom, transparent, rgba(175,224,249,0.06), transparent)",
                  }}
                />
              </div>
            )}
          </div>
        </motion.div>

        {/* Transformed circle — emerges from PDP position, moves to center */}
        {transformed && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <TransformedCircle
              previewUrl={previewUrl}
              signalsVisible={signalsVisible}
              pdpOffset={pdpOffset}
            />
          </motion.div>
        )}
      </div>

      {/* Progress bar — subtle, premium */}
      <div className="mt-6 w-full max-w-[260px] sm:max-w-[300px]">
        <div className="relative h-1 overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="absolute left-0 top-0 h-full rounded-full bg-blink-sky"
            style={{ width: `${progress}%` }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          />
        </div>
        <div className="mt-2 flex items-center justify-between">
          <AnimatePresence mode="wait">
            <motion.p
              key={messageIdx}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.3 }}
              className="text-xs font-medium text-white/60 sm:text-sm"
            >
              {messages[messageIdx] ?? "Analyzing…"}
            </motion.p>
          </AnimatePresence>
          <span className="text-xs font-bold tabular-nums text-white/40">
            {Math.round(progress)}%
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Transformed circle — the mid-analysis moment.
// The circle contains the user's actual profile image, NOT the Blink logo.
// The screenshot visually collapses toward the profile picture location.
// ---------------------------------------------------------------------------

function TransformedCircle({
  previewUrl,
  signalsVisible,
  pdpOffset,
}: {
  previewUrl: string;
  signalsVisible: boolean;
  pdpOffset: { x: number; y: number };
}) {
  const SIGNAL_LABELS = [
    "Visual Identity",
    "Aesthetic",
    "Confidence",
    "Status",
    "Approachability",
    "Mystery",
  ];

  return (
    <div className="relative flex h-[280px] w-[280px] items-center justify-center sm:h-[340px] sm:w-[340px]">
      {/* The profile image circle — emerges from the PDP position, moves to center */}
      <motion.div
        className="absolute overflow-hidden rounded-full ring-2 ring-blink-sky/40"
        initial={{ width: 80, height: 80, opacity: 0, x: pdpOffset.x, y: pdpOffset.y, scale: 0.5 }}
        animate={{ width: 130, height: 130, opacity: 1, x: 0, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 26, delay: 0.15 }}
      >
        <img
          src={previewUrl}
          alt="Your profile picture"
          className="h-full w-full object-cover"
          draggable={false}
        />
      </motion.div>

      {/* Outer ring — follows the circle from PDP to center */}
      <motion.div
        className="absolute rounded-full border-2 border-blink-sky/30"
        style={{ width: 145, height: 145 }}
        initial={{ opacity: 0, scale: 0.55, x: pdpOffset.x, y: pdpOffset.y }}
        animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
        transition={{ duration: 0.7, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
      />

      {/* Pulsing scan ring — smoothly emerges from the circle, no abrupt start */}
      <motion.div
        className="absolute rounded-full border border-blink-sky/25"
        style={{ width: 145, height: 145 }}
        initial={{ opacity: 0, scale: 1 }}
        animate={{
          opacity: [0, 0, 0.5, 0.25, 0],
          scale: [1, 1.02, 1.12, 1.28, 1.45],
        }}
        transition={{
          duration: 2.4,
          repeat: Infinity,
          ease: [0.22, 1, 0.36, 1],
          delay: 0.6,
          times: [0, 0.1, 0.3, 0.65, 1],
        }}
      />

      {/* Surrounding perception signals */}
      {signalsVisible &&
        SIGNAL_LABELS.map((label, i) => {
          const angle = (i * 360) / SIGNAL_LABELS.length - 90;
          const radius = 140;
          const x = Math.cos((angle * Math.PI) / 180) * radius;
          const y = Math.sin((angle * Math.PI) / 180) * radius;
          return (
            <motion.div
              key={label}
              className="absolute flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 backdrop-blur-sm"
              initial={{ opacity: 0, x: 0, y: 0, scale: 0.6 }}
              animate={{ opacity: 1, x, y, scale: 1 }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 24,
                delay: i * 0.1,
              }}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-blink-sky-bright" />
              <span className="text-[10px] font-bold text-white/90 sm:text-xs">{label}</span>
            </motion.div>
          );
        })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Result screen — locked (blurred) or unlocked (full narrative)
// ---------------------------------------------------------------------------

const springUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { type: "spring" as const, stiffness: 300, damping: 30 },
};

function ResultScreen({
  result,
  revealStage,
  unlocked,
  onUnlock,
}: {
  result: AnalysisResult;
  revealStage: number;
  unlocked: boolean;
  onUnlock: () => (() => void) | void;
}) {
  if (!unlocked) {
    return <LockedResult result={result} onUnlock={onUnlock} />;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center pt-4 text-center sm:pt-8"
    >
      {/* Hero — score + first impression + traits */}
      {revealStage >= 1 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
        >
          <ScoreRing value={result.overallScore} size={170} light />
        </motion.div>
      )}

      {revealStage >= 2 && (
        <motion.p
          {...springUp}
          transition={{ delay: 0.1, ...springUp.transition }}
          className="mt-4 text-xs font-bold uppercase tracking-widest text-white/45"
        >
          {result.firstImpression}
        </motion.p>
      )}

      {revealStage >= 3 && (
        <motion.div
          {...springUp}
          transition={{ delay: 0.1, ...springUp.transition }}
          className="mt-6 flex flex-wrap justify-center gap-2"
        >
          {result.traits.map((trait) => (
            <span
              key={trait}
              className="rounded-full bg-blink-sky px-4 py-1.5 text-sm font-semibold text-blink-navy"
            >
              {trait}
            </span>
          ))}
        </motion.div>
      )}

      {/* Personalized interpretation */}
      {revealStage >= 4 && (
        <motion.p
          {...springUp}
          transition={{ delay: 0.1, ...springUp.transition }}
          className="mt-8 max-w-md text-lg leading-relaxed text-white/80"
        >
          {result.why}
        </motion.p>
      )}

      {/* Signal dimensions — narrative, not generic cards */}
      {revealStage >= 5 && (
        <motion.div
          {...springUp}
          transition={{ delay: 0.1, ...springUp.transition }}
          className="mt-12 w-full max-w-md space-y-5 text-left"
        >
          <h3 className="text-xs font-bold uppercase tracking-widest text-white/45">
            What creates this impression
          </h3>
          {result.signals.map((signal) => (
            <SignalBar key={signal.label} signal={signal} />
          ))}
        </motion.div>
      )}

      {/* Perspectives — how different people may see you */}
      {revealStage >= 6 && (
        <motion.div
          {...springUp}
          transition={{ delay: 0.1, ...springUp.transition }}
          className="mt-12 w-full max-w-md text-left"
        >
          <h3 className="text-xs font-bold uppercase tracking-widest text-white/45">
            How different people may see you
          </h3>
          <PerspectiveSelector perspectives={result.perspectives} />
        </motion.div>
      )}

      {/* What works / What to change / Next move — narrative ending */}
      {revealStage >= 7 && (
        <motion.div
          {...springUp}
          transition={{ delay: 0.1, ...springUp.transition }}
          className="mt-12 w-full max-w-md space-y-3 text-left"
        >
          {result.strengths.map((text, i) => (
            <ResultBlock key={`strength-${i}`} title="What's working" text={text} tone="positive" />
          ))}
          {result.weaknesses.map((text, i) => (
            <ResultBlock key={`weak-${i}`} title="What you could change" text={text} tone="neutral" />
          ))}
          <ResultBlock title="Your next move" text={result.nextMove} tone="action" />
        </motion.div>
      )}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Locked result — blurred preview + Unlock CTA
// ---------------------------------------------------------------------------

function LockedResult({ result, onUnlock }: { result: AnalysisResult; onUnlock: () => (() => void) | void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center pt-4 text-center sm:pt-8"
    >
      {/* Visible score — creates curiosity */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
      >
        <ScoreRing value={result.overallScore} size={170} light />
      </motion.div>

      <motion.p
        {...springUp}
        transition={{ delay: 0.1, ...springUp.transition }}
        className="mt-4 text-xs font-bold uppercase tracking-widest text-white/45"
      >
        {result.firstImpression}
      </motion.p>

      {/* Visible first trait only */}
      {result.traits.length > 0 && (
        <motion.div
          {...springUp}
          transition={{ delay: 0.15, ...springUp.transition }}
          className="mt-6 flex justify-center gap-2"
        >
          <span className="rounded-full bg-blink-sky px-4 py-1.5 text-sm font-semibold text-blink-navy">
            {result.traits[0]}
          </span>
          {result.traits.length > 1 && (
            <span className="rounded-full bg-white/10 px-4 py-1.5 text-sm font-semibold text-white/40">
              +{result.traits.length - 1} more
            </span>
          )}
        </motion.div>
      )}

      {/* Blurred detailed results with lock CTA */}
      <div className="mt-10 w-full max-w-md">
        <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-5">
          <div className="space-y-3 blur-[6px] select-none" aria-hidden>
            <p className="text-sm font-bold text-white/80">{result.why.slice(0, 80)}…</p>
            <div className="space-y-2">
              {result.signals.slice(0, 3).map((s) => (
                <div key={s.label}>
                  <div className="flex justify-between">
                    <span className="text-xs font-semibold text-white/70">{s.label}</span>
                    <span className="text-xs font-bold text-blink-sky">{s.score.toFixed(1)}</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-blink-sky" style={{ width: `${s.score * 10}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 flex flex-col items-center border-t border-white/8 pt-5">
            <Lock className="h-6 w-6 text-blink-sky/60" />
            <p className="mt-3 text-sm font-semibold text-white/70">Your full analysis is ready</p>
            <p className="mt-1 text-xs text-white/40">See how your profile comes across — and what you can do about it.</p>

            <button
              type="button"
              onClick={onUnlock}
              className="mt-5 inline-flex items-center justify-center gap-2 rounded-2xl bg-blink-sky px-8 py-3.5 text-sm font-bold text-blink-navy transition-all hover:scale-[1.02] hover:bg-[hsl(var(--blink-sky-2))]"
            >
              <Lock className="h-4 w-4" />
              Unlock my results
            </button>
            <p className="mt-3 text-xs text-white/30">Free — create an account or sign in</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Signal bar — individual perception dimension
// ---------------------------------------------------------------------------

function SignalBar({ signal }: { signal: { label: string; score: number; description: string } }) {
  const [label, setLabel] = useState("");
  useEffect(() => {
    if (signal.score >= 7.5) setLabel("Strong");
    else if (signal.score >= 5.5) setLabel("Moderate");
    else if (signal.score >= 3.5) setLabel("Developing");
    else setLabel("Low");
  }, [signal.score]);

  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-white/90">{signal.label}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-white/45">{label}</span>
          <span className="text-sm font-bold tabular-nums text-blink-sky">
            {signal.score.toFixed(1)}
          </span>
        </div>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
        <motion.div
          className="h-full rounded-full bg-blink-sky"
          initial={{ width: 0 }}
          animate={{ width: `${signal.score * 10}%` }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
        />
      </div>
      {signal.description && (
        <p className="mt-1.5 text-xs leading-relaxed text-white/50">{signal.description}</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Perspective selector — crush, stranger, friends, recruiter
// ---------------------------------------------------------------------------

const PERSPECTIVE_ORDER: Perspective["id"][] = ["crush", "stranger", "friends", "recruiter"];

function PerspectiveSelector({ perspectives }: { perspectives: AnalysisResult["perspectives"] }) {
  const [selected, setSelected] = useState<Perspective["id"]>("crush");
  const current = perspectives[selected];

  return (
    <div className="mt-4">
      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {PERSPECTIVE_ORDER.map((id) => {
          const p = perspectives[id];
          const isActive = id === selected;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setSelected(id)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-2xl px-3.5 py-2 text-sm font-semibold transition-all",
                isActive
                  ? "bg-blink-sky text-blink-navy"
                  : "border border-white/10 text-white/60 hover:text-white/90",
              )}
            >
              <span>{p.emoji}</span>
              <span className="capitalize">{id}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={selected}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5"
        >
          <p className="text-base font-bold text-white">{current.title}</p>

          {current.traits.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {current.traits.map((trait) => (
                <span
                  key={trait}
                  className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/80"
                >
                  {trait}
                </span>
              ))}
            </div>
          )}

          {current.summary && (
            <p className="mt-3 text-sm leading-relaxed text-white/70">{current.summary}</p>
          )}

          {current.why && (
            <div className="mt-4">
              <p className="text-xs font-bold uppercase tracking-widest text-white/40">Why</p>
              <p className="mt-1 text-sm leading-relaxed text-white/70">{current.why}</p>
            </div>
          )}

          {current.recommendation && (
            <div className="mt-4">
              <p className="text-xs font-bold uppercase tracking-widest text-blink-sky/70">
                If you want to shift this
              </p>
              <p className="mt-1 text-sm leading-relaxed text-white/70">
                {current.recommendation}
              </p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Result block — what works / what to change / next move
// ---------------------------------------------------------------------------

function ResultBlock({
  title,
  text,
  tone,
}: {
  title: string;
  text: string;
  tone: "positive" | "neutral" | "action";
}) {
  const toneClasses = {
    positive: "border-emerald-400/20 bg-emerald-400/[0.06]",
    neutral: "border-amber-400/20 bg-amber-400/[0.06]",
    action: "border-blink-sky/30 bg-blink-sky/[0.08]",
  };

  const titleColors = {
    positive: "text-emerald-300/80",
    neutral: "text-amber-300/80",
    action: "text-blink-sky",
  };

  return (
    <div className={cn("rounded-2xl border p-4", toneClasses[tone])}>
      <p className={cn("text-xs font-bold uppercase tracking-widest", titleColors[tone])}>{title}</p>
      <p className="mt-1 text-sm font-medium leading-relaxed text-white/80 sm:text-base">{text}</p>
    </div>
  );
}
