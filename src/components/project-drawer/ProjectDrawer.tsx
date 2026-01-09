"use client";

import React, { useEffect } from "react";
import { X, LogOut } from "lucide-react";
import { useProjectDrawer } from "./ProjectDrawerProvider";
import { MeetingList } from "./MeetingList";
import { LoginPrompt } from "./LoginPrompt";

/**
 * Slide-out drawer panel that displays project meetings
 * Slides in from the configured side (default: right)
 */
export function ProjectDrawer() {
  const {
    isOpen,
    closeDrawer,
    themeColors,
    config,
    isAuthenticated,
    logout,
    session,
  } = useProjectDrawer();

  const position = config.triggerPosition || "right";
  const drawerTitle = config.drawerTitle || "Projekt-Meetings";

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        closeDrawer();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, closeDrawer]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className={`fixed inset-0 z-40 transition-opacity duration-300 ${
          isOpen ? "opacity-50 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        style={{ backgroundColor: "black" }}
        onClick={closeDrawer}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        className={`fixed top-0 bottom-0 z-50 flex flex-col transition-transform duration-300 ease-out ${
          position === "right" ? "right-0" : "left-0"
        }`}
        style={{
          width: "min(400px, 100vw)",
          backgroundColor: "white",
          boxShadow: isOpen
            ? position === "right"
              ? "-4px 0 24px rgba(0,0,0,0.15)"
              : "4px 0 24px rgba(0,0,0,0.15)"
            : "none",
          transform: isOpen
            ? "translateX(0)"
            : position === "right"
            ? "translateX(100%)"
            : "translateX(-100%)",
        }}
        role="dialog"
        aria-modal="true"
        aria-label={drawerTitle}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b shrink-0"
          style={{
            backgroundColor: themeColors.background,
            borderColor: themeColors.border,
          }}
        >
          <h2
            className="text-lg font-semibold"
            style={{ color: themeColors.accent }}
          >
            {drawerTitle}
          </h2>

          <div className="flex items-center gap-2">
            {/* Logout button (when authenticated) */}
            {isAuthenticated && (
              <button
                onClick={logout}
                className="p-2 transition-colors rounded hover:bg-gray-100"
                title={`Abmelden (${session?.contactEmail})`}
                aria-label="Abmelden"
              >
                <LogOut className="w-5 h-5 text-gray-500" />
              </button>
            )}

            {/* Close button */}
            <button
              onClick={closeDrawer}
              className="p-2 transition-colors rounded hover:bg-gray-100"
              aria-label="Schließen"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {isAuthenticated ? (
            <MeetingList />
          ) : (
            <LoginPrompt />
          )}
        </div>

        {/* Footer */}
        <div
          className="px-4 py-2 text-xs text-center border-t shrink-0"
          style={{
            backgroundColor: themeColors.background,
            borderColor: themeColors.border,
            color: themeColors.accent,
            opacity: 0.7,
          }}
        >
          Powered by l4yercak3
        </div>
      </div>
    </>
  );
}
