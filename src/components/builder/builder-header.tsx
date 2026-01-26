"use client";

/**
 * BUILDER HEADER
 *
 * Top navigation header for l4yercak3 Builder.
 * Full-width header with logo (hover for slide-out drawer), and action buttons on right.
 * No separator lines - everything belongs together.
 */

import { useState } from "react";
import Image from "next/image";
import { Share2, MoreHorizontal, Gift } from "lucide-react";
import { FaGithub } from "react-icons/fa";
import { BuilderLogoMenu } from "./builder-logo-menu";
import { BuilderUserMenu } from "./builder-user-menu";

interface BuilderHeaderProps {
  projectName?: string;
  onProjectNameChange?: (name: string) => void;
  onPublish?: () => void;
  onShare?: () => void;
}

export function BuilderHeader({
  onPublish,
  onShare,
}: BuilderHeaderProps) {
  const [isLogoMenuOpen, setIsLogoMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  return (
    <>
      <header className="h-14 flex items-center relative z-50 bg-zinc-950">
        {/* Left: Logo area - triggers slide-out drawer */}
        <div
          className="w-12 h-full flex-shrink-0 flex items-center justify-center"
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

        {/* Main header area - no border */}
        <div className="flex-1 h-full flex items-center justify-end px-4">
          {/* Right: Actions + User */}
          <div className="flex items-center gap-2">
            {/* Refer Button */}
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 text-zinc-300 text-sm font-medium rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <Gift className="w-4 h-4" />
              Refer
            </button>

            {/* Three Dot Menu */}
            <button
              className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
              title="More options"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>

            {/* GitHub Button */}
            <button
              className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
              title="View on GitHub"
              onClick={() => window.open("https://github.com", "_blank")}
            >
              <FaGithub className="w-5 h-5" />
            </button>

            {/* Share Button */}
            <button
              onClick={onShare}
              className="flex items-center gap-1.5 px-3 py-1.5 text-zinc-300 text-sm font-medium rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <Share2 className="w-4 h-4" />
              Share
            </button>

            {/* Publish Button */}
            <button
              onClick={onPublish}
              className="flex items-center px-4 py-1.5 bg-zinc-100 text-zinc-900 text-sm font-medium rounded-lg hover:bg-white transition-colors"
            >
              Publish
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
