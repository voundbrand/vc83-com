"use client";

/**
 * CTA BUTTON
 *
 * A smart button component that handles different action types:
 * - link: Standard navigation
 * - booking: Opens booking modal
 * - form: Opens form modal
 * - scroll: Smooth scrolls to section
 * - contact: Opens contact form → CRM
 */

import { useState } from "react";
import type { CTAConfig, CTAActionType } from "@/lib/page-builder/section-registry";

interface CTAButtonProps extends CTAConfig {
  integrations?: {
    bookingResources?: string[];
    forms?: string[];
    contactEmail?: string;
  };
}

export function CTAButton({
  text,
  href,
  actionType = "link",
  variant = "primary",
  className = "",
  bookingResourceId,
  formId,
  contactEmail,
  integrations,
}: CTAButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  // Base styles by variant
  const variantStyles: Record<string, string> = {
    primary:
      "bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg hover:shadow-xl",
    secondary:
      "bg-white hover:bg-gray-50 text-gray-900 border border-gray-200 shadow-sm hover:shadow",
    outline:
      "bg-transparent hover:bg-white/10 text-current border-2 border-current",
  };

  const baseStyles = `inline-flex items-center justify-center px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${variantStyles[variant] || variantStyles.primary} ${className}`;

  const handleClick = async () => {
    setIsLoading(true);

    try {
      switch (actionType) {
        case "booking":
          // Get resource ID from props or integrations
          const resourceId =
            bookingResourceId || integrations?.bookingResources?.[0];
          if (resourceId) {
            // Dispatch custom event for booking modal
            window.dispatchEvent(
              new CustomEvent("openBookingModal", {
                detail: { resourceId },
              })
            );
          } else {
            console.warn("No booking resource ID configured");
          }
          break;

        case "form":
          // Get form ID from props or integrations
          const fId = formId || integrations?.forms?.[0];
          if (fId) {
            // Dispatch custom event for form modal
            window.dispatchEvent(
              new CustomEvent("openFormModal", {
                detail: { formId: fId },
              })
            );
          } else {
            console.warn("No form ID configured");
          }
          break;

        case "scroll":
          if (href?.startsWith("#")) {
            const element = document.querySelector(href);
            if (element) {
              element.scrollIntoView({ behavior: "smooth", block: "start" });
            }
          }
          break;

        case "contact":
          // Dispatch custom event for contact form
          window.dispatchEvent(
            new CustomEvent("openContactForm", {
              detail: {
                email: contactEmail || integrations?.contactEmail,
              },
            })
          );
          break;

        case "link":
        default:
          if (href) {
            // Check if external link
            if (href.startsWith("http://") || href.startsWith("https://")) {
              window.open(href, "_blank", "noopener,noreferrer");
            } else {
              window.location.href = href;
            }
          }
          break;
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className={baseStyles}
      aria-busy={isLoading}
    >
      {isLoading ? (
        <span className="inline-flex items-center gap-2">
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Loading...
        </span>
      ) : (
        text
      )}
    </button>
  );
}

/**
 * Helper to get action icon (optional, for visual hints)
 */
export function getActionIcon(actionType: CTAActionType): string | null {
  const icons: Record<CTAActionType, string> = {
    link: "ExternalLink",
    booking: "Calendar",
    form: "FileText",
    scroll: "ArrowDown",
    contact: "Mail",
  };
  return icons[actionType] || null;
}
