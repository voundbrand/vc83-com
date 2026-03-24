"use client"

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { EditableHeading, EditableParagraph, EditableText } from "@cms"
import { isCmsEditorEnabled } from "@/lib/cms-editor-config"

interface FAQItem {
  question: string
  answer: string
}

interface FAQSectionProps {
  title: string
  subtitle: string
  faqs: FAQItem[]
}

export function FAQSection({ title, subtitle, faqs }: FAQSectionProps) {
  const cmsEnabled = isCmsEditorEnabled()

  return (
    <section className="bg-secondary py-24 px-4">
      <div className="container mx-auto max-w-4xl">
        <div className="mb-12 text-center">
          {cmsEnabled ? (
            <>
              <EditableHeading
                page="home"
                section="faq"
                contentKey="title"
                fallback={title}
                level={2}
                className="mb-4 font-serif text-4xl font-bold text-primary md:text-5xl text-balance"
              />
              <EditableParagraph
                page="home"
                section="faq"
                contentKey="subtitle"
                fallback={subtitle}
                className="text-lg text-muted-foreground md:text-xl text-pretty"
              />
            </>
          ) : (
            <>
              <h2 className="mb-4 font-serif text-4xl font-bold text-primary md:text-5xl text-balance">{title}</h2>
              <p className="text-lg text-muted-foreground md:text-xl text-pretty">{subtitle}</p>
            </>
          )}
        </div>

        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, index) => (
            <AccordionItem key={index} value={`item-${index}`} className="border-border">
              <AccordionTrigger className="text-left text-lg font-semibold text-primary hover:text-accent">
                {cmsEnabled ? (
                  <EditableText
                    page="home"
                    section="faq"
                    contentKey={`item_${index + 1}_question`}
                    fallback={faq.question}
                  />
                ) : (
                  faq.question
                )}
              </AccordionTrigger>
              <AccordionContent className="text-foreground/80 leading-relaxed">
                {cmsEnabled ? (
                  <EditableText
                    page="home"
                    section="faq"
                    contentKey={`item_${index + 1}_answer`}
                    fallback={faq.answer}
                  />
                ) : (
                  faq.answer
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  )
}
