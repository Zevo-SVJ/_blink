/**
 * Blink — the mobile tab bar.
 *
 * Lives in its own file because it is mounted once by `AppChrome`, above the
 * router, rather than by whichever screen happens to be showing. Keeping it
 * inside `AppShell` was what made it pop in a beat late on `/analyze`, which
 * renders outside the shell and so had to construct a second copy.
 *
 * **Analyze is the centre action, not a tab.** It is filled rather than
 * outlined and takes no active state: you never "are" in Analyze the way you
 * are in Library — you go and do it and come back. Treating it as a tab that
 * lights up would imply a place you can sit.
 */

import { motion } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";

import { APP_NAV, isNavActive, type NavDestination } from "@/lib/app-nav";
import { cn } from "@/lib/utils";

export function TabBar() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 px-3 md:hidden"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0.75rem)" }}
      aria-label="Primary"
    >
      <ul className="mx-auto flex max-w-md items-center justify-between gap-0.5 rounded-[1.75rem] border border-white/[0.08] bg-blink-navy-2/80 p-1.5 shadow-[0_16px_50px_-12px_rgba(0,0,0,0.7)] backdrop-blur-2xl">
        {APP_NAV.map((item) =>
          item.primary ? (
            <PrimaryTab key={item.path} item={item} onPress={() => navigate(item.path)} />
          ) : (
            <Tab
              key={item.path}
              item={item}
              active={isNavActive(location.pathname, item.path)}
              onPress={() => navigate(item.path)}
            />
          ),
        )}
      </ul>
    </nav>
  );
}

function Tab({
  item,
  active,
  onPress,
}: {
  item: NavDestination;
  active: boolean;
  onPress: () => void;
}) {
  const Icon = item.icon;

  return (
    <li className="flex-1">
      <motion.button
        type="button"
        onClick={onPress}
        aria-current={active ? "page" : undefined}
        whileTap={{ scale: 0.92 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        // 48px minimum: the previous 44px was the floor, not a comfortable
        // target, and these sit right above the home indicator.
        className="relative flex min-h-[48px] w-full flex-col items-center justify-center gap-1 rounded-[1.35rem] px-1 py-1.5"
      >
        {active && (
          <motion.span
            layoutId="app-tab-pill"
            className="absolute inset-0 rounded-[1.35rem] bg-white/[0.09]"
            transition={{ type: "spring", stiffness: 420, damping: 36 }}
          />
        )}
        <Icon
          className={cn(
            "relative h-[1.15rem] w-[1.15rem] transition-colors",
            active ? "text-blink-sky" : "text-white/45",
          )}
          strokeWidth={active ? 2.4 : 2}
        />
        <span
          className={cn(
            "relative text-[0.625rem] font-semibold leading-none transition-colors",
            active ? "text-white" : "text-white/45",
          )}
        >
          {item.label}
        </span>
      </motion.button>
    </li>
  );
}

/**
 * The centre action.
 *
 * Filled rather than outlined, and it does not take an active state: you never
 * "are" in Analyze the way you are in Library — you go and do it and come back.
 * Treating it as a tab that lights up would imply a place you can sit.
 */
function PrimaryTab({ item, onPress }: { item: NavDestination; onPress: () => void }) {
  const Icon = item.icon;

  return (
    <li className="flex-1">
      <motion.button
        type="button"
        onClick={onPress}
        whileTap={{ scale: 0.9 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className="flex min-h-[48px] w-full flex-col items-center justify-center gap-1 rounded-[1.35rem] px-1 py-1.5"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blink-sky shadow-[0_6px_18px_-6px_hsl(var(--blink-sky)/0.9)]">
          <Icon className="h-[1.1rem] w-[1.1rem] text-blink-navy" strokeWidth={2.6} />
        </span>
        <span className="text-[0.625rem] font-bold leading-none text-white">
          {item.label}
        </span>
      </motion.button>
    </li>
  );
}
