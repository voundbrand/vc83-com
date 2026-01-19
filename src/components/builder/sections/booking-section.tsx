"use client";

/**
 * BOOKING SECTION
 *
 * Placeholder for booking widget integration.
 * Will be expanded to support date pickers, guest selectors, etc.
 */

import type { BookingSectionProps } from "@/lib/page-builder/section-registry";

interface BookingSectionComponentProps extends BookingSectionProps {
  sectionId: string;
  isEditMode?: boolean;
}

export function BookingSection({
  sectionId,
  title,
  resourceId,
  showPricing,
  pricePerUnit,
  priceUnit,
  layout = "card",
  isEditMode,
}: BookingSectionComponentProps) {
  return (
    <section
      id={sectionId}
      className="py-16 sm:py-24 bg-white"
      data-section-type="booking"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {title && (
          <h2 className="text-3xl font-bold text-center mb-8">{title}</h2>
        )}

        <div
          className={`max-w-md mx-auto p-6 border rounded-lg shadow-sm ${
            layout === "card" ? "bg-white" : "bg-gray-50"
          }`}
        >
          <p className="text-gray-600 text-center mb-4">
            Booking Widget Placeholder
          </p>
          <p className="text-sm text-gray-500 text-center">
            Resource ID: {resourceId || "Not configured"}
          </p>
          {showPricing && pricePerUnit && (
            <p className="text-lg font-semibold text-center mt-4">
              ${pricePerUnit} / {priceUnit || "unit"}
            </p>
          )}
          {isEditMode && (
            <p className="text-xs text-amber-600 text-center mt-2">
              Edit mode: Configure booking settings in the sidebar
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
