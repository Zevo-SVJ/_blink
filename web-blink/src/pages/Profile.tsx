/**
 * Blink — your profile.
 *
 * Until onboarding is complete this renders the onboarding flow instead. That
 * is deliberate: a first-run dashboard of zeros and em-dashes reads as broken,
 * so we ask for an identity before we show anything about standing.
 *
 * Once complete it shows the same card the leaderboard opens for anyone else,
 * plus the private "how to climb" section.
 */

import { Pencil, Settings as SettingsIcon, Sparkles, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

import { AppShell, AppShellLoading } from "@/components/app/AppShell";
import { ClimbSection } from "@/components/app/ClimbSection";
import { IdentityFields } from "@/components/app/IdentityForm";
import { validateIdentity, type IdentityDraft } from "@/lib/identity";
import { PublicProfileCard, type PublicProfileView } from "@/components/app/PublicProfileCard";
import { EmptyState, ErrorState, SkeletonList } from "@/components/app/states";
import { useAuth } from "@/hooks/useAuth";
import {
  fetchFullProfile,
  updateBlinkProfile,
  withRank,
  type BlinkProfile,
  type FullProfile,
} from "@/lib/blink-profile";
import { fetchSavedAnalyses } from "@/lib/analysis";
import { useT } from "@/lib/i18n";
import { fetchMyStanding, type LeaderboardEntry } from "@/lib/leaderboard";
import { Onboarding } from "@/pages/Onboarding";

/** First impression and traits from the newest own-profile analysis. */
interface Perception {
  firstImpression: string | null;
  traits: string[];
}

type Load =
  | { state: "loading" }
  | { state: "error"; message: string }
  | {
      state: "ready";
      data: FullProfile;
      standing: LeaderboardEntry | null;
      perception: Perception | null;
    };

export default function Profile() {
  const t = useT();
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const [editing, setEditing] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) return;
    /* Three independent reads, all at once. In sequence their timeouts stacked
       into most of half a minute of skeleton with the backend unreachable, and
       cost two extra round trips on every ordinary visit. The perception is
       best-effort — see below — so its rejection is caught here rather than
       being allowed to fail the page. */
    const [standingRes, full, saved] = await Promise.all([
      fetchMyStanding(user.id),
      fetchFullProfile(user.id),
      fetchSavedAnalyses().catch(() => null),
    ]);
    const standing = standingRes.status === "ok" ? standingRes.data : null;

    if (full.status === "error") {
      setLoad({ state: "error", message: full.message });
      return;
    }

    // Best-effort: the page is still complete without it, so a failure here
    // must not take down the profile.
    const mine = saved?.find((a) => a.result.ownership === "own");
    const perception: Perception | null = mine
      ? {
          firstImpression: mine.result.firstImpression || null,
          traits: mine.result.traits ?? [],
        }
      : null;

    setLoad({
      state: "ready",
      data: withRank(full.data, standing?.rank ?? null),
      standing,
      perception,
    });
  }, [user]);

  useEffect(() => {
    setLoad({ state: "loading" });
    void refresh();
  }, [refresh]);

  if (authLoading) return <AppShellLoading />;

  // Onboarding owns the whole screen — no shell, no empty stats behind it.
  if (user && load.state === "ready" && !load.data.profile?.onboardedAt) {
    return (
      <Onboarding
        userId={user.id}
        existing={load.data.profile}
        suggestedName={user.name}
        onComplete={() => void refresh()}
      />
    );
  }

  return (
    <AppShell
      title={t.profilePage.title}
      // Nothing here needs the full column height until an analysis exists.
      center={load.state === "ready" && load.data.stats.verifiedCount === 0}
      action={
        load.state === "ready" ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="focus-ring inline-flex min-h-[44px] items-center gap-1.5 rounded-[var(--r-pill)] bg-white/[0.06] px-3.5 text-xs font-bold text-white/80 ring-1 ring-white/10 transition-colors hover:bg-white/[0.11]"
            >
              <Pencil className="h-3.5 w-3.5" />
              {t.profilePage.edit}
            </button>
            {/* Settings lost its tab so the bar could carry Analyze; this is
                now its only entry point, so it has to be here. */}
            <button
              type="button"
              onClick={() => navigate("/settings")}
              aria-label={t.profilePage.settings}
              className="focus-ring inline-flex h-11 w-11 items-center justify-center rounded-[var(--r-pill)] bg-white/[0.06] text-white/70 ring-1 ring-white/10 transition-colors hover:bg-white/[0.11] hover:text-white"
            >
              <SettingsIcon className="h-4 w-4" />
            </button>
          </div>
        ) : undefined
      }
    >
      {load.state === "loading" && <SkeletonList rows={3} />}

      {load.state === "error" && (
        <ErrorState message={load.message} onRetry={() => void refresh()} />
      )}

      {load.state === "ready" && user && (
        <>
          <ProfileBody
            data={load.data}
            standing={load.standing}
            perception={load.perception}
            onAnalyze={() => navigate("/analyze")}
          />
          <EditSheet
            open={editing}
            onClose={() => setEditing(false)}
            userId={user.id}
            profile={load.data.profile}
            onSaved={() => {
              setEditing(false);
              void refresh();
            }}
          />
        </>
      )}
    </AppShell>
  );
}

function ProfileBody({
  data,
  standing,
  perception,
  onAnalyze,
}: {
  data: FullProfile;
  standing: LeaderboardEntry | null;
  perception: Perception | null;
  onAnalyze: () => void;
}) {
  const t = useT();
  const { stats, profile } = data;

  if (stats.verifiedCount === 0) {
    return (
      <EmptyState
        icon={Sparkles}
        title={t.profilePage.noVerifiedTitle}
        description={t.profilePage.noVerifiedBody}
        action={
          <button
            type="button"
            onClick={onAnalyze}
            className="rounded-2xl bg-blink-sky px-6 py-3 text-sm font-bold text-blink-navy transition-transform hover:scale-[1.02]"
          >
            Analyze your profile
          </button>
        }
      />
    );
  }

  const view: PublicProfileView = {
    displayName: profile?.displayName ?? null,
    handle: profile?.handle ?? null,
    avatarUrl: profile?.avatarUrl ?? null,
    country: profile?.country ?? null,
    instagramUrl: profile?.instagramUrl ?? null,
    score: stats.score,
    peakScore: stats.peakScore,
    verifiedCount: stats.verifiedCount,
    streak: stats.streak,
    standing,
    bestRank: stats.bestRank,
    momentumDelta: stats.momentum.delta,
    perception,
  };

  return (
    <div className="space-y-10">
      <PublicProfileCard view={view} isMe />
      <ClimbSection stats={stats} rank={standing?.rank ?? null} onAnalyze={onAnalyze} />
    </div>
  );
}

// ---------------------------------------------------------------------------

function EditSheet({
  open,
  onClose,
  userId,
  profile,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  userId: string;
  profile: BlinkProfile | null;
  onSaved: () => void;
}) {
  const t = useT();
  const [draft, setDraft] = useState<IdentityDraft>({
    displayName: profile?.displayName ?? "",
    handle: profile?.handle ?? "",
    instagramUrl: profile?.instagramUrl ?? "",
    country: profile?.country ?? "",
    avatarUrl: profile?.avatarUrl ?? null,
    isPublic: profile?.isPublic ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-seed on open so a cancelled edit never persists into the next one.
  useEffect(() => {
    if (!open) return;
    setDraft({
      displayName: profile?.displayName ?? "",
      handle: profile?.handle ?? "",
      instagramUrl: profile?.instagramUrl ?? "",
      country: profile?.country ?? "",
      avatarUrl: profile?.avatarUrl ?? null,
      isPublic: profile?.isPublic ?? true,
    });
    setError(null);
  }, [open, profile]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const save = async () => {
    const validation = validateIdentity(draft);
    if (!validation.ok) {
      setError(validation.message ?? t.profilePage.checkFields);
      return;
    }

    setSaving(true);
    setError(null);
    const res = await updateBlinkProfile(userId, {
      ...validation.clean,
      avatarUrl: draft.avatarUrl,
      isPublic: draft.isPublic,
    });
    setSaving(false);

    if (res.status === "error") {
      setError(res.message);
      return;
    }
    onSaved();
  };

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
            aria-label={t.profilePage.editDialog}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ type: "spring", stiffness: 340, damping: 34 }}
            className="fixed inset-x-0 bottom-0 z-[71] mx-auto max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-[2rem] border border-white/[0.08] bg-blink-navy-2/95 p-5 backdrop-blur-2xl sm:inset-0 sm:m-auto sm:h-fit sm:rounded-[2rem]"
            style={{ paddingBottom: "max(env(safe-area-inset-bottom), 1.25rem)" }}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white">{t.profilePage.editProfile}</h2>
              <button
                type="button"
                onClick={onClose}
                aria-label={t.app.close}
                className="rounded-xl p-2 text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5">
              <IdentityFields
                draft={draft}
                onChange={(patch) => {
                  setDraft((d) => ({ ...d, ...patch }));
                  setError(null);
                }}
                userId={userId}
                onAvatarError={setError}
              />
            </div>

            {error && (
              <p role="alert" className="mt-3 text-xs font-medium text-red-400">
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="mt-5 w-full rounded-2xl bg-blink-sky py-3.5 text-sm font-bold text-blink-navy transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
            >
              {saving ? t.app.saving : "Save"}
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
