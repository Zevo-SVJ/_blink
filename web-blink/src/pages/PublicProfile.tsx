/**
 * Blink — someone else's public profile, opened from the leaderboard or from a
 * shared link.
 *
 * Everything shown comes from the `leaderboard` view, which only contains
 * profiles that opted in *and* have a verified analysis. That means visibility
 * is enforced by the query rather than by a check here: a private profile
 * simply isn't returned, and the page shows "not available" instead.
 *
 * ## Why this route is readable signed out
 *
 * It is the one screen people send to each other, and a shared link that
 * bounces the recipient to a marketing page wastes the share. It is safe to
 * open because the data was already public at the database level, not because
 * a check was removed here:
 *
 *  - `blink_profiles` RLS is `using (is_public or auth.uid() = id)` — it never
 *    required a session, so an anonymous read returns opted-in rows only.
 *  - The `leaderboard` view is `security_invoker`, so it evaluates that policy
 *    as the caller, and additionally filters to `is_public and
 *    verified_count > 0`.
 *  - `score_history`, `analyses` and `leaderboard_suggestions` are self-read
 *    only and return nothing anonymously. Momentum and the analysis text
 *    therefore cannot appear on someone else's profile — `toView` already
 *    omits them rather than guessing.
 *
 * So nothing was widened for this. The page simply stopped requiring a session
 * it never needed to read what it shows.
 *
 * The two shells differ only in chrome. A signed-in reader keeps the app shell
 * and its tab bar; a signed-out reader gets the public one, whose job is to
 * make the result land and then offer the obvious next step.
 */

import { ArrowLeft, UserX } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { AppShell, AppShellLoading } from "@/components/app/AppShell";
import { PublicProfileCard, type PublicProfileView } from "@/components/app/PublicProfileCard";
import { EmptyState, ErrorState, SkeletonList } from "@/components/app/states";
import { CTAButton } from "@/components/blink/CTAButton";
import { PageBackground } from "@/components/blink/PageBackground";
import { useAuth } from "@/hooks/useAuth";
import { BRAND } from "@/lib/brand";
import { fetchPublicStanding, type LeaderboardEntry } from "@/lib/leaderboard";

type Load =
  | { state: "loading" }
  | { state: "error"; message: string }
  | { state: "missing" }
  | { state: "ready"; entry: LeaderboardEntry };

export default function PublicProfile() {
  const { id } = useParams<{ id: string }>();
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [load, setLoad] = useState<Load>({ state: "loading" });

  const refresh = useCallback(async () => {
    if (!id) {
      setLoad({ state: "missing" });
      return;
    }
    setLoad({ state: "loading" });
    const res = await fetchPublicStanding(id);
    if (res.status === "error") {
      setLoad({ state: "error", message: res.message });
      return;
    }
    if (!res.data) {
      setLoad({ state: "missing" });
      return;
    }
    setLoad({ state: "ready", entry: res.data });
  }, [id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const entry = load.state === "ready" ? load.entry : null;
  const title = entry
    ? (entry.handle ? `@${entry.handle}` : (entry.displayName ?? "Profile"))
    : "Profile";

  // The profile fetch does not depend on the session, so it runs regardless.
  // Only the chrome waits — rendering the app shell and then swapping it for
  // the public one (or the reverse) would flash two different pages.
  const body = (
    <>
      {load.state === "loading" && <SkeletonList rows={3} />}

      {load.state === "error" && (
        <ErrorState message={load.message} onRetry={() => void refresh()} />
      )}

      {load.state === "missing" && (
        <EmptyState
          icon={UserX}
          title="Profile not available"
          description="This profile is private, or it isn't on the leaderboard yet."
          action={
            user ? (
              <button
                type="button"
                onClick={() => navigate("/ranks")}
                className="rounded-2xl bg-blink-sky px-6 py-3 text-sm font-bold text-blink-navy transition-transform hover:scale-[1.02]"
              >
                Back to Ranks
              </button>
            ) : (
              // Ranks is behind the session. Offering it to a signed-out
              // visitor would bounce them to the landing page, which is the
              // exact redirect this route exists to avoid.
              <CTAButton label={BRAND.cta} onClick={() => navigate("/analyze")} />
            )
          }
        />
      )}

      {entry && <PublicProfileCard view={toView(entry)} isMe={user?.id === entry.id} />}
    </>
  );

  if (authLoading) return <AppShellLoading />;

  if (!user) {
    return (
      <PublicShell title={title}>
        {body}
        {entry && <ShareCTA handle={entry.handle} onStart={() => navigate("/analyze")} />}
      </PublicShell>
    );
  }

  return (
    <AppShell
      title={title}
      action={
        <button
          type="button"
          onClick={() => navigate("/ranks")}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-3.5 py-2 text-xs font-bold text-white/80 transition-colors hover:bg-white/[0.1]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Ranks
        </button>
      }
    >
      {body}
    </AppShell>
  );
}

/**
 * Chrome for a signed-out reader.
 *
 * Deliberately thin. This person arrived from a message, not from the app, so
 * there is no navigation to restore them to — one way back to Blink in the
 * header, the profile itself, and the invitation underneath it. It borrows the
 * app shell's measurements (same max width, same top padding) so the card sits
 * exactly where it does when signed in.
 */
function PublicShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <PageBackground />

      <header className="fixed inset-x-0 top-0 z-40 border-b border-white/5 bg-blink-navy/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-2 sm:px-6">
          <Link
            to="/"
            className="inline-flex min-h-[44px] items-center text-lg font-bold tracking-tight text-white"
          >
            {BRAND.name}
          </Link>
          <Link
            to="/analyze"
            className="inline-flex min-h-[44px] items-center rounded-full px-3 text-sm font-semibold text-white/65 transition-colors hover:text-white"
          >
            Try it
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl px-4 pb-20 pt-24 sm:px-6 sm:pt-28">
        <h1 className="truncate text-[1.75rem] font-extrabold tracking-tight text-white sm:text-4xl">
          {title}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-white/50">
          A public Blink profile.
        </p>
        <div className="mt-8">{children}</div>
      </main>
    </div>
  );
}

/**
 * The reason the link was worth opening.
 *
 * It comes *after* the profile, not before: someone who followed a friend's
 * link came to see the result, and asking them to sign up before they have
 * seen anything is how a share gets closed. By this point they have read a
 * real score and a real standing, and the offer is the same one the landing
 * page makes, in the same words.
 */
function ShareCTA({ handle, onStart }: { handle: string | null; onStart: () => void }) {
  return (
    <section className="mt-12 border-t border-white/5 pt-10 text-center">
      <h2 className="text-xl font-extrabold tracking-tight text-white sm:text-2xl">
        {handle ? <>Curious how you&rsquo;d read next to @{handle}?</> : "Curious how you read?"}
      </h2>
      <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-white/50">
        Blink analyzes an Instagram screenshot and shows the first impression it
        makes — from a crush, a recruiter, a stranger.
      </p>
      <div className="mt-7 flex justify-center">
        <CTAButton label={BRAND.cta} size="lg" onClick={onStart} />
      </div>
      {/* Not "no account needed": an analysis runs signed out, but the full
          reveal asks you to sign in. Promising otherwise sets up the letdown. */}
      <p className="mt-4 text-xs text-white/30">
        One screenshot. Analyzed and deleted, never stored.
      </p>
    </section>
  );
}

/**
 * The board row carries everything a public profile shows except momentum,
 * which lives in private score history. Rather than claim a value we can't
 * see, momentum reads as zero for other people's profiles.
 *
 * Exported for the regression test. This route is readable signed out, so the
 * fields it declines to fill are a security boundary, not a formatting choice:
 * `perception` comes from `analyses` and `momentumDelta`/`bestRank` from
 * `score_history`, all of which are self-read only. A future edit that
 * populated them here would be reading something the caller cannot see.
 */
export function toView(entry: LeaderboardEntry): PublicProfileView {
  return {
    displayName: entry.displayName,
    handle: entry.handle,
    avatarUrl: entry.avatarUrl,
    country: entry.country,
    instagramUrl: entry.instagramUrl,
    score: entry.score,
    peakScore: entry.peakScore,
    verifiedCount: entry.verifiedCount,
    streak: entry.streak,
    standing: entry,
    // Peak rank isn't exposed publicly; the board's own rank is the honest
    // claim, so best rank is omitted rather than guessed from it.
    bestRank: null,
    momentumDelta: 0,
  };
}
