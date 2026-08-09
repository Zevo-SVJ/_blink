/**
 * Blink — public profile onboarding.
 *
 * Shown instead of the Profile screen until the user has completed it. The
 * point is to avoid the worst version of a first run: a dashboard of zeros and
 * em-dashes that looks broken. Until there's an identity to show, we ask for
 * one rather than rendering empty stats.
 */

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useState } from "react";

import { IdentityFields } from "@/components/app/IdentityForm";
import { validateIdentity, type IdentityDraft } from "@/lib/identity";
import { PageBackground } from "@/components/blink/PageBackground";
import { updateBlinkProfile, type BlinkProfile } from "@/lib/blink-profile";
import { BRAND } from "@/lib/brand";

export function Onboarding({
  userId,
  existing,
  suggestedName,
  onComplete,
}: {
  userId: string;
  existing: BlinkProfile | null;
  /** From the auth account, so the name field isn't blank on first run. */
  suggestedName?: string;
  onComplete: () => void;
}) {
  const [draft, setDraft] = useState<IdentityDraft>({
    displayName: existing?.displayName ?? suggestedName ?? "",
    handle: existing?.handle ?? "",
    instagramUrl: existing?.instagramUrl ?? "",
    country: existing?.country ?? "",
    avatarUrl: existing?.avatarUrl ?? null,
    // On by default. A row can already exist with `is_public = false` from the
    // column default, but that was never a choice the user made — only a
    // completed onboarding counts as one, so anything before that starts on.
    isPublic: existing?.onboardedAt ? existing.isPublic : true,
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
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
      markOnboarded: true,
    });
    setSaving(false);

    if (res.status === "error") {
      setError(res.message);
      return;
    }
    onComplete();
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <PageBackground />

      <main className="mx-auto w-full max-w-md px-4 pb-16 pt-14 sm:pt-20">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-blink-sky">
            {BRAND.name}
          </p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-white">
            Set up your profile
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-white/50">
            This is what people see when you appear on the leaderboard. You can change any
            of it later.
          </p>

          <div className="mt-8">
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
            <p role="alert" className="mt-4 text-xs font-medium text-red-400">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={() => void submit()}
            disabled={saving}
            className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blink-sky py-3.5 text-sm font-bold text-blink-navy transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
          >
            {saving ? "Saving…" : "Continue"}
            {!saving && <ArrowRight className="h-4 w-4" />}
          </button>

          <p className="mt-4 text-center text-[0.7rem] leading-relaxed text-white/30">
            Your Blink Score comes from analyzing your profile — never from followers.
          </p>
        </motion.div>
      </main>
    </div>
  );
}
