"use client";

/**
 * PAGE HEADER
 *
 * Optional navigation header for AI-generated pages.
 * Supports transparent, white, and dark variants.
 */

import type { PageHeaderConfig } from "@/lib/page-builder/page-schema";

interface PageHeaderProps extends PageHeaderConfig {
  /** Page title as fallback text */
  pageTitle?: string;
}

export function PageHeader({
  enabled = true,
  logoUrl,
  logoAlt = "Logo",
  navLinks = [],
  variant = "white",
  sticky = false,
  pageTitle,
}: PageHeaderProps) {
  // Don't render if disabled
  if (!enabled) {
    return null;
  }

  // Variant styles
  const variantStyles = {
    transparent: "bg-transparent text-white",
    white: "bg-white text-gray-900 shadow-sm",
    dark: "bg-gray-900 text-white",
  };

  const linkStyles = {
    transparent: "text-white/90 hover:text-white",
    white: "text-gray-600 hover:text-gray-900",
    dark: "text-gray-300 hover:text-white",
  };

  return (
    <header
      className={`${variantStyles[variant]} ${sticky ? "sticky top-0 z-50" : ""}`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo / Site Title */}
          <div className="flex-shrink-0">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={logoAlt}
                className="h-8 w-auto"
              />
            ) : pageTitle ? (
              <span className="text-xl font-semibold">{pageTitle}</span>
            ) : null}
          </div>

          {/* Navigation Links */}
          {navLinks.length > 0 && (
            <nav className="hidden md:flex items-center space-x-8">
              {navLinks.map((link, index) => (
                <a
                  key={index}
                  href={link.href}
                  className={`text-sm font-medium transition-colors ${linkStyles[variant]}`}
                  {...(link.isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                >
                  {link.label}
                </a>
              ))}
            </nav>
          )}

          {/* Mobile menu button (placeholder for future expansion) */}
          {navLinks.length > 0 && (
            <div className="md:hidden">
              <button
                className={`p-2 rounded-md ${linkStyles[variant]}`}
                aria-label="Open menu"
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
