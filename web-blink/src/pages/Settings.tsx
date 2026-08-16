/**
 * Blink — Settings, and the two data rights that live here.
 *
 * Erasure and portability are exercised from this screen, so the copy on it is
 * held to the same standard as the privacy policy: "Screenshots deleted after
 * analysis" became "not kept after analysis" because a screenshot is never
 * stored to be deleted, and the deletion confirmation now reports what was
 * actually erased. See `lib/account.ts`.
 */

import { Download, LogOut, Mail, Shield, Trash2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { AppShell } from "@/components/app/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { deleteAccount, downloadJson, exportAccountData } from "@/lib/account";
import { useT } from "@/lib/i18n";
import { CONTACT } from "@/lib/legal-entity";
import { supabase } from "@/lib/supabase";

export default function Settings() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const t = useT();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const handleExport = async () => {
    setExportError(null);
    setIsExporting(true);
    const result = await exportAccountData();
    setIsExporting(false);
    if (result.status === "error") {
      setExportError(t.settings.exportFailed);
      return;
    }
    downloadJson(result.data, `blink-data-${new Date().toISOString().slice(0, 10)}.json`);
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    setDeleteError(null);
    setIsDeleting(true);

    const outcome = await deleteAccount(user.id);
    setIsDeleting(false);

    if (outcome.status === "error") {
      setDeleteError(t.settings.deleteFailed);
      return;
    }

    // Signed out either way: the data is gone, so staying signed in would be a
    // session pointing at nothing.
    signOut();

    if (outcome.status === "partial") {
      // Carried through navigation state so the landing page can say what is
      // still outstanding rather than dropping the user with no explanation.
      navigate("/", { state: { accountDeletion: "partial" } });
      return;
    }
    navigate("/");
  };

  return (
    <AppShell title={t.settings.title} subtitle={t.settings.subtitle}>
      <div className="space-y-4">
        {/* Account */}
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-white/40">
            {t.settings.account}
          </p>
          <div className="mt-4 flex items-center gap-4">
            {user?.picture ? (
              <img
                src={user.picture}
                alt=""
                className="h-12 w-12 rounded-full"
              />
            ) : (
              <div
                aria-hidden
                className="flex h-12 w-12 items-center justify-center rounded-full bg-blink-sky text-sm font-bold text-blink-navy"
              >
                {(user?.name ?? user?.email ?? "?")[0]?.toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-white">{user?.name ?? "—"}</p>
              <p className="truncate text-xs text-white/50">{user?.email}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 border-t border-white/[0.07] pt-4">
            <Mail className="h-4 w-4 text-white/40" aria-hidden />
            <span className="text-xs font-medium text-white/50">
              {t.settings.authMethod}: {user?.authMethod === "google" ? "Google" : "E-mail"}
            </span>
          </div>
        </div>

        {/* Security & Privacy */}
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/40">
            <Shield className="h-3.5 w-3.5" aria-hidden />
            {t.settings.privacy}
          </p>
          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-medium text-white/80">
                {t.settings.screenshots}
              </span>
              <span className="text-right text-xs text-white/40">
                {t.settings.screenshotsValue}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-medium text-white/80">{t.settings.analyses}</span>
              <span className="text-right text-xs text-white/40">
                {t.settings.analysesValue}
              </span>
            </div>
            {user?.authMethod === "email" && (
              <button
                type="button"
                onClick={() => {
                  if (user?.email) {
                    void supabase.auth.resetPasswordForEmail(user.email, {
                      redirectTo: `${window.location.origin}/auth/reset`,
                    });
                  }
                }}
                className="text-sm font-semibold text-blink-sky transition-colors hover:text-blink-sky-bright"
              >
                {t.settings.changePassword}
              </button>
            )}
          </div>
        </div>

        {/* Your data — portability, and the address for everything else */}
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-white/40">
            {t.settings.yourData}
          </p>

          <p className="mt-4 text-sm font-bold text-white">{t.settings.exportTitle}</p>
          <p className="mt-1 text-sm leading-relaxed text-white/50">
            {t.settings.exportBody}
          </p>
          {exportError && (
            <p role="alert" className="mt-3 text-sm font-medium text-red-400">
              {exportError}
            </p>
          )}
          <button
            type="button"
            onClick={() => void handleExport()}
            disabled={isExporting}
            className="mt-3 inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-white/80 transition-colors hover:bg-white/5 disabled:opacity-60"
          >
            <Download className="h-4 w-4" aria-hidden />
            {isExporting ? t.settings.exportPreparing : t.settings.exportButton}
          </button>

          <div className="mt-5 border-t border-white/[0.07] pt-4">
            <p className="text-sm font-bold text-white">{t.settings.privacyRequests}</p>
            <p className="mt-1 text-sm leading-relaxed text-white/50">
              {t.settings.privacyRequestsBody}
            </p>
            <a
              href={`mailto:${CONTACT.email}`}
              className="mt-2 inline-flex min-h-[44px] items-center text-sm font-semibold text-blink-sky transition-colors hover:text-blink-sky-bright"
            >
              {CONTACT.email}
            </a>
          </div>
        </div>

        {/* Danger zone */}
        <div className="rounded-2xl border border-red-500/15 bg-red-500/[0.04] p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-red-400/80">
            {t.settings.dangerZone}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-white/50">
            {t.settings.deleteBody}
          </p>
          {showDeleteConfirm ? (
            <div className="mt-4 space-y-3">
              {deleteError && (
                <p role="alert" className="text-sm font-medium text-red-400">
                  {deleteError}
                </p>
              )}
              <p className="text-sm font-medium text-white/70">
                {t.settings.deleteConfirmQuestion}
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => void handleDeleteAccount()}
                  disabled={isDeleting}
                  className="min-h-[44px] flex-1 rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
                >
                  {isDeleting ? t.settings.deleting : t.settings.deleteConfirm}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="min-h-[44px] rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold text-white/60 transition-colors hover:text-white"
                >
                  {t.common.cancel}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-red-500/20 px-4 py-2.5 text-sm font-semibold text-red-400 transition-colors hover:bg-red-500/10"
            >
              <Trash2 className="h-4 w-4" aria-hidden />
              {t.settings.deleteButton}
            </button>
          )}
        </div>

        {/* Sign out */}
        <button
          type="button"
          onClick={() => {
            signOut();
            navigate("/");
          }}
          className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl border border-white/10 py-3.5 text-sm font-semibold text-white/60 transition-colors hover:bg-white/5 hover:text-white"
        >
          <LogOut className="h-4 w-4" aria-hidden />
          {t.settings.logOut}
        </button>
      </div>
    </AppShell>
  );
}
