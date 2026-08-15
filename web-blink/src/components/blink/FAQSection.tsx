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
          <h2 className="text-[1.75rem] font-extrabold tracking-tight text-white sm:text-4xl">
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
                className="overflow-hidden rounded-2xl border-b-0 bg-white/[0.035] px-4 ring-1 ring-white/[0.07] transition-colors data-[state=open]:bg-white/[0.07] sm:px-5"
              >
                <AccordionTrigger className="py-4 text-left text-sm font-bold text-white/90 hover:no-underline sm:text-base [&>svg]:text-white/40">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="pb-5 text-sm leading-relaxed text-white/55 sm:text-[15px]">
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
