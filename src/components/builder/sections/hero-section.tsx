"use client";

/**
 * HERO SECTION
 *
 * The main headline section for AI-generated pages.
 * Supports three layout modes:
 * 1. Background image mode - dramatic full-bleed hero with text overlay (like v0)
 * 2. Side image mode - text on one side, image on other
 * 3. Content image mode - image displayed below text
 *
 * Auto-detects background mode when titleClassName contains "text-white"
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
  showTitle = true,
  showSubtitle = true,
  cta,
  secondaryCta,
  image,
  isEditMode = false,
  integrations,
  // Extended props for layout modes
  imageMode,
  overlayClassName,
  minHeight,
}: HeroSectionComponentProps & {
  imageMode?: "background" | "content" | "side";
  overlayClassName?: string;
  minHeight?: string;
}) {
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

  // Auto-detect background mode: if title has white text or explicit imageMode="background"
  const useBackgroundMode =
    imageMode === "background" ||
    (image && (titleClassName?.includes("text-white") || backgroundClassName?.includes("from-slate-900") || backgroundClassName?.includes("from-blue-900")));

  const useSideMode = imageMode === "side";

  // BACKGROUND IMAGE MODE - Full-bleed dramatic hero (like v0)
  if (useBackgroundMode && image) {
    const effectiveOverlay = overlayClassName || "bg-black/40";
    const effectiveMinHeight = minHeight || "min-h-[70vh]";

    return (
      <section className={`relative ${effectiveMinHeight} flex items-center justify-center overflow-hidden`}>
        {/* Background Image */}
        <div className="absolute inset-0">
          <img
            src={image.src}
            alt={image.alt || "Hero background"}
            className="w-full h-full object-cover"
          />
          {/* Overlay for text readability */}
          <div className={`absolute inset-0 ${effectiveOverlay}`} />
        </div>

        {/* Content */}
        <div className={`relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-32 ${align.container}`}>
          {/* Badge */}
          {badge && (
            <div className="mb-6">
              {isEditMode ? (
                <EditableText
                  blockId={`${sectionId}.badge`}
                  defaultValue={badge}
                  as="span"
                  className="inline-block text-sm font-semibold text-white/90 bg-white/20 backdrop-blur-sm px-4 py-1.5 rounded-full border border-white/30"
                  sectionId={sectionId}
                  blockLabel="Hero Badge"
                />
              ) : (
                <span className="inline-block text-sm font-semibold text-white/90 bg-white/20 backdrop-blur-sm px-4 py-1.5 rounded-full border border-white/30">
                  {badge}
                </span>
              )}
            </div>
          )}

          {/* Title */}
          {showTitle && (
            isEditMode ? (
              <EditableText
                blockId={`${sectionId}.title`}
                defaultValue={title}
                as="h1"
                className={titleClassName || "text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white tracking-tight drop-shadow-lg"}
                sectionId={sectionId}
                blockLabel="Hero Title"
              />
            ) : (
              <h1 className={titleClassName || "text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white tracking-tight drop-shadow-lg"}>
                {title}
              </h1>
            )
          )}

          {/* Subtitle */}
          {showSubtitle && subtitle && (
            <div className={`${align.text} max-w-3xl mt-6`}>
              {isEditMode ? (
                <EditableText
                  blockId={`${sectionId}.subtitle`}
                  defaultValue={subtitle}
                  as="p"
                  className={subtitleClassName || "text-xl sm:text-2xl text-white/90 drop-shadow-md"}
                  sectionId={sectionId}
                  blockLabel="Hero Subtitle"
                />
              ) : (
                <p className={subtitleClassName || "text-xl sm:text-2xl text-white/90 drop-shadow-md"}>
                  {subtitle}
                </p>
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
                  className={cta.className || "px-8 py-4 text-lg bg-white text-gray-900 hover:bg-gray-100 font-semibold shadow-lg rounded-lg"}
                />
              )}
              {secondaryCta && (
                <CTAButton
                  {...secondaryCta}
                  integrations={integrations}
                  variant={secondaryCta.variant || "secondary"}
                  className={secondaryCta.className || "px-8 py-4 text-lg border-2 border-white text-white hover:bg-white/10 font-semibold rounded-lg"}
                />
              )}
            </div>
          )}
        </div>
      </section>
    );
  }

  // SIDE IMAGE MODE - Text on one side, image on other
  if (useSideMode && image) {
    return (
      <section className={backgroundClassName}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Content */}
            <div className={alignment === "right" ? "lg:order-2" : ""}>
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
              {showTitle && (
                isEditMode ? (
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
                )
              )}

              {/* Subtitle */}
              {showSubtitle && subtitle && (
                <div className="mt-6">
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
                <div className="mt-10 flex flex-col sm:flex-row gap-4">
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
            </div>

            {/* Image */}
            <div className={alignment === "right" ? "lg:order-1" : ""}>
              <img
                src={image.src}
                alt={image.alt}
                className={image.className || "rounded-2xl shadow-2xl w-full h-auto"}
              />
            </div>
          </div>
        </div>
      </section>
    );
  }

  // CONTENT IMAGE MODE (default) - Image below text
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
        {showTitle && (
          isEditMode ? (
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
          )
        )}

        {/* Subtitle */}
        {showSubtitle && subtitle && (
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
