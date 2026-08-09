import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import { PageBackground } from "@/components/blink/PageBackground";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
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
const Legal = {
  Privacy: lazy(() => import("./pages/Legal").then((m) => ({ default: m.PrivacyPolicy }))),
  Terms: lazy(() => import("./pages/Legal").then((m) => ({ default: m.TermsOfService }))),
  Cookies: lazy(() => import("./pages/Legal").then((m) => ({ default: m.CookiePolicy }))),
  Contact: lazy(() => import("./pages/Legal").then((m) => ({ default: m.ContactPage }))),
};

const queryClient = new QueryClient();

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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
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
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
