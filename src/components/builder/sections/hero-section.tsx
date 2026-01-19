"use client";

/**
 * HERO SECTION
 *
 * The main headline section for AI-generated pages.
 * Supports editable text, CTAs, and images.
 */

import { EditableText } from "@/components/project-editing";
import { CTAButton } from "./cta-button";
import type { HeroSectionProps } from "@/lib/page-builder/section-registry";
import type { PageIntegrations } from "@/lib/page-builder/page-schema";

interface HeroSectionComponentProps extends HeroSectionProps {
  sectionId: string;
  isEditMode?: boolean;
  integrations?: PageIntegrations;
}

export function HeroSection({
  sectionId,
  badge,
  title,
  subtitle,
  backgroundClassName = "bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-16 sm:py-24",
  titleClassName = "text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 tracking-tight",
  subtitleClassName = "text-lg sm:text-xl text-gray-600 mt-6 max-w-2xl mx-auto",
  alignment = "center",
  cta,
  secondaryCta,
  image,
  isEditMode = false,
  integrations,
}: HeroSectionComponentProps) {
  // Alignment classes
  const alignmentClasses: Record<string, { container: string; text: string }> = {
    left: {
      container: "text-left",
      text: "mr-auto",
    },
    center: {
      container: "text-center",
      text: "mx-auto",
    },
    right: {
      container: "text-right",
      text: "ml-auto",
    },
  };

  const align = alignmentClasses[alignment] || alignmentClasses.center;

  // CTA alignment
  const ctaAlignmentClasses: Record<string, string> = {
    left: "justify-start",
    center: "justify-center",
    right: "justify-end",
  };

  return (
    <section className={backgroundClassName}>
      <div className={`max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 ${align.container}`}>
        {/* Badge */}
        {badge && (
          <div className="mb-6">
            {isEditMode ? (
              <EditableText
                blockId={`${sectionId}.badge`}
                defaultValue={badge}
                as="span"
                className="inline-block text-sm font-semibold text-indigo-600 bg-indigo-50 px-4 py-1.5 rounded-full"
                sectionId={sectionId}
                blockLabel="Hero Badge"
              />
            ) : (
              <span className="inline-block text-sm font-semibold text-indigo-600 bg-indigo-50 px-4 py-1.5 rounded-full">
                {badge}
              </span>
            )}
          </div>
        )}

        {/* Title */}
        {isEditMode ? (
          <EditableText
            blockId={`${sectionId}.title`}
            defaultValue={title}
            as="h1"
            className={titleClassName}
            sectionId={sectionId}
            blockLabel="Hero Title"
          />
        ) : (
          <h1 className={titleClassName}>{title}</h1>
        )}

        {/* Subtitle */}
        {subtitle && (
          <div className={`${align.text} max-w-2xl`}>
            {isEditMode ? (
              <EditableText
                blockId={`${sectionId}.subtitle`}
                defaultValue={subtitle}
                as="p"
                className={subtitleClassName}
                sectionId={sectionId}
                blockLabel="Hero Subtitle"
              />
            ) : (
              <p className={subtitleClassName}>{subtitle}</p>
            )}
          </div>
        )}

        {/* CTAs */}
        {(cta || secondaryCta) && (
          <div
            className={`mt-10 flex flex-col sm:flex-row gap-4 ${ctaAlignmentClasses[alignment]}`}
          >
            {cta && (
              <CTAButton
                {...cta}
                integrations={integrations}
                className={cta.className || "px-8 py-4 text-lg"}
              />
            )}
            {secondaryCta && (
              <CTAButton
                {...secondaryCta}
                integrations={integrations}
                variant={secondaryCta.variant || "secondary"}
                className={secondaryCta.className || "px-8 py-4 text-lg"}
              />
            )}
          </div>
        )}

        {/* Image */}
        {image && (
          <div className="mt-12">
            <img
              src={image.src}
              alt={image.alt}
              className={
                image.className ||
                "rounded-2xl shadow-2xl mx-auto max-w-full h-auto"
              }
            />
          </div>
        )}
      </div>
    </section>
  );
}
