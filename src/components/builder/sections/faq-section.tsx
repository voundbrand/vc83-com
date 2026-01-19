"use client";

/**
 * FAQ SECTION
 *
 * Displays frequently asked questions in an accordion or grid layout.
 */

import { useState } from "react";
import { EditableText } from "@/components/project-editing";
import { ChevronDown } from "lucide-react";
import type { FAQSectionProps, FAQItem } from "@/lib/page-builder/section-registry";
import type { PageIntegrations } from "@/lib/page-builder/page-schema";

interface FAQSectionComponentProps extends FAQSectionProps {
  sectionId: string;
  isEditMode?: boolean;
  integrations?: PageIntegrations;
}

function FAQAccordionItem({
  faq,
  sectionId,
  index,
  isEditMode,
  isOpen,
  onToggle,
}: {
  faq: FAQItem;
  sectionId: string;
  index: number;
  isEditMode: boolean;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border-b border-gray-200">
      <button
        className="w-full py-4 flex items-center justify-between text-left"
        onClick={onToggle}
      >
        {isEditMode ? (
          <EditableText
            blockId={`${sectionId}.faqs.${index}.question`}
            defaultValue={faq.question}
            as="span"
            className="text-lg font-medium text-gray-900 pr-4"
          />
        ) : (
          <span className="text-lg font-medium text-gray-900 pr-4">
            {faq.question}
          </span>
        )}
        <ChevronDown
          className={`w-5 h-5 text-gray-500 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ${
          isOpen ? "max-h-96 pb-4" : "max-h-0"
        }`}
      >
        {isEditMode ? (
          <EditableText
            blockId={`${sectionId}.faqs.${index}.answer`}
            defaultValue={faq.answer}
            as="p"
            className="text-gray-600"
          />
        ) : (
          <p className="text-gray-600">{faq.answer}</p>
        )}
      </div>
    </div>
  );
}

function FAQGridItem({
  faq,
  sectionId,
  index,
  isEditMode,
}: {
  faq: FAQItem;
  sectionId: string;
  index: number;
  isEditMode: boolean;
}) {
  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
      {isEditMode ? (
        <>
          <EditableText
            blockId={`${sectionId}.faqs.${index}.question`}
            defaultValue={faq.question}
            as="h3"
            className="text-lg font-semibold text-gray-900 mb-2"
          />
          <EditableText
            blockId={`${sectionId}.faqs.${index}.answer`}
            defaultValue={faq.answer}
            as="p"
            className="text-gray-600"
          />
        </>
      ) : (
        <>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {faq.question}
          </h3>
          <p className="text-gray-600">{faq.answer}</p>
        </>
      )}
    </div>
  );
}

export function FAQSection({
  sectionId,
  isEditMode = false,
  badge,
  title,
  subtitle,
  titleClassName = "text-3xl sm:text-4xl font-bold text-gray-900",
  subtitleClassName = "text-lg text-gray-600 mt-4 max-w-2xl mx-auto",
  backgroundClassName = "bg-white py-16 sm:py-24",
  layout = "accordion",
  faqs,
}: FAQSectionComponentProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className={backgroundClassName}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          {badge && (
            <span className="inline-block px-3 py-1 text-sm font-medium text-indigo-600 bg-indigo-100 rounded-full mb-4">
              {isEditMode ? (
                <EditableText
                  blockId={`${sectionId}.badge`}
                  defaultValue={badge}
                  as="span"
                />
              ) : (
                badge
              )}
            </span>
          )}
          {isEditMode ? (
            <EditableText
              blockId={`${sectionId}.title`}
              defaultValue={title}
              as="h2"
              className={titleClassName}
            />
          ) : (
            <h2 className={titleClassName}>{title}</h2>
          )}
          {subtitle &&
            (isEditMode ? (
              <EditableText
                blockId={`${sectionId}.subtitle`}
                defaultValue={subtitle}
                as="p"
                className={subtitleClassName}
              />
            ) : (
              <p className={subtitleClassName}>{subtitle}</p>
            ))}
        </div>

        {/* FAQ Content */}
        {layout === "accordion" ? (
          <div className="max-w-3xl mx-auto">
            {faqs.map((faq, index) => (
              <FAQAccordionItem
                key={faq.id}
                faq={faq}
                sectionId={sectionId}
                index={index}
                isEditMode={isEditMode}
                isOpen={openIndex === index}
                onToggle={() => setOpenIndex(openIndex === index ? null : index)}
              />
            ))}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {faqs.map((faq, index) => (
              <FAQGridItem
                key={faq.id}
                faq={faq}
                sectionId={sectionId}
                index={index}
                isEditMode={isEditMode}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
