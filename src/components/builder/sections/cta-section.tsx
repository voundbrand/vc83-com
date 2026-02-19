"use client";

/**
 * CTA SECTION
 *
 * A call-to-action section with prominent button(s).
 * Typically used at the end of a page with a strong visual background.
 */

import { EditableText } from "@/components/project-editing";
import { CTAButton } from "./cta-button";
import type { CTASectionProps } from "@/lib/page-builder/section-registry";
import type { PageIntegrations } from "@/lib/page-builder/page-schema";

interface CTASectionComponentProps extends CTASectionProps {
  sectionId: string;
  isEditMode?: boolean;
  integrations?: PageIntegrations;
}

export function CTASection({
  sectionId,
  title,
  description,
  titleClassName = "text-3xl sm:text-4xl font-bold text-white",
  descriptionClassName = "text-indigo-100 mt-4 max-w-xl mx-auto text-lg",
  backgroundClassName = "bg-gradient-to-r from-indigo-600 to-amber-600 py-16 sm:py-20",
  alignment = "center",
  primaryCta,
  secondaryCta,
  isEditMode = false,
  integrations,
}: CTASectionComponentProps) {
  // Alignment classes
  const alignmentClasses: Record<string, { container: string; ctas: string }> = {
    left: {
      container: "text-left",
      ctas: "justify-start",
    },
    center: {
      container: "text-center",
      ctas: "justify-center",
    },
    right: {
      container: "text-right",
      ctas: "justify-end",
    },
  };

  const align = alignmentClasses[alignment] || alignmentClasses.center;

  return (
    <section className={backgroundClassName}>
      <div className={`max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 ${align.container}`}>
        {/* Title */}
        {isEditMode ? (
          <EditableText
            blockId={`${sectionId}.title`}
            defaultValue={title}
            as="h2"
            className={titleClassName}
            sectionId={sectionId}
            blockLabel="CTA Title"
          />
        ) : (
          <h2 className={titleClassName}>{title}</h2>
        )}

        {/* Description */}
        {description && (
          <div className={alignment === "center" ? "max-w-xl mx-auto" : ""}>
            {isEditMode ? (
              <EditableText
                blockId={`${sectionId}.description`}
                defaultValue={description}
                as="p"
                className={descriptionClassName}
                sectionId={sectionId}
                blockLabel="CTA Description"
              />
            ) : (
              <p className={descriptionClassName}>{description}</p>
            )}
          </div>
        )}

        {/* CTAs */}
        <div
          className={`mt-8 flex flex-col sm:flex-row gap-4 ${align.ctas}`}
        >
          {primaryCta && (
            <CTAButton
              {...primaryCta}
              integrations={integrations}
              variant={primaryCta.variant || "secondary"}
              className={
                primaryCta.className ||
                "bg-white text-indigo-600 hover:bg-indigo-50 px-8 py-4 text-lg font-semibold shadow-lg"
              }
            />
          )}
          {secondaryCta && (
            <CTAButton
              {...secondaryCta}
              integrations={integrations}
              variant={secondaryCta.variant || "outline"}
              className={
                secondaryCta.className ||
                "border-2 border-white text-white hover:bg-white/10 px-8 py-4 text-lg font-semibold"
              }
            />
          )}
        </div>
      </div>
    </section>
  );
}
