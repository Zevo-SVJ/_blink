import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

import { CTAButton } from "@/components/blink/CTAButton";
import { useAuth } from "@/hooks/useAuth";
import { BLINK_LOGO, BRAND } from "@/lib/brand";

export default function AppHome() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  // Redirect to landing if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/", { replace: true });
    }
  }, [user, isLoading, navigate]);

  if (isLoading || !user) {
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
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="h-8 w-8 rounded-full border-2 border-blink-sky/30 border-t-blink-sky"
        />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* Continuous background */}
      <div
        className="fixed inset-0 -z-10"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 0%, hsl(220 70% 14%) 0%, hsl(220 84% 10%) 40%, hsl(220 80% 8%) 100%)",
        }}
      />

      {/* Top nav */}
      <header className="fixed inset-x-0 top-0 z-50 bg-white/[0.03] shadow-[0_1px_0_rgba(175,224,249,0.06)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
          <span className="text-lg font-bold tracking-tight text-white">{BRAND.name}</span>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate("/library")}
              className="hidden text-sm font-medium text-white/60 transition-colors hover:text-white sm:block"
            >
              Library
            </button>
            <button
              type="button"
              onClick={() => navigate("/settings")}
              className="hidden text-sm font-medium text-white/60 transition-colors hover:text-white sm:block"
            >
              Settings
            </button>
            <button
              type="button"
              onClick={() => navigate("/settings")}
              className="text-sm font-medium text-white/60 transition-colors hover:text-white sm:hidden"
            >
              Menu
            </button>
          </div>
        </div>
      </header>

      <main className="px-4 pb-20 pt-28 sm:px-6 sm:pt-32">
        <div className="mx-auto max-w-2xl">
          {/* Greeting */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="text-center"
          >
            <img
              src={BLINK_LOGO}
              alt={BRAND.name}
              className="mx-auto h-12 w-12 rounded-xl"
              draggable={false}
            />
            <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              {user?.name ? `Hey, ${user.name.split(" ")[0]}` : "Welcome to Blink"}
            </h1>
            <p className="mt-4 text-base leading-relaxed text-white/55">
              Analyze any Instagram profile and see how it comes across.
            </p>
          </motion.div>

          {/* Primary actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.15 }}
            className="mt-10 flex flex-col items-center gap-4"
          >
            <CTAButton
              label="Analyze a profile"
              onClick={() => navigate("/analyze")}
              size="lg"
            />
            <button
              type="button"
              onClick={() => navigate("/library")}
              className="text-sm font-semibold text-white/50 transition-colors hover:text-white"
            >
              View your previous analyses
            </button>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
