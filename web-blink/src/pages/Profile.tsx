/**
 * Blink — your profile.
 *
 * Compact by design. The previous version was a dashboard: a giant dial and
 * six stat tiles that pushed everything else below the fold. Here the identity
 * header carries the score inline, and everything earned is a badge you can
 * tap for its meaning — so the screen stays short and still says everything.
 *
 * Nothing on this page moves without a verified analysis of a new screenshot.
 */

import { AnimatePresence, motion } from "framer-motion";
import {
  Camera,
  Check,
  ExternalLink,
  Flame,
  Globe,
  Lock,
  Medal,
  Pencil,
  Sparkles,
  TrendingUp,
  Trophy,
  X,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { AppShell } from "@/components/app/AppShell";
import { EmptyState, ErrorState, SkeletonList } from "@/components/app/states";
import { useAuth } from "@/hooks/useAuth";
import { formatRank } from "@/lib/app-nav";
import { ACCEPTED_AVATAR_TYPES, uploadAvatar } from "@/lib/avatar";
import {
  fetchFullProfile,
  updateBlinkProfile,
  type BlinkProfile,
  type FullProfile,
} from "@/lib/blink-profile";
import { categoryLabel } from "@/lib/categories";
import { COUNTRIES, countryName, flagEmoji } from "@/lib/countries";
import { fetchMyStanding } from "@/lib/leaderboard";
import { MAX_SCORE, pointsToNextTier, type ProfileStats } from "@/lib/ranking";
import { cn } from "@/lib/utils";

type Load =
  | { state: "loading" }
  | { state: "error"; message: string }
  | { state: "ready"; data: FullProfile; rank: number | null };

export default function Profile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const [editing, setEditing] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) return;
    const standing = await fetchMyStanding(user.id);
    const rank = standing.status === "ok" ? (standing.data?.rank ?? null) : null;

    const full = await fetchFullProfile(user.id, rank);
    if (full.status === "error") {
      setLoad({ state: "error", message: full.message });
      return;
    }
    setLoad({ state: "ready", data: full.data, rank });
  }, [user]);

  useEffect(() => {
    setLoad({ state: "loading" });
    void refresh();
  }, [refresh]);

  return (
    <AppShell
      title="Profile"
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
            rank={load.rank}
            fallbackName={user.name ?? user.email}
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

// ---------------------------------------------------------------------------

function ProfileBody({
  data,
  rank,
  fallbackName,
  onAnalyze,
}: {
  data: FullProfile;
  rank: number | null;
  fallbackName: string;
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

  return (
    <div className="space-y-5">
      <IdentityHeader profile={profile} stats={stats} rank={rank} fallbackName={fallbackName} />
      <Badges stats={stats} rank={rank} />
      <ClimbCard onAnalyze={onAnalyze} />
    </div>
  );
}

/** Avatar, name, handle, country and the score — all in one compact block. */
function IdentityHeader({
  profile,
  stats,
  rank,
  fallbackName,
}: {
  profile: BlinkProfile | null;
  stats: ProfileStats;
  rank: number | null;
  fallbackName: string;
}) {
  const next = pointsToNextTier(stats.score);
  const name = profile?.displayName || fallbackName;
  const progress = Math.min(100, (stats.score / MAX_SCORE) * 100);

  return (
    <section className="rounded-3xl border border-white/[0.07] bg-white/[0.03] p-5">
      <div className="flex items-center gap-4">
        <Avatar url={profile?.avatarUrl ?? null} name={name} size={64} />

        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-extrabold leading-tight text-white">{name}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-white/45">
            {profile?.handle && (
              <a
                href={`https://instagram.com/${profile.handle}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-white/60 transition-colors hover:text-white"
              >
                @{profile.handle}
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
            {profile?.country && (
              <span title={countryName(profile.country) ?? undefined}>
                {flagEmoji(profile.country)} {profile.country}
              </span>
            )}
            {stats.category && (
              <span className="capitalize">{categoryLabel(stats.category)}</span>
            )}
          </div>
        </div>

        <div className="shrink-0 text-right">
          <p className="text-2xl font-extrabold tabular-nums leading-none text-white">
            {stats.score}
          </p>
          <p className="mt-1 text-[0.65rem] font-bold uppercase tracking-[0.1em] text-blink-sky">
            {stats.tier.label}
          </p>
        </div>
      </div>

      {/* One slim bar instead of a dial — the score is already stated above. */}
      <div className="mt-4">
        <div className="h-1 overflow-hidden rounded-full bg-white/[0.08]">
          <motion.div
            className="h-full rounded-full bg-blink-sky"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
        <div className="mt-2 flex items-center justify-between text-[0.7rem] text-white/40">
          <span>{formatRank(rank)} global</span>
          <span>
            {next ? `${next.points} to ${next.tier.label}` : "Top tier"}
          </span>
        </div>
      </div>
    </section>
  );
}

function Avatar({
  url,
  name,
  size,
}: {
  url: string | null;
  name: string;
  size: number;
}) {
  const [failed, setFailed] = useState(false);

  if (url && !failed) {
    return (
      <img
        src={url}
        alt=""
        width={size}
        height={size}
        onError={() => setFailed(true)}
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full bg-blink-sky font-extrabold text-blink-navy"
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      aria-hidden
    >
      {name.trim().charAt(0).toUpperCase() || "?"}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Badges
// ---------------------------------------------------------------------------

interface Badge {
  id: string;
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
  earned: boolean;
}

function buildBadges(stats: ProfileStats, rank: number | null): Badge[] {
  return [
    {
      id: "rank",
      icon: Medal,
      label: "Best rank",
      value: formatRank(stats.bestRank),
      detail:
        "The highest position you've held on the global board. It never goes down, even if your current rank does.",
      earned: stats.bestRank !== null,
    },
    {
      id: "peak",
      icon: Trophy,
      label: "Peak score",
      value: String(stats.peakScore),
      detail: `Your highest verified Blink Score. You're currently ${
        stats.score >= stats.peakScore ? "at your peak" : `${stats.peakScore - stats.score} below it`
      }.`,
      earned: stats.peakScore > 0,
    },
    {
      id: "momentum",
      icon: TrendingUp,
      label: "Momentum",
      value:
        stats.momentum.delta > 0
          ? `+${stats.momentum.delta}`
          : String(stats.momentum.delta),
      detail:
        "Points gained or lost since your previous verified analysis. Momentum only moves when a new screenshot confirms a real change.",
      earned: stats.momentum.delta !== 0,
    },
    {
      id: "streak",
      icon: Flame,
      label: "Streak",
      value: `${stats.streak}w`,
      detail:
        "Consecutive weeks with at least one verified analysis. Opening the app doesn't count — only a fresh screenshot does.",
      earned: stats.streak > 0,
    },
    {
      id: "wins",
      icon: Sparkles,
      label: "Improvements",
      value: String(stats.weeklyWins),
      detail: "Verified analyses that scored higher than the one before them.",
      earned: stats.weeklyWins > 0,
    },
    {
      id: "verified",
      icon: Check,
      label: "Verified",
      value: String(stats.verifiedCount),
      detail:
        "Profile changes Blink has confirmed from a new screenshot. This is the only thing that moves your rank.",
      earned: stats.verifiedCount > 0,
    },
  ];
}

function Badges({ stats, rank }: { stats: ProfileStats; rank: number | null }) {
  const badges = buildBadges(stats, rank);
  const [open, setOpen] = useState<string | null>(null);
  const active = badges.find((b) => b.id === open) ?? null;

  return (
    <section>
      <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-white/40">
        Earned
      </h2>

      <div className="grid grid-cols-3 gap-2.5">
        {badges.map((badge) => {
          const Icon = badge.icon;
          const isOpen = open === badge.id;
          return (
            <motion.button
              key={badge.id}
              type="button"
              onClick={() => setOpen(isOpen ? null : badge.id)}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              aria-expanded={isOpen}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-2xl border p-3 transition-colors",
                isOpen
                  ? "border-blink-sky/40 bg-blink-sky/[0.09]"
                  : badge.earned
                    ? "border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.07]"
                    : "border-white/[0.05] bg-white/[0.02]",
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4",
                  badge.earned ? "text-blink-sky" : "text-white/25",
                )}
              />
              <span
                className={cn(
                  "text-base font-extrabold tabular-nums leading-none",
                  badge.earned ? "text-white" : "text-white/30",
                )}
              >
                {badge.value}
              </span>
              <span className="text-center text-[0.62rem] font-semibold leading-tight text-white/40">
                {badge.label}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* Tap-to-reveal detail, so the grid stays terse. */}
      <AnimatePresence mode="wait">
        {active && (
          <motion.p
            key={active.id}
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: "auto", marginTop: 10 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-xs leading-relaxed text-white/55"
          >
            <span className="font-bold text-white/75">{active.label}. </span>
            {active.detail}
          </motion.p>
        )}
      </AnimatePresence>
    </section>
  );
}

function ClimbCard({ onAnalyze }: { onAnalyze: () => void }) {
  return (
    <section className="rounded-2xl border border-blink-sky/20 bg-blink-sky/[0.05] p-5">
      <p className="text-xs font-bold uppercase tracking-widest text-blink-sky">How to climb</p>
      <p className="mt-2 text-sm leading-relaxed text-white/65">
        Change something real on Instagram, then upload a new screenshot. Your score moves
        only if the profile actually improved.
      </p>
      <button
        type="button"
        onClick={onAnalyze}
        className="mt-4 rounded-2xl bg-blink-sky px-5 py-3 text-sm font-bold text-blink-navy transition-transform hover:scale-[1.02] active:scale-[0.98]"
      >
        Upload a new screenshot
      </button>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Edit sheet
// ---------------------------------------------------------------------------

const HANDLE_PATTERN = /^[A-Za-z0-9._]{1,30}$/;

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
  const [displayName, setDisplayName] = useState(profile?.displayName ?? "");
  const [handle, setHandle] = useState(profile?.handle ?? "");
  const [country, setCountry] = useState(profile?.country ?? "");
  const [isPublic, setIsPublic] = useState(profile?.isPublic ?? false);
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatarUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Re-seed whenever the sheet opens, so a cancelled edit doesn't persist.
  useEffect(() => {
    if (!open) return;
    setDisplayName(profile?.displayName ?? "");
    setHandle(profile?.handle ?? "");
    setCountry(profile?.country ?? "");
    setIsPublic(profile?.isPublic ?? false);
    setAvatarUrl(profile?.avatarUrl ?? null);
    setError(null);
  }, [open, profile]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const handleFile = async (file: File) => {
    setUploading(true);
    setError(null);
    const res = await uploadAvatar(userId, file);
    setUploading(false);
    if (res.status === "error") {
      setError(res.message);
      return;
    }
    setAvatarUrl(res.url);
  };

  const save = async () => {
    const cleanHandle = handle.trim().replace(/^@+/, "");
    if (cleanHandle && !HANDLE_PATTERN.test(cleanHandle)) {
      setError("That Instagram username doesn't look right.");
      return;
    }

    setSaving(true);
    setError(null);
    const res = await updateBlinkProfile(userId, {
      displayName: displayName.trim() || null,
      handle: cleanHandle || null,
      country: country || null,
      avatarUrl,
      isPublic,
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

            {/* Avatar */}
            <div className="mt-5 flex items-center gap-4">
              <Avatar url={avatarUrl} name={displayName || "?"} size={64} />
              <div className="min-w-0 flex-1">
                <input
                  ref={fileRef}
                  type="file"
                  accept={ACCEPTED_AVATAR_TYPES.join(",")}
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleFile(f);
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-3.5 py-2 text-xs font-bold text-white/80 transition-colors hover:bg-white/[0.1] disabled:opacity-50"
                >
                  <Camera className="h-3.5 w-3.5" />
                  {uploading ? "Uploading…" : avatarUrl ? "Change picture" : "Add picture"}
                </button>
                <p className="mt-1.5 text-[0.7rem] text-white/35">
                  Shown publicly on the leaderboard.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <Field label="Display name">
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={40}
                  placeholder="Your name"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white placeholder:text-white/25 focus:border-blink-sky/40 focus:outline-none"
                />
              </Field>

              <Field label="Instagram username">
                <div className="flex items-center rounded-xl border border-white/10 bg-white/[0.04] focus-within:border-blink-sky/40">
                  <span className="pl-3.5 text-sm text-white/35">@</span>
                  <input
                    value={handle}
                    onChange={(e) => setHandle(e.target.value)}
                    maxLength={30}
                    placeholder="username"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    className="w-full bg-transparent py-2.5 pl-1 pr-3.5 text-sm text-white placeholder:text-white/25 focus:outline-none"
                  />
                </div>
              </Field>

              <Field label="Country">
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white focus:border-blink-sky/40 focus:outline-none"
                >
                  <option value="" className="bg-blink-navy-2">
                    Not set
                  </option>
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code} className="bg-blink-navy-2">
                      {flagEmoji(c.code)} {c.name}
                    </option>
                  ))}
                </select>
              </Field>

              <button
                type="button"
                onClick={() => setIsPublic((v) => !v)}
                className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-3 text-left"
              >
                <span className="flex items-center gap-2.5">
                  {isPublic ? (
                    <Globe className="h-4 w-4 text-blink-sky" />
                  ) : (
                    <Lock className="h-4 w-4 text-white/40" />
                  )}
                  <span className="text-sm font-semibold text-white">
                    {isPublic ? "On the leaderboard" : "Private"}
                  </span>
                </span>
                <span
                  className={cn(
                    "relative h-6 w-10 shrink-0 rounded-full transition-colors",
                    isPublic ? "bg-blink-sky" : "bg-white/15",
                  )}
                >
                  <motion.span
                    layout
                    transition={{ type: "spring", stiffness: 500, damping: 34 }}
                    className={cn(
                      "absolute top-1 h-4 w-4 rounded-full bg-white",
                      isPublic ? "left-5" : "left-1",
                    )}
                  />
                </span>
              </button>
            </div>

            {error && (
              <p role="alert" className="mt-3 text-xs font-medium text-red-400">
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={() => void save()}
              disabled={saving || uploading}
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[0.7rem] font-bold uppercase tracking-[0.1em] text-white/40">
        {label}
      </span>
      {children}
    </label>
  );
}
