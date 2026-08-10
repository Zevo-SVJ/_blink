import { MotionConfig } from "framer-motion";
import { useCallback } from "react";
import { useNavigate } from "react-router-dom";

import { FAQSection } from "@/components/blink/FAQSection";
import { FinalCTA } from "@/components/blink/FinalCTA";
import { Footer } from "@/components/blink/Footer";
import { Hero } from "@/components/blink/Hero";
import { HowItWorks } from "@/components/blink/HowItWorks";
import { LeaderboardShowcase } from "@/components/blink/LeaderboardShowcase";
import { ActivityToasts } from "@/components/blink/ActivityToasts";
import { Navbar } from "@/components/blink/Navbar";
import { PageBackground } from "@/components/blink/PageBackground";
import { Testimonials } from "@/components/blink/Testimonials";
import { useAuth } from "@/hooks/useAuth";

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

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
      <div className="relative min-h-screen overflow-x-hidden">
        {/* One continuous visual environment; sections sit transparent on top. */}
        <PageBackground glows />

        <Navbar onCTA={handleCTA} />

        {/* Landing only — see the component's note. Mounted here rather than in
            the shell so it can never follow anyone into the app. */}
        <ActivityToasts />
        <main>
          <Hero onCTA={handleCTA} />
          <HowItWorks onCTA={handleCTA} />
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
