"use client";

/**
 * FEATURES SECTION
 *
 * A grid or list of features/benefits with icons.
 * Supports 2, 3, 4 column grids or a vertical list layout.
 */

import { EditableText } from "@/components/project-editing";
import * as LucideIcons from "lucide-react";
import type {
  FeaturesSectionProps,
  FeatureItem,
} from "@/lib/page-builder/section-registry";
import type { PageIntegrations } from "@/lib/page-builder/page-schema";

interface FeaturesSectionComponentProps extends FeaturesSectionProps {
  sectionId: string;
  isEditMode?: boolean;
  integrations?: PageIntegrations;
}

// Get icon component from Lucide by name
function getIconComponent(iconName: string): React.ComponentType<{ className?: string }> | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const icons = LucideIcons as unknown as Record<string, React.ComponentType<any>>;
  return icons[iconName] || null;
}

// Single feature card
function FeatureCard({
  feature,
  sectionId,
  featureIndex,
  isEditMode,
}: {
  feature: FeatureItem;
  sectionId: string;
  featureIndex: number;
  isEditMode: boolean;
}) {
  const IconComponent = feature.icon ? getIconComponent(feature.icon) : null;

  return (
    <div className="relative p-6 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      {/* Icon */}
      {IconComponent && (
        <div
          className={
            feature.iconClassName ||
            "w-12 h-12 flex items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 mb-4"
          }
        >
          <IconComponent className="w-6 h-6" />
        </div>
      )}

      {/* Title */}
      {isEditMode ? (
        <EditableText
          blockId={`${sectionId}.features.${featureIndex}.title`}
          defaultValue={feature.title}
          as="h3"
          className={
            feature.titleClassName ||
            "text-lg font-semibold text-gray-900 mb-2"
          }
          sectionId={sectionId}
          blockLabel={`Feature ${featureIndex + 1} Title`}
        />
      ) : (
        <h3
          className={
            feature.titleClassName ||
            "text-lg font-semibold text-gray-900 mb-2"
          }
        >
          {feature.title}
        </h3>
      )}

      {/* Description */}
      {isEditMode ? (
        <EditableText
          blockId={`${sectionId}.features.${featureIndex}.description`}
          defaultValue={feature.description}
          as="p"
          className={
            feature.descriptionClassName || "text-gray-600 leading-relaxed"
          }
          sectionId={sectionId}
          blockLabel={`Feature ${featureIndex + 1} Description`}
        />
      ) : (
        <p
          className={
            feature.descriptionClassName || "text-gray-600 leading-relaxed"
          }
        >
          {feature.description}
        </p>
      )}
    </div>
  );
}

// List layout feature item
function FeatureListItem({
  feature,
  sectionId,
  featureIndex,
  isEditMode,
}: {
  feature: FeatureItem;
  sectionId: string;
  featureIndex: number;
  isEditMode: boolean;
}) {
  const IconComponent = feature.icon ? getIconComponent(feature.icon) : null;

  return (
    <div className="flex gap-4 items-start">
      {/* Icon */}
      {IconComponent && (
        <div
          className={
            feature.iconClassName ||
            "w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-lg bg-indigo-50 text-indigo-600"
          }
        >
          <IconComponent className="w-5 h-5" />
        </div>
      )}

      <div className="flex-1">
        {/* Title */}
        {isEditMode ? (
          <EditableText
            blockId={`${sectionId}.features.${featureIndex}.title`}
            defaultValue={feature.title}
            as="h3"
            className={
              feature.titleClassName ||
              "text-base font-semibold text-gray-900 mb-1"
            }
            sectionId={sectionId}
            blockLabel={`Feature ${featureIndex + 1} Title`}
          />
        ) : (
          <h3
            className={
              feature.titleClassName ||
              "text-base font-semibold text-gray-900 mb-1"
            }
          >
            {feature.title}
          </h3>
        )}

        {/* Description */}
        {isEditMode ? (
          <EditableText
            blockId={`${sectionId}.features.${featureIndex}.description`}
            defaultValue={feature.description}
            as="p"
            className={feature.descriptionClassName || "text-gray-600 text-sm"}
            sectionId={sectionId}
            blockLabel={`Feature ${featureIndex + 1} Description`}
          />
        ) : (
          <p className={feature.descriptionClassName || "text-gray-600 text-sm"}>
            {feature.description}
          </p>
        )}
      </div>
    </div>
  );
}

export function FeaturesSection({
  sectionId,
  badge,
  title,
  subtitle,
  titleClassName = "text-3xl sm:text-4xl font-bold text-gray-900",
  subtitleClassName = "text-lg text-gray-600 mt-4 max-w-2xl mx-auto",
  backgroundClassName = "bg-gray-50 py-16 sm:py-24",
  layout = "grid-3",
  features,
  isEditMode = false,
}: FeaturesSectionComponentProps) {
  // Grid classes based on layout
  const gridClasses: Record<string, string> = {
    "grid-2": "grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8",
    "grid-3": "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8",
    "grid-4": "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6",
    list: "flex flex-col gap-6 max-w-2xl mx-auto",
  };

  const isList = layout === "list";

  return (
    <section className={backgroundClassName}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12 lg:mb-16">
          {/* Badge */}
          {badge && (
            <div className="mb-4">
              {isEditMode ? (
                <EditableText
                  blockId={`${sectionId}.badge`}
                  defaultValue={badge}
                  as="span"
                  className="inline-block text-sm font-semibold text-indigo-600 uppercase tracking-wide"
                  sectionId={sectionId}
                  blockLabel="Features Badge"
                />
              ) : (
                <span className="inline-block text-sm font-semibold text-indigo-600 uppercase tracking-wide">
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
              as="h2"
              className={titleClassName}
              sectionId={sectionId}
              blockLabel="Features Title"
            />
          ) : (
            <h2 className={titleClassName}>{title}</h2>
          )}

          {/* Subtitle */}
          {subtitle && (
            <div className="max-w-2xl mx-auto">
              {isEditMode ? (
                <EditableText
                  blockId={`${sectionId}.subtitle`}
                  defaultValue={subtitle}
                  as="p"
                  className={subtitleClassName}
                  sectionId={sectionId}
                  blockLabel="Features Subtitle"
                />
              ) : (
                <p className={subtitleClassName}>{subtitle}</p>
              )}
            </div>
          )}
        </div>

        {/* Features Grid/List */}
        <div className={gridClasses[layout] || gridClasses["grid-3"]}>
          {features.map((feature, index) =>
            isList ? (
              <FeatureListItem
                key={feature.id}
                feature={feature}
                sectionId={sectionId}
                featureIndex={index}
                isEditMode={isEditMode}
              />
            ) : (
              <FeatureCard
                key={feature.id}
                feature={feature}
                sectionId={sectionId}
                featureIndex={index}
                isEditMode={isEditMode}
              />
            )
          )}
        </div>
      </div>
    </section>
  );
}
