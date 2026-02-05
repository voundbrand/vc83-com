"use client";

/**
 * BUILDER LANDING PAGE
 *
 * Public landing page for l4yercak3 Builder (like v0.app).
 * Shows prompt input, quick actions, and templates.
 * Redirects to login on interaction if not authenticated.
 */

import { useState, useEffect, useRef, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useAction } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Id } from "@/../convex/_generated/dataModel";
import {
  FileText,
  Image as ImageIcon,
  Gamepad2,
  Calculator,
  ArrowUp,
  RefreshCw,
  LayoutTemplate,
  Layers,
  LayoutDashboard,
  ChevronDown,
  Gift,
  Coins,
  Link as LinkIcon,
  X,
  Paperclip,
  Zap,
  Loader2,
  Check,
  MessageSquare,
  Plug,
  Sparkles,
} from "lucide-react";
import { BuilderLogoMenu } from "@/components/builder/builder-logo-menu";

// UI Mode type for the mode selector dropdown
type BuilderUIMode = "auto" | "plan" | "connect" | "docs";

// Headline variations - randomized on each visit
const headlineVariations = [
  "What do you want to create?",
  "What would you like to build?",
  "What can I help you design?",
  "What's your next big idea?",
  "Ready to build something amazing?",
  "What should we create together?",
];

// Quick action chips (matching v0 style)
const quickActions = [
  { icon: FileText, label: "Contact Form" },
  { icon: ImageIcon, label: "Image Editor" },
  { icon: Gamepad2, label: "Mini Game" },
  { icon: Calculator, label: "Finance Calculator" },
];

// Template categories
const templateCategories = [
  { icon: Gamepad2, label: "Apps and Games" },
  { icon: LayoutTemplate, label: "Landing Pages" },
  { icon: Layers, label: "Components" },
  { icon: LayoutDashboard, label: "Dashboards" },
];

// Sample templates (placeholders - connect to actual template data later)
const sampleTemplates = [
  { id: 1, name: "SaaS Landing", category: "Landing Pages" },
  { id: 2, name: "E-commerce", category: "Landing Pages" },
  { id: 3, name: "Portfolio", category: "Landing Pages" },
  { id: 4, name: "Restaurant", category: "Landing Pages" },
];

// Inner component that uses useSearchParams - must be wrapped in Suspense
function BuilderLandingPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isSignedIn, isLoading, user } = useAuth();
  const [prompt, setPrompt] = useState("");

  // Handle conversation URL parameter - redirect to workspace if signed in
  const conversationId = searchParams.get("conversation");
  useEffect(() => {
    if (conversationId && isSignedIn && !isLoading) {
      // Store conversation ID for the workspace to pick up
      sessionStorage.setItem("builder_pending_conversation", conversationId);
      router.push("/builder/new");
    }
  }, [conversationId, isSignedIn, isLoading, router]);

  // Handle setup mode URL parameter - for agent creation wizard
  const setupParam = searchParams.get("setup");
  useEffect(() => {
    if (setupParam === "true" && isSignedIn && !isLoading) {
      // Store setup mode flag for the workspace to pick up
      sessionStorage.setItem("builder_pending_setup_mode", "true");
      router.push("/builder/new");
    }
  }, [setupParam, isSignedIn, isLoading, router]);

  // Auto-redirect to workspace if user just logged in with a pending prompt
  useEffect(() => {
    if (isSignedIn && !isLoading) {
      const pendingPrompt = sessionStorage.getItem("builder_pending_prompt");
      if (pendingPrompt) {
        // Prompt is already in sessionStorage — workspace will pick it up
        router.push("/builder/new");
      }
    }
  }, [isSignedIn, isLoading, router]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [headline, setHeadline] = useState(headlineVariations[0]);
  const [selectedModel, setSelectedModel] = useState<string | undefined>(undefined);
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  const [isPlanningMode, setIsPlanningMode] = useState(false); // Default to Auto mode
  const [isDocsMode, setIsDocsMode] = useState(false);
  const [isModeMenuOpen, setIsModeMenuOpen] = useState(false);
  const modeMenuRef = useRef<HTMLDivElement>(null);
  const [referenceUrls, setReferenceUrls] = useState<string[]>([]);
  const [urlInput, setUrlInput] = useState("");
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [attachedText, setAttachedText] = useState<{ content: string; preview: string } | null>(null);
  const [isFetchingUrls, setIsFetchingUrls] = useState(false);
  const [urlContents, setUrlContents] = useState<Record<string, string>>({});
  const modelMenuRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Convex action for fetching URL content
  const fetchUrlContent = useAction(api.ai.webReader.fetchUrlContent);

  // Character threshold for converting to file attachment
  const LONG_TEXT_THRESHOLD = 1500;

  // Get organization's AI settings for model list
  const organizationId = user?.defaultOrgId as Id<"organizations"> | undefined;
  const aiSettings = useQuery(
    api.ai.settings.getAISettings,
    organizationId ? { organizationId } : "skip"
  );

  // Get all platform-enabled models
  const allPlatformModels = useQuery(api.ai.platformModels.getEnabledModelsByProvider);

  // Filter to show only the organization's enabled models
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

  // Build flat model list for display
  const modelList = useMemo(() => {
    if (!platformModels) return [];
    return Object.entries(platformModels).flatMap(([provider, models]) =>
      models.map((m) => ({ ...m, provider }))
    );
  }, [platformModels]);

  // Get display name for current model
  const getModelDisplayName = (modelId: string) => {
    const model = modelList.find((m) => m.modelId === modelId);
    return model?.name || modelId.split("/")[1] || modelId;
  };

  // Close model menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modelMenuRef.current && !modelMenuRef.current.contains(event.target as Node)) {
        setIsModelMenuOpen(false);
      }
      if (modeMenuRef.current && !modeMenuRef.current.contains(event.target as Node)) {
        setIsModeMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Derive current UI mode from state
  const currentUIMode: BuilderUIMode = useMemo(() => {
    if (isDocsMode) return "docs";
    if (isPlanningMode) return "plan";
    return "auto";
  }, [isDocsMode, isPlanningMode]);

  // Handle UI mode change
  const handleUIModeChange = (mode: BuilderUIMode) => {
    // Reset all mode states
    setIsDocsMode(false);
    setIsPlanningMode(false);

    switch (mode) {
      case "auto":
        // Default state - both false
        break;
      case "plan":
        setIsPlanningMode(true);
        break;
      case "connect":
        // Connect mode not available on landing page (no page generated yet)
        // Just ignore this selection
        break;
      case "docs":
        setIsDocsMode(true);
        break;
    }
    setIsModeMenuOpen(false);
  };

  // Randomize headline on mount
  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * headlineVariations.length);
    setHeadline(headlineVariations[randomIndex]);
  }, []);

  // Auto-resize textarea and scroll into view
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const newHeight = Math.min(textareaRef.current.scrollHeight, 300); // Max 300px
      textareaRef.current.style.height = `${newHeight}px`;
      // Scroll textarea into view if it's getting tall
      if (newHeight > 150) {
        textareaRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [prompt]);

  // URL regex pattern for detection
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

    // Check if it's ONLY URLs (no other content) - don't add to prompt
    if (urls && urls.length > 0) {
      const nonUrlContent = trimmed.replace(urlPattern, "").replace(/\s+/g, "");
      if (nonUrlContent.length < trimmed.length * 0.2) {
        e.preventDefault();
        return;
      }
    }

    // For long text (with URLs stripped out for the attachment), convert to file attachment
    if (pastedText.length > LONG_TEXT_THRESHOLD) {
      e.preventDefault();
      // Store the text (URLs will be handled separately via references)
      const preview = pastedText.slice(0, 100) + (pastedText.length > 100 ? "..." : "");
      setAttachedText({ content: pastedText, preview });
      if (!prompt.trim()) {
        setPrompt("I've attached some reference text for context.");
      }
    }
    // Otherwise, let the paste happen normally (URLs still get extracted above)
  };

  // Add a URL to references and fetch its content (extracted for reuse)
  const addUrlToReferences = async (url: string) => {
    if (!isValidUrl(url) || referenceUrls.includes(url)) return;

    setReferenceUrls((prev) => [...prev, url]);

    // Fetch URL content in the background
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

  // Add URL reference from the manual input field
  const addUrlReference = async () => {
    const url = urlInput.trim();
    if (url && isValidUrl(url)) {
      setUrlInput("");
      setShowUrlInput(false);
      await addUrlToReferences(url);
    }
  };

  // Check if string is a valid URL
  const isValidUrl = (str: string) => {
    try {
      new URL(str);
      return true;
    } catch {
      return false;
    }
  };

  // Remove URL reference
  const removeUrlReference = (index: number) => {
    const urlToRemove = referenceUrls[index];
    setReferenceUrls((prev) => prev.filter((_, i) => i !== index));
    // Clean up the fetched content
    if (urlToRemove && urlContents[urlToRemove]) {
      setUrlContents((prev) => {
        const newContents = { ...prev };
        delete newContents[urlToRemove];
        return newContents;
      });
    }
  };

  // Remove attached text
  const removeAttachedText = () => {
    setAttachedText(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() && !attachedText) return;

    // Build the full prompt including attached text and reference URLs
    let fullPrompt = prompt;

    // Add attached text if present
    if (attachedText) {
      fullPrompt += `\n\n--- ATTACHED REFERENCE TEXT ---\n${attachedText.content}\n--- END REFERENCE TEXT ---`;
    }

    // Add reference URLs with their fetched content if available
    if (referenceUrls.length > 0) {
      fullPrompt += `\n\n--- REFERENCE URLS FOR DESIGN INSPIRATION ---`;
      for (const url of referenceUrls) {
        fullPrompt += `\n\nURL: ${url}`;
        if (urlContents[url]) {
          fullPrompt += `\n\n${urlContents[url]}`;
        }
      }
      fullPrompt += `\n--- END REFERENCE URLS ---`;
    }

    // Add mode indicators
    if (isPlanningMode) {
      fullPrompt = `[PLANNING MODE - Please discuss and iterate on the design before creating]\n\n${fullPrompt}`;
    }
    if (isDocsMode) {
      fullPrompt = `[DOCS MODE - Document editor mode]\n\n${fullPrompt}`;
    }

    // If not signed in, redirect to login with return URL
    if (!isSignedIn) {
      // Store the prompt and model in sessionStorage so we can restore them after login
      sessionStorage.setItem("builder_pending_prompt", fullPrompt);
      if (selectedModel) {
        sessionStorage.setItem("builder_pending_model", selectedModel);
      }
      if (isPlanningMode) {
        sessionStorage.setItem("builder_pending_planning_mode", "true");
      }
      if (isDocsMode) {
        sessionStorage.setItem("builder_pending_docs_mode", "true");
      }
      // Tell root page to redirect back to builder after auth
      sessionStorage.setItem("auth_return_url", "/builder");
      // If inside an iframe (e.g., the fake browser window), navigate the top window
      const loginUrl = "/?openLogin=builder";
      if (window.self !== window.top) {
        window.top!.location.href = loginUrl;
      } else {
        router.push(loginUrl);
      }
      return;
    }

    // Signed in - store prompt and model in sessionStorage and navigate to workspace
    // The workspace will pick up the pending prompt and model and start the conversation
    setIsSubmitting(true);
    sessionStorage.setItem("builder_pending_prompt", fullPrompt);
    if (selectedModel) {
      sessionStorage.setItem("builder_pending_model", selectedModel);
    } else {
      sessionStorage.removeItem("builder_pending_model");
    }
    if (isPlanningMode) {
      sessionStorage.setItem("builder_pending_planning_mode", "true");
    } else {
      sessionStorage.removeItem("builder_pending_planning_mode");
    }
    if (isDocsMode) {
      sessionStorage.setItem("builder_pending_docs_mode", "true");
    } else {
      sessionStorage.removeItem("builder_pending_docs_mode");
    }
    router.push("/builder/new");
  };

  const handleQuickAction = (action: string) => {
    const prompts: Record<string, string> = {
      "Contact Form": `Create a professional contact form page with:
- Modern, clean design with a hero section explaining why to get in touch
- Form fields: Full name, email, phone (optional), subject dropdown, message textarea
- Form validation with helpful error messages
- Success state with confirmation message
- Business contact info sidebar (email, phone, address, business hours)
- FAQ accordion section below the form
- Social proof: "Typically respond within 24 hours" badge`,
      "Image Editor": `Create a browser-based image editor with:
- Drag & drop image upload area
- Canvas-based editing with real-time preview
- Tools: Crop, rotate, flip, brightness/contrast sliders, saturation
- Filter presets: Original, Grayscale, Sepia, Vintage, High Contrast
- Undo/redo history stack
- Export options: Download as PNG/JPEG with quality slider
- Responsive design that works on tablet and desktop`,
      "Mini Game": `Create an addictive Snake game with:
- Clean, modern UI with neon color scheme
- Smooth animations and satisfying sound effects
- Score counter with high score persistence (localStorage)
- Difficulty levels: Easy, Medium, Hard (affects speed)
- Mobile-friendly touch controls + keyboard support
- Game over screen with retry button and score sharing
- Leaderboard showing top 10 local scores`,
      "Finance Calculator": `Create a comprehensive loan calculator with:
- Tabs for: Mortgage, Auto Loan, Personal Loan
- Inputs: Loan amount, interest rate, term (months/years), down payment
- Real-time calculation of monthly payment
- Amortization schedule table (expandable/collapsible)
- Visual pie chart showing principal vs interest breakdown
- Total interest paid and total cost summary
- "Compare rates" feature showing how different rates affect payments
- Print/export functionality for the amortization schedule`,
    };
    setPrompt(prompts[action] || "");
  };

  const handleTemplateClick = (templateId: number) => {
    if (!isSignedIn) {
      sessionStorage.setItem("builder_pending_template", String(templateId));
      router.push("/");
      return;
    }
    // Store template ID in sessionStorage for the workspace to pick up
    sessionStorage.setItem("builder_pending_template", String(templateId));
    router.push("/builder/new");
  };

  const [isLogoMenuOpen, setIsLogoMenuOpen] = useState(false);

  return (
    <div className="min-h-screen text-zinc-100" style={{ backgroundColor: '#0a0a0a' }}>
      {/* Navigation - Different layout for logged in vs logged out */}
      <nav className="h-14 flex items-center justify-between px-4 border-b border-zinc-800/50">
        {/* Left: Logo (with hover menu when logged in) */}
        {isSignedIn ? (
          <div
            className="relative"
            onMouseEnter={() => setIsLogoMenuOpen(true)}
            onMouseLeave={() => setIsLogoMenuOpen(false)}
          >
            <button className="flex items-center p-2 rounded-lg hover:bg-zinc-800 transition-colors">
              <Image
                src="/android-chrome-512x512.png"
                alt="l4yercak3"
                width={28}
                height={28}
                className="rounded"
              />
            </button>
            {/* Logo Dropdown Menu - appears on hover */}
            {isLogoMenuOpen && (
              <div className="absolute top-full left-0 pt-1 z-50">
                <BuilderLogoMenu onClose={() => setIsLogoMenuOpen(false)} />
              </div>
            )}
          </div>
        ) : (
          <Link href="/builder" className="flex items-center p-2">
            <Image
              src="/android-chrome-512x512.png"
              alt="l4yercak3"
              width={28}
              height={28}
              className="rounded"
            />
          </Link>
        )}

        {/* Center: Nav Links (only when logged out) */}
        {!isSignedIn && !isLoading && (
          <div className="hidden md:flex items-center gap-1">
            <button className="flex items-center gap-1 px-3 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">
              Templates
              <ChevronDown className="w-3 h-3" />
            </button>
            <button className="flex items-center gap-1 px-3 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">
              Resources
              <ChevronDown className="w-3 h-3" />
            </button>
            <Link href="/enterprise" className="px-3 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">
              Enterprise
            </Link>
            <Link href="/pricing" className="px-3 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">
              Pricing
            </Link>
            <Link href="/ios" className="px-3 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">
              iOS
            </Link>
            <Link href="/students" className="px-3 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">
              Students
            </Link>
            <Link href="/faq" className="px-3 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">
              FAQ
            </Link>
          </div>
        )}

        {/* Right: Auth Buttons or User Menu */}
        <div className="flex items-center gap-2">
          {isLoading ? (
            <div className="w-20 h-8 bg-zinc-800 rounded animate-pulse" />
          ) : isSignedIn ? (
            <>
              {/* Feedback Button */}
              <button className="px-3 py-1.5 text-sm text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors">
                Feedback
              </button>
              {/* Refer Button */}
              <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors">
                <Gift className="w-4 h-4" />
                Refer
              </button>
              {/* Credits Button */}
              <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors">
                <Coins className="w-4 h-4" />
                <span>21.59</span>
              </button>
              {/* Avatar */}
              <button className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 via-yellow-400 to-green-400 hover:opacity-90 transition-opacity" />
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  sessionStorage.setItem("auth_return_url", "/builder");
                  const loginUrl = "/?openLogin=builder";
                  if (window.self !== window.top) {
                    window.top!.location.href = loginUrl;
                  } else {
                    router.push(loginUrl);
                  }
                }}
                className="px-4 py-2 text-sm text-zinc-300 hover:text-white transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={() => {
                  sessionStorage.setItem("auth_return_url", "/builder");
                  const loginUrl = "/?openLogin=builder";
                  if (window.self !== window.top) {
                    window.top!.location.href = loginUrl;
                  } else {
                    router.push(loginUrl);
                  }
                }}
                className="px-4 py-2 bg-white text-black text-sm font-medium rounded-lg hover:bg-zinc-200 transition-colors"
              >
                Sign Up
              </button>
            </>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-3xl mx-auto px-4 pt-24 pb-16">
        {/* Heading - Pure white, no gradient */}
        <h1 className="text-3xl md:text-4xl font-medium text-white text-center mb-10 leading-tight">
          {headline}
        </h1>

        {/* Prompt Input */}
        <form onSubmit={handleSubmit} className="mb-6">
          <div className="relative bg-zinc-900 border border-zinc-800 rounded-2xl">
            {/* Attached items display */}
            {(attachedText || referenceUrls.length > 0) && (
              <div className="px-4 pt-3 flex flex-wrap gap-2">
                {/* Attached text file */}
                {attachedText && (
                  <div className="flex items-center gap-2 px-2 py-1 bg-zinc-800 border border-zinc-700 rounded-lg text-xs">
                    <Paperclip className="w-3 h-3 text-zinc-400" />
                    <span className="text-zinc-300 max-w-[150px] truncate">{attachedText.preview}</span>
                    <button
                      type="button"
                      onClick={removeAttachedText}
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
                        type="button"
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

            {/* URL input field (conditionally shown) */}
            {showUrlInput && (
              <div className="px-4 pt-3 flex items-center gap-2">
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://example.com"
                  className="flex-1 px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
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
                  type="button"
                  onClick={addUrlReference}
                  disabled={!urlInput.trim() || !isValidUrl(urlInput.trim())}
                  className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => { setShowUrlInput(false); setUrlInput(""); }}
                  className="p-1.5 text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onPaste={handlePaste}
              placeholder={
                isDocsMode
                  ? "Describe your document..."
                  : isPlanningMode
                  ? "Describe what you want to plan..."
                  : "Ask l4yercak3 to build..."
              }
              className="w-full min-h-[100px] max-h-[300px] px-4 pt-4 pb-14 bg-transparent text-zinc-100 placeholder-zinc-500 focus:outline-none resize-none overflow-y-auto"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {/* Model Selector Dropdown */}
                <div className="relative" ref={modelMenuRef}>
                  <button
                    type="button"
                    onClick={() => setIsModelMenuOpen(!isModelMenuOpen)}
                    className={`flex items-center gap-1.5 px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-400 hover:text-zinc-300 transition-colors border border-zinc-700 ${
                      isModelMenuOpen ? "rounded-t-md border-b-0" : "rounded-md"
                    }`}
                  >
                    <Image
                      src="/android-chrome-512x512.png"
                      alt=""
                      width={14}
                      height={14}
                      className="rounded"
                    />
                    <span className="max-w-[80px] truncate">
                      {selectedModel ? getModelDisplayName(selectedModel) : "l4yercak3"}
                    </span>
                    <ChevronDown className={`w-3 h-3 transition-transform ${isModelMenuOpen ? "rotate-180" : ""}`} />
                  </button>

                  {/* Dropdown Menu - opens downward, connected to button */}
                  {isModelMenuOpen && (
                    <div className="absolute top-full left-0 mt-0 w-48 bg-zinc-800 border border-zinc-700 border-t-0 rounded-b-md shadow-lg z-50 max-h-48 overflow-y-auto">
                      {/* Default option */}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedModel(undefined);
                          setIsModelMenuOpen(false);
                        }}
                        className={`w-full px-2 py-1.5 text-left text-xs hover:bg-zinc-700 transition-colors ${
                          !selectedModel ? "bg-zinc-700" : ""
                        }`}
                      >
                        <span className="text-zinc-200">Auto</span>
                      </button>

                      {/* Models list */}
                      {modelList.map((model) => (
                        <button
                          key={model.modelId}
                          type="button"
                          onClick={() => {
                            setSelectedModel(model.modelId);
                            setIsModelMenuOpen(false);
                          }}
                          className={`w-full px-2 py-1.5 text-left text-xs hover:bg-zinc-700 transition-colors truncate ${
                            selectedModel === model.modelId ? "bg-purple-900/30" : ""
                          }`}
                        >
                          <span className="text-zinc-200">{model.name}</span>
                        </button>
                      ))}

                      {modelList.length === 0 && !isSignedIn && (
                        <div className="px-2 py-1.5 text-xs text-zinc-500">
                          Sign in for more models
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Mode Selector Dropdown - All 4 modes */}
                <div className="relative" ref={modeMenuRef}>
                  {(() => {
                    // Mode configuration
                    const modeConfig: Record<BuilderUIMode, {
                      icon: React.ReactNode;
                      label: string;
                      description: string;
                      color: string;
                      bgColor: string;
                    }> = {
                      auto: {
                        icon: <Zap className="w-3 h-3" />,
                        label: "Auto",
                        description: "Execute directly",
                        color: "text-zinc-400",
                        bgColor: "",
                      },
                      plan: {
                        icon: <MessageSquare className="w-3 h-3" />,
                        label: "Plan",
                        description: "Discuss before executing",
                        color: "text-blue-400",
                        bgColor: "bg-blue-500/10",
                      },
                      connect: {
                        icon: <Plug className="w-3 h-3" />,
                        label: "Connect",
                        description: "Link to real data",
                        color: "text-emerald-400",
                        bgColor: "bg-emerald-500/10",
                      },
                      docs: {
                        icon: <FileText className="w-3 h-3" />,
                        label: "Docs",
                        description: "Document editor mode",
                        color: "text-purple-400",
                        bgColor: "bg-purple-500/10",
                      },
                    };

                    const current = modeConfig[currentUIMode];

                    return (
                      <>
                        <button
                          type="button"
                          onClick={() => setIsModeMenuOpen(!isModeMenuOpen)}
                          className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors border ${
                            currentUIMode !== "auto"
                              ? `${current.color} ${current.bgColor} border-transparent`
                              : "text-zinc-400 hover:text-zinc-300 hover:bg-zinc-700 bg-zinc-800 border-zinc-700"
                          }`}
                        >
                          {current.icon}
                          <span className="text-xs">{current.label}</span>
                          <ChevronDown className={`w-3 h-3 transition-transform ${isModeMenuOpen ? "rotate-180" : ""}`} />
                        </button>

                        {/* Dropdown menu - opens downward */}
                        {isModeMenuOpen && (
                          <div className="absolute top-full left-0 mt-1 w-44 bg-zinc-900 rounded-lg shadow-xl z-50 py-1 overflow-hidden border border-zinc-800">
                            {(["auto", "plan", "connect", "docs"] as BuilderUIMode[]).map((mode) => {
                              const config = modeConfig[mode];
                              const isActive = currentUIMode === mode;
                              // Connect mode is disabled on landing page (no page generated yet)
                              const isDisabled = mode === "connect";

                              return (
                                <button
                                  key={mode}
                                  type="button"
                                  onClick={() => handleUIModeChange(mode)}
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
                        )}
                      </>
                    );
                  })()}
                </div>

                {/* Add URL Reference Button */}
                <button
                  type="button"
                  onClick={() => setShowUrlInput(!showUrlInput)}
                  className={`flex items-center gap-1.5 px-2 py-1 text-xs rounded-md border transition-colors ${
                    showUrlInput || referenceUrls.length > 0
                      ? "bg-blue-600/20 border-blue-500/50 text-blue-400"
                      : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-300"
                  }`}
                  title="Add URL reference for design inspiration"
                >
                  <LinkIcon className="w-3 h-3" />
                  <span>{referenceUrls.length > 0 ? referenceUrls.length : "Link"}</span>
                </button>
              </div>
              <button
                type="submit"
                disabled={(!prompt.trim() && !attachedText) || isSubmitting || isFetchingUrls}
                className="p-2 bg-zinc-700 text-zinc-300 rounded-lg hover:bg-zinc-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title={isFetchingUrls ? "Fetching URL content..." : undefined}
              >
                {isSubmitting || isFetchingUrls ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <ArrowUp className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Quick Actions */}
        <div className="flex flex-wrap justify-center gap-2 mb-20">
          {/* Layers - Automation workflows (highlighted purple) */}
          <button
            onClick={() => {
              if (!isSignedIn) {
                sessionStorage.setItem("auth_return_url", "/layers");
                const loginUrl = "/?openLogin=true";
                if (window.self !== window.top) {
                  window.top!.location.href = loginUrl;
                } else {
                  router.push(loginUrl);
                }
              } else {
                router.push("/layers");
              }
            }}
            className="flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/50 rounded-full text-sm text-purple-400 hover:bg-purple-500/20 hover:text-purple-300 hover:border-purple-400 transition-colors"
          >
            <Layers className="w-4 h-4" />
            Layers
          </button>
          {/* New Agent - Setup Mode (highlighted cyan) */}
          <button
            onClick={() => {
              sessionStorage.setItem("builder_pending_setup_mode", "true");
              if (!isSignedIn) {
                sessionStorage.setItem("auth_return_url", "/builder");
                const loginUrl = "/?openLogin=builder";
                if (window.self !== window.top) {
                  window.top!.location.href = loginUrl;
                } else {
                  router.push(loginUrl);
                }
              } else {
                router.push("/builder/new");
              }
            }}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/50 rounded-full text-sm text-cyan-400 hover:bg-cyan-500/20 hover:text-cyan-300 hover:border-cyan-400 transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            New Agent
          </button>
          {/* Standard quick actions */}
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                onClick={() => handleQuickAction(action.label)}
                className="flex items-center gap-2 px-4 py-2 bg-transparent border border-zinc-800 rounded-full text-sm text-zinc-400 hover:bg-zinc-900 hover:text-zinc-300 hover:border-zinc-700 transition-colors"
              >
                <Icon className="w-4 h-4" />
                {action.label}
              </button>
            );
          })}
          <button className="p-2 bg-transparent border border-zinc-800 rounded-full text-zinc-500 hover:bg-zinc-900 hover:text-zinc-400 hover:border-zinc-700 transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

      </main>

      {/* Templates Section - Full width */}
      <section className="max-w-6xl mx-auto px-4 pb-20">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-medium text-zinc-200">
            Start with a template
          </h2>
          <div className="flex items-center gap-2">
            {templateCategories.map((cat) => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.label}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-400 bg-transparent border border-zinc-800 rounded-lg hover:bg-zinc-900 hover:text-zinc-300 hover:border-zinc-700 transition-colors"
                >
                  <Icon className="w-3.5 h-3.5" />
                  {cat.label}
                </button>
              );
            })}
            <Link
              href="/builder/templates"
              className="text-xs text-zinc-400 hover:text-zinc-300 ml-2 flex items-center gap-1"
            >
              Browse all
              <span>→</span>
            </Link>
          </div>
        </div>

        {/* Template Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {sampleTemplates.map((template) => (
            <button
              key={template.id}
              onClick={() => handleTemplateClick(template.id)}
              className="group relative aspect-[4/3] bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden hover:border-zinc-700 transition-colors"
            >
              {/* Placeholder - would show template preview */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <LayoutTemplate className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
                  <span className="text-xs text-zinc-600">{template.name}</span>
                </div>
              </div>
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-zinc-800/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="text-sm font-medium text-zinc-300">Use Template</span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-900 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-zinc-600">
          <p>Built with l4yercak3</p>
        </div>
      </footer>
    </div>
  );
}

// Default export wraps the inner component in Suspense for Next.js static generation
export default function BuilderLandingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen text-zinc-100 flex items-center justify-center" style={{ backgroundColor: '#0a0a0a' }}>
        <div className="w-8 h-8 border-2 border-zinc-600 border-t-zinc-300 rounded-full animate-spin" />
      </div>
    }>
      <BuilderLandingPageInner />
    </Suspense>
  );
}
