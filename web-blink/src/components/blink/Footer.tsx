import { Link } from "react-router-dom";

import { BlinkLogo } from "@/components/blink/BlinkLogo";
import { BRAND, SOCIAL } from "@/lib/brand";

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

const columns: { title: string; links: FooterLink[] }[] = [
  {
    title: "Product",
    links: [
      { label: "How it works", href: "#how-it-works" },
      // Was a second link to #how-it-works. The leaderboard is its own
      // section and was the one thing on the page the footer never reached.
      { label: "Leaderboard", href: "#leaderboard" },
      { label: "Reviews", href: "#reactions" },
      { label: "FAQ", href: "#faq" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", to: "/privacy" },
      { label: "Terms of Service", to: "/terms" },
      { label: "Cookie Policy", to: "/cookies" },
      { label: "Contact", to: "/contact" },
    ],
  },
  // Omitted entirely until at least one profile is published, rather than
  // shown as three links that go nowhere.
  ...(social.length ? [{ title: "Social", links: social }] : []),
];

/** Both literals are spelled out so Tailwind can see them at build time. */
const GRID =
  columns.length === 3
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
  return (
    <footer className="border-t border-white/5 px-4 py-14 sm:px-6">
      <div className={`mx-auto grid max-w-6xl gap-10 ${GRID}`}>
        <div>
          <BlinkLogo width={78} />
          <p className="mt-4 max-w-[220px] text-xs leading-relaxed text-white/35">
            {BRAND.tagline}
          </p>
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
        <p className="text-xs text-white/30">© 2026 {BRAND.name}. All rights reserved.</p>
        <p className="text-xs text-white/20">Made for the curious.</p>
      </div>
    </footer>
  );
}
