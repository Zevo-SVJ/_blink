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

import { Pencil, Sparkles, X } from "lucide-react";
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
  type BlinkProfile,
  type FullProfile,
} from "@/lib/blink-profile";
import { fetchMyStanding, type LeaderboardEntry } from "@/lib/leaderboard";
import { Onboarding } from "@/pages/Onboarding";

type Load =
  | { state: "loading" }
  | { state: "error"; message: string }
  | { state: "ready"; data: FullProfile; standing: LeaderboardEntry | null };

export default function Profile() {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const [editing, setEditing] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) return;
    const standingRes = await fetchMyStanding(user.id);
    const standing = standingRes.status === "ok" ? standingRes.data : null;

    const full = await fetchFullProfile(user.id, standing?.rank ?? null);
    if (full.status === "error") {
      setLoad({ state: "error", message: full.message });
      return;
    }
    setLoad({ state: "ready", data: full.data, standing });
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
      title="Profile"
      // Nothing here needs the full column height until an analysis exists.
      center={load.state === "ready" && load.data.stats.verifiedCount === 0}
      action={
        load.state === "ready" ? (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-3.5 py-2 text-xs font-bold text-white/80 transition-colors hover:bg-white/[0.1]"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </button>
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
  onAnalyze,
}: {
  data: FullProfile;
  standing: LeaderboardEntry | null;
  onAnalyze: () => void;
}) {
  const { stats, profile } = data;

  if (stats.verifiedCount === 0) {
    return (
      <EmptyState
        icon={Sparkles}
        title="No verified analysis yet"
        description="Upload a screenshot of your own Instagram profile — the one showing Edit profile — to get your first Blink Score."
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
  };

  return (
    <div className="space-y-5">
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
      setError(validation.message ?? "Check the fields above.");
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
            aria-label="Edit your profile"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ type: "spring", stiffness: 340, damping: 34 }}
            className="fixed inset-x-0 bottom-0 z-[71] mx-auto max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-[2rem] border border-white/[0.08] bg-blink-navy-2/95 p-5 backdrop-blur-2xl sm:inset-0 sm:m-auto sm:h-fit sm:rounded-[2rem]"
            style={{ paddingBottom: "max(env(safe-area-inset-bottom), 1.25rem)" }}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white">Edit profile</h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
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
              {saving ? "Saving…" : "Save"}
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
