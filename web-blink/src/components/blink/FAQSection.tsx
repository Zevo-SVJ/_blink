import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Reveal } from "@/components/blink/Reveal";
import { useT } from "@/lib/i18n";

export function FAQSection() {
  const t = useT();

  /**
   * Order is editorial, so it is written out rather than derived from the
   * dictionary: what Blink is, how it works, what it needs, what happens to
   * the image, who wrote the answer, what it gives back, what it costs, and
   * the question everyone eventually asks — can I run it on someone else.
   */
  const FAQS = [
    { id: "what-is-blink", ...t.faq.items.whatIsBlink },
    { id: "how-analyze", ...t.faq.items.howAnalyze },
    { id: "connect-account", ...t.faq.items.connectAccount },
    { id: "data-storage", ...t.faq.items.dataStorage },
    { id: "ai-disclosure", ...t.faq.items.aiDisclosure },
    { id: "recommendations", ...t.faq.items.recommendations },
    { id: "free", ...t.faq.items.free },
    { id: "someone-else", ...t.faq.items.someoneElse },
  ];

  return (
    <section id="faq" className="relative overflow-hidden px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-2xl">
        <Reveal className="text-center">
          <h2 className="t-title text-balance text-white">
            {t.faq.heading}
          </h2>
        </Reveal>

        <Reveal delay={0.05} className="mt-10 sm:mt-12">
          <Accordion type="single" collapsible className="space-y-3">
            {FAQS.map((faq) => (
              <AccordionItem
                key={faq.id}
                value={faq.id}
                // border-b-0 drops the shadcn default, which drew a bright rule
                // across the bottom of every rounded card.
                className="surface overflow-hidden rounded-[var(--r-md)] border-b-0 px-4 transition-colors data-[state=open]:bg-[hsl(var(--surface-3))] sm:px-5"
              >
                <AccordionTrigger className="focus-ring t-body py-4 text-left font-bold text-white/90 hover:no-underline [&>svg]:text-white/40">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="t-body pb-5 text-white/55">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
      </div>
    </section>
  );
}
