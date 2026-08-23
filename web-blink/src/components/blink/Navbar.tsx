import { AnimatePresence, motion, useScroll, useMotionValueEvent } from "framer-motion";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";

import { AuthModal } from "@/components/blink/AuthModal";
import { TopBar } from "@/components/nav/chrome";
import { CTAButton } from "@/components/blink/CTAButton";
import { LanguageToggle } from "@/components/blink/LanguageToggle";
import { BRAND } from "@/lib/brand";
import { useAuth } from "@/hooks/useAuth";
import { useT } from "@/lib/i18n";
import type { Messages } from "@/lib/messages";
import { cn } from "@/lib/utils";

/** Anchors are stable; only the words are translated. */
const PUBLIC_LINKS: Array<{ key: keyof Messages["nav"]; href: string }> = [
  { key: "howItWorks", href: "#how-it-works" },
  { key: "leaderboard", href: "#leaderboard" },
  { key: "reviews", href: "#reactions" },
  { key: "faq", href: "#faq" },
];

export function Navbar({ onCTA }: { onCTA: () => void }) {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const t = useT();

  useMotionValueEvent(scrollY, "change", (latest) => {
    setScrolled(latest > 10);
  });

  const handleCTA = () => {
    if (user) {
      navigate("/analyze");
    } else {
      onCTA();
    }
  };

  return (
    <>
      {/* Transparent over the hero, a real material once the reader has
          moved: the same bar the app uses, sharing its glass. */}
      <TopBar solid={scrolled}>
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6 sm:py-4">
          {/* Was `href="#"`, which scrolled to the top and left `#` in the URL.
              The wordmark is the way home from every route the navbar appears
              on, so it navigates like one. */}
          <Link
            to="/"
            className="focus-ring inline-flex min-h-[44px] items-center rounded-[var(--r-sm)] text-lg font-bold tracking-tight text-white"
          >
            {BRAND.name}
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            {PUBLIC_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="focus-ring inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-[var(--r-sm)] px-1 text-sm font-medium text-white/60 transition-colors hover:text-white"
              >
                {t.nav[link.key]}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
            <LanguageToggle />

            {/* The returning-user door. Secondary by weight, but present on
                every width — someone who already has an account should never
                have to hunt through a marketing page to get back in. */}
            {/* Someone who already has an account gets a sign-in form, not the
                upload flow. Sending them through acquisition was the bug: the
                button said "Log in" and asked for a screenshot. */}
            <button
              type="button"
              onClick={() => (user ? navigate("/app") : setSignInOpen(true))}
              className="focus-ring min-h-[44px] rounded-[var(--r-pill)] px-3 text-sm font-semibold text-white/65 transition-colors hover:text-white sm:px-4"
            >
              {user ? t.nav.openBlink : t.nav.logIn}
            </button>

            <div className="hidden md:block">
              <CTAButton
                label={user ? t.nav.analyzeProfile : t.brand.cta}
                onClick={handleCTA}
              />
            </div>

            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="focus-ring flex h-11 w-11 items-center justify-center rounded-[var(--r-md)] text-white/80 transition-colors hover:text-white md:hidden"
              aria-label={t.nav.openMenu}
            >
              <Menu className="h-6 w-6" />
            </button>
          </div>

        </nav>
      </TopBar>

      <AuthModal
        open={signInOpen}
        onClose={() => setSignInOpen(false)}
        onSuccess={() => {
          setSignInOpen(false);
          navigate("/app");
        }}
        initialMode="signin"
        title={t.nav.welcomeBack}
        subtitle={t.nav.signInToOpen}
      />

      {/* Mobile menu overlay */}
      <AnimatePresence>
        {menuOpen && (
          <MobileMenu
            key="mobile-menu"
            isAuthenticated={!!user}
            onCTA={() => {
              setMenuOpen(false);
              handleCTA();
            }}
            onClose={() => setMenuOpen(false)}
            onNavigate={(path) => {
              setMenuOpen(false);
              navigate(path);
            }}
            onSignOut={() => {
              setMenuOpen(false);
              signOut();
              navigate("/");
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}

function MobileMenu({
  isAuthenticated,
  onCTA,
  onClose,
  onNavigate,
  onSignOut,
}: {
  isAuthenticated: boolean;
  onCTA: () => void;
  onClose: () => void;
  onNavigate: (path: string) => void;
  onSignOut: () => void;
}) {
  const t = useT();

  const menuItems = isAuthenticated
    ? [
        { label: BRAND.name, action: () => onNavigate("/app") },
        { label: t.nav.library, action: () => onNavigate("/library") },
        { label: t.nav.ranks, action: () => onNavigate("/ranks") },
        { label: t.nav.profile, action: () => onNavigate("/profile") },
        { label: t.nav.settings, action: () => onNavigate("/settings") },
        { label: t.nav.logOut, action: onSignOut },
      ]
    : PUBLIC_LINKS.map((link) => ({ label: t.nav[link.key], href: link.href }));

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm md:hidden"
        onClick={onClose}
      />

      {/* Panel */}
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 360, damping: 36 }}
        className="glass-panel fixed right-0 top-0 z-[61] flex h-full w-[78%] max-w-xs flex-col rounded-none border-y-0 border-r-0 p-6 md:hidden"
      >
        <div className="flex items-center justify-between">
          <span className="text-lg font-bold tracking-tight text-white">
            {BRAND.name}
          </span>
          <div className="flex items-center gap-1">
            <LanguageToggle />
            <button
              type="button"
              onClick={onClose}
              className="focus-ring flex h-11 w-11 items-center justify-center rounded-[var(--r-md)] text-white/60 transition-colors hover:text-white"
              aria-label={t.nav.closeMenu}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="mt-8 flex flex-1 flex-col gap-1">
          {menuItems.map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 + i * 0.04, type: "spring", stiffness: 300, damping: 30 }}
            >
              {"action" in item ? (
                <button
                  type="button"
                  onClick={item.action}
                  className="focus-ring block min-h-[48px] w-full rounded-[var(--r-md)] px-4 py-3 text-left text-base font-semibold text-white/70 transition-colors hover:bg-white/5 hover:text-white"
                >
                  {item.label}
                </button>
              ) : (
                <a
                  href={item.href}
                  onClick={onClose}
                  className="focus-ring block min-h-[48px] rounded-[var(--r-md)] px-4 py-3 text-base font-semibold text-white/70 transition-colors hover:bg-white/5 hover:text-white"
                >
                  {item.label}
                </a>
              )}
            </motion.div>
          ))}
        </div>

        <div className="border-t border-white/8 pt-6">
          <CTAButton
            label={isAuthenticated ? t.nav.analyzeProfile : t.brand.cta}
            onClick={onCTA}
            size="lg"
            className="w-full justify-center"
          />
        </div>
      </motion.div>
    </>
  );
}
