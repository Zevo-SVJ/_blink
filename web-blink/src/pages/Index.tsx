import { MotionConfig } from "framer-motion";
import { useCallback } from "react";
import { useNavigate } from "react-router-dom";

import { FAQSection } from "@/components/blink/FAQSection";
import { FinalCTA } from "@/components/blink/FinalCTA";
import { Footer } from "@/components/blink/Footer";
import { Hero } from "@/components/blink/Hero";
import { HowItWorks } from "@/components/blink/HowItWorks";
import { LeaderboardShowcase } from "@/components/blink/LeaderboardShowcase";
import { MobileCTA } from "@/components/blink/MobileCTA";
import { Navbar } from "@/components/blink/Navbar";
import { PageBackground } from "@/components/blink/PageBackground";
import { PerceptionShowcase } from "@/components/blink/PerceptionShowcase";
import { Testimonials } from "@/components/blink/Testimonials";

const Index = () => {
  const navigate = useNavigate();
  const handleCTA = useCallback(() => {
    navigate("/analyze");
  }, [navigate]);

  return (
    <MotionConfig reducedMotion="user">
      <div className="relative min-h-screen overflow-x-hidden">
        {/* One continuous visual environment; sections sit transparent on top. */}
        <PageBackground glows />

        <Navbar onCTA={handleCTA} />
        <main>
          <Hero onCTA={handleCTA} />
          <HowItWorks onCTA={handleCTA} />
          <PerceptionShowcase onCTA={handleCTA} />
          <LeaderboardShowcase onCTA={handleCTA} />
          <Testimonials onCTA={handleCTA} />
          <FAQSection />
          <FinalCTA onCTA={handleCTA} />
        </main>
        <Footer />
        <MobileCTA onCTA={handleCTA} />
      </div>
    </MotionConfig>
  );
};

export default Index;
