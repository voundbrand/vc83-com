"use client";

/**
 * SECTION PROPERTIES PANEL
 *
 * Editable properties panel for the selected section.
 * Shows toggles and inputs based on section type.
 */

import { useBuilder } from "@/contexts/builder-context";
import { X, Eye, EyeOff } from "lucide-react";
import type { PageSection, HeroSectionProps } from "@/lib/page-builder/section-registry";

export function SectionPropertiesPanel() {
  const { pageSchema, setPageSchema, selectedSectionId, setSelectedSectionId, isEditMode } = useBuilder();

  // Only show when section is selected and in edit mode
  if (!selectedSectionId || !pageSchema || !isEditMode) {
    return null;
  }

  // Find the selected section
  const sectionIndex = pageSchema.sections.findIndex((s) => s.id === selectedSectionId);
  const section = pageSchema.sections[sectionIndex];

  if (!section) {
    return null;
  }

  // Update a section property
  const updateSectionProp = (key: string, value: unknown) => {
    const updatedSections = [...pageSchema.sections];
    updatedSections[sectionIndex] = {
      ...section,
      props: {
        ...section.props,
        [key]: value,
      },
    } as PageSection;

    setPageSchema({
      ...pageSchema,
      sections: updatedSections,
      revisions: [
        ...pageSchema.revisions,
        {
          at: Date.now(),
          by: "user",
          summary: `Updated ${section.type} section: ${key}`,
        },
      ],
    });
  };

  // Render properties based on section type
  const renderProperties = () => {
    switch (section.type) {
      case "hero":
        return <HeroProperties props={section.props as HeroSectionProps} onUpdate={updateSectionProp} />;
      // Add more section types as needed
      default:
        return (
          <p className="text-sm text-gray-500">
            No editable properties for this section type yet.
          </p>
        );
    }
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-20">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-indigo-600" />
          <span className="text-sm font-medium text-gray-900">
            {section.type.charAt(0).toUpperCase() + section.type.slice(1)} Properties
          </span>
        </div>
        <button
          onClick={() => setSelectedSectionId(null)}
          className="p-1 text-gray-400 hover:text-gray-600 rounded"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Properties */}
      <div className="p-4 max-h-48 overflow-y-auto">
        {renderProperties()}
      </div>
    </div>
  );
}

// ============================================================================
// HERO PROPERTIES
// ============================================================================

interface HeroPropertiesProps {
  props: HeroSectionProps;
  onUpdate: (key: string, value: unknown) => void;
}

function HeroProperties({ props, onUpdate }: HeroPropertiesProps) {
  return (
    <div className="space-y-3">
      {/* Show Title Toggle */}
      <div className="flex items-center justify-between">
        <label className="text-sm text-gray-700">Show Title</label>
        <button
          onClick={() => onUpdate("showTitle", props.showTitle === false ? true : false)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
            props.showTitle !== false
              ? "bg-indigo-100 text-indigo-700"
              : "bg-gray-100 text-gray-500"
          }`}
        >
          {props.showTitle !== false ? (
            <>
              <Eye className="w-3.5 h-3.5" />
              Visible
            </>
          ) : (
            <>
              <EyeOff className="w-3.5 h-3.5" />
              Hidden
            </>
          )}
        </button>
      </div>

      {/* Show Subtitle Toggle */}
      <div className="flex items-center justify-between">
        <label className="text-sm text-gray-700">Show Subtitle</label>
        <button
          onClick={() => onUpdate("showSubtitle", props.showSubtitle === false ? true : false)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
            props.showSubtitle !== false
              ? "bg-indigo-100 text-indigo-700"
              : "bg-gray-100 text-gray-500"
          }`}
        >
          {props.showSubtitle !== false ? (
            <>
              <Eye className="w-3.5 h-3.5" />
              Visible
            </>
          ) : (
            <>
              <EyeOff className="w-3.5 h-3.5" />
              Hidden
            </>
          )}
        </button>
      </div>

      {/* Alignment */}
      <div className="flex items-center justify-between">
        <label className="text-sm text-gray-700">Alignment</label>
        <div className="flex gap-1 bg-gray-100 rounded-md p-0.5">
          {(["left", "center", "right"] as const).map((align) => (
            <button
              key={align}
              onClick={() => onUpdate("alignment", align)}
              className={`px-3 py-1 rounded text-xs capitalize transition-colors ${
                (props.alignment || "center") === align
                  ? "bg-white text-indigo-600 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {align}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
