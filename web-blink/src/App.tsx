import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import { AppChrome } from "@/components/app/AppChrome";
import { PageBackground } from "@/components/blink/PageBackground";
import { AuthProvider } from "@/hooks/useAuth";
import { I18nProvider, type Lang } from "@/lib/i18n";

// The landing is the only route most visitors ever see, so it ships in the
// initial bundle. Everything behind it — the analysis flow, the authenticated
// app, the legal pages — is split out. Previously all of it parsed before the
// hero could paint, which is what made the first screen appear late.
import Index from "./pages/Index";

const Product = lazy(() => import("./pages/Product"));
const AppHome = lazy(() => import("./pages/AppHome"));
const Library = lazy(() => import("./pages/Library"));
const AnalysisDetail = lazy(() => import("./pages/AnalysisDetail"));
const Profile = lazy(() => import("./pages/Profile"));
const PublicProfile = lazy(() => import("./pages/PublicProfile"));
const Ranks = lazy(() => import("./pages/Ranks"));
const Settings = lazy(() => import("./pages/Settings"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const NotFound = lazy(() => import("./pages/NotFound"));
/**
 * Component gallery for local development only.
 *
 * The authenticated screens can't be opened without Supabase credentials, so
 * this is how their components get looked at in a browser. `import.meta.env.DEV`
 * is statically replaced at build time, so the route and its chunk are dropped
 * from production entirely.
 */
const DevGallery = import.meta.env.DEV
  ? lazy(() => import("./pages/DevGallery"))
  : null;

const Legal = {
  Privacy: lazy(() =>
    import("./pages/Legal").then((m) => ({ default: m.PrivacyPolicy })),
  ),
  Terms: lazy(() =>
    import("./pages/Legal").then((m) => ({ default: m.TermsOfService })),
  ),
  Cookies: lazy(() =>
    import("./pages/Legal").then((m) => ({ default: m.CookiePolicy })),
  ),
  Contact: lazy(() =>
    import("./pages/Legal").then((m) => ({ default: m.ContactPage })),
  ),
  Notice: lazy(() =>
    import("./pages/Legal").then((m) => ({ default: m.LegalNotice })),
  ),
};

/**
 * Shown while a split route's chunk loads. Just the brand background — a
 * spinner would flash on fast connections and read as jank.
 */
function RouteFallback() {
  return (
    <div className="min-h-screen">
      <PageBackground />
    </div>
  );
}

/**
 * Honour an anchor in the URL on a cold load.
 *
 * The browser resolves `/#faq` once, at parse time — when the document is
 * still the boot shell, `#faq` does not exist yet, and scrolling is locked by
 * `html.booting`. By the time React has mounted the real page and released the
 * lock, the browser has long since given up, so a shared deep link silently
 * landed at the top of the page. In-page clicks were unaffected, which is why
 * this only shows up on a fresh load.
 *
 * The target arrives with a lazily-loaded route chunk, so it is polled for
 * rather than read once — briefly, and only until it appears. Any real scroll
 * input cancels the wait: someone who has started reading should never be
 * yanked somewhere else by a late-arriving anchor.
 */
function HashLanding() {
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (!id) return;

    let cancelled = false;
    const stop = () => { cancelled = true; };
    window.addEventListener("wheel", stop, { once: true, passive: true });
    window.addEventListener("touchstart", stop, { once: true, passive: true });
    window.addEventListener("keydown", stop, { once: true });

    const deadline = performance.now() + 3000;
    const tick = () => {
      if (cancelled) return;
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ block: "start", behavior: "instant" });
        return;
      }
      if (performance.now() < deadline) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      window.removeEventListener("wheel", stop);
      window.removeEventListener("touchstart", stop);
      window.removeEventListener("keydown", stop);
    };
  }, []);

  return null;
}

/**
 * Three providers used to wrap this tree — TanStack Query, Sonner's `Toaster`
 * and Radix's `TooltipProvider`. None of them were used anywhere: no
 * `useQuery`, no `toast()`, no `<Tooltip>` in the entire codebase. They cost
 * roughly 35 kB gzip in the *critical* bundle, on every first load, to render
 * nothing. Removed. The shadcn wrappers remain in `components/ui` for whenever
 * something actually needs them.
 */
/**
 * Everything inside the router.
 *
 * Split out so the same tree can be mounted under `BrowserRouter` in the
 * browser and `StaticRouter` during the build-time prerender. The two must be
 * the same component or the prerendered markup and the hydrated markup drift,
 * and hydration silently throws the server HTML away — which is precisely the
 * flash this build exists to remove.
 */
export const AppTree = ({ lang }: { lang?: Lang }) => (
  <I18nProvider initial={lang}>
    <AuthProvider>
      <HashLanding />
      {/* The tab bar is mounted here, once, so navigating between app
          screens never rebuilds it. See `AppChrome`. */}
      <AppChrome>
        <Suspense fallback={<RouteFallback />}>
          <Routes>{ROUTES}</Routes>
        </Suspense>
      </AppChrome>
    </AuthProvider>
  </I18nProvider>
);

const App = ({ lang }: { lang?: Lang }) => {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AppTree lang={lang} />
    </BrowserRouter>
  );
};

export default App;

const ROUTES = (
  <>
    <Route path="/" element={<Index />} />
    <Route path="/analyze" element={<Product />} />
    <Route path="/auth/callback" element={<AuthCallback />} />
    <Route path="/auth/reset" element={<AuthCallback />} />
    <Route path="/app" element={<AppHome />} />
    <Route path="/library" element={<Library />} />
    <Route path="/library/:id" element={<AnalysisDetail />} />
    <Route path="/profile" element={<Profile />} />
    <Route path="/u/:id" element={<PublicProfile />} />
    <Route path="/ranks" element={<Ranks />} />
    <Route path="/settings" element={<Settings />} />
    <Route path="/privacy" element={<Legal.Privacy />} />
    <Route path="/terms" element={<Legal.Terms />} />
    <Route path="/cookies" element={<Legal.Cookies />} />
    <Route path="/contact" element={<Legal.Contact />} />
    {/* Mentions légales — required of a French site editor by the LCEN, and
        the page Stripe looks for when it checks who is behind the business.
        Reachable under both names so a French visitor and a reviewer each
        find it where they expect. */}
    <Route path="/legal" element={<Legal.Notice />} />
    <Route path="/mentions-legales" element={<Legal.Notice />} />
    {DevGallery && <Route path="/dev" element={<DevGallery />} />}
    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
    <Route path="*" element={<NotFound />} />
  </>
);
