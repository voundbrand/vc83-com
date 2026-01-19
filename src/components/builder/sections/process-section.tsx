"use client";

/**
 * PROCESS SECTION
 *
 * Displays a process or steps flow.
 */

import { EditableText } from "@/components/project-editing";
import * as LucideIcons from "lucide-react";
import type { ProcessSectionProps, ProcessStep } from "@/lib/page-builder/section-registry";
import type { PageIntegrations } from "@/lib/page-builder/page-schema";

interface ProcessSectionComponentProps extends ProcessSectionProps {
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

function HorizontalStep({
  step,
  sectionId,
  index,
  isEditMode,
  isLast,
}: {
  step: ProcessStep;
  sectionId: string;
  index: number;
  isEditMode: boolean;
  isLast: boolean;
}) {
  const IconComponent = step.icon ? getIconComponent(step.icon) : null;

  return (
    <div className="flex-1 relative">
      {/* Connector line */}
      {!isLast && (
        <div className="hidden md:block absolute top-8 left-1/2 w-full h-0.5 bg-indigo-200" />
      )}

      <div className="relative flex flex-col items-center text-center">
        {/* Number/Icon circle */}
        <div className="w-16 h-16 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xl font-bold mb-4 relative z-10">
          {IconComponent ? (
            <IconComponent className="w-8 h-8" />
          ) : (
            step.number || index + 1
          )}
        </div>

        {/* Title */}
        {isEditMode ? (
          <EditableText
            blockId={`${sectionId}.steps.${index}.title`}
            defaultValue={step.title}
            as="h3"
            className="text-lg font-semibold text-gray-900 mb-2"
          />
        ) : (
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {step.title}
          </h3>
        )}

        {/* Description */}
        {isEditMode ? (
          <EditableText
            blockId={`${sectionId}.steps.${index}.description`}
            defaultValue={step.description}
            as="p"
            className="text-sm text-gray-600 max-w-xs"
          />
        ) : (
          <p className="text-sm text-gray-600 max-w-xs">{step.description}</p>
        )}
      </div>
    </div>
  );
}

function VerticalStep({
  step,
  sectionId,
  index,
  isEditMode,
  isLast,
}: {
  step: ProcessStep;
  sectionId: string;
  index: number;
  isEditMode: boolean;
  isLast: boolean;
}) {
  const IconComponent = step.icon ? getIconComponent(step.icon) : null;

  return (
    <div className="relative flex gap-6">
      {/* Number/Icon with connector */}
      <div className="flex flex-col items-center">
        <div className="w-12 h-12 rounded-full bg-indigo-600 text-white flex items-center justify-center text-lg font-bold flex-shrink-0">
          {IconComponent ? (
            <IconComponent className="w-6 h-6" />
          ) : (
            step.number || index + 1
          )}
        </div>
        {!isLast && <div className="w-0.5 flex-1 bg-indigo-200 my-2" />}
      </div>

      {/* Content */}
      <div className={`pb-8 ${isLast ? "" : ""}`}>
        {isEditMode ? (
          <>
            <EditableText
              blockId={`${sectionId}.steps.${index}.title`}
              defaultValue={step.title}
              as="h3"
              className="text-lg font-semibold text-gray-900 mb-2"
            />
            <EditableText
              blockId={`${sectionId}.steps.${index}.description`}
              defaultValue={step.description}
              as="p"
              className="text-gray-600"
            />
          </>
        ) : (
          <>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {step.title}
            </h3>
            <p className="text-gray-600">{step.description}</p>
          </>
        )}
      </div>
    </div>
  );
}

function AlternatingStep({
  step,
  sectionId,
  index,
  isEditMode,
  isLast,
}: {
  step: ProcessStep;
  sectionId: string;
  index: number;
  isEditMode: boolean;
  isLast: boolean;
}) {
  const IconComponent = step.icon ? getIconComponent(step.icon) : null;
  const isEven = index % 2 === 0;

  return (
    <div className="relative">
      {/* Center line */}
      {!isLast && (
        <div className="absolute left-1/2 top-12 w-0.5 h-full bg-indigo-200 -translate-x-1/2" />
      )}

      <div className={`flex items-start gap-8 ${isEven ? "flex-row" : "flex-row-reverse"}`}>
        {/* Content */}
        <div className={`flex-1 ${isEven ? "text-right" : "text-left"}`}>
          {isEditMode ? (
            <>
              <EditableText
                blockId={`${sectionId}.steps.${index}.title`}
                defaultValue={step.title}
                as="h3"
                className="text-lg font-semibold text-gray-900 mb-2"
              />
              <EditableText
                blockId={`${sectionId}.steps.${index}.description`}
                defaultValue={step.description}
                as="p"
                className="text-gray-600"
              />
            </>
          ) : (
            <>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {step.title}
              </h3>
              <p className="text-gray-600">{step.description}</p>
            </>
          )}
        </div>

        {/* Number/Icon */}
        <div className="w-12 h-12 rounded-full bg-indigo-600 text-white flex items-center justify-center text-lg font-bold flex-shrink-0 relative z-10">
          {IconComponent ? (
            <IconComponent className="w-6 h-6" />
          ) : (
            step.number || index + 1
          )}
        </div>

        {/* Empty space for alternating layout */}
        <div className="flex-1" />
      </div>
    </div>
  );
}

export function ProcessSection({
  sectionId,
  isEditMode = false,
  badge,
  title,
  subtitle,
  titleClassName = "text-3xl sm:text-4xl font-bold text-gray-900",
  subtitleClassName = "text-lg text-gray-600 mt-4 max-w-2xl mx-auto",
  backgroundClassName = "bg-gray-50 py-16 sm:py-24",
  layout = "horizontal",
  steps,
}: ProcessSectionComponentProps) {
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

        {/* Steps */}
        {layout === "horizontal" ? (
          <div className="flex flex-col md:flex-row gap-8 md:gap-4">
            {steps.map((step, index) => (
              <HorizontalStep
                key={step.id}
                step={step}
                sectionId={sectionId}
                index={index}
                isEditMode={isEditMode}
                isLast={index === steps.length - 1}
              />
            ))}
          </div>
        ) : layout === "alternating" ? (
          <div className="max-w-4xl mx-auto space-y-8">
            {steps.map((step, index) => (
              <AlternatingStep
                key={step.id}
                step={step}
                sectionId={sectionId}
                index={index}
                isEditMode={isEditMode}
                isLast={index === steps.length - 1}
              />
            ))}
          </div>
        ) : (
          <div className="max-w-2xl mx-auto">
            {steps.map((step, index) => (
              <VerticalStep
                key={step.id}
                step={step}
                sectionId={sectionId}
                index={index}
                isEditMode={isEditMode}
                isLast={index === steps.length - 1}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
