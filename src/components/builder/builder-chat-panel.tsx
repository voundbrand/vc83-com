"use client";

/**
 * BUILDER CHAT PANEL
 *
 * Chat interface for the AI page builder.
 * Shows conversation history and input for prompts.
 */

import { useState, useRef, useEffect, useMemo } from "react";
import { useBuilder } from "@/contexts/builder-context";
import {
  Send,
  Save,
  RefreshCw,
  AlertCircle,
  ThumbsUp,
  ThumbsDown,
  Sparkles,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Check,
  X,
  FileText,
  Zap,
  Copy,
  MoreHorizontal,
  Mail,
  Link as LinkIcon,
  MessageSquare,
  Palette,
  Plug,
  Variable,
  ScrollText,
  Settings,
  Clock,
  Loader2,
  Paperclip,
  Activity,
  Rocket,
  Wrench,
  GitBranch,
  FolderOpen,
} from "lucide-react";
import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { Id } from "@/../convex/_generated/dataModel";
import { FileExplorerPanel } from "./file-explorer-panel";

// ============================================================================
// COLLAPSED SIDEBAR (v0-style icon menu)
// ============================================================================

interface SidebarItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick?: () => void;
  active?: boolean;
}

function CollapsedSidebar({
  activeTab,
  onTabChange,
  currentMode,
  onModeChange,
  canConnect,
}: {
  activeTab: string;
  onTabChange: (tab: string) => void;
  currentMode: BuilderUIMode;
  onModeChange: (mode: BuilderUIMode) => void;
  canConnect?: boolean;
}) {
  const sidebarItems: SidebarItem[] = [
    { icon: MessageSquare, label: "Chat", active: activeTab === "chat" },
    { icon: Palette, label: "Design", active: activeTab === "design" },
    { icon: FolderOpen, label: "Files", active: activeTab === "files" },
    { icon: Variable, label: "Vars", active: activeTab === "vars" },
    { icon: ScrollText, label: "Rules", active: activeTab === "rules" },
    { icon: Settings, label: "Settings", active: activeTab === "settings" },
  ];

  const handleContactSupport = () => {
    window.location.href = "mailto:support@l4yercak3.com";
  };

  // Get mode icon and color for the sidebar button
  const getModeDisplay = () => {
    switch (currentMode) {
      case "connect":
        return { icon: <Plug className="w-5 h-5 mb-0.5" />, label: "Connect", color: "text-emerald-400 bg-emerald-500/10" };
      case "publish":
        return { icon: <Rocket className="w-5 h-5 mb-0.5" />, label: "Publish", color: "text-amber-400 bg-amber-500/10" };
      case "docs":
        return { icon: <FileText className="w-5 h-5 mb-0.5" />, label: "Docs", color: "text-purple-400 bg-purple-500/10" };
      case "setup":
        return { icon: <Sparkles className="w-5 h-5 mb-0.5" />, label: "Setup", color: "text-cyan-400 bg-cyan-500/10" };
      default:
        return { icon: <Zap className="w-5 h-5 mb-0.5" />, label: "Build", color: "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900" };
    }
  };

  const modeDisplay = getModeDisplay();

  return (
    <div className="w-12 h-full flex-shrink-0 bg-zinc-950 flex flex-col">
      {/* Main nav items */}
      <div className="flex-1">
        {sidebarItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              onClick={() => onTabChange(item.label.toLowerCase())}
              className={`w-full flex flex-col items-center justify-center py-3 px-1 text-[10px] transition-colors ${
                item.active
                  ? "text-white bg-zinc-800"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900"
              }`}
              title={item.label}
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span>{item.label}</span>
            </button>
          );
        })}

        {/* Separator */}
        <div className="mx-2 my-2 border-t border-zinc-800" />

        {/* Mode Selector - shows current mode with dropdown for all 4 modes */}
        <div className="relative group">
          <SidebarModeButton
            currentMode={currentMode}
            onModeChange={onModeChange}
            canConnect={canConnect}
          />
        </div>
      </div>

      {/* Support email at bottom */}
      <button
        onClick={handleContactSupport}
        className="w-full flex flex-col items-center justify-center py-3 px-1 text-[10px] text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 transition-colors"
        title="Contact Support"
      >
        <Mail className="w-5 h-5 mb-0.5" />
        <span>Support</span>
      </button>
    </div>
  );
}

// Sidebar-specific mode button with dropdown
function SidebarModeButton({
  currentMode,
  onModeChange,
  canConnect,
}: {
  currentMode: BuilderUIMode;
  onModeChange: (mode: BuilderUIMode) => void;
  canConnect?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);

  // Icon component for each mode (for sidebar - larger icons)
  const getModeIcon = (mode: BuilderUIMode, large: boolean = false) => {
    const size = large ? "w-5 h-5 mb-0.5" : "w-4 h-4";
    switch (mode) {
      case "auto": return <Zap className={size} />;
      case "connect": return <Plug className={size} />;
      case "publish": return <Rocket className={size} />;
      case "docs": return <FileText className={size} />;
      case "setup": return <Sparkles className={size} />;
    }
  };

  const modeConfig: Record<BuilderUIMode, {
    label: string;
    description: string;
    color: string;
  }> = {
    auto: {
      label: "Build",
      description: "Generate with AI",
      color: "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900",
    },
    connect: {
      label: "Connect",
      description: "Link to data",
      color: "text-emerald-400 bg-emerald-500/10",
    },
    publish: {
      label: "Publish",
      description: "GitHub & deploy",
      color: "text-amber-400 bg-amber-500/10",
    },
    docs: {
      label: "Docs",
      description: "Editor mode",
      color: "text-purple-400 bg-purple-500/10",
    },
    setup: {
      label: "Setup",
      description: "Agent wizard",
      color: "text-cyan-400 bg-cyan-500/10",
    },
  };

  const current = modeConfig[currentMode];

  const handleModeSelect = (mode: BuilderUIMode) => {
    if (mode === "connect" && !canConnect) return;
    onModeChange(mode);
    setIsOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex flex-col items-center justify-center py-3 px-1 text-[10px] transition-colors ${current.color}`}
        title={`${current.label}: ${current.description}`}
      >
        {getModeIcon(currentMode, true)}
        <span>{current.label}</span>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute left-full top-0 ml-2 w-40 bg-zinc-900 rounded-lg shadow-xl z-50 py-1 overflow-hidden border border-zinc-800">
            {(["auto", "setup", "connect", "publish", "docs"] as BuilderUIMode[]).map((mode) => {
              const config = modeConfig[mode];
              const isActive = currentMode === mode;
              const isDisabled = mode === "connect" && !canConnect;

              return (
                <button
                  key={mode}
                  onClick={() => handleModeSelect(mode)}
                  disabled={isDisabled}
                  className={`w-full px-3 py-2 flex items-center gap-2 text-left text-xs transition-colors ${
                    isActive
                      ? "bg-zinc-800 text-zinc-200"
                      : isDisabled
                      ? "text-zinc-600 cursor-not-allowed"
                      : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                  }`}
                  title={isDisabled ? "Generate a page first" : config.description}
                >
                  <span className={isActive && mode !== "auto" ? config.color.split(" ")[0] : isDisabled ? "text-zinc-600" : ""}>
                    {getModeIcon(mode)}
                  </span>
                  <div>
                    <div className="font-medium">{config.label}</div>
                    <div className="text-zinc-500 text-[10px]">{config.description}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}

// ============================================================================
// HEADLINE VARIATIONS
// ============================================================================

const headlineVariations = [
  "What do you want to create?",
  "What would you like to build?",
  "What can I help you design?",
  "What's your next project?",
  "Let's build something amazing.",
];

// Get a random headline (stable per session using useState)
function useRandomHeadline() {
  const [headline] = useState(() => {
    const index = Math.floor(Math.random() * headlineVariations.length);
    return headlineVariations[index];
  });
  return headline;
}

// ============================================================================
// WELCOME MESSAGE COMPONENT
// ============================================================================

function WelcomeMessage({ onSuggestionClick }: { onSuggestionClick: (text: string) => void }) {
  const headline = useRandomHeadline();

  const suggestions = [
    "A landing page for a sailing school with a hero, features about lessons, and a booking CTA",
    "A simple landing page for my coffee shop with opening hours",
    "A professional page for my consulting business",
  ];

  // Styled like AssistantMessage for consistency
  return (
    <div className="flex justify-start">
      <div className="max-w-[90%]">
        {/* Message bubble - matches AssistantMessage style */}
        <div className="bg-zinc-800 rounded-2xl rounded-tl-md px-4 py-3">
          <h2 className="text-lg font-medium text-zinc-100 mb-3">
            {headline}
          </h2>
          <p className="text-sm text-zinc-400 mb-4">
            Describe your landing page and I&apos;ll generate it for you. Try one of these:
          </p>
          <div className="space-y-2">
            {suggestions.map((suggestion, i) => (
              <button
                key={i}
                onClick={() => onSuggestionClick(suggestion)}
                className="block w-full text-left text-sm text-zinc-300 hover:text-zinc-100 bg-zinc-700/50 hover:bg-zinc-700 rounded-lg px-3 py-2 transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
        {/* Metadata footer - matches AssistantMessage */}
        <div className="flex items-center gap-3 mt-1.5 px-1 text-xs text-zinc-500">
          <span>AI Assistant</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// UNIFIED MODE TYPE
// ============================================================================

type BuilderUIMode = "auto" | "connect" | "publish" | "docs" | "setup";

// ============================================================================
// MODE SELECTOR (All 4 modes: Auto, Plan, Connect, Docs)
// ============================================================================

interface ModeSelectorProps {
  currentMode: BuilderUIMode;
  onModeChange: (mode: BuilderUIMode) => void;
  disabled?: boolean;
  canConnect?: boolean;
  direction?: "up" | "down";
}

function ModeSelector({
  currentMode,
  onModeChange,
  disabled,
  canConnect = false,
  direction = "up",
}: ModeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const modeConfig: Record<BuilderUIMode, {
    icon: React.ReactNode;
    label: string;
    description: string;
    color: string;
    bgColor: string;
  }> = {
    auto: {
      icon: <Zap className="w-4 h-4" />,
      label: "Build",
      description: "Generate with AI",
      color: "text-zinc-400",
      bgColor: "",
    },
    connect: {
      icon: <Plug className="w-4 h-4" />,
      label: "Connect",
      description: "Link to real data",
      color: "text-emerald-400",
      bgColor: "bg-emerald-500/10",
    },
    publish: {
      icon: <Rocket className="w-4 h-4" />,
      label: "Publish",
      description: "Push to GitHub & deploy",
      color: "text-amber-400",
      bgColor: "bg-amber-500/10",
    },
    docs: {
      icon: <FileText className="w-4 h-4" />,
      label: "Docs",
      description: "Document editor mode",
      color: "text-purple-400",
      bgColor: "bg-purple-500/10",
    },
    setup: {
      icon: <Sparkles className="w-4 h-4" />,
      label: "Setup",
      description: "AI agent wizard",
      color: "text-cyan-400",
      bgColor: "bg-cyan-500/10",
    },
  };

  const current = modeConfig[currentMode];

  const handleModeSelect = (mode: BuilderUIMode) => {
    // Connect mode requires a page to be generated first
    if (mode === "connect" && !canConnect) {
      return;
    }
    onModeChange(mode);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-colors ${
          currentMode !== "auto"
            ? `${current.color} ${current.bgColor}`
            : "text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        {current.icon}
        <span className="text-xs font-medium">{current.label}</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className={`absolute ${direction === "up" ? "bottom-full mb-2" : "top-full mt-2"} left-0 w-48 bg-zinc-900 rounded-lg shadow-xl z-50 py-1 overflow-hidden border border-zinc-800`}>
            {(["auto", "setup", "connect", "publish", "docs"] as BuilderUIMode[]).map((mode) => {
              const config = modeConfig[mode];
              const isActive = currentMode === mode;
              const isDisabled = mode === "connect" && !canConnect;

              return (
                <button
                  key={mode}
                  onClick={() => handleModeSelect(mode)}
                  disabled={isDisabled}
                  className={`w-full px-3 py-2 flex items-center gap-2 text-left text-xs transition-colors ${
                    isActive
                      ? "bg-zinc-800 text-zinc-200"
                      : isDisabled
                      ? "text-zinc-600 cursor-not-allowed"
                      : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                  }`}
                  title={isDisabled ? "Generate a page first" : config.description}
                >
                  <span className={isActive || !isDisabled ? config.color : "text-zinc-600"}>
                    {config.icon}
                  </span>
                  <div>
                    <div className="font-medium">{config.label}</div>
                    <div className="text-zinc-500 text-[10px]">{config.description}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================================
// MESSAGE COMPONENTS
// ============================================================================

function UserMessage({ content }: { content: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] bg-zinc-700 rounded-2xl rounded-tr-md px-4 py-3">
        <p className="text-sm text-zinc-100 whitespace-pre-wrap">{content}</p>
      </div>
    </div>
  );
}

function AssistantMessage({
  content,
  hasSchema,
  pageSchema,
  onFeedback,
  feedbackGiven,
  processingTime,
  timestamp,
  onCopy,
}: {
  content: string;
  hasSchema?: boolean;
  pageSchema?: { metadata?: { title?: string; description?: string }; sections?: { type: string }[] };
  onFeedback?: (score: number) => void;
  feedbackGiven?: number;
  processingTime?: number;
  timestamp?: number;
  onCopy?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showWorkDetails, setShowWorkDetails] = useState(false);

  // Extract just the text part - remove ALL code blocks (json or otherwise)
  // This handles both ```json ... ``` and ``` ... ``` blocks
  let textContent = content
    .replace(/```(?:json)?\s*[\s\S]*?```/g, "") // Remove complete code blocks
    .replace(/```(?:json)?[\s\S]*$/g, "") // Remove unclosed code blocks at end
    .trim();

  // If we have a schema but no text explanation, generate a friendly summary
  if (hasSchema && pageSchema && !textContent) {
    const sectionTypes = pageSchema.sections?.map(s => s.type) || [];
    const uniqueTypes = [...new Set(sectionTypes)];
    const sectionSummary = uniqueTypes.length > 0
      ? `Includes ${uniqueTypes.slice(0, 3).join(", ")}${uniqueTypes.length > 3 ? ` and ${uniqueTypes.length - 3} more sections` : ""}.`
      : "";
    textContent = `I've created "${pageSchema.metadata?.title || "your page"}". ${sectionSummary}`.trim();
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(textContent || content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onCopy?.();
  };

  // Format relative time
  const getRelativeTime = (ts: number) => {
    const now = Date.now();
    const diff = now - ts;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div className="flex justify-start group">
      <div className="max-w-[85%]">
        {/* Message bubble - no border for cleaner look */}
        <div className="bg-zinc-800 rounded-2xl rounded-tl-md px-4 py-3">
          {textContent && (
            <p className="text-sm text-zinc-200 whitespace-pre-wrap">{textContent}</p>
          )}
          {hasSchema && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-green-400">
              <Sparkles className="w-3 h-3" />
              <span>Page generated - see preview</span>
            </div>
          )}
        </div>

        {/* Expandable work details - v0 style */}
        {processingTime !== undefined && (
          <div className="mt-2">
            <button
              onClick={() => setShowWorkDetails(!showWorkDetails)}
              className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-400 transition-colors"
            >
              {showWorkDetails ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
              <Activity className="w-3.5 h-3.5" />
              <span>Worked for {processingTime}s</span>
            </button>

            {showWorkDetails && (
              <div className="mt-2 ml-5 p-3 bg-zinc-900 rounded-lg text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Processing time</span>
                  <span className="text-zinc-300">{processingTime}s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Response length</span>
                  <span className="text-zinc-300">{content.length} chars</span>
                </div>
                {hasSchema && (
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Page generated</span>
                    <span className="text-green-400">Yes</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Actions row BELOW bubble - v0 style */}
        <div className="flex items-center gap-0.5 mt-2 pl-1">
          {/* Thumbs up */}
          <button
            onClick={() => onFeedback?.(1)}
            disabled={feedbackGiven !== undefined}
            className={`p-1.5 rounded transition-colors ${
              feedbackGiven === 1
                ? "text-zinc-300"
                : feedbackGiven !== undefined
                  ? "text-zinc-700 cursor-not-allowed"
                  : "text-zinc-600 hover:text-zinc-400"
            }`}
            title="Good response"
          >
            <ThumbsUp className="w-4 h-4" />
          </button>

          {/* Thumbs down */}
          <button
            onClick={() => onFeedback?.(-1)}
            disabled={feedbackGiven !== undefined}
            className={`p-1.5 rounded transition-colors ${
              feedbackGiven === -1
                ? "text-zinc-300"
                : feedbackGiven !== undefined
                  ? "text-zinc-700 cursor-not-allowed"
                  : "text-zinc-600 hover:text-zinc-400"
            }`}
            title="Bad response"
          >
            <ThumbsDown className="w-4 h-4" />
          </button>

          {/* Copy button */}
          <button
            onClick={handleCopy}
            className="p-1.5 rounded text-zinc-600 hover:text-zinc-400 transition-colors"
            title={copied ? "Copied!" : "Copy response"}
          >
            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
          </button>

          {/* More options */}
          <div className="relative">
            <button
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className="p-1.5 rounded text-zinc-600 hover:text-zinc-400 transition-colors"
              title="More options"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
            {showMoreMenu && (
              <div className="absolute top-full left-0 mt-1 w-36 bg-zinc-900 rounded-lg shadow-xl z-50 py-1 overflow-hidden">
                <button
                  onClick={() => {
                    // TODO: Retry/Regenerate
                    setShowMoreMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-xs text-zinc-300 hover:bg-zinc-800 transition-colors"
                >
                  Retry
                </button>
                <button
                  onClick={() => {
                    // TODO: Copy link
                    setShowMoreMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-xs text-zinc-300 hover:bg-zinc-800 transition-colors"
                >
                  Copy link
                </button>
              </div>
            )}
          </div>

          {/* Timestamp */}
          {timestamp && (
            <span className="ml-2 text-xs text-zinc-600">
              <Clock className="w-3 h-3 inline mr-1" />
              {getRelativeTime(timestamp)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

interface ErrorDetails {
  type: "user_budget" | "platform_error" | "rate_limit" | "api" | "network" | "unknown";
  canRetry: boolean;
  actionLabel?: string;
  actionUrl?: string;
  isAdminAlert?: boolean;
}

function SystemMessage({
  content,
  errorDetails,
  onRetry,
  onDismiss,
}: {
  content: string;
  errorDetails?: ErrorDetails;
  onRetry?: () => void;
  onDismiss?: () => void;
}) {
  const isError = errorDetails || content.toLowerCase().startsWith("error");

  // Get icon and color based on error type
  const getErrorStyles = () => {
    if (!errorDetails) return { icon: AlertCircle, bgColor: "bg-red-900/30", borderColor: "border-red-800", textColor: "text-red-400" };

    switch (errorDetails.type) {
      case "user_budget":
        // User ran out of credits - amber/warning color, actionable
        return { icon: AlertCircle, bgColor: "bg-amber-900/30", borderColor: "border-amber-700", textColor: "text-amber-400" };
      case "platform_error":
        // Platform issue (OpenRouter 402) - softer color since not user's fault
        return { icon: AlertCircle, bgColor: "bg-zinc-800", borderColor: "border-zinc-600", textColor: "text-zinc-300" };
      case "rate_limit":
        return { icon: Clock, bgColor: "bg-blue-900/30", borderColor: "border-blue-700", textColor: "text-blue-400" };
      case "network":
        return { icon: AlertCircle, bgColor: "bg-orange-900/30", borderColor: "border-orange-700", textColor: "text-orange-400" };
      case "api":
        return { icon: AlertCircle, bgColor: "bg-red-900/30", borderColor: "border-red-800", textColor: "text-red-400" };
      default:
        return { icon: AlertCircle, bgColor: "bg-red-900/30", borderColor: "border-red-800", textColor: "text-red-400" };
    }
  };

  if (!isError) {
    return (
      <div className="flex justify-center">
        <div className="max-w-[90%] rounded-lg px-3 py-1.5 text-xs bg-zinc-800 text-zinc-400">
          {content}
        </div>
      </div>
    );
  }

  const { icon: ErrorIcon, bgColor, borderColor, textColor } = getErrorStyles();

  return (
    <div className="flex justify-center">
      <div className={`max-w-[90%] rounded-xl px-4 py-3 text-sm ${bgColor} ${textColor} border ${borderColor}`}>
        {/* Error header */}
        <div className="flex items-start gap-2">
          <ErrorIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium">{content}</p>

            {/* Action buttons */}
            {errorDetails && (
              <div className="flex flex-wrap gap-2 mt-3">
                {errorDetails.canRetry && onRetry && (
                  <button
                    onClick={onRetry}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-medium transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Try again
                  </button>
                )}
                {errorDetails.actionLabel && errorDetails.actionUrl && (
                  <a
                    href={errorDetails.actionUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-medium transition-colors"
                  >
                    {errorDetails.actionLabel}
                    <span className="text-[10px]">↗</span>
                  </a>
                )}
                {onDismiss && (
                  <button
                    onClick={onDismiss}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs opacity-60 hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                    Dismiss
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// HEAL PROGRESS MESSAGE (deployment self-heal)
// ============================================================================

/**
 * FILE DIFF VIEWER
 * Shows before/after file changes from self-heal fixes.
 * Collapsible per-file with line-by-line diff coloring.
 */
function FileDiffViewer({ fileDiffs }: {
  fileDiffs: Array<{ filePath: string; oldContent: string; newContent: string; explanation: string }>;
}) {
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(() => new Set());
  const [showAll, setShowAll] = useState(false);

  const toggleFile = (path: string) => {
    setExpandedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  return (
    <div className="mt-2 border-t border-white/10 pt-2">
      <button
        onClick={() => setShowAll(!showAll)}
        className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-300 mb-1"
      >
        {showAll ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        <FileText className="w-3 h-3" />
        Files Changed ({fileDiffs.length})
      </button>

      {showAll && (
        <div className="space-y-1.5">
          {fileDiffs.map((diff) => {
            const isExpanded = expandedFiles.has(diff.filePath);
            const isNewFile = !diff.oldContent;
            return (
              <div key={diff.filePath} className="rounded bg-black/20 overflow-hidden">
                <button
                  onClick={() => toggleFile(diff.filePath)}
                  className="w-full flex items-center gap-1.5 px-2 py-1 text-left hover:bg-white/5 transition-colors"
                >
                  {isExpanded ? <ChevronDown className="w-3 h-3 text-zinc-500 flex-shrink-0" /> : <ChevronRight className="w-3 h-3 text-zinc-500 flex-shrink-0" />}
                  <span className="text-[11px] text-zinc-300 truncate font-mono">{diff.filePath}</span>
                  {isNewFile && <span className="text-[9px] text-emerald-500 ml-auto flex-shrink-0">NEW</span>}
                </button>
                {isExpanded && (
                  <div className="px-2 pb-2">
                    <p className="text-[10px] text-zinc-500 mb-1 italic">{diff.explanation}</p>
                    <div className="max-h-60 overflow-auto rounded bg-zinc-950 p-1.5">
                      <DiffLines oldContent={diff.oldContent} newContent={diff.newContent} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * DIFF LINES
 * Simple line-by-line unified diff with red/green coloring.
 */
function DiffLines({ oldContent, newContent }: { oldContent: string; newContent: string }) {
  const oldLines = oldContent.split("\n");
  const newLines = newContent.split("\n");

  // Simple LCS-based diff for small files, truncated line comparison for large
  const maxLines = Math.max(oldLines.length, newLines.length);
  if (maxLines > 500) {
    // For very large files, just show new content
    return (
      <pre className="text-[10px] font-mono leading-relaxed text-emerald-400 whitespace-pre overflow-x-auto">
        {newContent.substring(0, 3000)}
        {newContent.length > 3000 && "\n... (truncated)"}
      </pre>
    );
  }

  // Build a simple unified diff using longest common subsequence
  const diffLines = computeSimpleDiff(oldLines, newLines);

  return (
    <pre className="text-[10px] font-mono leading-relaxed whitespace-pre overflow-x-auto">
      {diffLines.map((line, i) => (
        <div
          key={i}
          className={
            line.type === "add"
              ? "text-emerald-400 bg-emerald-950/30"
              : line.type === "remove"
                ? "text-red-400 bg-red-950/30"
                : "text-zinc-500"
          }
        >
          <span className="select-none inline-block w-4 text-right mr-1 text-zinc-600">
            {line.type === "add" ? "+" : line.type === "remove" ? "-" : " "}
          </span>
          {line.text}
        </div>
      ))}
    </pre>
  );
}

/** Simple diff: compare old/new lines, output unified diff entries */
function computeSimpleDiff(
  oldLines: string[],
  newLines: string[]
): Array<{ type: "add" | "remove" | "same"; text: string }> {
  const result: Array<{ type: "add" | "remove" | "same"; text: string }> = [];
  const oldSet = new Set(oldLines);
  const newSet = new Set(newLines);

  let oi = 0;
  let ni = 0;

  while (oi < oldLines.length || ni < newLines.length) {
    if (oi < oldLines.length && ni < newLines.length && oldLines[oi] === newLines[ni]) {
      result.push({ type: "same", text: oldLines[oi] });
      oi++;
      ni++;
    } else if (oi < oldLines.length && !newSet.has(oldLines[oi])) {
      result.push({ type: "remove", text: oldLines[oi] });
      oi++;
    } else if (ni < newLines.length && !oldSet.has(newLines[ni])) {
      result.push({ type: "add", text: newLines[ni] });
      ni++;
    } else if (oi < oldLines.length) {
      result.push({ type: "remove", text: oldLines[oi] });
      oi++;
    } else {
      result.push({ type: "add", text: newLines[ni] });
      ni++;
    }
  }

  return result;
}

function HealProgressMessage({
  content,
  healData,
  onRetry,
}: {
  content: string;
  healData: NonNullable<import("@/contexts/builder-context").BuilderMessage["healData"]>;
  onRetry?: () => void;
}) {
  const [showLogs, setShowLogs] = useState(false);

  const isStart = healData.type === "heal_start";
  const isProgress = healData.type === "heal_progress";
  const isSuccess = healData.type === "heal_success";
  const isFailed = healData.type === "heal_failed";

  // Color scheme based on state
  const colors = isSuccess
    ? { bg: "bg-emerald-950/30", border: "border-emerald-800", text: "text-emerald-300", icon: "text-emerald-400" }
    : isFailed
      ? { bg: "bg-red-950/30", border: "border-red-800", text: "text-red-300", icon: "text-red-400" }
      : { bg: "bg-purple-950/30", border: "border-purple-800", text: "text-purple-300", icon: "text-purple-400" };

  return (
    <div className="flex justify-start">
      <div className={`max-w-[90%] rounded-2xl rounded-tl-md px-4 py-3 ${colors.bg} border ${colors.border}`}>
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          {isStart && <Wrench className={`w-4 h-4 ${colors.icon}`} />}
          {isProgress && <Loader2 className={`w-4 h-4 ${colors.icon} animate-spin`} />}
          {isSuccess && <Check className={`w-4 h-4 ${colors.icon}`} />}
          {isFailed && <AlertCircle className={`w-4 h-4 ${colors.icon}`} />}
          <span className={`text-xs font-medium ${colors.text} uppercase tracking-wider`}>
            {isStart && "Self-Heal Started"}
            {isProgress && "Applying Fixes"}
            {isSuccess && "Deploy Succeeded"}
            {isFailed && "Heal Failed"}
          </span>
          {healData.attemptNumber && healData.maxAttempts && (
            <span className="text-[10px] text-zinc-500 ml-auto">
              Attempt {healData.attemptNumber}/{healData.maxAttempts}
            </span>
          )}
        </div>

        {/* Content - render markdown-like content */}
        <div className={`text-sm ${colors.text} whitespace-pre-wrap`}>
          {content.split("\n").map((line, i) => {
            // Bold
            const boldParsed = line.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
            // Code
            const codeParsed = boldParsed.replace(/`(.*?)`/g, '<code class="bg-black/30 px-1 rounded text-xs">$1</code>');

            if (line.startsWith("```")) {
              // Toggle logs section
              if (!showLogs) {
                return (
                  <button
                    key={i}
                    onClick={() => setShowLogs(true)}
                    className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-300 mt-1"
                  >
                    <FileText className="w-3 h-3" />
                    Show build logs
                    <ChevronDown className="w-3 h-3" />
                  </button>
                );
              }
              return null;
            }

            if (showLogs && line === "```") {
              return null;
            }

            return (
              <p
                key={i}
                className={line.startsWith("```") ? "hidden" : ""}
                dangerouslySetInnerHTML={{ __html: codeParsed }}
              />
            );
          })}
        </div>

        {/* Strategy badge */}
        {healData.strategy && (
          <div className="flex items-center gap-2 mt-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/20 text-[10px] text-zinc-400">
              <GitBranch className="w-3 h-3" />
              {healData.strategy === "surgical" ? "Surgical Fix" : "v0 Regeneration"}
            </span>
            {healData.fixCount !== undefined && healData.fixCount > 0 && (
              <span className="text-[10px] text-zinc-500">
                {healData.fixCount} file{healData.fixCount !== 1 ? "s" : ""} changed
              </span>
            )}
          </div>
        )}

        {/* File diffs - collapsible per-file view */}
        {healData.fileDiffs && healData.fileDiffs.length > 0 && (
          <FileDiffViewer fileDiffs={healData.fileDiffs} />
        )}

        {/* Retry button for failed heals */}
        {isFailed && onRetry && (
          <button
            onClick={onRetry}
            className="mt-2 flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-medium transition-colors text-zinc-300"
          >
            <RefreshCw className="w-3 h-3" />
            Retry
          </button>
        )}
      </div>
    </div>
  );
}

// Thinking phrases that cycle during generation
const thinkingPhrases = [
  "Thinking...",
  "Building...",
  "Designing...",
  "Creating...",
  "Generating...",
];

function ThinkingIndicator() {
  const [phraseIndex, setPhraseIndex] = useState(0);

  // Cycle through phrases
  useEffect(() => {
    const interval = setInterval(() => {
      setPhraseIndex((prev) => (prev + 1) % thinkingPhrases.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex justify-start">
      <div className="bg-zinc-800 border border-zinc-700 rounded-2xl rounded-tl-md px-4 py-3">
        <div className="flex items-center gap-3">
          {/* Spinning logo */}
          <div className="relative w-6 h-6 flex-shrink-0">
            <img
              src="/android-chrome-512x512.png"
              alt=""
              className="w-6 h-6 rounded animate-spin"
              style={{ animationDuration: "2s" }}
            />
          </div>
          {/* Shimmering text */}
          <span
            className="text-sm font-medium bg-gradient-to-r from-purple-400 via-zinc-200 to-purple-400 bg-clip-text text-transparent animate-shimmer bg-[length:200%_100%]"
            style={{
              animation: "shimmer 2s linear infinite",
            }}
          >
            {thinkingPhrases[phraseIndex]}
          </span>
        </div>
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


// ============================================================================
// TOOL APPROVAL COMPONENT
// ============================================================================

interface PendingToolExecution {
  _id: Id<"aiToolExecutions">;
  toolName: string;
  parameters: Record<string, unknown>;
  proposalMessage?: string;
}

function ToolApprovalCard({
  execution,
  onApprove,
  onReject,
  onOther,
  isProcessing,
}: {
  execution: PendingToolExecution;
  onApprove: (executionId: Id<"aiToolExecutions">) => void;
  onReject: (executionId: Id<"aiToolExecutions">) => void;
  onOther: (executionId: Id<"aiToolExecutions">, instructions: string) => void;
  isProcessing: boolean;
}) {
  const [showOtherInput, setShowOtherInput] = useState(false);
  const [otherInstructions, setOtherInstructions] = useState("");

  // Get human-friendly tool name
  const getToolDisplayName = (name: string) => {
    const names: Record<string, string> = {
      create_contact: "Create Contact",
      update_contact: "Update Contact",
      create_event: "Create Event",
      create_product: "Create Product",
      send_email: "Send Email",
      sync_contacts: "Sync Contacts",
    };
    return names[name] || name.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  // Render parameters in a readable format
  const renderParameters = () => {
    const params = execution.parameters;
    const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "");

    if (entries.length === 0) return <span className="text-zinc-500 italic">No parameters</span>;

    return (
      <div className="space-y-1">
        {entries.slice(0, 5).map(([key, value]) => (
          <div key={key} className="flex gap-2">
            <span className="text-zinc-500 text-xs">{key}:</span>
            <span className="text-zinc-300 text-xs truncate max-w-[200px]">
              {typeof value === "object" ? JSON.stringify(value) : String(value)}
            </span>
          </div>
        ))}
        {entries.length > 5 && (
          <span className="text-zinc-500 text-xs">+ {entries.length - 5} more...</span>
        )}
      </div>
    );
  };

  const handleSubmitOther = () => {
    if (otherInstructions.trim()) {
      onOther(execution._id, otherInstructions.trim());
      setShowOtherInput(false);
      setOtherInstructions("");
    }
  };

  return (
    <div className="bg-amber-900/20 border border-amber-600/50 rounded-xl p-4 mb-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="w-5 h-5 text-amber-500" />
        <span className="text-sm font-medium text-zinc-200">
          AI wants to: {getToolDisplayName(execution.toolName)}
        </span>
      </div>

      {/* Proposal message if any */}
      {execution.proposalMessage && (
        <p className="text-xs text-zinc-400 mb-3">{execution.proposalMessage}</p>
      )}

      {/* Parameters */}
      <div className="bg-zinc-900/50 rounded-lg p-3 mb-4">
        {renderParameters()}
      </div>

      {/* Other instructions input */}
      {showOtherInput && (
        <div className="mb-4 space-y-2">
          <textarea
            value={otherInstructions}
            onChange={(e) => setOtherInstructions(e.target.value)}
            placeholder="Enter your instructions for the AI..."
            className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-purple-500 resize-none"
            rows={3}
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={handleSubmitOther}
              disabled={!otherInstructions.trim() || isProcessing}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-medium rounded-lg transition-colors"
            >
              <Send className="w-3 h-3" />
              Send Instructions
            </button>
            <button
              onClick={() => { setShowOtherInput(false); setOtherInstructions(""); }}
              className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 text-xs font-medium rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Action buttons */}
      {!showOtherInput && (
        <div className="flex gap-2">
          <button
            onClick={() => onApprove(execution._id)}
            disabled={isProcessing}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Check className="w-4 h-4" />
            Yes
          </button>
          <button
            onClick={() => onReject(execution._id)}
            disabled={isProcessing}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-200 text-sm font-medium rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
            No
          </button>
          <button
            onClick={() => setShowOtherInput(true)}
            disabled={isProcessing}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed text-purple-300 text-sm font-medium rounded-lg transition-colors"
          >
            <MessageSquare className="w-4 h-4" />
            Other
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// AI PROVIDER TOGGLE (v0 vs Built-in)
// ============================================================================

function AIProviderToggle({
  provider,
  onProviderChange,
  disabled,
  hasV0Preview,
}: {
  provider: "built-in" | "v0";
  onProviderChange: (provider: "built-in" | "v0") => void;
  disabled?: boolean;
  hasV0Preview?: boolean;
}) {
  return (
    <div className="flex items-center bg-zinc-800 border border-zinc-700 rounded-lg p-0.5">
      <button
        type="button"
        onClick={() => !disabled && onProviderChange("v0")}
        disabled={disabled}
        className={`flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-colors ${
          provider === "v0"
            ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-sm"
            : "text-zinc-400 hover:text-zinc-200"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        title="Use v0.dev for live preview (Recommended)"
      >
        <span className="font-medium">v0</span>
        {hasV0Preview && provider === "v0" && (
          <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
        )}
      </button>
      <button
        type="button"
        onClick={() => !disabled && onProviderChange("built-in")}
        disabled={disabled}
        className={`flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-colors ${
          provider === "built-in"
            ? "bg-zinc-700 text-zinc-100 shadow-sm"
            : "text-zinc-400 hover:text-zinc-200"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        title="Use built-in JSON schema renderer"
      >
        <span className="font-medium">JSON</span>
      </button>
    </div>
  );
}

// ============================================================================
// COMPACT MODEL SELECTOR (For input area)
// ============================================================================

function CompactModelSelector({
  selectedModel,
  onModelChange,
  disabled,
}: {
  selectedModel?: string;
  onModelChange: (model: string | undefined) => void;
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  const organizationId = user?.defaultOrgId as Id<"organizations"> | undefined;
  const aiSettings = useQuery(
    api.ai.settings.getAISettings,
    organizationId ? { organizationId } : "skip"
  );
  const allPlatformModels = useQuery(api.ai.platformModels.getEnabledModelsByProvider);

  const platformModels = useMemo(() => {
    if (!aiSettings?.llm.enabledModels || aiSettings.llm.enabledModels.length === 0) {
      return allPlatformModels;
    }
    if (!allPlatformModels) return null;
    const enabledModelIds = new Set(aiSettings.llm.enabledModels.map((m: { modelId: string }) => m.modelId));
    const filtered: Record<string, typeof allPlatformModels[string]> = {};
    for (const [provider, models] of Object.entries(allPlatformModels)) {
      const orgModels = models.filter((m) => enabledModelIds.has(m.modelId));
      if (orgModels.length > 0) {
        filtered[provider] = orgModels;
      }
    }
    return filtered;
  }, [aiSettings, allPlatformModels]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getModelDisplayName = (model: string) => {
    const parts = model.split("/");
    const name = parts[1] || model;
    // Shorten long model names
    if (name.length > 12) return name.slice(0, 10) + "...";
    return name;
  };

  const orgDefaultModel = aiSettings?.llm.defaultModelId;
  const currentModel = selectedModel || orgDefaultModel || "claude-3-5-sonnet";
  const currentDisplayName = selectedModel ? getModelDisplayName(currentModel) : "Auto";

  const modelList = platformModels
    ? Object.values(platformModels).flat().map((m) => ({ id: m.modelId, name: m.name }))
    : [];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border transition-colors ${
          disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-zinc-700"
        } bg-zinc-800 border-zinc-700 text-zinc-300`}
      >
        <span className="truncate max-w-[80px]">{currentDisplayName}</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-0 mb-1 w-56 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-50 max-h-64 overflow-y-auto">
          <button
            type="button"
            onClick={() => { onModelChange(undefined); setIsOpen(false); }}
            className={`w-full px-3 py-2 text-left text-xs hover:bg-zinc-700 transition-colors ${!selectedModel ? "bg-zinc-700" : ""}`}
          >
            <span className="text-zinc-200 font-medium">Auto</span>
            <span className="text-zinc-500 ml-1">(Default)</span>
          </button>
          {modelList.map((model) => (
            <button
              key={model.id}
              type="button"
              onClick={() => { onModelChange(model.id); setIsOpen(false); }}
              className={`w-full px-3 py-2 text-left text-xs hover:bg-zinc-700 transition-colors truncate ${selectedModel === model.id ? "bg-purple-900/30" : ""}`}
            >
              <span className="text-zinc-200">{model.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SAVE DIALOG
// ============================================================================

function SaveDialog({
  isOpen,
  onClose,
  onSave,
  isSaving,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
  isSaving: boolean;
}) {
  const [name, setName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSave(name.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-zinc-800 border border-zinc-700 rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <h3 className="text-lg font-semibold text-zinc-100 mb-4">
          Save as Project
        </h3>
        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter project name..."
            className="w-full px-4 py-2 bg-zinc-900 border border-zinc-600 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            disabled={isSaving}
          />
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || isSaving}
              className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function BuilderChatPanel() {
  const {
    messages,
    isGenerating,
    generationError,
    sendMessage,
    retryLastMessage,
    saveAsProject,
    pageSchema,
    reset,
    clearError,
    conversationId,
    selectedModel,
    setSelectedModel,
    // V0 integration
    aiProvider,
    setAiProvider,
    v0DemoUrl,
    // Three-mode architecture
    builderMode,
    setBuilderMode,
    analyzePageForConnections,
    canSwitchToMode,
    // Builder app (set after v0 connection)
    builderAppId,
    sessionId,
    organizationId,
    // Programmatic message injection
    addSystemMessage,
    addAssistantMessage,
    // Setup mode (agent creation wizard)
    isSetupMode,
    setIsSetupMode,
  } = useBuilder();

  const [input, setInput] = useState("");
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState<Record<string, number>>({});
  const [processingApproval, setProcessingApproval] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("chat");
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [referenceUrls, setReferenceUrls] = useState<string[]>([]);
  const [urlContents, setUrlContents] = useState<Record<string, string>>({});
  const [isFetchingUrls, setIsFetchingUrls] = useState(false);
  const [attachedText, setAttachedText] = useState<{ content: string; preview: string } | null>(null);
  const [showConnectionPanel, setShowConnectionPanel] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Convex action for fetching URL content
  const fetchUrlContent = useAction(api.ai.webReader.fetchUrlContent);
  const runChatHealAttempt = useAction(api.integrations.selfHealChat.runChatHealAttempt);

  const { sessionId: authSessionId } = useAuth();
  const effectiveSessionId = authSessionId || sessionId;

  // ── BUILDER APP FILES (for Files tab) ──
  const builderFilesRaw = useQuery(
    api.fileSystemOntology.getFilesByApp,
    effectiveSessionId && builderAppId
      ? { sessionId: effectiveSessionId, appId: builderAppId }
      : "skip"
  );
  const generatedFiles = useMemo(() => {
    if (!builderFilesRaw) return [];
    return builderFilesRaw.map((f) => ({
      path: f.path,
      content: f.content,
      language: f.language,
    }));
  }, [builderFilesRaw]);

  // ── HEAL STATE RESUME ──
  // Query active heal state from DB to resume on page load
  const healState = useQuery(
    api.integrations.selfHealChat.getHealState,
    effectiveSessionId && builderAppId
      ? { sessionId: effectiveSessionId, appId: builderAppId }
      : "skip"
  );

  const hasResumedHeal = useRef(false);

  useEffect(() => {
    if (!healState || hasResumedHeal.current) return;
    if (!effectiveSessionId || !organizationId || !builderAppId) return;

    // Check if there's an active heal in progress
    if (healState.status === "analyzing" || healState.status === "fixing") {
      hasResumedHeal.current = true;
      addSystemMessage(
        `**Resuming Self-Heal** - Attempt ${healState.attemptNumber} of ${healState.maxAttempts}\n\nA previous heal session was in progress. Continuing...`,
        undefined,
        { type: "heal_start", attemptNumber: healState.attemptNumber, maxAttempts: healState.maxAttempts }
      );

      // Auto-retry the heal attempt
      (async () => {
        try {
          const result = await runChatHealAttempt({
            sessionId: effectiveSessionId,
            organizationId,
            appId: builderAppId,
          });

          const message = result.progressMessages.join("\n");
          if (result.success) {
            addAssistantMessage(message, {
              healData: { type: "heal_progress", strategy: result.strategy, fixCount: result.fixCount, rootCause: result.rootCause, fileDiffs: result.fileDiffs },
            });
            addAssistantMessage("Fixes pushed to GitHub. Vercel is rebuilding - I'll update you when it's done.", {
              healData: { type: "heal_progress" },
            });
          } else {
            addSystemMessage(message, { type: "api", canRetry: true }, {
              type: "heal_failed", strategy: result.strategy, rootCause: result.rootCause,
            });
          }
        } catch (err) {
          addSystemMessage(
            `Failed to resume heal: ${err instanceof Error ? err.message : "Unknown error"}`,
            { type: "api", canRetry: true }
          );
        }
      })();
    } else if (healState.status === "building") {
      hasResumedHeal.current = true;
      addSystemMessage(
        `**Deploy In Progress** - Fixes were applied, waiting for Vercel build to complete.\n\nCheck the Publish dropdown for live status.`,
        undefined,
        { type: "heal_progress" }
      );
    } else if (healState.status === "failed" && healState.attemptNumber < healState.maxAttempts) {
      hasResumedHeal.current = true;
      addSystemMessage(
        `**Previous Heal Failed** (Attempt ${healState.attemptNumber} of ${healState.maxAttempts})\n\nYou can retry from the Publish dropdown.`,
        undefined,
        { type: "heal_failed", attemptNumber: healState.attemptNumber, maxAttempts: healState.maxAttempts }
      );
    }
  }, [healState, effectiveSessionId, organizationId, builderAppId, addSystemMessage, addAssistantMessage, runChatHealAttempt]);

  // Docs mode state
  const [isDocsMode, setIsDocsMode] = useState(false);
  // Note: isSetupMode and setIsSetupMode come from useBuilder() context

  // ============================================================================
  // UNIFIED MODE HANDLING
  // Derive currentUIMode from the separate state variables
  // ============================================================================
  const currentUIMode: BuilderUIMode = useMemo(() => {
    if (showConnectionPanel && builderMode === "connect") return "connect";
    if (isDocsMode) return "docs";
    if (isSetupMode) return "setup";
    return "auto";
  }, [showConnectionPanel, builderMode, isDocsMode, isSetupMode]);

  // Handle unified mode change from the dropdown
  const handleUIModeChange = async (mode: BuilderUIMode) => {
    // Reset all modes first
    setIsDocsMode(false);
    setShowConnectionPanel(false);
    setIsSetupMode(false);

    switch (mode) {
      case "auto":
        // Build mode = prototype builder mode
        setBuilderMode("prototype");
        break;
      case "setup":
        // Setup mode = agent creation wizard with system knowledge
        setBuilderMode("prototype");
        setIsSetupMode(true);
        break;
      case "connect":
        if (!canSwitchToMode("connect")) return;
        await analyzePageForConnections();
        setBuilderMode("connect");
        setShowConnectionPanel(true);
        break;
      case "publish":
        // Publishing is now handled by the header Publish dropdown
        break;
      case "docs":
        setIsDocsMode(true);
        break;
    }
  };

  // Handle connection panel complete
  const handleConnectionComplete = () => {
    setShowConnectionPanel(false);
    setBuilderMode("prototype");
  };

  // Handle connection panel close
  const handleConnectionPanelClose = () => {
    setShowConnectionPanel(false);
    setBuilderMode("prototype");
  };

  // Publish panel removed - now handled by header Publish dropdown

  // Handle switching from Connect → Publish (now via header dropdown)
  const handleSwitchToPublish = () => {
    setShowConnectionPanel(false);
    setBuilderMode("prototype");
    // Publishing is now done via the header Publish dropdown
  };

  // Handle switching from Publish → Connect
  // handleSwitchToConnect removed - publish panel no longer exists

  // Training data feedback mutation
  const submitFeedbackMutation = useMutation(api.ai.trainingData.submitFeedback);

  // Tool approval mutations
  const approveToolMutation = useMutation(api.ai.conversations.approveToolExecution);
  const rejectToolMutation = useMutation(api.ai.conversations.rejectToolExecution);

  // Query pending tool executions
  const pendingExecutions = useQuery(
    api.ai.conversations.getPendingToolExecutions,
    conversationId ? { conversationId } : "skip"
  ) as PendingToolExecution[] | undefined;

  // Handle tool approval
  const handleApprove = async (executionId: Id<"aiToolExecutions">) => {
    setProcessingApproval(executionId);
    try {
      await approveToolMutation({ executionId, dontAskAgain: false });
    } catch (error) {
      console.error("Failed to approve tool:", error);
    } finally {
      setProcessingApproval(null);
    }
  };

  // Handle tool rejection
  const handleReject = async (executionId: Id<"aiToolExecutions">) => {
    setProcessingApproval(executionId);
    try {
      await rejectToolMutation({ executionId });
    } catch (error) {
      console.error("Failed to reject tool:", error);
    } finally {
      setProcessingApproval(null);
    }
  };

  // Handle tool "Other" - reject with custom instructions
  const handleOther = async (executionId: Id<"aiToolExecutions">, instructions: string) => {
    setProcessingApproval(executionId);
    try {
      // Reject the tool execution
      await rejectToolMutation({ executionId });
      // Send the custom instructions as a new message
      await sendMessage(`[REGARDING PREVIOUS ACTION] ${instructions}`);
    } catch (error) {
      console.error("Failed to handle other:", error);
    } finally {
      setProcessingApproval(null);
    }
  };

  const handleFeedback = async (messageId: string, score: number) => {
    if (!conversationId) return;

    try {
      await submitFeedbackMutation({
        conversationId,
        feedbackScore: score,
      });
      setFeedbackGiven((prev) => ({ ...prev, [messageId]: score }));
    } catch (error) {
      console.error("Failed to submit feedback:", error);
    }
  };

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, isGenerating, pendingExecutions?.length]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !attachedText) || isGenerating) return;

    // Build full message with attachments
    let fullMessage = input.trim();

    // Add attached text if present
    if (attachedText) {
      fullMessage += `\n\n--- ATTACHED REFERENCE TEXT ---\n${attachedText.content}\n--- END REFERENCE TEXT ---`;
    }

    // Add reference URLs with their fetched content
    if (referenceUrls.length > 0) {
      fullMessage += `\n\n--- REFERENCE URLS FOR DESIGN INSPIRATION ---`;
      for (const url of referenceUrls) {
        fullMessage += `\n\nURL: ${url}`;
        if (urlContents[url]) {
          fullMessage += `\n\n${urlContents[url]}`;
        }
      }
      fullMessage += `\n--- END REFERENCE URLS ---`;
    }

    // Clear inputs
    setInput("");
    setAttachedText(null);
    setReferenceUrls([]);
    setUrlContents({});

    await sendMessage(fullMessage);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleSave = async (name: string) => {
    setIsSaving(true);
    try {
      const projectId = await saveAsProject(name);
      if (projectId) {
        setShowSaveDialog(false);
        // Could redirect to project page here
      }
    } finally {
      setIsSaving(false);
    }
  };

  // URL validation
  const isValidUrl = (str: string) => {
    try {
      new URL(str);
      return true;
    } catch {
      return false;
    }
  };

  // Add URL to references and fetch content
  const addUrlToReferences = async (url: string) => {
    if (!isValidUrl(url) || referenceUrls.includes(url)) return;

    setReferenceUrls((prev) => [...prev, url]);
    setIsFetchingUrls(true);
    try {
      const result = await fetchUrlContent({ url });
      if (result.success && result.content) {
        setUrlContents((prev) => ({ ...prev, [url]: result.content }));
      }
    } catch (error) {
      console.error("Failed to fetch URL content:", error);
    } finally {
      setIsFetchingUrls(false);
    }
  };

  // Add URL from input
  const addUrlReference = async () => {
    const url = urlInput.trim();
    if (url && isValidUrl(url)) {
      setUrlInput("");
      setShowUrlInput(false);
      await addUrlToReferences(url);
    }
  };

  // Remove URL reference
  const removeUrlReference = (index: number) => {
    const urlToRemove = referenceUrls[index];
    setReferenceUrls((prev) => prev.filter((_, i) => i !== index));
    if (urlToRemove && urlContents[urlToRemove]) {
      setUrlContents((prev) => {
        const newContents = { ...prev };
        delete newContents[urlToRemove];
        return newContents;
      });
    }
  };

  // URL pattern for paste detection
  const urlPattern = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;

  // Handle paste - always extract URLs, handle long text separately
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedText = e.clipboardData.getData("text");
    const trimmed = pastedText.trim();

    // Always extract any URLs found in the pasted content
    const urls = trimmed.match(urlPattern);
    const newUrls = urls?.filter((url) => !referenceUrls.includes(url)) || [];

    if (newUrls.length > 0) {
      // Add URLs as references (they'll be fetched automatically)
      newUrls.forEach((url) => addUrlToReferences(url));
    }

    // Check if it's ONLY URLs (no other content) - don't add to input
    if (urls && urls.length > 0) {
      const nonUrlContent = trimmed.replace(urlPattern, "").replace(/\s+/g, "");
      if (nonUrlContent.length < trimmed.length * 0.2) {
        e.preventDefault();
        return;
      }
    }

    // For long text, convert to file attachment
    if (pastedText.length > 1500) {
      e.preventDefault();
      const preview = pastedText.slice(0, 100) + (pastedText.length > 100 ? "..." : "");
      setAttachedText({ content: pastedText, preview });
      if (!input.trim()) {
        setInput("I've attached some reference text for context.");
      }
    }
    // Otherwise, let the paste happen normally (URLs still get extracted above)
  };

  // Dynamically import ConnectionPanel and V0ConnectionPanel to avoid circular deps
  const ConnectionPanel = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("./connection-panel").ConnectionPanel;
  }, []);
  const V0ConnectionPanel = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("./v0-connection-panel").V0ConnectionPanel;
  }, []);
  // PublishConfigWizard and PublishProvider removed - publishing is now via header dropdown

  return (
    <div className="h-full flex bg-zinc-900 overflow-hidden">
      {/* Collapsed Sidebar - v0 style - stays fixed */}
      <div className="h-full flex-shrink-0">
        <CollapsedSidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          currentMode={currentUIMode}
          onModeChange={handleUIModeChange}
          canConnect={canSwitchToMode("connect")}
        />
      </div>

      {/* Main Chat Area - fixed height, internal scroll */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
        {/* Connection Panel Drawer - overlays above the chat content */}
        {showConnectionPanel && builderMode === "connect" && (
          <div className="absolute inset-0 z-20 bg-zinc-950/95 backdrop-blur-sm overflow-y-auto overflow-x-hidden">
            {aiProvider === "v0" ? (
              <V0ConnectionPanel
                onClose={handleConnectionPanelClose}
                onSwitchToPublish={handleSwitchToPublish}
              />
            ) : (
              <ConnectionPanel
                onClose={handleConnectionPanelClose}
                onComplete={handleConnectionComplete}
              />
            )}
          </div>
        )}

        {/* Publish is now handled by the header Publish dropdown */}

        {/* Files tab - read-only file explorer */}
        {activeTab === "files" ? (
          <FileExplorerPanel generatedFiles={generatedFiles} />
        ) : (
        <>
        {/* Messages - this is the ONLY scrollable area */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
          {/* Welcome message if empty */}
          {messages.length === 0 && (
            <WelcomeMessage onSuggestionClick={setInput} />
          )}

          {/* Message list */}
          {messages.map((message) => {
            // Heal messages get special rendering
            if (message.healData) {
              return (
                <HealProgressMessage
                  key={message.id}
                  content={message.content}
                  healData={message.healData}
                  onRetry={message.healData.type === "heal_failed" ? retryLastMessage : undefined}
                />
              );
            }
            if (message.role === "user") {
              return <UserMessage key={message.id} content={message.content} />;
            }
            if (message.role === "assistant") {
              return (
                <AssistantMessage
                  key={message.id}
                  content={message.content}
                  hasSchema={!!message.pageSchema}
                  pageSchema={message.pageSchema}
                  onFeedback={(score) => handleFeedback(message.id, score)}
                  feedbackGiven={feedbackGiven[message.id]}
                  processingTime={message.processingTime}
                  timestamp={message.timestamp}
                />
              );
            }
            return (
              <SystemMessage
                key={message.id}
                content={message.content}
                errorDetails={message.errorDetails}
                onRetry={message.errorDetails?.canRetry ? retryLastMessage : undefined}
                onDismiss={clearError}
              />
            );
          })}

          {/* Thinking indicator */}
          {isGenerating && <ThinkingIndicator />}

          {/* Pending tool approvals */}
          {pendingExecutions && pendingExecutions.length > 0 && (
            <div className="space-y-2">
              {pendingExecutions.map((execution) => (
                <ToolApprovalCard
                  key={execution._id}
                  execution={execution}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  onOther={handleOther}
                  isProcessing={processingApproval === execution._id}
                />
              ))}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Attachments display */}
        {(attachedText || referenceUrls.length > 0) && (
          <div className="flex-shrink-0 px-4 pb-2 flex flex-wrap gap-2">
            {/* Attached text */}
            {attachedText && (
              <div className="flex items-center gap-2 px-2 py-1 bg-zinc-800 border border-zinc-700 rounded-lg text-xs">
                <Paperclip className="w-3 h-3 text-zinc-400" />
                <span className="text-zinc-300 max-w-[150px] truncate">{attachedText.preview}</span>
                <button
                  onClick={() => setAttachedText(null)}
                  className="text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            {/* Reference URLs */}
            {referenceUrls.map((url, index) => {
              const hasContent = !!urlContents[url];
              const isLatest = index === referenceUrls.length - 1;
              const isLoading = isLatest && isFetchingUrls && !hasContent;

              return (
                <div
                  key={index}
                  className={`flex items-center gap-2 px-2 py-1 rounded-lg text-xs border ${
                    hasContent
                      ? "bg-green-900/20 border-green-700/50"
                      : isLoading
                      ? "bg-blue-900/20 border-blue-700/50"
                      : "bg-blue-900/30 border-blue-700/50"
                  }`}
                >
                  {isLoading ? (
                    <Loader2 className="w-3 h-3 text-blue-400 animate-spin" />
                  ) : hasContent ? (
                    <Check className="w-3 h-3 text-green-400" />
                  ) : (
                    <LinkIcon className="w-3 h-3 text-blue-400" />
                  )}
                  <span className={`max-w-[150px] truncate ${hasContent ? "text-green-300" : "text-blue-300"}`}>
                    {new URL(url).hostname}
                  </span>
                  <button
                    onClick={() => removeUrlReference(index)}
                    className={`hover:opacity-80 transition-opacity ${hasContent ? "text-green-500" : "text-blue-500"}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* URL input field */}
        {showUrlInput && (
          <div className="flex-shrink-0 px-4 pb-2 flex items-center gap-2">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://example.com"
              className="flex-1 px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-purple-500"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addUrlReference();
                }
                if (e.key === "Escape") {
                  setShowUrlInput(false);
                  setUrlInput("");
                }
              }}
              autoFocus
            />
            <button
              onClick={addUrlReference}
              disabled={!urlInput.trim() || !isValidUrl(urlInput.trim())}
              className="px-3 py-1.5 bg-purple-600 text-white text-xs rounded-lg hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Add
            </button>
            <button
              onClick={() => { setShowUrlInput(false); setUrlInput(""); }}
              className="p-1.5 text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Input - v0 style layout - fixed at bottom */}
        <div className="flex-shrink-0 bg-zinc-950 p-3">
          {/* Main input row */}
          <form onSubmit={handleSubmit} className="flex items-end gap-2">
            {/* Textarea */}
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                placeholder="Ask a follow-up..."
                disabled={isGenerating}
                className="w-full px-4 py-2.5 bg-zinc-900 rounded-xl text-zinc-100 placeholder-zinc-500 resize-none overflow-hidden min-h-[44px] max-h-[120px] focus:outline-none focus:ring-1 focus:ring-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                rows={1}
              />
            </div>

            {/* Send button */}
            <button
              type="submit"
              disabled={(!input.trim() && !attachedText) || isGenerating || isFetchingUrls}
              className="p-2.5 bg-zinc-800 text-zinc-300 rounded-xl hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title={isFetchingUrls ? "Fetching URL content..." : "Send message"}
            >
              {isGenerating || isFetchingUrls ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </form>

          {/* Bottom row with icons and model selector - v0 style */}
          <div className="flex items-center justify-between mt-3">
            {/* Left side icons */}
            <div className="flex items-center gap-1">
              {/* Add URL reference - Link icon with badge */}
              <button
                type="button"
                onClick={() => setShowUrlInput(!showUrlInput)}
                className={`relative p-2 rounded-lg transition-colors ${
                  showUrlInput || referenceUrls.length > 0
                    ? "text-purple-400"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
                title="Add URL reference"
              >
                <LinkIcon className="w-4 h-4" />
                {referenceUrls.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-purple-500 text-white text-[10px] font-medium rounded-full flex items-center justify-center">
                    {referenceUrls.length}
                  </span>
                )}
              </button>

              {/* AI Provider Toggle (v0 vs Built-in) */}
              <AIProviderToggle
                provider={aiProvider}
                onProviderChange={setAiProvider}
                disabled={isGenerating}
                hasV0Preview={!!v0DemoUrl}
              />

              {/* Unified Mode Selector - Auto, Plan, Connect, Docs */}
              <ModeSelector
                currentMode={currentUIMode}
                onModeChange={handleUIModeChange}
                disabled={isGenerating}
                canConnect={canSwitchToMode("connect")}
                direction="up"
              />

              {/* Model Selector - only show for built-in provider */}
              {aiProvider === "built-in" && (
                <CompactModelSelector
                  selectedModel={selectedModel}
                  onModelChange={setSelectedModel}
                  disabled={isGenerating}
                />
              )}
            </div>

            {/* Right side actions */}
            <div className="flex items-center gap-1">
              {messages.length > 0 && pageSchema && (
                <button
                  type="button"
                  onClick={() => setShowSaveDialog(true)}
                  className="p-2 text-zinc-500 hover:text-purple-400 rounded-lg transition-colors"
                  title="Save as project"
                >
                  <Save className="w-4 h-4" />
                </button>
              )}
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={reset}
                  className="p-2 text-zinc-500 hover:text-zinc-300 rounded-lg transition-colors"
                  title="Start over"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
        </>
        )}
      </div>

      {/* Save Dialog */}
      <SaveDialog
        isOpen={showSaveDialog}
        onClose={() => setShowSaveDialog(false)}
        onSave={handleSave}
        isSaving={isSaving}
      />
    </div>
  );
}
