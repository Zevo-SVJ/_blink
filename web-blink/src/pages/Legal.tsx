import { Link } from "react-router-dom";

import { BlinkLogo } from "@/components/blink/BlinkLogo";

function LegalLayout({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div
        className="fixed inset-0 -z-10"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 0%, hsl(220 70% 14%) 0%, hsl(220 84% 10%) 40%, hsl(220 80% 8%) 100%)",
        }}
      />
      <header className="fixed inset-x-0 top-0 z-50 bg-white/[0.03] shadow-[0_1px_0_rgba(175,224,249,0.06)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3.5 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <BlinkLogo width={28} />
            <span className="text-lg font-bold tracking-tight text-white">Blink</span>
          </Link>
          <Link to="/" className="text-sm font-medium text-white/60 transition-colors hover:text-white">
            Back to Blink
          </Link>
        </div>
      </header>
      <main className="px-4 pb-20 pt-28 sm:px-6 sm:pt-32">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">{title}</h1>
          <div className="mt-8 space-y-6 text-sm leading-relaxed text-white/60 sm:text-base">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}

export function PrivacyPolicy() {
  return (
    <LegalLayout title="Privacy Policy">
      <p className="text-xs text-white/35">Last updated: August 2026</p>

      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white">1. What Blink does</h2>
        <p>
          Blink analyzes Instagram profile screenshots to reveal how the profile likely comes across to others.
          You upload a screenshot, Blink's AI analyzes it, and you receive a perception report.
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white">2. Screenshots</h2>
        <p>
          Screenshots you upload are sent securely to our AI analysis endpoint, processed in memory, and deleted
          immediately after analysis. We do not permanently store your uploaded screenshots unless you explicitly
          save an analysis to your library.
        </p>
        <p>
          Screenshots are never shared with third parties, never made public, and never used for training.
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white">3. Account data</h2>
        <p>
          When you create an account, we store your email address and authentication information. Your analysis
          results are stored in your account so you can access them later. You can delete your account and all
          associated data at any time from Settings.
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white">4. Authentication</h2>
        <p>
          We use Supabase for authentication. If you sign in with Google, we receive your name and email as
          provided by Google. We do not post to your Google account or access your Google data beyond
          authentication.
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white">5. Cookies</h2>
        <p>
          We use essential cookies to maintain your authentication session. See our Cookie Policy for details.
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white">6. Your rights</h2>
        <p>
          You have the right to access, correct, or delete your personal data. You can delete your account
          directly from Settings, or contact us for assistance.
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white">7. Contact</h2>
        <p>
          For privacy questions or requests, please <Link to="/contact" className="text-blink-sky hover:underline">contact us</Link>.
        </p>
      </div>
    </LegalLayout>
  );
}

export function TermsOfService() {
  return (
    <LegalLayout title="Terms of Service">
      <p className="text-xs text-white/35">Last updated: August 2026</p>

      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white">1. Acceptance</h2>
        <p>
          By using Blink, you agree to these terms. If you do not agree, please do not use the service.
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white">2. What Blink provides</h2>
        <p>
          Blink provides AI-generated analysis of Instagram profile screenshots. These analyses are perceptions
          and interpretations, not facts or professional advice. Blink is for entertainment and self-reflection
          purposes.
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white">3. Your responsibility</h2>
        <p>
          You are responsible for the screenshots you upload. Only upload profiles you have the right to analyze.
          Do not use Blink to harass, bully, or defame anyone.
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white">4. Accounts</h2>
        <p>
          You are responsible for maintaining the security of your account. You must be at least 13 years old
          to use Blink.
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white">5. Limitation of liability</h2>
        <p>
          Blink is provided "as is" without warranties. We are not liable for any decisions you make based on
          Blink analyses.
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white">6. Changes</h2>
        <p>
          We may update these terms from time to time. Continued use of Blink constitutes acceptance of updated
          terms.
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white">7. Contact</h2>
        <p>
          For questions about these terms, please <Link to="/contact" className="text-blink-sky hover:underline">contact us</Link>.
        </p>
      </div>
    </LegalLayout>
  );
}

export function CookiePolicy() {
  return (
    <LegalLayout title="Cookie Policy">
      <p className="text-xs text-white/35">Last updated: August 2026</p>

      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white">1. Essential cookies</h2>
        <p>
          Blink uses essential cookies to maintain your authentication session. These cookies are necessary
          for the service to function and cannot be disabled.
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white">2. Session storage</h2>
        <p>
          We use browser localStorage to store your authentication session token. This allows you to stay
          logged in across page refreshes and browser sessions. This data is stored locally on your device
          and is not sent to third parties.
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white">3. No tracking cookies</h2>
        <p>
          Blink does not use tracking cookies, advertising cookies, or third-party analytics cookies.
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white">4. Managing cookies</h2>
        <p>
          You can clear your session at any time by logging out. You can also clear localStorage in your
          browser settings.
        </p>
      </div>
    </LegalLayout>
  );
}

export function ContactPage() {
  return (
    <LegalLayout title="Contact & Support">
      <div className="space-y-4">
        <p>
          We're here to help. Whether you have a question, feedback, or need support, we'd love to hear from you.
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white">Support</h2>
        <p>
          For technical issues, account problems, or feature requests, please email us at{" "}
          <a href="mailto:support@blink.app" className="text-blink-sky hover:underline">support@blink.app</a>.
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white">Privacy</h2>
        <p>
          For privacy questions or data deletion requests, please email{" "}
          <a href="mailto:privacy@blink.app" className="text-blink-sky hover:underline">privacy@blink.app</a>.
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white">Business</h2>
        <p>
          For partnerships and business inquiries, please email{" "}
          <a href="mailto:hello@blink.app" className="text-blink-sky hover:underline">hello@blink.app</a>.
        </p>
      </div>

      <div className="mt-8 rounded-2xl border border-white/8 bg-white/[0.03] p-5">
        <p className="text-sm font-medium text-white/50">
          You can also manage your account and delete your data directly from{" "}
          <Link to="/settings" className="text-blink-sky hover:underline">Settings</Link>.
        </p>
      </div>
    </LegalLayout>
  );
}
