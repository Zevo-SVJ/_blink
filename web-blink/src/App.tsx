import { lazy, Suspense, useLayoutEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import { AppChrome } from "@/components/app/AppChrome";
import { PageBackground } from "@/components/blink/PageBackground";
import { AuthProvider } from "@/hooks/useAuth";

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
 * Three providers used to wrap this tree — TanStack Query, Sonner's `Toaster`
 * and Radix's `TooltipProvider`. None of them were used anywhere: no
 * `useQuery`, no `toast()`, no `<Tooltip>` in the entire codebase. They cost
 * roughly 35 kB gzip in the *critical* bundle, on every first load, to render
 * nothing. Removed. The shadcn wrappers remain in `components/ui` for whenever
 * something actually needs them.
 */
const App = () => {
  /**
   * Hand scrolling back to the user.
   *
   * `index.html` locks it while the boot markup is the whole document — see
   * the note there. A layout effect is the right moment: it runs after React
   * has committed the real page and before the browser paints it, so the
   * document is already full height the first time scrolling is possible.
   */
  useLayoutEffect(() => {
    document.documentElement.classList.remove("booting");
  }, []);

  return (
    <AuthProvider>
      <BrowserRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        {/* The tab bar is mounted here, once, so navigating between app
              screens never rebuilds it. See `AppChrome`. */}
        <AppChrome>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
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
              {DevGallery && <Route path="/dev" element={<DevGallery />} />}
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AppChrome>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
