"use client";

/**
 * BUILDER HEADER
 *
 * Top navigation header for l4yercak3 Builder.
 * Full-width header with logo (hover for slide-out drawer), and action buttons on right.
 * Includes v0-style Publish dropdown button in the top-right.
 */

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { Share2, ArrowLeft, Settings, ChevronDown } from "lucide-react";
import { BuilderLogoMenu } from "./builder-logo-menu";
import { BuilderUserMenu } from "./builder-user-menu";
import { PublishDropdown } from "./publish-dropdown";
import { useWindowManager } from "@/hooks/use-window-manager";
import { BookingWindow } from "@/components/window-content/booking-window";

interface BuilderHeaderProps {
  projectName?: string;
  onProjectNameChange?: (name: string) => void;
  onPublish?: () => void;
  onShare?: () => void;
}

export function BuilderHeader({
}: BuilderHeaderProps) {
  const [isLogoMenuOpen, setIsLogoMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isPublishOpen, setIsPublishOpen] = useState(false);
  const [publishHighlight, setPublishHighlight] = useState(false);
  const { openWindow } = useWindowManager();

  // Listen for highlight-publish-button event from connection panel
  const handleHighlight = useCallback(() => {
    setPublishHighlight(true);
    // Auto-open the dropdown after a short delay
    setTimeout(() => setIsPublishOpen(true), 400);
    // Remove highlight after animation
    setTimeout(() => setPublishHighlight(false), 3000);
  }, []);

  useEffect(() => {
    window.addEventListener("highlight-publish-button", handleHighlight);
    return () => window.removeEventListener("highlight-publish-button", handleHighlight);
  }, [handleHighlight]);

  return (
    <>
      <header className="h-14 flex items-center relative z-50 bg-zinc-950">
        {/* Left: Exit button + Logo area */}
        <div className="flex items-center h-full flex-shrink-0">
          <Link
            href="/"
            className="p-2 ml-1 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
            title="Exit to dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div
            className="w-12 h-full flex items-center justify-center"
            onMouseEnter={() => setIsLogoMenuOpen(true)}
          >
            <button
              className="flex items-center p-2 rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <Image
                src="/android-chrome-512x512.png"
                alt="l4yercak3"
                width={28}
                height={28}
                className="rounded"
              />
            </button>
          </div>
        </div>

        {/* Main header area - no border */}
        <div className="flex-1 h-full flex items-center justify-end px-4">
          {/* Right: Actions + User */}
          <div className="flex items-center gap-2">
            {/* Share button */}
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 text-zinc-400 text-sm rounded-lg hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
            >
              <Share2 className="w-4 h-4" />
              Share
            </button>

            {/* Publish Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsPublishOpen(!isPublishOpen)}
                className={`flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${
                  publishHighlight
                    ? "bg-purple-500 text-white ring-2 ring-purple-400 ring-offset-2 ring-offset-zinc-950 animate-pulse shadow-lg shadow-purple-500/30"
                    : "bg-zinc-100 text-zinc-900 hover:bg-white"
                }`}
              >
                Publish
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              {isPublishOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsPublishOpen(false)}
                  />
                  <div className="absolute top-10 right-0 z-50">
                    <PublishDropdown />
                  </div>
                </>
              )}
            </div>

            {/* Settings Gear */}
            <button
              onClick={() => {
                openWindow(
                  "booking-settings",
                  "Booking Settings",
                  <BookingWindow initialTab="settings" />,
                  { x: 150, y: 100 },
                  { width: 1100, height: 700 },
                  "ui.app.booking",
                  "📅"
                );
              }}
              className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
              title="Booking Settings"
            >
              <Settings className="w-5 h-5" />
            </button>

            {/* User Avatar Menu */}
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 via-yellow-400 to-green-400 flex items-center justify-center hover:opacity-90 transition-opacity"
              >
                {/* Colorful gradient avatar like v0 */}
              </button>

              {isUserMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsUserMenuOpen(false)}
                  />
                  <div className="absolute top-10 right-0 z-50">
                    <BuilderUserMenu onClose={() => setIsUserMenuOpen(false)} />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Slide-out drawer from left edge - UNDER the header (top-14) */}
      <div
        className={`fixed top-14 left-0 bottom-0 z-[60] transition-transform duration-200 ease-out ${
          isLogoMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        onMouseLeave={() => setIsLogoMenuOpen(false)}
      >
        <div className="h-full bg-zinc-950 shadow-2xl shadow-black/50">
          <BuilderLogoMenu onClose={() => setIsLogoMenuOpen(false)} />
        </div>
      </div>

      {/* Backdrop for drawer - also under header */}
      {isLogoMenuOpen && (
        <div
          className="fixed top-14 left-0 right-0 bottom-0 z-[55] bg-black/20"
          onClick={() => setIsLogoMenuOpen(false)}
        />
      )}
    </>
  );
}
