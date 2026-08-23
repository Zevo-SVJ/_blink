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

import { useLocation, useNavigate } from "react-router-dom";

import { BarAction, BarTab, BottomBar } from "@/components/nav/chrome";
import { APP_NAV, isNavActive } from "@/lib/app-nav";
import { useT } from "@/lib/i18n";

/** One id for the whole bar, so the pill travels between destinations. */
const GROUP = "app-tab";

export function TabBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const t = useT();

  return (
    <BottomBar label={t.app.primaryNav}>
      {APP_NAV.map((item) => {
        const destination = {
          path: item.path,
          label: t.app[item.labelKey],
          icon: item.icon,
        };
        return item.primary ? (
          <BarAction
            key={item.path}
            item={destination}
            onGo={() => navigate(item.path)}
          />
        ) : (
          <BarTab
            key={item.path}
            group={GROUP}
            item={destination}
            active={isNavActive(location.pathname, item.path)}
            onGo={() => navigate(item.path)}
          />
        );
      })}
    </BottomBar>
  );
}
