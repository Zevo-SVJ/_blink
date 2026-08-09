/**
 * Blink — public profile onboarding.
 *
 * One question per screen. The previous version was a single long form, which
 * scrolled on a phone and read as admin rather than setup.
 *
 * It renders **inside the app shell**, so Home / Library / Ranks / Settings
 * stay one tap away throughout. An earlier version owned the whole viewport to
 * keep the screen clean, and that trapped anyone who opened Profile before
 * finishing — there was no way out.
 *
 * Progress is kept in local state and only written once, at the end, so
 * abandoning halfway leaves nothing half-saved.
 */

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, Camera, Check, Globe, Lock } from "lucide-react";
import { useRef, useState } from "react";

import { AppShell } from "@/components/app/AppShell";
import { AvatarPreview } from "@/components/app/IdentityForm";
import { ACCEPTED_AVATAR_TYPES, uploadAvatar } from "@/lib/avatar";
import { updateBlinkProfile, type BlinkProfile } from "@/lib/blink-profile";
import { COUNTRIES, flagEmoji } from "@/lib/countries";
import { validateIdentity, type IdentityDraft } from "@/lib/identity";
import { cn } from "@/lib/utils";

/** 16px minimum, or iOS Safari zooms the viewport on focus. */
const INPUT =
  "w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3.5 text-center text-[17px] text-white placeholder:text-white/25 focus:border-blink-sky/50 focus:outline-none";

type StepId = "name" | "handle" | "link" | "country" | "picture" | "visibility";

interface Step {
  id: StepId;
  question: string;
  hint: string;
  /** Optional steps can be skipped without filling anything in. */
  optional?: boolean;
}

const STEPS: Step[] = [
  { id: "name", question: "What should we call you?", hint: "Shown on your public profile and the leaderboard." },
  { id: "handle", question: "What's your Instagram?", hint: "So people can tell it's really you." },
  { id: "link", question: "Link your profile?", hint: "Adds a View Instagram button. You can skip this.", optional: true },
  { id: "country", question: "Where are you from?", hint: "Shows as a flag next to your name.", optional: true },
  { id: "picture", question: "Add a photo?", hint: "Optional — we'll use your initial otherwise.", optional: true },
  { id: "visibility", question: "Join the leaderboard?", hint: "You can change this any time in your profile." },
];

export function Onboarding({
  userId,
  existing,
  suggestedName,
  onComplete,
}: {
  userId: string;
  existing: BlinkProfile | null;
  /** From the auth account, so the first question isn't blank. */
  suggestedName?: string;
  onComplete: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  /** +1 forward, -1 back — drives which way the card slides. */
  const [direction, setDirection] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [draft, setDraft] = useState<IdentityDraft>({
    displayName: existing?.displayName ?? suggestedName ?? "",
    handle: existing?.handle ?? "",
    instagramUrl: existing?.instagramUrl ?? "",
    country: existing?.country ?? "",
    avatarUrl: existing?.avatarUrl ?? null,
    // On by default. A row can exist with `is_public = false` from the column
    // default, but that was never a choice the user made.
    isPublic: existing?.onboardedAt ? existing.isPublic : true,
  });

  const step = STEPS[index];
  const isLast = index === STEPS.length - 1;
  const patch = (p: Partial<IdentityDraft>) => {
    setDraft((d) => ({ ...d, ...p }));
    setError(null);
  };

  /** Per-step gate, so a required answer can't be skipped past. */
  const stepError = (): string | null => {
    if (step.id === "name" && !draft.displayName.trim()) {
      return "Add a name so people know who they're seeing.";
    }
    if (step.id === "handle") {
      const validation = validateIdentity({ ...draft, instagramUrl: "" });
      if (!validation.ok && validation.message?.includes("username")) return validation.message;
      if (!draft.handle.trim()) return "Add your Instagram username.";
    }
    if (step.id === "link" && draft.instagramUrl.trim()) {
      const validation = validateIdentity(draft);
      if (!validation.ok && validation.message?.includes("link")) return validation.message;
    }
    return null;
  };

  const goNext = async () => {
    const problem = stepError();
    if (problem) {
      setError(problem);
      return;
    }
    if (!isLast) {
      setDirection(1);
      setIndex((i) => i + 1);
      return;
    }
    await save();
  };

  const goBack = () => {
    if (index === 0) return;
    setDirection(-1);
    setError(null);
    setIndex((i) => i - 1);
  };

  const save = async () => {
    const validation = validateIdentity(draft);
    if (!validation.ok) {
      setError(validation.message ?? "Check your answers.");
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

  // Horizontal slide, or a plain fade when reduced motion is requested.
  const slide = reduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, x: direction * 28 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: direction * -28 },
      };

  return (
    <AppShell title="Set up your profile" bare center>
      <div className="mx-auto w-full max-w-sm">
        <Progress index={index} total={STEPS.length} />

        <div className="mt-8 min-h-[19rem]">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step.id}
              {...slide}
              transition={{ type: "spring", stiffness: 380, damping: 34 }}
              className="text-center"
            >
              <h1 className="text-[1.6rem] font-extrabold leading-tight tracking-tight text-white">
                {step.question}
              </h1>
              <p className="mx-auto mt-2.5 max-w-xs text-sm leading-relaxed text-white/45">
                {step.hint}
              </p>

              <div className="mt-7">
                <StepControl
                  step={step}
                  draft={draft}
                  patch={patch}
                  userId={userId}
                  onError={setError}
                />
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="mt-2 min-h-[1.25rem] text-center">
          {error && (
            <p role="alert" className="text-xs font-medium text-red-400">
              {error}
            </p>
          )}
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={goBack}
            disabled={index === 0}
            aria-label="Back"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white/70 transition-colors hover:bg-white/[0.08] disabled:opacity-30"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => void goNext()}
            disabled={saving}
            className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-blink-sky text-sm font-bold text-blink-navy transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
          >
            {saving ? "Saving…" : isLast ? "Finish" : step.optional ? "Continue" : "Continue"}
            {!saving && (isLast ? <Check className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />)}
          </button>
        </div>

        {step.optional && !isLast && (
          <button
            type="button"
            onClick={() => void goNext()}
            className="mt-3 w-full text-center text-xs font-semibold text-white/35 transition-colors hover:text-white/60"
          >
            Skip for now
          </button>
        )}
      </div>
    </AppShell>
  );
}

function Progress({ index, total }: { index: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-1.5" aria-label={`Step ${index + 1} of ${total}`}>
      {Array.from({ length: total }).map((_, i) => (
        <motion.span
          key={i}
          className="h-1 rounded-full bg-white"
          initial={false}
          animate={{
            width: i === index ? 22 : 6,
            opacity: i === index ? 0.9 : i < index ? 0.45 : 0.15,
          }}
          transition={{ type: "spring", stiffness: 400, damping: 32 }}
        />
      ))}
    </div>
  );
}

function StepControl({
  step,
  draft,
  patch,
  userId,
  onError,
}: {
  step: Step;
  draft: IdentityDraft;
  patch: (p: Partial<IdentityDraft>) => void;
  userId: string;
  onError: (message: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  switch (step.id) {
    case "name":
      return (
        <input
          autoFocus
          value={draft.displayName}
          onChange={(e) => patch({ displayName: e.target.value })}
          maxLength={40}
          placeholder="Your name"
          autoComplete="name"
          className={INPUT}
        />
      );

    case "handle":
      return (
        <div className="flex items-center rounded-2xl border border-white/10 bg-white/[0.05] focus-within:border-blink-sky/50">
          <span className="pl-4 text-[17px] text-white/35">@</span>
          <input
            autoFocus
            value={draft.handle}
            onChange={(e) => patch({ handle: e.target.value })}
            maxLength={30}
            placeholder="username"
            autoCapitalize="none"
            autoCorrect="off"
            autoComplete="username"
            spellCheck={false}
            className="w-full bg-transparent py-3.5 pl-1 pr-4 text-[17px] text-white placeholder:text-white/25 focus:outline-none"
          />
        </div>
      );

    case "link":
      return (
        <input
          value={draft.instagramUrl}
          onChange={(e) => patch({ instagramUrl: e.target.value })}
          placeholder="https://instagram.com/username"
          inputMode="url"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className={INPUT}
        />
      );

    case "country":
      return (
        <select
          value={draft.country}
          onChange={(e) => patch({ country: e.target.value })}
          className={cn(INPUT, "appearance-none")}
        >
          <option value="" className="bg-blink-navy-2">
            Prefer not to say
          </option>
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code} className="bg-blink-navy-2">
              {flagEmoji(c.code)} {c.name}
            </option>
          ))}
        </select>
      );

    case "picture":
      return (
        <div className="flex flex-col items-center gap-4">
          <AvatarPreview url={draft.avatarUrl} name={draft.displayName} size={96} />
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPTED_AVATAR_TYPES.join(",")}
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setUploading(true);
              const res = await uploadAvatar(userId, file);
              setUploading(false);
              if (res.status === "error") onError(res.message);
              else patch({ avatarUrl: res.url });
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm font-bold text-white/80 transition-colors hover:bg-white/[0.1] disabled:opacity-50"
          >
            <Camera className="h-4 w-4" />
            {uploading ? "Uploading…" : draft.avatarUrl ? "Change photo" : "Choose photo"}
          </button>
        </div>
      );

    case "visibility":
      return (
        <button
          type="button"
          onClick={() => patch({ isPublic: !draft.isPublic })}
          aria-pressed={draft.isPublic}
          className={cn(
            "flex w-full items-center gap-3 rounded-2xl border px-4 py-4 text-left transition-colors",
            draft.isPublic
              ? "border-blink-sky/40 bg-blink-sky/[0.08]"
              : "border-white/10 bg-white/[0.04]",
          )}
        >
          {draft.isPublic ? (
            <Globe className="h-5 w-5 shrink-0 text-blink-sky" />
          ) : (
            <Lock className="h-5 w-5 shrink-0 text-white/40" />
          )}
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold text-white">
              {draft.isPublic ? "Yes, show me" : "Keep me private"}
            </span>
            <span className="block text-xs text-white/40">
              {draft.isPublic
                ? "Your name and score appear publicly"
                : "Only you can see your score"}
            </span>
          </span>
          <span
            className={cn(
              "relative h-6 w-10 shrink-0 rounded-full transition-colors",
              draft.isPublic ? "bg-blink-sky" : "bg-white/15",
            )}
          >
            <motion.span
              layout
              transition={{ type: "spring", stiffness: 500, damping: 34 }}
              className={cn(
                "absolute top-1 h-4 w-4 rounded-full bg-white",
                draft.isPublic ? "left-5" : "left-1",
              )}
            />
          </span>
        </button>
      );
  }
}
