"use client";

/**
 * PAGE RENDERER
 *
 * Takes an AIGeneratedPageSchema and renders it using section components.
 * Supports edit mode for post-generation modifications.
 */

import {
  HeroSection,
  FeaturesSection,
  CTASection,
  TestimonialsSection,
  PricingSection,
  GallerySection,
  TeamSection,
  FAQSection,
  ProcessSection,
  BookingSection,
} from "./sections";
import { PageHeader } from "./page-header";
import type { AIGeneratedPageSchema } from "@/lib/page-builder/page-schema";
import type { PageSection, SectionType } from "@/lib/page-builder/section-registry";

// ============================================================================
// SECTION COMPONENT REGISTRY
// ============================================================================

// Using a more permissive type to allow dynamic prop spreading from schema
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sectionComponents: Record<SectionType, React.ComponentType<any>> = {
  hero: HeroSection,
  features: FeaturesSection,
  cta: CTASection,
  testimonials: TestimonialsSection,
  pricing: PricingSection,
  gallery: GallerySection,
  team: TeamSection,
  faq: FAQSection,
  process: ProcessSection,
  booking: BookingSection,
};

// ============================================================================
// PROPS
// ============================================================================

interface PageRendererProps {
  /** The page schema to render */
  schema: AIGeneratedPageSchema;
  /** ID of the currently selected section (for highlighting in builder) */
  selectedSectionId?: string | null;
  /** Whether edit mode is enabled */
  isEditMode?: boolean;
  /** Project ID for edit mode context */
  projectId?: string;
  /** Organization ID for edit mode context */
  organizationId?: string;
  /** Callback when a section is clicked */
  onSectionClick?: (sectionId: string) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function PageRenderer({
  schema,
  selectedSectionId,
  isEditMode = false,
  onSectionClick,
}: PageRendererProps) {
  // Generate CSS variables from theme
  const themeStyles = schema.theme
    ? {
        "--page-primary": schema.theme.primaryColor || "#4F46E5",
        "--page-secondary": schema.theme.secondaryColor || "#7C3AED",
        "--page-text": schema.theme.textColor || "#111827",
        "--page-bg": schema.theme.backgroundColor || "#FFFFFF",
      }
    : {};

  return (
    <div
      className="min-h-screen"
      style={themeStyles as React.CSSProperties}
    >
      {/* Optional header/navigation */}
      {schema.header?.enabled !== false && schema.header && (
        <PageHeader
          {...schema.header}
          pageTitle={schema.metadata.title}
        />
      )}

      {/* Render each section */}
      {schema.sections.map((section) => {
        const SectionComponent = sectionComponents[section.type];

        if (!SectionComponent) {
          console.warn(`Unknown section type: ${section.type}`);
          return (
            <div
              key={section.id}
              className="p-8 bg-red-50 text-red-600 text-center"
            >
              Unknown section type: {section.type}
            </div>
          );
        }

        const isSelected = selectedSectionId === section.id;

        return (
          <div
            key={section.id}
            id={section.id}
            className={`relative ${
              isSelected
                ? "ring-2 ring-indigo-500 ring-inset ring-offset-2"
                : ""
            } ${onSectionClick ? "cursor-pointer" : ""}`}
            onClick={() => onSectionClick?.(section.id)}
          >
            {/* Section selection indicator */}
            {isSelected && (
              <div className="absolute top-2 left-2 z-10 bg-indigo-500 text-white text-xs px-2 py-1 rounded">
                {section.type.charAt(0).toUpperCase() + section.type.slice(1)}
              </div>
            )}

            <SectionComponent
              {...section.props}
              sectionId={section.id}
              isEditMode={isEditMode}
              integrations={schema.integrations}
            />
          </div>
        );
      })}

      {/* Empty state */}
      {schema.sections.length === 0 && (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center p-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-200 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No sections yet
            </h3>
            <p className="text-gray-500">
              Describe the page you want to create in the chat.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

/**
 * Renders just a single section (useful for previews)
 */
export function SectionPreview({
  section,
  isEditMode = false,
  integrations,
}: {
  section: PageSection;
  isEditMode?: boolean;
  integrations?: AIGeneratedPageSchema["integrations"];
}) {
  const SectionComponent = sectionComponents[section.type];

  if (!SectionComponent) {
    return null;
  }

  return (
    <SectionComponent
      {...section.props}
      sectionId={section.id}
      isEditMode={isEditMode}
      integrations={integrations}
    />
  );
}

/**
 * Gets the display name for a section type
 */
export function getSectionDisplayName(type: SectionType): string {
  const names: Record<SectionType, string> = {
    hero: "Hero",
    features: "Features",
    cta: "Call to Action",
    testimonials: "Testimonials",
    pricing: "Pricing",
    gallery: "Gallery",
    team: "Team",
    faq: "FAQ",
    process: "Process",
    booking: "Booking",
  };
  return names[type] || type;
}
