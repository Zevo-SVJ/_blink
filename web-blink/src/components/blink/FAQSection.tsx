import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Reveal } from "@/components/blink/Reveal";
import { FAQS } from "@/lib/blink-data";

export function FAQSection() {
  return (
    <section id="faq" className="relative overflow-hidden px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-2xl">
        <Reveal className="text-center">
          <h2 className="text-[1.75rem] font-extrabold tracking-tight text-white sm:text-4xl">
            Questions
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
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="pb-5 text-sm leading-relaxed text-white/55 sm:text-[15px]">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
      </div>
    </section>
  );
}
