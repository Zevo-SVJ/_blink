/**
 * Blink — the analysis flow: upload → preview → analysing → result.
 *
 * Three things here are load-bearing and easy to break:
 *
 *  1. LAYOUT. The screenshot lives in a height-capped stage and is bounded on
 *     both axes, so a 9:19.5 phone capture and a wide desktop crop both fit
 *     entirely inside it. Nothing can ever grow into the progress bar below.
 *
 *  2. VOICE. Copy is driven by `getVoice(ownership)`. Someone else's profile is
 *     never addressed as "you" and never receives the owner's improvement plan
 *     (also stripped in `validateAnalysisResult`, so this is the second gate).
 *
 *  3. THE LOOP. A new screenshot of your own profile is the only thing that
 *     moves your score. The result screen closes that loop explicitly.
 */

import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ImagePlus, Lock, RefreshCw, Share2, Trophy, User } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  AnalysisResult,
  OwnershipBanner,
  type PublicStanding,
} from "@/components/analysis/AnalysisResult";
import { ShareSheet } from "@/components/analysis/ShareSheet";
import { AuthModal } from "@/components/blink/AuthModal";
import { CTAButton } from "@/components/blink/CTAButton";
import { PageBackground } from "@/components/blink/PageBackground";
import { ScoreRing } from "@/components/blink/ScoreRing";
import { useAuth } from "@/hooks/useAuth";
import {
  AnalysisError,
  ERROR_MESSAGES,
  analyzeProfile,
  getAnalysisMessages,
  isRefusal,
  saveAnalysis,
  type AnalysisErrorCode,
  type AnalysisResult as AnalysisResultType,
  type ProfileOwnership,
} from "@/lib/analysis";
import { recordAnalysis, type RecordedAnalysis } from "@/lib/blink-profile";
import { BLINK_LOGO, BRAND } from "@/lib/brand";
import { getMockMode, mockAnalyze } from "@/lib/dev-mock";
import { fetchMyStanding, fetchScoreStanding } from "@/lib/leaderboard";
import { getVoice, type Voice } from "@/lib/ownership";
import { detectPdp, heuristicPdp, type PdpDetection } from "@/lib/pdp";
import { computeBlinkScore } from "@/lib/ranking";
import { resizeForUpload } from "@/lib/resize";
import { cn } from "@/lib/utils";

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_SIZE_MB = 20;

/**
 * Height of the screenshot stage. The image's max-height is pinned to the same
 * value, which is what guarantees it can never overlap what follows.
 */
const STAGE_HEIGHT = "clamp(220px, 44vh, 420px)";

/**
 * Width cap for the screenshot.
 *
 * Deliberately expressed in viewport units rather than `100%`: the image sits
 * inside shrink-to-fit ancestors, and a percentage max-width against an
 * indefinite containing block resolves to `none`, which let very wide captures
 * escape the column. A viewport-based value is always definite, and it tracks
 * the content column (`max-w-2xl` inside `px-4`) on both mobile and desktop.
 */
const STAGE_MAX_WIDTH = "min(calc(100vw - 2rem), 40rem)";

interface StageDef {
  target: number;
  messageKey: number;
  duration: number;
}

const STAGES: StageDef[] = [
  { target: 14, messageKey: 0, duration: 900 },
  { target: 27, messageKey: 1, duration: 1300 },
  { target: 41, messageKey: 2, duration: 1300 },
  { target: 50, messageKey: 3, duration: 1000 }, // transformation fires here
  { target: 65, messageKey: 4, duration: 1300 },
  { target: 80, messageKey: 5, duration: 1200 },
  { target: 93, messageKey: 6, duration: 1100 },
  { target: 100, messageKey: 7, duration: 900 },
];

const TRANSFORM_PROGRESS = 50;

type Screen = "upload" | "preview" | "analyzing" | "result";

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function Product() {
  const [screen, setScreen] = useState<Screen>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<AnalysisErrorCode | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [result, setResult] = useState<AnalysisResultType | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [revealStage, setRevealStage] = useState(0);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [progression, setProgression] = useState<RecordedAnalysis | null>(null);
  const [standing, setStanding] = useState<PublicStanding | null>(null);
  const [myRank, setMyRank] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string>("");
  const navigate = useNavigate();
  const { user } = useAuth();

  // Kept in a ref so the unmount cleanup always revokes the current URL
  // without needing `previewUrl` in its dependency list.
  useEffect(() => {
    previewUrlRef.current = previewUrl;
  }, [previewUrl]);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  const clearImage = useCallback(() => {
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return "";
    });
    setFile(null);
    setError(null);
    setErrorCode(null);
  }, []);

  const validateAndSetImage = useCallback(
    (selectedFile: File) => {
      setError(null);
      setErrorCode(null);
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

  const handleAnalyze = async () => {
    if (!file) return;
    setScreen("analyzing");
    setError(null);
    setErrorCode(null);
    setResult(null);
    setUnlocked(false);
    setRevealStage(0);
    setProgression(null);

    try {
      // Dev-only escape hatch for exercising the animation and both result
      // variants without live credentials. Compiled out of production builds.
      const mock = import.meta.env.DEV ? getMockMode(window.location.search) : null;
      if (mock) {
        setResult(await mockAnalyze(mock));
        return;
      }

      const { base64, mimeType } = await resizeForUpload(file);
      const analysisResult = await analyzeProfile(base64, mimeType);
      setResult(analysisResult);
    } catch (err) {
      if (err instanceof AnalysisError) {
        console.error("[handleAnalyze]", err.code, err.debugDetail ?? err.message);
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
      setErrorCode(code);
      setScreen("preview");
    }
  };

  /**
   * Resolve the rank the result and share card display.
   *
   * Own analyses use the signed-in user's real standing; a third-party read
   * uses where that score would place. Failures stay silent — rank is simply
   * omitted rather than blocking the result.
   */
  useEffect(() => {
    if (!result) return;
    let cancelled = false;

    if (result.ownership === "own") {
      if (!user) return;
      void fetchMyStanding(user.id).then((res) => {
        if (!cancelled && res.status === "ok") setMyRank(res.data?.rank ?? null);
      });
    } else {
      void fetchScoreStanding(computeBlinkScore(result).total).then((res) => {
        if (cancelled || res.status !== "ok") return;
        setStanding(res.data);
        setMyRank(res.data?.rank ?? null);
      });
    }

    return () => {
      cancelled = true;
    };
  }, [result, user]);

  const runReveal = useCallback(() => {
    setRevealStage(1);
    const timers = [500, 900, 1300, 1800, 2300, 2800].map((ms, i) =>
      window.setTimeout(() => setRevealStage(i + 2), ms),
    );
    return () => timers.forEach(window.clearTimeout);
  }, []);

  const handleAnalysisComplete = useCallback(() => {
    setScreen("result");
    return runReveal();
  }, [runReveal]);

  /**
   * Persist the analysis and run it through the progression gate.
   * Only reached once the viewer is authenticated.
   */
  const persist = useCallback(
    async (analysis: AnalysisResultType, sourceFile: File, userId: string) => {
      try {
        const { base64, mimeType } = await resizeForUpload(sourceFile);
        const saved = await saveAnalysis(analysis, base64, mimeType);
        const recorded = await recordAnalysis(userId, analysis, base64, saved?.id);
        if (recorded.status === "ok") setProgression(recorded.data);
      } catch (err) {
        // A failed save must not take down a result the user is already reading.
        console.error("[persist]", err);
      }
    },
    [],
  );

  // Auth completed while results were locked — unlock and save.
  useEffect(() => {
    if (!user || !result || unlocked || screen !== "result") return;
    setUnlocked(true);
    setAuthModalOpen(false);
    const cleanup = runReveal();
    if (file) void persist(result, file, user.id);
    return cleanup;
  }, [user, result, unlocked, screen, file, runReveal, persist]);

  const inAnalysisMode = screen === "analyzing" || screen === "result";

  const goBack = () => {
    if (screen === "result" || screen === "analyzing") {
      // Don't strand the user on a finished analysis.
      navigate(user ? "/app" : "/");
      return;
    }
    if (screen === "preview") {
      clearImage();
      setScreen("upload");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    navigate(user ? "/app" : "/");
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <PageBackground />

      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.06] bg-blink-navy/50 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <button
            type="button"
            onClick={goBack}
            className="group flex items-center gap-2 text-sm font-semibold text-white/60 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            <span className="hidden sm:inline">
              {screen === "preview" ? "Change" : user ? "Home" : "Back"}
            </span>
          </button>

          <img
            src={BLINK_LOGO}
            alt={BRAND.name}
            className="h-8 w-8 select-none rounded-lg"
            draggable={false}
          />

          {/* Balances the back button so the logo stays optically centred. */}
          <div className="flex w-[4.5rem] justify-end">
            {user && !inAnalysisMode && (
              <button
                type="button"
                onClick={() => navigate("/library")}
                className="text-sm font-semibold text-white/60 transition-colors hover:text-white"
              >
                Library
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="px-4 pb-24 pt-20 sm:px-6 sm:pt-24">
        <div className="mx-auto max-w-2xl">
          <AnimatePresence mode="wait">
            {screen === "upload" && (
              <UploadScreen
                key="upload"
                fileInputRef={fileInputRef}
                error={error}
                isDragging={isDragging}
                onFileInput={(e) => {
                  const selected = e.target.files?.[0];
                  if (selected) validateAndSetImage(selected);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  const dropped = e.dataTransfer.files?.[0];
                  if (dropped) validateAndSetImage(dropped);
                }}
                onDragOver={() => setIsDragging(true)}
                onDragLeave={() => setIsDragging(false)}
              />
            )}

            {screen === "preview" && (
              <PreviewScreen
                key="preview"
                previewUrl={previewUrl}
                error={error}
                refused={errorCode !== null && isRefusal(errorCode)}
                onAnalyze={handleAnalyze}
                onRetry={() => {
                  setError(null);
                  setErrorCode(null);
                  setScreen("preview");
                }}
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
                file={file}
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
                progression={progression}
                standing={standing}
                shareRank={myRank}
                onUnlock={() => {
                  if (!user) {
                    setAuthModalOpen(true);
                    return;
                  }
                  setUnlocked(true);
                  const cleanup = runReveal();
                  if (file) void persist(result, file, user.id);
                  return cleanup;
                }}
                onAnalyzeAnother={() => {
                  clearImage();
                  setResult(null);
                  setProgression(null);
                  setStanding(null);
                  setMyRank(null);
                  setUnlocked(false);
                  setScreen("upload");
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
              />
            )}
          </AnimatePresence>
        </div>
      </main>

      <AuthModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        title="Unlock your Blink results"
        subtitle="Create your account to see the complete analysis."
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Upload
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
      className="flex flex-col items-center pt-6 text-center sm:pt-12"
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.07]">
        <ImagePlus className="h-8 w-8 text-blink-sky" />
      </div>
      <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
        Show us a profile.
      </h1>
      <p className="mt-4 max-w-sm text-base leading-relaxed text-white/55">
        Upload a screenshot of an Instagram profile and Blink will analyze the first
        impression it gives.
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
            <p className="mt-1 text-xs font-medium text-white/45">
              PNG, JPG, WEBP — max {MAX_SIZE_MB}MB
            </p>
          </div>
        </div>

        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              role="alert"
              className="mt-4 rounded-xl bg-red-500/10 px-4 py-3 text-sm font-medium text-red-400"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        <div className="mt-6 flex items-center justify-center gap-2 text-xs font-medium text-white/40">
          <Lock className="h-3.5 w-3.5 shrink-0" />
          <span>Your screenshot is analyzed and deleted. Never stored or shared.</span>
        </div>
      </div>
    </motion.div>
  );
}

function ProfilePlaceholder() {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4">
      <div className="h-12 w-12 rounded-full bg-white/10" />
      <div className="mt-2 h-2 w-16 rounded-full bg-white/10" />
      <div className="mt-3 grid grid-cols-3 gap-1">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-7 w-7 rounded bg-white/[0.08]" />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Preview
// ---------------------------------------------------------------------------

function PreviewScreen({
  previewUrl,
  error,
  refused,
  onAnalyze,
  onRetry,
  onChange,
}: {
  previewUrl: string;
  error: string | null;
  /** Blink declined the image — retrying the same one won't help. */
  refused: boolean;
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
      className="flex flex-col items-center pt-2 text-center sm:pt-8"
    >
      <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
        Your screenshot
      </h1>
      <p className="mt-2 text-sm text-white/50">Looks good?</p>

      {/* Bounded on both axes so any aspect ratio fits without stretching. */}
      <div
        className="mt-6 flex w-full items-center justify-center"
        style={{ height: STAGE_HEIGHT }}
      >
        <img
          src={previewUrl}
          alt="Your profile screenshot"
          className="block h-auto w-auto min-w-0 rounded-2xl border border-white/10 object-contain shadow-xl"
          style={{ maxHeight: STAGE_HEIGHT, maxWidth: STAGE_MAX_WIDTH }}
        />
      </div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            role="alert"
            className={cn(
              "mt-6 w-full max-w-sm rounded-2xl px-5 py-4",
              // A refusal isn't a fault to retry past — it's guidance, so it
              // gets a calmer treatment and an action that can actually help.
              refused ? "bg-amber-400/[0.08]" : "bg-red-500/10",
            )}
          >
            <p
              className={cn(
                "text-sm font-medium leading-relaxed",
                refused ? "text-amber-200/90" : "text-red-400",
              )}
            >
              {error}
            </p>
            <button
              type="button"
              onClick={refused ? onChange : onRetry}
              className={cn(
                "mt-3 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors",
                refused
                  ? "bg-white/10 text-white hover:bg-white/15"
                  : "bg-red-600 text-white hover:bg-red-700",
              )}
            >
              <RefreshCw className="h-4 w-4" />
              {refused ? "Choose another screenshot" : "Try again"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {!error && (
        <div className="mt-8 flex w-full max-w-sm flex-col gap-3">
          <CTAButton label="Analyze this profile" onClick={onAnalyze} size="lg" className="w-full" />
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
// Analysing
// ---------------------------------------------------------------------------

/** Where the profile picture sits, in on-screen pixels relative to stage centre. */
interface PdpTarget {
  offsetX: number;
  offsetY: number;
  /** Displayed diameter of the avatar, in pixels. */
  diameter: number;
  pdp: PdpDetection;
  /** Aspect ratio of the screenshot, for the circular crop. */
  aspect: number;
}

/** Exported for the layout regression test in `analysis-layout.browser.test.tsx`. */
export function AnalysisScreen({
  previewUrl,
  file,
  onComplete,
  hasResult,
  ownership,
}: {
  previewUrl: string;
  file: File | null;
  onComplete: () => (() => void) | void;
  hasResult: boolean;
  ownership: ProfileOwnership;
}) {
  const [progress, setProgress] = useState(0);
  const [messageIdx, setMessageIdx] = useState(0);
  const [scanY, setScanY] = useState(0);
  const [transformed, setTransformed] = useState(false);
  const [screenshotGone, setScreenshotGone] = useState(false);
  const [signalsVisible, setSignalsVisible] = useState(false);
  const [target, setTarget] = useState<PdpTarget | null>(null);

  const stageRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const pdpRef = useRef<PdpDetection | null>(null);
  const stageTimers = useRef<number[]>([]);

  const messages = getAnalysisMessages(ownership);

  // Find the avatar in the uploaded file while the early stages play out, so
  // the result is ready well before the transformation needs it.
  useEffect(() => {
    if (!file) return;
    let cancelled = false;
    detectPdp(file).then((pdp) => {
      if (!cancelled) pdpRef.current = pdp;
    });
    return () => {
      cancelled = true;
    };
  }, [file]);

  /**
   * Map the avatar's position in the *image* onto the *displayed* element.
   *
   * Measured at transform time rather than precomputed, because the rendered
   * size depends on the viewport and on how the image letterboxes inside the
   * stage.
   */
  const measureTarget = useCallback((): PdpTarget | null => {
    const img = imgRef.current;
    const stage = stageRef.current;
    if (!img || !stage || !img.naturalWidth) return null;

    const imgRect = img.getBoundingClientRect();
    const stageRect = stage.getBoundingClientRect();
    if (imgRect.width === 0) return null;

    const pdp = pdpRef.current ?? heuristicPdp(img.naturalWidth, img.naturalHeight);

    const pdpX = imgRect.left + pdp.cx * imgRect.width;
    const pdpY = imgRect.top + pdp.cy * imgRect.height;

    return {
      offsetX: pdpX - (stageRect.left + stageRect.width / 2),
      offsetY: pdpY - (stageRect.top + stageRect.height / 2),
      diameter: Math.max(24, pdp.r * 2 * imgRect.width),
      pdp,
      aspect: img.naturalWidth / img.naturalHeight,
    };
  }, []);

  const beginTransform = useCallback(() => {
    setTarget(measureTarget());
    setTransformed(true);
    window.setTimeout(() => setSignalsVisible(true), 900);
  }, [measureTarget]);

  /**
   * Abandon the scripted timeline.
   *
   * Called when the analysis returns early. Without this the queued stage
   * timers keep writing lower progress values over the 100 we just set, which
   * repeatedly cancels the completion timeout — the screen would sit there for
   * the full scripted duration no matter how fast the model replied.
   */
  const cancelStages = useCallback(() => {
    stageTimers.current.forEach(window.clearTimeout);
    stageTimers.current = [];
  }, []);

  // Stage progression.
  useEffect(() => {
    const timers = stageTimers.current;

    const runStage = (stageIdx: number) => {
      if (stageIdx >= STAGES.length) return;
      const stage = STAGES[stageIdx];
      setMessageIdx(stage.messageKey);

      const startProgress = stageIdx === 0 ? 0 : STAGES[stageIdx - 1].target;
      const steps = 8;
      const stepDuration = stage.duration / steps;
      const increment = (stage.target - startProgress) / steps;

      for (let s = 0; s < steps; s++) {
        timers.push(
          window.setTimeout(() => {
            setProgress(startProgress + increment * (s + 1));
          }, s * stepDuration),
        );
      }

      timers.push(
        window.setTimeout(() => {
          setProgress(stage.target);
          if (stage.target >= TRANSFORM_PROGRESS) {
            setTransformed((already) => {
              if (!already) beginTransform();
              return true;
            });
          }
          runStage(stageIdx + 1);
        }, stage.duration),
      );
    };

    runStage(0);
    return cancelStages;
    // Runs once for the lifetime of the screen; both callbacks are stable.
  }, [beginTransform, cancelStages]);

  // Scan line, retired once the screenshot collapses.
  useEffect(() => {
    if (transformed) return;
    let frame: number;
    let startTime: number | null = null;
    const period = 2800;

    const animate = (time: number) => {
      if (startTime === null) startTime = time;
      const cycle = ((time - startTime) % period) / period;
      setScanY(cycle < 0.5 ? cycle * 2 : (1 - cycle) * 2);
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [transformed]);

  // Result landed and the bar is full — hand off to the result screen.
  useEffect(() => {
    if (hasResult && progress >= 100) {
      const t = window.setTimeout(onComplete, 600);
      return () => window.clearTimeout(t);
    }
  }, [hasResult, progress, onComplete]);

  // Result beat the animation — drop the remaining stages and jump to the end.
  useEffect(() => {
    if (!hasResult || progress >= 100) return;
    cancelStages();
    setProgress(100);
    setMessageIdx(messages.length - 1);
    setTransformed((already) => {
      if (!already) beginTransform();
      return true;
    });
    setSignalsVisible(true);
  }, [hasResult, progress, messages.length, beginTransform, cancelStages]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      // Centred in the remaining viewport so the stage isn't stranded at the
      // top of a mostly empty screen while the analysis runs.
      className="flex flex-col items-center justify-center"
      style={{ minHeight: "calc(100dvh - 11rem)" }}
    >
      {/* Stage — height-capped, so nothing here can reach the progress bar. */}
      <div
        ref={stageRef}
        className="relative flex w-full items-center justify-center"
        style={{ height: STAGE_HEIGHT }}
      >
        <div
          className={cn(
            "pointer-events-none absolute rounded-full bg-blink-sky/[0.07] blur-2xl transition-all duration-1000",
            transformed ? "h-[220px] w-[220px]" : "h-full w-full max-w-[320px]",
          )}
          aria-hidden
        />

        {/* Screenshot.
            `min-w-0` matters: a flex item's default `min-width: auto` is its
            content size, which overrides `max-width` and lets a wide capture
            burst out of the stage. Zeroing it lets the max-width cap win. */}
        <motion.div
          className="relative flex min-w-0 max-h-full max-w-full items-center justify-center"
          animate={transformed ? { opacity: 0, scale: 0.94 } : { opacity: 1, scale: 1 }}
          transition={{ duration: 0.65, ease: [0.4, 0, 0.2, 1] }}
          // Dropped from the tree once faded, so no ghost of the frame's
          // border or shadow can survive behind the circle.
          onAnimationComplete={() => transformed && setScreenshotGone(true)}
          style={{ pointerEvents: "none", display: screenshotGone ? "none" : undefined }}
        >
          <div className="relative max-w-full overflow-hidden rounded-2xl border border-blink-sky/25 shadow-[0_0_40px_-12px_rgba(175,224,249,0.2)]">
            <img
              ref={imgRef}
              src={previewUrl}
              alt="The profile being analyzed"
              className="block h-auto w-auto object-contain"
              style={{ maxHeight: STAGE_HEIGHT, maxWidth: STAGE_MAX_WIDTH }}
              draggable={false}
            />
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

        {transformed && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <TransformedCircle previewUrl={previewUrl} signalsVisible={signalsVisible} target={target} />
          </div>
        )}
      </div>

      {/* Progress — a sibling of the stage, never overlapped by it. */}
      <div className="mt-8 w-full max-w-[320px] shrink-0">
        <div
          className="relative h-1 overflow-hidden rounded-full bg-white/10"
          role="progressbar"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <motion.div
            className="absolute left-0 top-0 h-full rounded-full bg-blink-sky"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <AnimatePresence mode="wait">
            <motion.p
              key={messageIdx}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.3 }}
              className="min-w-0 flex-1 truncate text-xs font-medium text-white/60 sm:text-sm"
            >
              {messages[messageIdx] ?? "Analyzing…"}
            </motion.p>
          </AnimatePresence>
          <span className="shrink-0 text-xs font-bold tabular-nums text-white/40">
            {Math.round(progress)}%
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// The transformation
// ---------------------------------------------------------------------------

/** Rendered diameter of the circle once it settles in the centre. */
const CIRCLE_SIZE = 132;

const SIGNAL_LABELS = [
  "Visual Identity",
  "Aesthetic",
  "Confidence",
  "Status",
  "Approachability",
  "Mystery",
];

/**
 * The circle lifts off the profile picture inside the screenshot and carries it
 * to the centre.
 *
 * It is always a `CIRCLE_SIZE` element that animates `scale` and `x`/`y`, never
 * width/height — transform-only keeps it on the compositor, and it keeps the
 * background crop maths constant while the circle is moving.
 */
function TransformedCircle({
  previewUrl,
  signalsVisible,
  target,
}: {
  previewUrl: string;
  signalsVisible: boolean;
  target: PdpTarget | null;
}) {
  // Crop the screenshot so the circle shows the avatar itself, not a circular
  // window onto the whole screenshot.
  const crop = (() => {
    if (!target) return { backgroundSize: "cover", backgroundPosition: "center" };
    const { pdp, aspect } = target;
    const bgW = CIRCLE_SIZE / (2 * pdp.r);
    const bgH = bgW / aspect;
    return {
      backgroundSize: `${bgW}px ${bgH}px`,
      backgroundPosition: `${-(pdp.cx * bgW - CIRCLE_SIZE / 2)}px ${-(pdp.cy * bgH - CIRCLE_SIZE / 2)}px`,
    };
  })();

  const from = target
    ? { x: target.offsetX, y: target.offsetY, scale: target.diameter / CIRCLE_SIZE }
    : { x: 0, y: 0, scale: 0.55 };

  return (
    <div className="relative flex h-[300px] w-[300px] items-center justify-center sm:h-[340px] sm:w-[340px]">
      {/* Ripples. Each is exactly the circle's size, so scale 1 sits on its rim
          and there is no visible spawn — they fade up out of the edge. */}
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border border-blink-sky/30"
          style={{ width: CIRCLE_SIZE, height: CIRCLE_SIZE }}
          initial={{ opacity: 0, scale: 1 }}
          animate={{ opacity: [0, 0.45, 0], scale: [1, 1.55, 2.05] }}
          transition={{
            duration: 3.2,
            repeat: Infinity,
            ease: "easeOut",
            delay: 0.9 + i * 1.05,
            times: [0, 0.35, 1],
          }}
          aria-hidden
        />
      ))}

      {/* Ring, settling a beat after the avatar. */}
      <motion.div
        className="absolute rounded-full border border-blink-sky/25"
        style={{ width: CIRCLE_SIZE + 16, height: CIRCLE_SIZE + 16 }}
        initial={{ opacity: 0, x: from.x, y: from.y, scale: from.scale }}
        animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
        transition={{ duration: 0.85, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
        aria-hidden
      />

      {/* The avatar. */}
      <motion.div
        className="absolute overflow-hidden rounded-full bg-blink-navy-2 ring-2 ring-blink-sky/40"
        style={{
          width: CIRCLE_SIZE,
          height: CIRCLE_SIZE,
          backgroundImage: `url(${previewUrl})`,
          backgroundRepeat: "no-repeat",
          ...crop,
        }}
        initial={{ opacity: 0, x: from.x, y: from.y, scale: from.scale }}
        animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 150, damping: 22, mass: 0.9 }}
        role="img"
        aria-label="The profile picture being analyzed"
      />

      {/* Perception signals fanning out. */}
      {signalsVisible &&
        SIGNAL_LABELS.map((label, i) => {
          const angle = (i * 360) / SIGNAL_LABELS.length - 90;
          // Far enough out that the longest label still clears the circle's
          // rim, close enough that the widest one stays inside a 390px phone.
          const radius = 146;
          return (
            <motion.div
              key={label}
              className="absolute flex items-center gap-1.5 whitespace-nowrap rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 backdrop-blur-sm"
              initial={{ opacity: 0, x: 0, y: 0, scale: 0.6 }}
              animate={{
                opacity: 1,
                x: Math.cos((angle * Math.PI) / 180) * radius,
                y: Math.sin((angle * Math.PI) / 180) * radius,
                scale: 1,
              }}
              transition={{ type: "spring", stiffness: 280, damping: 26, delay: i * 0.09 }}
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
// Result — locked teaser, then the shared result surface
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
  progression,
  standing,
  shareRank,
  onUnlock,
  onAnalyzeAnother,
}: {
  result: AnalysisResultType;
  revealStage: number;
  unlocked: boolean;
  progression: RecordedAnalysis | null;
  standing: PublicStanding | null;
  shareRank: number | null;
  onUnlock: () => (() => void) | void;
  onAnalyzeAnother: () => void;
}) {
  const voice = getVoice(result.ownership, result.subjectGender);

  if (!unlocked) return <LockedResult result={result} voice={voice} onUnlock={onUnlock} />;

  return (
    <div className="pt-2 sm:pt-6">
      <AnalysisResult
        result={result}
        revealStage={revealStage}
        standing={standing}
        progression={
          voice.isOwn ? <ProgressionCard progression={progression} result={result} /> : undefined
        }
        actions={
          <ResultActions
            onAnalyzeAnother={onAnalyzeAnother}
            result={result}
            isOwn={voice.isOwn}
            shareRank={shareRank}
          />
        }
      />
    </div>
  );
}

/** Closes the loop: did this upload actually move the score, and if not, why. */
function ProgressionCard({
  progression,
  result,
}: {
  progression: RecordedAnalysis | null;
  result: AnalysisResultType;
}) {
  const score = progression?.score ?? computeBlinkScore(result).total;

  if (!progression) {
    return (
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5">
        <p className="text-xs font-bold uppercase tracking-widest text-white/45">Blink Score</p>
        <p className="mt-2 text-3xl font-extrabold tabular-nums text-white">{score}</p>
        <p className="mt-1.5 text-xs leading-relaxed text-white/45">
          Saving this analysis to your profile…
        </p>
      </div>
    );
  }

  const { check, delta } = progression;

  return (
    <div
      className={cn(
        "rounded-2xl border p-5",
        check.counts
          ? "border-emerald-400/20 bg-emerald-400/[0.06]"
          : "border-amber-400/20 bg-amber-400/[0.06]",
      )}
    >
      <p
        className={cn(
          "text-xs font-bold uppercase tracking-widest",
          check.counts ? "text-emerald-300/80" : "text-amber-300/80",
        )}
      >
        {check.counts ? "Verified — this counts" : "Not counted"}
      </p>

      <div className="mt-2 flex items-baseline gap-3">
        <span className="text-3xl font-extrabold tabular-nums text-white">{score}</span>
        {check.counts && delta !== 0 && (
          <span
            className={cn(
              "text-sm font-bold tabular-nums",
              delta > 0 ? "text-emerald-300" : "text-amber-300",
            )}
          >
            {delta > 0 ? `+${delta}` : delta}
          </span>
        )}
      </div>

      <p className="mt-1.5 text-xs leading-relaxed text-white/55">
        {check.counts
          ? "Your rank has been updated from this screenshot."
          : check.message}
      </p>
    </div>
  );
}

function ResultActions({
  onAnalyzeAnother,
  result,
  isOwn,
  shareRank,
}: {
  onAnalyzeAnother: () => void;
  result: AnalysisResultType;
  isOwn: boolean;
  shareRank: number | null;
}) {
  const navigate = useNavigate();
  const [shareOpen, setShareOpen] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => setShareOpen(true)}
        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blink-sky px-6 py-3.5 text-sm font-bold text-blink-navy transition-transform hover:scale-[1.02] active:scale-[0.98]"
      >
        <Share2 className="h-4 w-4" />
        Share this result
      </button>

      {isOwn && (
        <button
          type="button"
          onClick={() => navigate("/profile")}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-3.5 text-sm font-semibold text-white/80 transition-colors hover:bg-white/[0.08]"
        >
          <User className="h-4 w-4" />
          See your Blink profile
        </button>
      )}

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => navigate("/ranks")}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3.5 text-sm font-semibold text-white/80 transition-colors hover:bg-white/[0.08]"
        >
          <Trophy className="h-4 w-4" />
          Ranks
        </button>
        <button
          type="button"
          onClick={onAnalyzeAnother}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3.5 text-sm font-semibold text-white/80 transition-colors hover:bg-white/[0.08]"
        >
          <RefreshCw className="h-4 w-4" />
          Analyze another
        </button>
      </div>

      <ShareSheet
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        result={result}
        rank={shareRank}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Locked result — blurred teaser behind the auth wall
// ---------------------------------------------------------------------------

function LockedResult({
  result,
  voice,
  onUnlock,
}: {
  result: AnalysisResultType;
  voice: Voice;
  onUnlock: () => (() => void) | void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center pt-2 text-center sm:pt-6"
    >
      <OwnershipBanner voice={voice} handle={result.handle} />

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        className="mt-6"
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

      {result.traits.length > 0 && (
        <motion.div
          {...springUp}
          transition={{ delay: 0.15, ...springUp.transition }}
          className="mt-6 flex flex-wrap justify-center gap-2"
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

      <div className="mt-10 w-full max-w-md">
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
          <div className="select-none space-y-3 blur-[6px]" aria-hidden>
            <p className="text-sm font-bold text-white/80">{result.why.slice(0, 80)}…</p>
            <div className="space-y-2">
              {result.signals.slice(0, 3).map((s) => (
                <div key={s.label}>
                  <div className="flex justify-between">
                    <span className="text-xs font-semibold text-white/70">{s.label}</span>
                    <span className="text-xs font-bold text-blink-sky">{s.score.toFixed(1)}</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-blink-sky"
                      style={{ width: `${s.score * 10}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 flex flex-col items-center border-t border-white/[0.08] pt-5">
            <Lock className="h-6 w-6 text-blink-sky/60" />
            <p className="mt-3 text-sm font-semibold text-white/70">
              The full analysis is ready
            </p>
            <p className="mt-1 text-xs text-white/40">
              {voice.isOwn
                ? "See how your profile comes across — and what you can do about it."
                : `See how ${voice.subject} comes across to different people.`}
            </p>

            <button
              type="button"
              onClick={onUnlock}
              className="mt-5 inline-flex items-center justify-center gap-2 rounded-2xl bg-blink-sky px-8 py-3.5 text-sm font-bold text-blink-navy transition-all hover:scale-[1.02] hover:bg-[hsl(var(--blink-sky-2))]"
            >
              <Lock className="h-4 w-4" />
              Unlock the results
            </button>
            <p className="mt-3 text-xs text-white/30">Free — create an account or sign in</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
