import { Link } from "react-router-dom";

import { BlinkLogo } from "@/components/blink/BlinkLogo";
import { LanguageToggle } from "@/components/blink/LanguageToggle";
import { BRAND, SOCIAL } from "@/lib/brand";
import { useI18n } from "@/lib/i18n";

interface FooterLink {
  label: string;
  href?: string;
  to?: string;
}

const social: FooterLink[] = [
  { label: "Instagram", href: SOCIAL.instagram ?? undefined },
  { label: "TikTok", href: SOCIAL.tiktok ?? undefined },
  { label: "X", href: SOCIAL.x ?? undefined },
].filter((link): link is FooterLink & { href: string } => Boolean(link.href));

/** Both literals are spelled out so Tailwind can see them at build time. */
const GRID = social.length
  ? "sm:grid-cols-[1.4fr_repeat(3,1fr)]"
  : "sm:grid-cols-[1.4fr_repeat(2,1fr)]";

/**
 * On a phone these links are the densest tappable text on the page: 17px tall
 * and stacked. The anchor grows to a 44px row on mobile and collapses back to
 * its natural height from `sm` up, where a cursor makes the padding pointless.
 */
const LINK =
  "inline-flex min-h-[44px] items-center text-sm font-medium text-white/55 transition-colors hover:text-white sm:min-h-0";

export function Footer() {
  const { lang, t } = useI18n();

  /**
   * The legal column is the one Stripe and a French reader both look for, so
   * every required page is reachable from here — including the legal notice,
   * which the LCEN expects to be accessible from any page of the site.
   */
  const columns: { title: string; links: FooterLink[] }[] = [
    {
      title: t.footer.product,
      links: [
        { label: t.nav.howItWorks, href: "#how-it-works" },
        // Was a second link to #how-it-works. The leaderboard is its own
        // section and was the one thing on the page the footer never reached.
        { label: t.nav.leaderboard, href: "#leaderboard" },
        { label: t.nav.reviews, href: "#reactions" },
        { label: t.nav.faq, href: "#faq" },
      ],
    },
    {
      title: t.footer.legal,
      links: [
        { label: t.footer.privacy, to: "/privacy" },
        { label: t.footer.terms, to: "/terms" },
        { label: t.footer.cookies, to: "/cookies" },
        { label: t.footer.legalNotice, to: lang === "fr" ? "/mentions-legales" : "/legal" },
        { label: t.footer.contact, to: "/contact" },
      ],
    },
    // Omitted entirely until at least one profile is published, rather than
    // shown as three links that go nowhere.
    ...(social.length ? [{ title: t.footer.social, links: social }] : []),
  ];

  return (
    <footer className="border-t border-white/5 px-4 py-14 sm:px-6">
      <div className={`mx-auto grid max-w-6xl gap-10 ${GRID}`}>
        <div>
          <BlinkLogo width={78} />
          <p className="mt-4 max-w-[220px] text-xs leading-relaxed text-white/35">
            {t.brand.tagline}
          </p>
          <div className="mt-3">
            <LanguageToggle className="-ml-2" />
          </div>
        </div>
        {columns.map((col) => (
          <div key={col.title}>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/30">{col.title}</p>
            <ul className="mt-2 space-y-0 sm:mt-4 sm:space-y-2.5">
              {col.links.map((link) => (
                <li key={link.label}>
                  {link.to ? (
                    <Link to={link.to} className={LINK}>
                      {link.label}
                    </Link>
                  ) : (
                    <a href={link.href} className={LINK}>
                      {link.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mx-auto mt-12 flex max-w-6xl flex-col gap-2 border-t border-white/5 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-white/30">
          © 2026 {BRAND.name}. {t.footer.rights}
        </p>
        {/* Site-wide AI disclosure. Small, permanent, and one line — the AI Act
            asks that people know they are getting AI output, not that every
            screen shout it. The result screens carry the specific notice. */}
        <p className="text-xs text-white/20">{t.footer.aiNotice}</p>
      </div>
    </footer>
  );
}
