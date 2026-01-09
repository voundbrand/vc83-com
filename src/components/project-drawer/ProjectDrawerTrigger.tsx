"use client";

import React from "react";
import { ChevronLeft, ChevronRight, Menu } from "lucide-react";
import { useProjectDrawer } from "./ProjectDrawerProvider";

/**
 * Floating trigger button that opens the project drawer
 * Round white button with hamburger menu icon and small arrow pointing inward
 */
export function ProjectDrawerTrigger() {
  const { isOpen, toggleDrawer, config } = useProjectDrawer();

  const position = config.triggerPosition || "right";
  const offset = config.triggerOffset || 16;

  // Position styles based on config
  const positionStyles: React.CSSProperties =
    position === "right"
      ? { right: offset, left: "auto" }
      : { left: offset, right: "auto" };

  return (
    <button
      onClick={toggleDrawer}
      className="fixed z-40 group"
      style={{
        ...positionStyles,
        top: "50%",
        transform: "translateY(-50%)",
      }}
      aria-label={isOpen ? "Drawer schließen" : "Projekt-Meetings öffnen"}
    >
      {/* Main circular button */}
      <div
        className="relative flex items-center justify-center transition-all duration-200 rounded-full shadow-lg group-hover:shadow-xl bg-white border border-gray-200 group-hover:border-gray-300"
        style={{
          width: 48,
          height: 48,
        }}
      >
        {/* Icon container */}
        <div className="relative z-10 flex items-center justify-center">
          {/* Hamburger menu icon */}
          <Menu className="w-5 h-5 text-gray-600 group-hover:text-gray-800 transition-colors" />

          {/* Small arrow indicator pointing inward */}
          {position === "right" ? (
            <ChevronLeft
              className="w-3 h-3 text-gray-400 group-hover:text-gray-600 transition-all duration-200 -ml-0.5"
              style={{
                transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
              }}
            />
          ) : (
            <ChevronRight
              className="w-3 h-3 text-gray-400 group-hover:text-gray-600 transition-all duration-200 -mr-0.5"
              style={{
                transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
              }}
            />
          )}
        </div>
      </div>
    </button>
  );
}
