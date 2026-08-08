/**
 * The single visual environment every Blink screen sits on.
 *
 * Fixed rather than per-section so the gradient stays continuous while the
 * page scrolls and while routes change — sections and cards are transparent
 * on top of it.
 */

/** Deep navy with the light-blue lift at the top. Blink's core identity. */
export const BLINK_GRADIENT =
  "radial-gradient(ellipse 80% 60% at 50% 0%, hsl(220 70% 14%) 0%, hsl(220 84% 10%) 40%, hsl(220 80% 8%) 100%)";

export function PageBackground({ glows = false }: { glows?: boolean }) {
  return (
    <>
      <div className="fixed inset-0 -z-10" aria-hidden style={{ background: BLINK_GRADIENT }} />
      {glows && (
        <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
          <div
            className="absolute left-[-10%] top-[15%] h-[500px] w-[500px] rounded-full opacity-[0.04] blur-[140px]"
            style={{ background: "hsl(195 88% 60%)" }}
          />
          <div
            className="absolute right-[-5%] top-[55%] h-[600px] w-[600px] rounded-full opacity-[0.03] blur-[160px]"
            style={{ background: "hsl(208 95% 55%)" }}
          />
          <div
            className="absolute left-[30%] top-[85%] h-[400px] w-[400px] rounded-full opacity-[0.025] blur-[120px]"
            style={{ background: "hsl(195 88% 70%)" }}
          />
        </div>
      )}
    </>
  );
}
