"use client";

/**
 * BUILDER PREVIEW PANEL
 *
 * Live preview of the AI-generated page.
 * Shows the rendered page with device viewport toggles.
 * Intercepts link clicks for multi-page prototype navigation.
 */

import { useState, useEffect, useCallback, type ReactNode } from "react";
import { useBuilder } from "@/contexts/builder-context";
import { PageRenderer } from "./page-renderer";
import { SectionPropertiesPanel } from "./section-properties-panel";
import {
  Monitor,
  Tablet,
  Smartphone,
  Edit3,
  Eye,
  ExternalLink,
  ArrowLeft,
} from "lucide-react";

// Thinking phrases that cycle during generation (matches chat panel)
const thinkingPhrases = [
  "Thinking...",
  "Building...",
  "Designing...",
  "Creating...",
  "Generating...",
];

type DeviceMode = "desktop" | "tablet" | "mobile";

const deviceWidths: Record<DeviceMode, string> = {
  desktop: "100%",
  tablet: "768px",
  mobile: "375px",
};

// Enhanced loading state component for the preview panel
function PreviewLoadingState() {
  const [phraseIndex, setPhraseIndex] = useState(0);

  // Cycle through phrases
  useEffect(() => {
    const interval = setInterval(() => {
      setPhraseIndex((prev) => (prev + 1) % thinkingPhrases.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center">
        {/* Animated rings around logo */}
        <div className="relative w-32 h-32 mx-auto mb-6">
          {/* Outer pulsing ring */}
          <div className="absolute inset-0 rounded-full border-2 border-purple-500/20 animate-ping" />
          {/* Middle pulsing ring */}
          <div className="absolute inset-4 rounded-full border-2 border-purple-500/30 animate-pulse" />
          {/* Inner circle with spinning logo */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative">
              <img
                src="/android-chrome-512x512.png"
                alt=""
                className="w-16 h-16 rounded-lg animate-spin"
                style={{ animationDuration: "3s" }}
              />
              {/* Glow effect */}
              <div className="absolute inset-0 rounded-lg bg-purple-500/20 blur-xl animate-pulse" />
            </div>
          </div>
        </div>
        {/* Shimmering text */}
        <p
          className="text-xl font-medium bg-gradient-to-r from-purple-400 via-zinc-200 to-purple-400 bg-clip-text text-transparent bg-[length:200%_100%] mb-2"
          style={{
            animation: "shimmer 2s linear infinite",
          }}
        >
          {thinkingPhrases[phraseIndex]}
        </p>
        <p className="text-zinc-500 text-sm">This usually takes a few seconds</p>
      </div>
      {/* Inline keyframes for shimmer animation */}
      <style jsx>{`
        @keyframes shimmer {
          0% { background-position: 100% 0; }
          100% { background-position: -100% 0; }
        }
      `}</style>
    </div>
  );
}

/**
 * Link Interception Wrapper
 *
 * Wraps the preview content and intercepts link clicks to enable
 * navigation between pages within the prototype.
 */
interface LinkInterceptorProps {
  children: ReactNode;
  onNavigate: (slug: string) => boolean;
  onExternalLink?: (url: string) => void;
}

function LinkInterceptor({ children, onNavigate, onExternalLink }: LinkInterceptorProps) {
  const handleClick = useCallback((e: React.MouseEvent) => {
    // Find the closest anchor element
    const target = e.target as HTMLElement;
    const link = target.closest("a");

    if (!link) return;

    const href = link.getAttribute("href");
    if (!href) return;

    // Handle anchor links (scroll within page)
    if (href.startsWith("#")) {
      e.preventDefault();
      const element = document.getElementById(href.slice(1));
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
      return;
    }

    // Handle external links (open in new tab)
    if (href.startsWith("http://") || href.startsWith("https://")) {
      e.preventDefault();
      onExternalLink?.(href);
      window.open(href, "_blank", "noopener,noreferrer");
      return;
    }

    // Handle internal page links (e.g., "/about", "/checkout")
    if (href.startsWith("/")) {
      e.preventDefault();
      const slug = href.slice(1); // Remove leading slash
      const navigated = onNavigate(slug);
      if (!navigated) {
        console.log(`[Preview] Page not found: ${slug}`);
      }
      return;
    }

    // Prevent default for any other links in prototype mode
    e.preventDefault();
  }, [onNavigate, onExternalLink]);

  return (
    <div onClick={handleClick}>
      {children}
    </div>
  );
}

export function BuilderPreviewPanel() {
  const {
    pageSchema,
    selectedSectionId,
    setSelectedSectionId,
    isEditMode,
    setIsEditMode,
    isGenerating,
    conversationId,
    pages,
    currentPageId,
    navigateToPageBySlug,
    setCurrentPage,
  } = useBuilder();

  const [deviceMode, setDeviceMode] = useState<DeviceMode>("desktop");

  // Navigation history for back button
  const [navigationHistory, setNavigationHistory] = useState<string[]>([]);

  // Handle page navigation from link clicks
  const handleNavigate = useCallback((slug: string): boolean => {
    // Save current page to history before navigating
    if (currentPageId) {
      setNavigationHistory(prev => [...prev, currentPageId]);
    }
    return navigateToPageBySlug(slug);
  }, [currentPageId, navigateToPageBySlug]);

  // Handle back navigation
  const handleBack = useCallback(() => {
    if (navigationHistory.length > 0) {
      const previousPageId = navigationHistory[navigationHistory.length - 1];
      setNavigationHistory(prev => prev.slice(0, -1));
      setCurrentPage(previousPageId);
    }
  }, [navigationHistory, setCurrentPage]);

  // Track previous generating state for completion detection
  const [wasGenerating, setWasGenerating] = useState(false);
  const [showCompletionToast, setShowCompletionToast] = useState(false);

  // Play notification sound and show toast when generation completes
  useEffect(() => {
    if (wasGenerating && !isGenerating && pageSchema) {
      // Generation just completed with a valid page
      setShowCompletionToast(true);

      // Play notification sound
      try {
        const audio = new Audio("/sounds/notification.mp3");
        audio.volume = 0.3;
        audio.play().catch(() => {
          // Fallback: use Web Audio API for a simple beep if file doesn't exist
          const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          oscillator.frequency.value = 800;
          oscillator.type = "sine";
          gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.3);
        });
      } catch {
        // Audio not supported, silently ignore
      }

      // Hide toast after 2 seconds
      setTimeout(() => setShowCompletionToast(false), 2000);
    }
    setWasGenerating(isGenerating);
  }, [isGenerating, wasGenerating, pageSchema]);

  // Debug logging for preview panel state
  useEffect(() => {
    console.log("[Preview] State changed:", {
      hasPageSchema: !!pageSchema,
      isGenerating,
      sectionCount: pageSchema?.sections?.length ?? 0,
      metadata: pageSchema?.metadata,
      pageCount: pages.length,
      currentPageId,
    });
  }, [pageSchema, isGenerating, pages.length, currentPageId]);

  return (
    <div className="h-full flex flex-col bg-zinc-900 overflow-hidden">
      {/* Toolbar - fixed at top */}
      <div className="flex-shrink-0 px-4 py-2 border-b border-zinc-700 flex items-center justify-between">
        {/* Device toggles */}
        <div className="flex items-center gap-1 bg-zinc-800 rounded-lg p-1">
          <button
            onClick={() => setDeviceMode("desktop")}
            className={`p-2 rounded-md transition-colors ${
              deviceMode === "desktop"
                ? "bg-zinc-700 text-purple-400 shadow-sm"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
            title="Desktop view"
          >
            <Monitor className="w-4 h-4" />
          </button>
          <button
            onClick={() => setDeviceMode("tablet")}
            className={`p-2 rounded-md transition-colors ${
              deviceMode === "tablet"
                ? "bg-zinc-700 text-purple-400 shadow-sm"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
            title="Tablet view"
          >
            <Tablet className="w-4 h-4" />
          </button>
          <button
            onClick={() => setDeviceMode("mobile")}
            className={`p-2 rounded-md transition-colors ${
              deviceMode === "mobile"
                ? "bg-zinc-700 text-purple-400 shadow-sm"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
            title="Mobile view"
          >
            <Smartphone className="w-4 h-4" />
          </button>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-2">
          {/* Edit/Preview toggle */}
          {pageSchema && (
            <div className="flex items-center gap-1 bg-zinc-800 rounded-lg p-1">
              <button
                onClick={() => setIsEditMode(false)}
                className={`px-3 py-1.5 rounded-md text-sm transition-colors flex items-center gap-1.5 ${
                  !isEditMode
                    ? "bg-zinc-700 text-purple-400 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                Preview
              </button>
              <button
                onClick={() => setIsEditMode(true)}
                className={`px-3 py-1.5 rounded-md text-sm transition-colors flex items-center gap-1.5 ${
                  isEditMode
                    ? "bg-zinc-700 text-purple-400 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                Edit
              </button>
            </div>
          )}

          {/* Open preview in new tab */}
          {pageSchema && conversationId && (
            <button
              onClick={() => window.open(`/preview/${conversationId}`, '_blank')}
              className="p-2 text-zinc-500 hover:text-purple-400 transition-colors"
              title="Open preview in new tab"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Preview area - scrollable content */}
      <div className="flex-1 min-h-0 overflow-auto bg-zinc-900 relative">
        {/* Completion toast notification */}
        {showCompletionToast && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg shadow-lg">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="font-medium">Design updated!</span>
            </div>
          </div>
        )}

        {/* Loading overlay for when editing existing page */}
        {isGenerating && pageSchema && (
          <div className="absolute inset-0 z-40 bg-zinc-900/80 backdrop-blur-sm flex items-center justify-center">
            <div className="text-center">
              <div className="relative w-20 h-20 mx-auto mb-4">
                <div className="absolute inset-0 rounded-full border-2 border-purple-500/30 animate-ping" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <img
                    src="/android-chrome-512x512.png"
                    alt=""
                    className="w-12 h-12 rounded-lg animate-spin"
                    style={{ animationDuration: "2s" }}
                  />
                </div>
              </div>
              <p className="text-purple-400 font-medium animate-pulse">Updating design...</p>
            </div>
          </div>
        )}

        {/* Loading state - enhanced with spinning logo and shimmering text */}
        {isGenerating && !pageSchema && (
          <PreviewLoadingState />
        )}

        {/* Empty state - engaging design */}
        {!isGenerating && !pageSchema && (
          <div className="h-full flex items-center justify-center relative overflow-hidden">
            {/* Animated background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-900/10 via-zinc-900 to-blue-900/10" />

            {/* Floating shapes animation */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {/* Shape 1 */}
              <div
                className="absolute w-64 h-64 rounded-full bg-purple-500/5 blur-3xl"
                style={{
                  top: '20%',
                  left: '10%',
                  animation: 'float 8s ease-in-out infinite',
                }}
              />
              {/* Shape 2 */}
              <div
                className="absolute w-48 h-48 rounded-full bg-blue-500/5 blur-3xl"
                style={{
                  top: '60%',
                  right: '15%',
                  animation: 'float 6s ease-in-out infinite reverse',
                }}
              />
              {/* Shape 3 */}
              <div
                className="absolute w-32 h-32 rounded-full bg-pink-500/5 blur-2xl"
                style={{
                  bottom: '30%',
                  left: '30%',
                  animation: 'float 10s ease-in-out infinite',
                }}
              />
            </div>

            {/* Content */}
            <div className="text-center p-8 relative z-10">
              {/* Logo with glow */}
              <div className="relative w-20 h-20 mx-auto mb-8">
                <div className="absolute inset-0 rounded-2xl bg-purple-500/20 blur-xl animate-pulse" />
                <img
                  src="/android-chrome-512x512.png"
                  alt="l4yercak3"
                  className="w-20 h-20 rounded-2xl relative z-10"
                />
              </div>

              <h3 className="text-2xl font-semibold text-zinc-100 mb-3">
                Ready to create
              </h3>
              <p className="text-zinc-400 text-sm max-w-sm mx-auto mb-6">
                Describe your landing page in the chat and watch it come to life.
                The AI will design and build it for you.
              </p>

              {/* Feature hints */}
              <div className="flex flex-wrap justify-center gap-2 max-w-md mx-auto">
                <span className="px-3 py-1 bg-zinc-800/50 border border-zinc-700/50 rounded-full text-xs text-zinc-400">
                  Hero sections
                </span>
                <span className="px-3 py-1 bg-zinc-800/50 border border-zinc-700/50 rounded-full text-xs text-zinc-400">
                  Features
                </span>
                <span className="px-3 py-1 bg-zinc-800/50 border border-zinc-700/50 rounded-full text-xs text-zinc-400">
                  Pricing tables
                </span>
                <span className="px-3 py-1 bg-zinc-800/50 border border-zinc-700/50 rounded-full text-xs text-zinc-400">
                  Contact forms
                </span>
                <span className="px-3 py-1 bg-zinc-800/50 border border-zinc-700/50 rounded-full text-xs text-zinc-400">
                  Testimonials
                </span>
              </div>
            </div>

            {/* CSS for float animation */}
            <style jsx>{`
              @keyframes float {
                0%, 100% { transform: translateY(0px) rotate(0deg); }
                50% { transform: translateY(-20px) rotate(5deg); }
              }
            `}</style>
          </div>
        )}

        {/* Rendered page - only show container when there's content */}
        {pageSchema && (
          <div className="p-4">
            {/* Back button when there's navigation history */}
            {navigationHistory.length > 0 && (
              <div className="mb-2 flex justify-start">
                <button
                  onClick={handleBack}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
              </div>
            )}

            {/* Current page indicator (when multiple pages exist) */}
            {pages.length > 1 && currentPageId && (
              <div className="mb-2 text-center">
                <span className="text-xs text-zinc-500">
                  Viewing: <span className="text-zinc-400">{pages.find(p => p.id === currentPageId)?.name || "Unknown"}</span>
                  {" "}({pages.find(p => p.id === currentPageId)?.slug})
                </span>
              </div>
            )}

            <LinkInterceptor onNavigate={handleNavigate}>
              <div
                className="mx-auto bg-white shadow-2xl rounded-lg overflow-hidden transition-all duration-300"
                style={{
                  width: deviceWidths[deviceMode],
                  maxWidth: "100%",
                  minHeight: deviceMode === "desktop" ? "calc(100vh - 200px)" : "600px",
                }}
              >
                <PageRenderer
                  schema={pageSchema}
                  selectedSectionId={selectedSectionId}
                  isEditMode={isEditMode}
                  onSectionClick={setSelectedSectionId}
                />
              </div>
            </LinkInterceptor>
          </div>
        )}
      </div>

      {/* Section properties panel (in edit mode) OR info bar (in preview mode) */}
      {selectedSectionId && pageSchema && isEditMode ? (
        <SectionPropertiesPanel />
      ) : selectedSectionId && pageSchema ? (
        <div className="px-4 py-2 border-t border-zinc-700 bg-purple-900/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-purple-500" />
            <span className="text-sm text-purple-200">
              Section selected:{" "}
              <span className="font-medium">
                {pageSchema.sections.find((s) => s.id === selectedSectionId)
                  ?.type || selectedSectionId}
              </span>
            </span>
          </div>
          <button
            onClick={() => setSelectedSectionId(null)}
            className="text-sm text-purple-400 hover:text-purple-300"
          >
            Clear selection
          </button>
        </div>
      ) : null}
    </div>
  );
}
