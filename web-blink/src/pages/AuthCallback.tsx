import { motion } from "framer-motion";
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

import { supabase } from "@/lib/supabase";

export default function AuthCallback() {
  const navigate = useNavigate();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    // Supabase handles the OAuth callback via detectSessionInUrl.
    // We just need to wait for the session to be set, then navigate.
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        navigate("/app", { replace: true });
      } else {
        // Session might still be processing — wait briefly
        setTimeout(async () => {
          const { data: retry } = await supabase.auth.getSession();
          if (retry.session) {
            navigate("/app", { replace: true });
          } else {
            navigate("/", { replace: true });
          }
        }, 1500);
      }
    };
    void checkSession();
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div
        className="fixed inset-0 -z-10"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 0%, hsl(220 70% 14%) 0%, hsl(220 84% 10%) 40%, hsl(220 80% 8%) 100%)",
        }}
      />
      <div className="flex flex-col items-center gap-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="h-8 w-8 rounded-full border-2 border-blink-sky/30 border-t-blink-sky"
        />
        <p className="text-sm font-medium text-white/60">Signing you in…</p>
      </div>
    </div>
  );
}
