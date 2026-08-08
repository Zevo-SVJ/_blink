import { MotionConfig } from "framer-motion";
import { useCallback } from "react";
import { useNavigate } from "react-router-dom";

import { FAQSection } from "@/components/blink/FAQSection";
import { FinalCTA } from "@/components/blink/FinalCTA";
import { Footer } from "@/components/blink/Footer";
import { Hero } from "@/components/blink/Hero";
import { HowItWorks } from "@/components/blink/HowItWorks";
import { MobileCTA } from "@/components/blink/MobileCTA";
import { Navbar } from "@/components/blink/Navbar";
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
        {/* ── One continuous page-level background ── */}
        {/* This is the single visual environment. Sections are transparent. */}
        <div
          className="fixed inset-0 -z-10"
          aria-hidden
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% 0%, hsl(220 70% 14%) 0%, hsl(220 84% 10%) 40%, hsl(220 80% 8%) 100%)",
          }}
        />
        {/* Subtle atmospheric depth — two large soft glows that stay fixed */}
        <div className="pointer-events-none fixed inset-0 -z-10" aria-hidden>
          <div
            className="absolute left-[-10%] top-[15%] h-[500px] w-[500px] rounded-full opacity-[0.04] blur-[140px]"
            style={{ background: "hsl(195 88% 60%)" }}
          />
          <div
            className="absolute right-[-5%] top-[55%] h-[600px] w-[600px] rounded-full opacity-[0.03] blur-[160px]"
            style={{ background: "hsl(208 95% 55%)" }}
          />
          <div
            className="absolute left-[30%] top-[85%] h-[400px] w-[400px] rounded-full opacity-[0.025] blur-[120px]"
            style={{ background: "hsl(195 88% 70%)" }}
          />
        </div>

        <Navbar onCTA={handleCTA} />
        <main>
          <Hero onCTA={handleCTA} />
          <HowItWorks onCTA={handleCTA} />
          <PerceptionShowcase onCTA={handleCTA} />
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
