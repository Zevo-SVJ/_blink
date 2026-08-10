/**
 * Blink — the app's persistent chrome.
 *
 * The tab bar is mounted **once**, above the router, and never unmounts while
 * you are inside the app. That is the whole point of this file.
 *
 * Previously each screen rendered its own copy: `AppShell` had one, and
 * `/analyze` — which lives outside the shell — had another. Navigating to
 * Analyze therefore destroyed one bar and constructed another, so it visibly
 * popped in a frame or two late, after that route's lazy chunk had loaded.
 * A native app's tab bar does not do that. Mounting it here means moving
 * between Home, Library, Analyze, Ranks and Profile changes only the content
 * underneath it.
 *
 * There is one exception, and it is deliberate: the analysis animation is
 * full-screen and cinematic, so `useImmersive` lets that one screen ask for
 * the bar to slide away, and it slides back the instant the screen is done.
 * That is a request to hide a persistent element, not a remount.
 */

import { AnimatePresence, motion } from "framer-motion";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useLocation } from "react-router-dom";

import { TabBar } from "@/components/app/TabBar";
import { useAuth } from "@/hooks/useAuth";

/** Routes that are "inside the app" and therefore carry the tab bar. */
const APP_ROUTES = ["/app", "/library", "/profile", "/ranks", "/settings", "/analyze", "/u/"];

/** Exported for the regression test — the bar appearing on the landing page, or
 *  vanishing on a nested route like `/library/:id`, are both silent failures. */
export function isAppRoute(pathname: string): boolean {
  return APP_ROUTES.some((r) => pathname === r || pathname.startsWith(r));
}

interface ImmersiveContext {
  /** Ask for the chrome to step aside. Returns a function that restores it. */
  setImmersive: (on: boolean) => void;
}

const Ctx = createContext<ImmersiveContext>({ setImmersive: () => {} });

/**
 * Hide the persistent chrome for as long as `active` is true.
 *
 * Self-restoring on unmount, so a screen can't navigate away mid-animation and
 * leave the user without navigation.
 */
export function useImmersive(active: boolean): void {
  const { setImmersive } = useContext(Ctx);

  useEffect(() => {
    setImmersive(active);
    return () => setImmersive(false);
  }, [active, setImmersive]);
}

export function AppChrome({ children }: { children: ReactNode }) {
  const [immersive, setImmersiveState] = useState(false);
  const location = useLocation();
  const { user } = useAuth();

  const setImmersive = useCallback((on: boolean) => setImmersiveState(on), []);
  const value = useMemo(() => ({ setImmersive }), [setImmersive]);

  const show = !!user && isAppRoute(location.pathname) && !immersive;

  return (
    <Ctx.Provider value={value}>
      {children}

      <AnimatePresence>
        {show && (
          <motion.div
            key="app-tabbar"
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            transition={{ type: "spring", stiffness: 340, damping: 34 }}
          >
            <TabBar />
          </motion.div>
        )}
      </AnimatePresence>
    </Ctx.Provider>
  );
}
