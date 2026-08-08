import { Link } from "react-router-dom";

import { BlinkLogo } from "@/components/blink/BlinkLogo";
import { BRAND } from "@/lib/brand";

const columns = [
  {
    title: "Product",
    links: [
      { label: "How it works", href: "#how-it-works" },
      { label: "Perceptions", href: "#perceptions" },
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
  {
    title: "Social",
    links: [
      { label: "Instagram", href: "#" },
      { label: "TikTok", href: "#" },
      { label: "X", href: "#" },
    ],
  },
] as const;

export function Footer() {
  return (
    <footer className="border-t border-white/5 px-4 py-14 sm:px-6">
      <div className="mx-auto grid max-w-6xl gap-10 sm:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <BlinkLogo width={78} />
          <p className="mt-4 max-w-[220px] text-xs leading-relaxed text-white/35">
            {BRAND.tagline}
          </p>
        </div>
        {columns.map((col) => (
          <div key={col.title}>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/30">{col.title}</p>
            <ul className="mt-4 space-y-2.5">
              {col.links.map((link) => (
                <li key={link.label}>
                  {"to" in link && link.to ? (
                    <Link to={link.to} className="text-sm font-medium text-white/55 transition-colors hover:text-white">
                      {link.label}
                    </Link>
                  ) : (
                    <a href={"href" in link ? link.href : "#"} className="text-sm font-medium text-white/55 transition-colors hover:text-white">
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
