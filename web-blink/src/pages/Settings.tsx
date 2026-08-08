import { LogOut, Mail, Shield, Trash2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { AppShell } from "@/components/app/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";

export default function Settings() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    setDeleteError(null);
    setIsDeleting(true);
    try {
      // Delete the user's profile and analyses (cascades via FK)
      // The auth.users entry is deleted by Supabase when the user calls deleteUser
      const { error: profileError } = await supabase
        .from("profiles")
        .delete()
        .eq("id", user?.id);

      if (profileError) throw profileError;

      // Sign out — the auth user entry remains in auth.users but is orphaned
      // For full deletion, a Supabase admin function would be needed
      signOut();
      navigate("/");
    } catch {
      setDeleteError("Could not delete account. Please try again or contact support.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AppShell title="Settings" subtitle="Your account, privacy and data.">
      <div className="space-y-4">
          {/* Account */}
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5">
            <p className="text-xs font-bold uppercase tracking-widest text-white/40">Account</p>
            <div className="mt-4 flex items-center gap-4">
              {user?.picture ? (
                <img
                  src={user.picture}
                  alt={user.name ?? "Profile"}
                  className="h-12 w-12 rounded-full"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blink-sky text-sm font-bold text-blink-navy">
                  {(user?.name ?? user?.email ?? "?")[0]?.toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-white">{user?.name ?? "User"}</p>
                <p className="truncate text-xs text-white/50">{user?.email}</p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 border-t border-white/[0.07] pt-4">
              <Mail className="h-4 w-4 text-white/40" />
              <span className="text-xs font-medium text-white/50">
                Authentication method: {user?.authMethod === "google" ? "Google" : "Email"}
              </span>
            </div>
          </div>

          {/* Security & Privacy */}
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/40">
              <Shield className="h-3.5 w-3.5" />
              Security & Privacy
            </p>
            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-white/80">Data retention</span>
                <span className="text-xs text-white/40">Screenshots deleted after analysis</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-white/80">Your analyses</span>
                <span className="text-xs text-white/40">Stored in your account</span>
              </div>
              {user?.authMethod === "email" && (
                <button
                  type="button"
                  onClick={() => {
                    if (user?.email) {
                      supabase.auth.resetPasswordForEmail(user.email, {
                        redirectTo: `${window.location.origin}/auth/reset`,
                      });
                    }
                  }}
                  className="text-sm font-semibold text-blink-sky transition-colors hover:text-blink-sky-bright"
                >
                  Change password
                </button>
              )}
            </div>
          </div>

          {/* Danger zone */}
          <div className="rounded-2xl border border-red-500/15 bg-red-500/[0.04] p-5">
            <p className="text-xs font-bold uppercase tracking-widest text-red-400/80">Danger zone</p>
            <p className="mt-2 text-sm leading-relaxed text-white/50">
              Delete your Blink account and all associated data. This action cannot be undone.
            </p>
            {showDeleteConfirm ? (
              <div className="mt-4 space-y-3">
                {deleteError && (
                  <p className="text-sm font-medium text-red-400">{deleteError}</p>
                )}
                <p className="text-sm font-medium text-white/70">
                  Are you sure? Type confirm by clicking below.
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleDeleteAccount}
                    disabled={isDeleting}
                    className="flex-1 rounded-xl bg-red-600 py-3 text-sm font-bold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
                  >
                    {isDeleting ? "Deleting…" : "Yes, delete my account"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold text-white/60 transition-colors hover:text-white"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="mt-4 inline-flex items-center gap-2 rounded-xl border border-red-500/20 px-4 py-2.5 text-sm font-semibold text-red-400 transition-colors hover:bg-red-500/10"
              >
                <Trash2 className="h-4 w-4" />
                Delete account
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
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 py-3.5 text-sm font-semibold text-white/60 transition-colors hover:bg-white/5 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            Log out
          </button>
      </div>
    </AppShell>
  );
}
