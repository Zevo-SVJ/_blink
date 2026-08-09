/**
 * Blink — the public identity fields.
 *
 * Shared by onboarding and by editing later, so the validation and the storage
 * shape can only ever be defined once.
 *
 * Mobile keyboard behaviour is load-bearing here. iOS Safari zooms the whole
 * viewport when a focused input's font-size is under 16px, and that zoom is
 * what produces the "app shifted sideways and won't come back" symptom. Every
 * control below is explicitly 16px, and `text-base` is not relied on because a
 * future type-scale change could silently drop it below the threshold.
 */

import { Camera, Globe, Lock } from "lucide-react";
import { useRef, useState } from "react";
import { motion } from "framer-motion";

import { ACCEPTED_AVATAR_TYPES, uploadAvatar } from "@/lib/avatar";
import type { IdentityDraft } from "@/lib/identity";
import { COUNTRIES, flagEmoji } from "@/lib/countries";
import { cn } from "@/lib/utils";

/** 16px minimum — anything smaller makes iOS Safari zoom on focus. */
const INPUT_CLASS =
  "w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-3 text-[16px] text-white placeholder:text-white/25 focus:border-blink-sky/40 focus:outline-none";

export function IdentityFields({
  draft,
  onChange,
  userId,
  onAvatarError,
}: {
  draft: IdentityDraft;
  onChange: (patch: Partial<IdentityDraft>) => void;
  userId: string;
  onAvatarError: (message: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setUploading(true);
    const res = await uploadAvatar(userId, file);
    setUploading(false);
    if (res.status === "error") {
      onAvatarError(res.message);
      return;
    }
    onChange({ avatarUrl: res.url });
  };

  return (
    <div className="space-y-4">
      {/* Picture */}
      <div className="flex items-center gap-4">
        <AvatarPreview url={draft.avatarUrl} name={draft.displayName} />
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
            {uploading ? "Uploading…" : draft.avatarUrl ? "Change picture" : "Add picture"}
          </button>
          <p className="mt-1.5 text-[0.7rem] text-white/35">Optional. Shown on the leaderboard.</p>
        </div>
      </div>

      <Field label="Display name">
        <input
          value={draft.displayName}
          onChange={(e) => onChange({ displayName: e.target.value })}
          maxLength={40}
          placeholder="Your name"
          autoComplete="name"
          className={INPUT_CLASS}
        />
      </Field>

      <Field label="Instagram username">
        <div className="flex items-center rounded-xl border border-white/10 bg-white/[0.04] focus-within:border-blink-sky/40">
          <span className="pl-3.5 text-[16px] text-white/35">@</span>
          <input
            value={draft.handle}
            onChange={(e) => onChange({ handle: e.target.value })}
            maxLength={30}
            placeholder="username"
            autoCapitalize="none"
            autoCorrect="off"
            autoComplete="username"
            spellCheck={false}
            className="w-full bg-transparent py-3 pl-1 pr-3.5 text-[16px] text-white placeholder:text-white/25 focus:outline-none"
          />
        </div>
      </Field>

      <Field label="Instagram link" hint="Optional">
        <input
          value={draft.instagramUrl}
          onChange={(e) => onChange({ instagramUrl: e.target.value })}
          placeholder="https://instagram.com/username"
          inputMode="url"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className={INPUT_CLASS}
        />
      </Field>

      <Field label="Country">
        <select
          value={draft.country}
          onChange={(e) => onChange({ country: e.target.value })}
          className={cn(INPUT_CLASS, "appearance-none")}
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
        onClick={() => onChange({ isPublic: !draft.isPublic })}
        className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-3 text-left"
      >
        <span className="flex min-w-0 items-center gap-2.5">
          {draft.isPublic ? (
            <Globe className="h-4 w-4 shrink-0 text-blink-sky" />
          ) : (
            <Lock className="h-4 w-4 shrink-0 text-white/40" />
          )}
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-white">
              Show me on the leaderboard
            </span>
            <span className="block text-[0.7rem] text-white/35">
              {draft.isPublic ? "Your profile is public" : "Only you can see your score"}
            </span>
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
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline justify-between">
        <span className="text-[0.7rem] font-bold uppercase tracking-[0.1em] text-white/40">
          {label}
        </span>
        {hint && <span className="text-[0.65rem] text-white/25">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

export function AvatarPreview({
  url,
  name,
  size = 64,
}: {
  url: string | null;
  name: string;
  size?: number;
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
