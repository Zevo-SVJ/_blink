/**
 * Development-only specimen for the design system.
 *
 * A token is a claim about how something looks, and a claim nobody has looked
 * at is a guess. This puts every surface, ink weight, line, radius, elevation,
 * material and type role on one page at real size so the ramps can be checked
 * against each other — which is the only way to catch two steps that are
 * indistinguishable, a glass that turns grey, or a caption that fails contrast
 * on the surface it actually sits on.
 *
 * Registered only under `import.meta.env.DEV`, like the component gallery.
 * It imports the system rather than describing it, so it cannot drift.
 */

import { motion } from "framer-motion";
import { useState } from "react";

import { PageBackground } from "@/components/blink/PageBackground";
import { SPRING, STAGGER } from "@/design/motion";

const SURFACES = ["--surface-0", "--surface-1", "--surface-2", "--surface-3"];
const INKS = ["--ink-1", "--ink-2", "--ink-3", "--ink-4"];
const LINES = ["--line-1", "--line-2", "--line-3"];
const RADII = ["--r-xs", "--r-sm", "--r-md", "--r-lg", "--r-xl", "--r-2xl"];
const ELEVATION = ["elev-1", "elev-2", "elev-3"];
const GLASS = ["glass-chrome", "glass-panel", "glass-inset"];

export default function DesignSystem() {
  return (
    <div className="relative min-h-screen pb-24">
      <PageBackground />
      <div className="relative z-10 mx-auto max-w-4xl space-y-14 px-5 py-14">
        <header>
          <p className="t-label text-blink-sky/60">Blink</p>
          <h1 className="t-display mt-2 text-white">Design system</h1>
          <p className="t-body mt-3 max-w-lg text-white/[var(--ink-3)]">
            Every role in one place, at real size. If two steps here are hard to
            tell apart, they are hard to tell apart in the product.
          </p>
        </header>

        <Group title="Surfaces">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {SURFACES.map((v) => (
              <div key={v} className="overflow-hidden rounded-[var(--r-md)] border border-white/[0.07]">
                <div className="h-20" style={{ background: `hsl(var(${v}))` }} />
                <p className="t-micro px-3 py-2 font-mono text-[0.65rem] text-white/40">{v}</p>
              </div>
            ))}
          </div>
        </Group>

        <Group title="Ink, on a card">
          <div className="surface p-5">
            {INKS.map((v) => (
              <p
                key={v}
                className="t-body"
                style={{ color: `hsl(0 0% 100% / var(${v}))` }}
              >
                {v} — See yourself the way others see you.
              </p>
            ))}
          </div>
        </Group>

        <Group title="Lines">
          <div className="flex flex-wrap gap-3">
            {LINES.map((v) => (
              <div
                key={v}
                className="rounded-[var(--r-md)] bg-[hsl(var(--surface-2))] px-5 py-4"
                style={{ border: `1px solid hsl(0 0% 100% / var(${v}))` }}
              >
                <span className="t-caption font-mono text-white/50">{v}</span>
              </div>
            ))}
          </div>
        </Group>

        <Group title="Radius">
          <div className="flex flex-wrap items-end gap-3">
            {RADII.map((v) => (
              <div key={v} className="text-center">
                <div
                  className="h-20 w-20 border border-white/[0.09] bg-[hsl(var(--surface-2))]"
                  style={{ borderRadius: `var(${v})` }}
                />
                <p className="t-micro mt-2 font-mono text-[0.6rem] text-white/40">{v.slice(2)}</p>
              </div>
            ))}
          </div>
        </Group>

        <Group title="Elevation — surface and shadow together">
          <div className="flex flex-wrap items-end gap-6 rounded-[var(--r-lg)] bg-[hsl(var(--surface-0))] p-8">
            {ELEVATION.map((v, i) => (
              <div key={v} className="text-center">
                <div
                  className={`${v} rounded-[var(--r-md)]`}
                  style={{ height: 80 + i * 8, width: 112 }}
                />
                <p className="mt-3 font-mono text-[0.6rem] text-white/40">.{v}</p>
              </div>
            ))}
            <div className="text-center">
              <div
                className="rounded-[var(--r-md)] bg-[hsl(var(--surface-2))]"
                style={{ height: 96, width: 112, boxShadow: "var(--e-glow)" }}
              />
              <p className="mt-3 font-mono text-[0.6rem] text-white/40">--e-glow</p>
            </div>
          </div>
        </Group>

        <Group title="Glass — over content, never as content">
          {/* Something with detail behind it, because glass over a flat colour
              proves nothing: the whole question is what it does to what it is
              covering. */}
          <div className="relative overflow-hidden rounded-[var(--r-lg)]">
            <div className="grid grid-cols-6">
              {Array.from({ length: 24 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-square"
                  style={{
                    background: `hsl(${200 + (i % 6) * 14} ${50 + (i % 4) * 12}% ${28 + ((i * 7) % 34)}%)`,
                  }}
                />
              ))}
            </div>
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              {GLASS.map((c) => (
                <div key={c} className={`${c} rounded-[var(--r-pill)] px-6 py-3`}>
                  <span className="t-caption font-mono text-white/80">.{c}</span>
                </div>
              ))}
            </div>
          </div>
        </Group>

        <Group title="Type">
          <div className="surface space-y-3 p-5">
            <p className="t-display text-white">Display</p>
            <p className="t-title text-white">Title</p>
            <p className="t-heading text-white">Heading</p>
            <p className="t-body text-white/[var(--ink-2)]">
              Body — Blink analyses a profile and shows what it communicates.
            </p>
            <p className="t-caption text-white/[var(--ink-3)]">Caption</p>
            <p className="t-label text-blink-sky/70">Label</p>
            <p className="t-numeric t-title text-white">8.7 / 10</p>
          </div>
        </Group>

        <Group title="Springs — press one">
          <SpringLab />
        </Group>
      </div>
    </div>
  );
}

/** Each preset, on the same object, so they can be compared by feel. */
function SpringLab() {
  const [at, setAt] = useState<Record<string, boolean>>({});

  return (
    <div className="space-y-3">
      {(Object.keys(SPRING) as (keyof typeof SPRING)[]).map((name, i) => (
        <div key={name} className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setAt((s) => ({ ...s, [name]: !s[name] }))}
            className="glass-inset focus-ring t-caption w-24 shrink-0 rounded-[var(--r-pill)] px-3 py-2 font-mono text-white/70"
          >
            {name}
          </button>
          <div className="relative h-10 flex-1 rounded-[var(--r-pill)] bg-white/[0.04]">
            <motion.div
              className="absolute top-1 h-8 w-8 rounded-full bg-blink-sky"
              animate={{ left: at[name] ? "calc(100% - 2.25rem)" : "0.25rem" }}
              transition={{ ...SPRING[name], delay: i * STAGGER }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <p className="t-label mb-4 text-blink-sky/50">{title}</p>
      {children}
    </section>
  );
}
