import { MotionConfig } from "framer-motion";
import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { FAQSection } from "@/components/blink/FAQSection";
import { FilmSection } from "@/components/blink/FilmSection";
import { FinalCTA } from "@/components/blink/FinalCTA";
import { Footer } from "@/components/blink/Footer";
import { EyeReveal } from "@/components/blink/EyeReveal";
import { Hero } from "@/components/blink/Hero";
import { HowItWorks } from "@/components/blink/HowItWorks";
import { LeaderboardShowcase } from "@/components/blink/LeaderboardShowcase";
import { ActivityToasts } from "@/components/blink/ActivityToasts";
import { Navbar } from "@/components/blink/Navbar";
import { PageBackground } from "@/components/blink/PageBackground";
import { Testimonials } from "@/components/blink/Testimonials";
import { useAuth } from "@/hooks/useAuth";
import { useT } from "@/lib/i18n";

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const t = useT();
  const location = useLocation();

  /**
   * Someone who just deleted their account, in a deployment where the login
   * record could not be removed from the client, lands here. Telling them what
   * is still outstanding is the whole point — a silent redirect would let them
   * believe a deletion finished when part of it has not.
   */
  const partialDeletion =
    (location.state as { accountDeletion?: string } | null)?.accountDeletion === "partial";

  /**
   * Every CTA on this page routes through here.
   *
   * A signed-in visitor goes to the app. The landing page is an acquisition
   * surface, and sending someone who already has an account and a history back
   * through "upload a screenshot to get started" treats them as a stranger.
   * They can still analyse — it's the middle of the tab bar — but that is now
   * their choice rather than the only door.
   */
  const handleCTA = useCallback(() => {
    navigate(user ? "/app" : "/analyze");
  }, [navigate, user]);

  return (
    <MotionConfig reducedMotion="user">
      {/* `overflow-x-clip` rather than `-hidden`: `hidden` on one axis coerces
          the other to `auto`, turning this into a scroll container and
          defeating the pinned stage in `EyeReveal`. `clip` hides the same
          overflow without creating one. */}
      <div className="relative min-h-screen overflow-x-clip">
        {/* One continuous visual environment; sections sit transparent on top. */}
        <PageBackground glows />

        <Navbar onCTA={handleCTA} />

        {/* Landing only — see the component's note. Mounted here rather than in
            the shell so it can never follow anyone into the app. */}
        <ActivityToasts />

        {partialDeletion && (
          <div
            role="status"
            className="mx-auto mt-20 max-w-xl px-4 sm:px-6"
          >
            <p className="rounded-2xl border border-blink-sky/20 bg-blink-sky/[0.07] px-4 py-3 text-sm leading-relaxed text-white/75">
              {t.settings.deletePartial}
            </p>
          </div>
        )}

        <main>
          <Hero onCTA={handleCTA} />
          {/* Between the promise and the explanation: the eye opens as you
              scroll away from the hero, and is open by the time How It Works
              starts telling you what Blink does. */}
          <EyeReveal />
          <HowItWorks onCTA={handleCTA} />
          {/* After the demonstration, before the leaderboard: the reader now
              knows what Blink does, and this is the same thing at the speed a
              feed would see it. */}
          <FilmSection />
          <LeaderboardShowcase onCTA={handleCTA} />
          <Testimonials onCTA={handleCTA} />
          <FAQSection />
          <FinalCTA onCTA={handleCTA} />
        </main>
        <Footer />
      </div>
    </MotionConfig>
  );
};

export default Index;
