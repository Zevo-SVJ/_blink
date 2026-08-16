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
import { ScoreGain } from "@/components/analysis/ScoreGain";
import { ShareSheet } from "@/components/analysis/ShareSheet";
import { AuthModal } from "@/components/blink/AuthModal";
import { CTAButton } from "@/components/blink/CTAButton";
import { PageBackground } from "@/components/blink/PageBackground";
import { useImmersive } from "@/components/app/AppChrome";
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
import { ClimbSection } from "@/components/app/ClimbSection";
import {
  fetchFullProfile,
  recordAnalysis,
  type RecordedAnalysis,
} from "@/lib/blink-profile";
import { getMockMode, mockAnalyze } from "@/lib/dev-mock";
import { fetchMyStanding, fetchScoreStanding } from "@/lib/leaderboard";
import { getVoice, type Voice } from "@/lib/ownership";
import { pdpAnchor } from "@/lib/pdp";
import { detectPdp } from "@/lib/pdp-detect";
import { computeBlinkScore, type ProfileStats } from "@/lib/ranking";
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
  /** Points gained on a re-scan, while the confirmation is on screen. */
  const [gain, setGain] = useState<number | null>(null);
  const [standing, setStanding] = useState<PublicStanding | null>(null);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [myStats, setMyStats] = useState<ProfileStats | null>(null);
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
    setGain(null);

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
        const { base64 } = await resizeForUpload(sourceFile);
        const saved = await saveAnalysis(userId, analysis);
        const recorded = await recordAnalysis(userId, analysis, base64, saved?.id);
        if (recorded.status === "ok") {
          setProgression(recorded.data);
          // Only a counted, positive move earns the moment. A flat or lower
          // score gets the result screen and nothing else — see `ScoreGain`.
          if (recorded.data.check.counts && recorded.data.delta > 0) {
            setGain(recorded.data.delta);
          }
        }

        // Loaded after recording so "how to climb" reflects the analysis the
        // user is currently looking at, not the one before it.
        const full = await fetchFullProfile(userId, null);
        if (full.status === "ok") setMyStats(full.data.stats);
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

  // The tab bar is mounted by `AppChrome` and is already on screen when this
  // route loads. All this screen does is ask it to step aside for the analysis
  // animation, which is deliberately full-screen; it returns on its own the
  // moment the result lands, or if the user navigates away mid-run.
  useImmersive(screen === "analyzing");
  // Not "should we render it" — `AppChrome` owns that. This is only whether
  // to reserve the space it occupies.
  const chromeVisible = !!user && screen !== "analyzing";

  return (
    <div
      className={cn(
        "relative min-h-screen overflow-x-hidden",
        chromeVisible && "has-app-tabbar",
      )}
    >
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

          {/* No wordmark or logo here: the screenshot being analyzed is the
              subject, and branding above it competes for attention. */}
          <div className="flex justify-end">
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

      <main
        className={cn(
          "px-4 pt-20 sm:px-6 sm:pt-24",
          chromeVisible ? "pb-[calc(7rem+env(safe-area-inset-bottom))]" : "pb-24",
        )}
      >
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
                stats={myStats}
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
                  setMyStats(null);
                  setUnlocked(false);
                  setScreen("upload");
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
              />
            )}
          </AnimatePresence>
        </div>
      </main>

      {gain !== null && <ScoreGain delta={gain} onDone={() => setGain(null)} />}

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

/**
 * The profile picture's geometry, in the *displayed* screenshot's own
 * coordinate space — which is the space a clip-path on that element uses.
 *
 * Measured from the rendered element rather than precomputed, and re-measured
 * on resize, so the zoom lands on the avatar at every viewport and for every
 * screenshot shape.
 */
interface PdpTarget {
  /** Avatar centre, in CSS pixels from the screenshot's top-left. */
  localX: number;
  localY: number;
  /** Avatar radius, in CSS pixels. */
  localRadius: number;
  /** Radius that still covers the whole screenshot — the clip's resting size. */
  coverRadius: number;
  /** Scale that renders the avatar at exactly `CIRCLE_SIZE`. */
  scale: number;
  /** Translation that brings the avatar to the stage centre under that scale. */
  x: number;
  y: number;
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
  const [signalsVisible, setSignalsVisible] = useState(false);
  /** Blink has found the profile picture and is marking it, pre-zoom. */
  const [locating, setLocating] = useState(false);
  const [target, setTarget] = useState<PdpTarget | null>(null);

  const stageRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const stageTimers = useRef<number[]>([]);

  const messages = getAnalysisMessages(ownership);

  /**
   * Map the avatar's position in the *image* onto the *displayed* element.
   *
   * Measured at transform time rather than precomputed, because the rendered
   * size depends on the viewport and on how the image letterboxes inside the
   * stage.
   */
  const measureTarget = useCallback((): PdpTarget | null => {
    const img = imgRef.current;
    if (!img || !img.naturalWidth) return null;

    const rect = img.getBoundingClientRect();
    if (rect.width === 0) return null;

    // Look for the avatar in the actual pixels first. `pdpAnchor` is a fixed
    // layout fraction and lands *near* the profile picture rather than on it
    // whenever the capture includes a status bar, comes from Android, or has
    // been cropped — which is most real uploads. Detection returns null rather
    // than guessing, so a miss degrades to the fraction instead of to a
    // confidently wrong target.
    const anchor =
      detectPdp(img, img.naturalWidth, img.naturalHeight) ??
      pdpAnchor(img.naturalWidth, img.naturalHeight);

    const localX = anchor.cx * rect.width;
    const localY = anchor.cy * rect.height;
    const localRadius = Math.max(12, anchor.r * rect.width);

    // Scale so the avatar ends up exactly `CIRCLE_SIZE` across, then translate
    // by the negated, scaled offset of the avatar from the element's centre —
    // Framer composes translate before scale about the transform origin, so
    // that lands the avatar precisely on the stage centre.
    const scale = CIRCLE_SIZE / (2 * localRadius);

    return {
      localX,
      localY,
      localRadius,
      coverRadius: Math.hypot(rect.width, rect.height),
      scale,
      x: -(localX - rect.width / 2) * scale,
      y: -(localY - rect.height / 2) * scale,
    };
  }, []);

  // Measure once the bitmap has laid out, and again whenever the element
  // resizes. Without the re-measure a rotation or a resized window would zoom
  // to where the avatar used to be.
  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;

    const update = () => setTarget(measureTarget());
    update();

    if (!img.complete) img.addEventListener("load", update);
    const observer = new ResizeObserver(update);
    observer.observe(img);
    return () => {
      img.removeEventListener("load", update);
      observer.disconnect();
    };
  }, [measureTarget, previewUrl]);

  /**
   * Mark the profile picture, then move the camera onto it.
   *
   * The pause is the point: without it the zoom is unmotivated, and the user
   * sees a viewport lurch rather than "it found my picture and went in".
   */
  const beginTransform = useCallback(() => {
    setTarget((current) => current ?? measureTarget());
    setLocating(true);
    window.setTimeout(() => setTransformed(true), 620);
    window.setTimeout(() => setSignalsVisible(true), 1650);
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
            setLocating((already) => {
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

  // Scan line, retired once Blink has locked onto the profile picture.
  useEffect(() => {
    if (locating) return;
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
  }, [locating]);

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
      return already;
    });
  }, [hasResult, progress, messages.length, beginTransform, cancelStages]);

  // Both endpoints of the clip are expressed in pixels around the same centre,
  // so the animation is a plain radius interpolation. Mixing a `%` resting
  // value with a `px` target makes Framer fall back to a hard cut.
  const clipPath = target
    ? transformed
      ? `circle(${target.localRadius}px at ${target.localX}px ${target.localY}px)`
      : `circle(${target.coverRadius}px at ${target.localX}px ${target.localY}px)`
    : "circle(150% at 50% 50%)";

  /**
   * The camera move, in two stages.
   *
   * A small lead-in — 1.35× toward the avatar — starts as soon as the target
   * is known, so the shot is already drifting toward the profile picture
   * while the marker settles on it. The full move follows. One jump from rest
   * to 5× read as a cut; this reads as a camera finding its subject.
   */
  const camera =
    target && transformed
      ? { scale: target.scale, x: target.x, y: target.y }
      : target && locating
        ? { scale: 1.35, x: target.x * (0.35 / (target.scale - 1 || 1)), y: target.y * (0.35 / (target.scale - 1 || 1)) }
        : { scale: 1, x: 0, y: 0 };

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
        {/* Viewport for the camera. Mid-zoom the screenshot is several times
            the stage's size, so it needs somewhere to be cut off; the ring and
            labels live outside this box and are never clipped by it. */}
        <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
        {/* Screenshot.
            `min-w-0` matters: a flex item's default `min-width: auto` is its
            content size, which overrides `max-width` and lets a wide capture
            burst out of the stage. Zeroing it lets the max-width cap win.

            This element is the camera. It scales and translates so the profile
            picture lands dead centre at exactly `CIRCLE_SIZE`, while a
            clip-path closes from the whole frame down to a circle around that
            same point. Because the clip is applied in the element's own
            coordinate space, it rides the transform — so the zoom and the
            framing stay locked together, and the circle you end up looking at
            *is* the screenshot rather than a second element faded in on top
            of it. That is what was missing before: the old version cross-faded
            to a separate cropped div, which reads as a cut, not a move. */}
        <motion.div
          className="relative flex min-w-0 max-h-full max-w-full items-center justify-center"
          animate={camera}
          transition={{ duration: 1.15, ease: [0.32, 0.72, 0, 1] }}
          style={{ pointerEvents: "none" }}
        >
          {/* Corner rounding is a static class, never animated. Animating
              `borderRadius` towards a pill on a tall element intersects the
              clip circle with a stadium, and what you see mid-zoom is a blob
              rather than a circle. The clip already does all the shaping. */}
          <motion.div
            className="relative max-w-full overflow-hidden rounded-2xl"
            animate={{ clipPath }}
            transition={{ duration: 1.15, ease: [0.32, 0.72, 0, 1] }}
            style={{ clipPath }}
          >
            <img
              ref={imgRef}
              src={previewUrl}
              alt="The profile being analyzed"
              className="block h-auto w-auto object-contain"
              style={{ maxHeight: STAGE_HEIGHT, maxWidth: STAGE_MAX_WIDTH }}
              draggable={false}
            />
            {/*
              The read.

              A soft band of light travelling down the capture, not a hard
              line: a 2px white rule with a glow reads as a sci-fi prop, and
              the brief was "Blink is inspecting this", which is a quieter
              gesture. Three layers do it — a wide soft wash, a narrow bright
              core inside it, and a faint sheen that lags slightly behind, so
              the light has depth and a direction rather than being a shape
              that slides.
            */}
            {!locating && (
              <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
                <div
                  className="absolute inset-x-0"
                  style={{
                    top: `${scanY * 100}%`,
                    height: "140px",
                    transform: "translateY(-70px)",
                    background:
                      "linear-gradient(to bottom, transparent 0%, rgba(175,224,249,0.05) 35%, rgba(175,224,249,0.12) 50%, rgba(175,224,249,0.05) 65%, transparent 100%)",
                  }}
                />
                <div
                  className="absolute inset-x-0"
                  style={{
                    top: `${scanY * 100}%`,
                    height: "26px",
                    transform: "translateY(-13px)",
                    background:
                      "linear-gradient(to bottom, transparent, rgba(200,235,255,0.3), transparent)",
                  }}
                />
                {/* The lag. A second, dimmer pass a few percent behind the
                    first is what stops it reading as a solid moving bar. */}
                <div
                  className="absolute inset-x-0"
                  style={{
                    top: `${Math.max(0, scanY * 100 - 5)}%`,
                    height: "60px",
                    transform: "translateY(-30px)",
                    background:
                      "linear-gradient(to bottom, transparent, rgba(175,224,249,0.07), transparent)",
                  }}
                />
              </div>
            )}

            {/*
              Lock-on. Drawn in the screenshot's own coordinate space, so it
              sits exactly on the detected profile picture and rides the zoom
              with it. This is the beat that makes the camera move legible:
              first Blink shows you what it found, then it goes there.
            */}
            {target && locating && (
              <motion.span
                aria-hidden
                className="pointer-events-none absolute rounded-full ring-2 ring-blink-sky"
                style={{
                  left: target.localX - target.localRadius,
                  top: target.localY - target.localRadius,
                  width: target.localRadius * 2,
                  height: target.localRadius * 2,
                }}
                initial={{ opacity: 0, scale: 2.4 }}
                animate={{ opacity: transformed ? 0 : 1, scale: 1 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              />
            )}
          </motion.div>
        </motion.div>
        </div>

        {/* Ring, ripples and labels, drawn around the point the camera lands
            on — the centre of the stage. */}
        {transformed && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <ScannerOverlay signalsVisible={signalsVisible} />
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
 * What is drawn *around* the profile picture once the camera has landed on it.
 *
 * There is no avatar in here. The screenshot itself is the circle by this
 * point — see the camera note on the stage — so a second cropped copy would
 * only be a chance for the two to disagree by a pixel. This is the ring, the
 * reflection sweep that reads as "being read", and the perception labels.
 */
function ScannerOverlay({ signalsVisible }: { signalsVisible: boolean }) {
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

      {/* The lock-on ring, closing as the camera settles. */}
      <motion.div
        className="absolute rounded-full ring-1 ring-blink-sky/45"
        style={{ width: CIRCLE_SIZE + 16, height: CIRCLE_SIZE + 16 }}
        initial={{ opacity: 0, scale: 1.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.95, ease: [0.32, 0.72, 0, 1] }}
        aria-hidden
      />

      {/* Reflection sweep across the locked profile picture. */}
      <motion.div
        className="absolute overflow-hidden rounded-full"
        style={{ width: CIRCLE_SIZE, height: CIRCLE_SIZE }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.85 }}
        aria-hidden
      >
        <motion.div
          className="absolute inset-y-0 w-1/2"
          style={{
            background:
              "linear-gradient(100deg, transparent, rgba(175,224,249,0.32), transparent)",
          }}
          initial={{ left: "-60%" }}
          animate={{ left: "130%" }}
          transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 0.9, ease: "easeInOut" }}
        />
      </motion.div>

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
              className="absolute flex items-center gap-1.5 whitespace-nowrap rounded-full bg-white/[0.06] px-3 py-1.5 ring-1 ring-white/10 backdrop-blur-sm"
              initial={{ opacity: 0, x: 0, y: 0, scale: 0.6 }}
              animate={{
                opacity: 1,
                x: Math.cos((angle * Math.PI) / 180) * radius,
                y: Math.sin((angle * Math.PI) / 180) * radius,
                scale: 1,
              }}
              transition={{ type: "spring", stiffness: 280, damping: 26, delay: i * 0.09 }}
            >
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
  stats,
  onUnlock,
  onAnalyzeAnother,
}: {
  result: AnalysisResultType;
  revealStage: number;
  unlocked: boolean;
  progression: RecordedAnalysis | null;
  standing: PublicStanding | null;
  shareRank: number | null;
  stats: ProfileStats | null;
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
        climb={
          voice.isOwn && stats ? (
            <ClimbSection
              stats={stats}
              rank={shareRank}
              recommendations={result.recommendations}
              // What Blink just decided about this profile, so the identity
              // path can name it instead of giving generic advice.
              identity={{
                category: result.category?.category ?? null,
                strongestSignal: result.strongestSignals?.[0] ?? null,
              }}
            />
          ) : undefined
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
