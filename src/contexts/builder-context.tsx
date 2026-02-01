"use client";

/**
 * BUILDER CONTEXT
 *
 * State management for the AI page builder.
 * Handles conversation, page schema, generation state, and project saving.
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  type ReactNode,
} from "react";
import { useMemo } from "react";
import { useMutation, useAction, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { analyzeV0FilesForConnections } from "@/lib/builder/v0-file-analyzer";
import { API_CATEGORIES } from "@/lib/api-catalog";
import type { Id } from "@convex/_generated/dataModel";
import type { AIGeneratedPageSchema } from "@/lib/page-builder/page-schema";
import { parseAndValidateAIResponse } from "@/lib/page-builder/validators";
import { useAuth } from "@/hooks/use-auth";

// ============================================================================
// THREE-MODE ARCHITECTURE TYPES
// ============================================================================

/**
 * Builder Mode - Controls how the AI generates pages
 * - prototype: Fast iteration, no database writes, placeholder data (Auto mode)
 * - connect: Link prototype to real data with validation
 */
export type BuilderMode = "prototype" | "connect";

/**
 * Detected item from page analysis - represents a product, event, or contact
 * that may need to be connected to real database records
 */
export interface DetectedItem {
  /** Unique ID for this detected item */
  id: string;
  /** Type of item detected */
  type: "product" | "event" | "contact" | "form" | "invoice" | "ticket" | "booking" | "workflow" | "checkout";
  /** The placeholder data from the prototype page */
  placeholderData: {
    name?: string;
    price?: number | string;
    description?: string;
    date?: string;
    email?: string;
    [key: string]: unknown;
  };
  /** Existing records that might match this item */
  existingMatches: ExistingRecord[];
  /** User's choice for how to handle this item */
  connectionChoice: "create" | "link" | "skip" | null;
  /** ID of the linked record (if choice is "link") */
  linkedRecordId: string | null;
  /** ID of newly created record (if choice is "create" and executed) */
  createdRecordId: string | null;
}

/**
 * An existing database record that might match a detected item
 */
export interface ExistingRecord {
  id: string;
  name: string;
  /** How closely this matches the placeholder (0-1) */
  similarity: number;
  /** Is this an exact name match? */
  isExactMatch: boolean;
  /** Additional info for display */
  details?: Record<string, unknown>;
}

/**
 * A section in the page that has items needing connection
 */
export interface SectionConnection {
  /** Section ID from the page schema */
  sectionId: string;
  /** Section type (pricing, team, events, etc.) */
  sectionType: string;
  /** Section label for display */
  sectionLabel: string;
  /** Items detected in this section */
  detectedItems: DetectedItem[];
  /** Current connection status */
  connectionStatus: "pending" | "in_progress" | "connected" | "skipped";
}

/**
 * A record that has been linked to the page
 */
export interface LinkedRecord {
  /** Database record ID */
  recordId: string;
  /** Type of record */
  recordType: "product" | "event" | "contact" | "form" | "invoice" | "ticket" | "booking" | "workflow" | "checkout";
  /** Section ID this record is linked to */
  sectionId: string;
  /** Item ID within the section */
  itemId: string;
  /** Was this created new or linked to existing? */
  wasCreated: boolean;
}

// ============================================================================
// MULTI-PAGE PROJECT TYPES
// ============================================================================

/**
 * A page within a multi-page project
 */
export interface ProjectPage {
  /** Unique ID for this page within the project */
  id: string;
  /** Display name for the page */
  name: string;
  /** URL slug for the page (used in navigation links) */
  slug: string;
  /** The page schema/content */
  schema: AIGeneratedPageSchema | null;
  /** Associated conversation ID for this page's chat history */
  conversationId?: string;
  /** Is this the default/home page? */
  isDefault?: boolean;
}

/**
 * Navigation link for site-wide navigation
 */
export interface ProjectNavLink {
  /** Display label */
  label: string;
  /** Page ID to link to (internal) or URL (external) */
  href: string;
  /** Is this an external link? */
  isExternal?: boolean;
}

/**
 * Project-level navigation configuration
 */
export interface ProjectNavigation {
  /** Header navigation links */
  header: ProjectNavLink[];
  /** Footer navigation links */
  footer?: ProjectNavLink[];
}

// ============================================================================
// ERROR PARSING HELPER
// ============================================================================

interface ParsedError {
  type: "user_budget" | "platform_error" | "rate_limit" | "api" | "network" | "unknown";
  message: string;
  canRetry: boolean;
  actionLabel?: string;
  actionUrl?: string;
  /** If true, this is a platform issue that admins should be notified about */
  isAdminAlert?: boolean;
}

function parseApiError(error: unknown): ParsedError {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const lowerMessage = errorMessage.toLowerCase();

  // USER budget exceeded (their credits on our platform)
  // This comes from our own check in chat.ts: "Monthly AI budget exceeded"
  if (
    lowerMessage.includes("monthly ai budget exceeded") ||
    lowerMessage.includes("budget exceeded")
  ) {
    return {
      type: "user_budget",
      message: "You've used all your AI credits for this month. Purchase more to continue.",
      canRetry: false,
      actionLabel: "Buy Credits",
      actionUrl: "/shop/ai-credits", // Your platform's credit purchase page
    };
  }

  // PLATFORM payment error (OpenRouter 402 - OUR API key ran out)
  // This is an admin issue, not the user's fault
  if (
    lowerMessage.includes("402") ||
    lowerMessage.includes("payment required") ||
    lowerMessage.includes("insufficient") && lowerMessage.includes("credit")
  ) {
    return {
      type: "platform_error",
      message: "Our AI service is temporarily unavailable. Our team has been notified and is working on it.",
      canRetry: false,
      isAdminAlert: true, // Trigger admin notification
    };
  }

  // Rate limit errors
  if (
    lowerMessage.includes("rate limit") ||
    lowerMessage.includes("429") ||
    lowerMessage.includes("too many requests")
  ) {
    return {
      type: "rate_limit",
      message: "Rate limit exceeded. Please wait a moment before trying again.",
      canRetry: true,
    };
  }

  // Network errors
  if (
    lowerMessage.includes("network") ||
    lowerMessage.includes("fetch") ||
    lowerMessage.includes("connection") ||
    lowerMessage.includes("timeout") ||
    lowerMessage.includes("econnrefused")
  ) {
    return {
      type: "network",
      message: "Network error. Please check your connection and try again.",
      canRetry: true,
    };
  }

  // Generic API errors (500, 503, etc.) - likely platform issues
  if (
    lowerMessage.includes("500") ||
    lowerMessage.includes("503") ||
    lowerMessage.includes("server error") ||
    lowerMessage.includes("openrouter")
  ) {
    return {
      type: "api",
      message: "AI service temporarily unavailable. Please try again in a moment.",
      canRetry: true,
      isAdminAlert: true, // Notify admins of service issues
    };
  }

  // Unknown error - default
  return {
    type: "unknown",
    message: errorMessage || "Something went wrong. Please try again.",
    canRetry: true,
  };
}

// ============================================================================
// TYPES
// ============================================================================

export interface BuilderMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  /** If assistant message contains valid page JSON */
  pageSchema?: AIGeneratedPageSchema;
  /** Processing time in seconds (for assistant messages) */
  processingTime?: number;
  /** Error details for system error messages */
  errorDetails?: {
    type: "user_budget" | "platform_error" | "rate_limit" | "api" | "network" | "unknown";
    canRetry: boolean;
    actionLabel?: string;
    actionUrl?: string;
    isAdminAlert?: boolean;
  };
  /** Heal-specific metadata for deployment self-heal messages */
  healData?: {
    type: "heal_start" | "heal_progress" | "heal_success" | "heal_failed";
    attemptNumber?: number;
    maxAttempts?: number;
    strategy?: "surgical" | "v0_regeneration";
    fixCount?: number;
    rootCause?: string;
    buildLogs?: string;
    fileDiffs?: Array<{
      filePath: string;
      oldContent: string;
      newContent: string;
      explanation: string;
    }>;
  };
}

interface BuilderContextType {
  // Session info
  organizationId: Id<"organizations"> | null;
  sessionId: string | null;

  // Page state
  pageSchema: AIGeneratedPageSchema | null;
  setPageSchema: (schema: AIGeneratedPageSchema | null) => void;

  // Conversation state
  conversationId: Id<"aiConversations"> | null;
  messages: BuilderMessage[];

  // Generation state
  isGenerating: boolean;
  generationError: string | null;

  // Model selection
  selectedModel: string | undefined;
  setSelectedModel: (model: string | undefined) => void;

  // V0 integration
  aiProvider: "built-in" | "v0";
  setAiProvider: (provider: "built-in" | "v0") => void;
  v0ChatId: string | null;
  v0DemoUrl: string | null;
  v0WebUrl: string | null;

  // Builder app (created when connecting v0 app to platform)
  builderAppId: Id<"objects"> | null;
  setBuilderAppId: (id: Id<"objects"> | null) => void;

  // Selected section (for highlighting)
  selectedSectionId: string | null;
  setSelectedSectionId: (id: string | null) => void;

  // Edit mode (legacy - being replaced by builderMode)
  isEditMode: boolean;
  setIsEditMode: (enabled: boolean) => void;

  // Planning mode - AI discusses specs before executing tools
  isPlanningMode: boolean;
  setIsPlanningMode: (enabled: boolean) => void;

  // ============================================================================
  // THREE-MODE ARCHITECTURE
  // ============================================================================

  /** Current builder mode: prototype, connect, or edit */
  builderMode: BuilderMode;
  /** Set the builder mode */
  setBuilderMode: (mode: BuilderMode) => void;

  /** The prototype page JSON (before connecting to real data) */
  prototypePageJson: AIGeneratedPageSchema | null;
  /** Set the prototype page JSON */
  setPrototypePageJson: (schema: AIGeneratedPageSchema | null) => void;

  /** Connected page ID (after saving with real data) */
  connectedPageId: Id<"objects"> | null;
  /** Set connected page ID */
  setConnectedPageId: (id: Id<"objects"> | null) => void;

  /** Pending connections detected from page analysis */
  pendingConnections: SectionConnection[];
  /** Set pending connections */
  setPendingConnections: (connections: SectionConnection[]) => void;

  /** Records that have been linked to the page */
  linkedRecords: LinkedRecord[];
  /** Set linked records */
  setLinkedRecords: (records: LinkedRecord[]) => void;

  /** Analyze current page for connections (call when entering connect mode) */
  analyzePageForConnections: () => Promise<void>;

  /** Update a single connection choice */
  updateConnectionChoice: (
    sectionId: string,
    itemId: string,
    choice: "create" | "link" | "skip",
    linkedRecordId?: string
  ) => void;

  /** Execute all pending connections */
  executeConnections: () => Promise<boolean>;

  /** Add a manual connection item to an empty section */
  addManualConnectionItem: (sectionId: string, type: DetectedItem["type"]) => void;

  /** Whether connection analysis is in progress */
  isAnalyzingConnections: boolean;

  /** Production URL from Vercel deployment (null if not deployed) */
  productionUrl: string | null;

  /** Whether the inspector mode is active (click-to-select in live preview) */
  inspectorMode: boolean;
  /** Toggle inspector mode */
  setInspectorMode: (enabled: boolean) => void;

  /** Check if we can switch to a given mode */
  canSwitchToMode: (mode: BuilderMode) => boolean;

  // ============================================================================
  // MULTI-PAGE PROJECT
  // ============================================================================

  /** All pages in the current project */
  pages: ProjectPage[];
  /** Currently active page ID */
  currentPageId: string | null;
  /** Project-level navigation */
  projectNavigation: ProjectNavigation;

  /** Switch to a different page in the project */
  setCurrentPage: (pageId: string) => void;
  /** Add a new page to the project */
  addPage: (name: string, slug?: string) => string;
  /** Update a page's schema */
  updatePageSchema: (pageId: string, schema: AIGeneratedPageSchema) => void;
  /** Rename a page */
  renamePage: (pageId: string, newName: string) => void;
  /** Delete a page from the project */
  deletePage: (pageId: string) => void;
  /** Duplicate a page */
  duplicatePage: (pageId: string) => string;
  /** Update project navigation */
  setProjectNavigation: (nav: ProjectNavigation) => void;
  /** Navigate to a page by slug (used for link interception) */
  navigateToPageBySlug: (slug: string) => boolean;

  // Actions
  sendMessage: (message: string) => Promise<void>;
  retryLastMessage: () => Promise<void>;
  saveAsProject: (name: string) => Promise<Id<"objects"> | null>;
  loadProject: (projectId: Id<"objects">) => Promise<void>;
  reset: () => void;
  clearError: () => void;

  // Programmatic message injection (for deploy heal flow, etc.)
  addSystemMessage: (content: string, errorDetails?: BuilderMessage["errorDetails"], healData?: BuilderMessage["healData"]) => void;
  addAssistantMessage: (content: string, options?: { processingTime?: number; healData?: BuilderMessage["healData"] }) => void;
}

// ============================================================================
// CONTEXT
// ============================================================================

const BuilderContext = createContext<BuilderContextType | undefined>(undefined);

// ============================================================================
// PROVIDER
// ============================================================================

interface BuilderProviderProps {
  children: ReactNode;
  organizationId: Id<"organizations"> | null;
  sessionId: string | null;
  /** Optional conversation ID to load on mount */
  initialConversationId?: Id<"aiConversations">;
  /** Callback when a new conversation is created - use to update URL */
  onConversationCreated?: (conversationId: Id<"aiConversations">, slug?: string) => void;
}

export function BuilderProvider({
  children,
  organizationId,
  sessionId,
  initialConversationId,
  onConversationCreated,
}: BuilderProviderProps) {
  // Get user from auth
  const { user } = useAuth();

  // Page schema state
  const [pageSchema, setPageSchema] = useState<AIGeneratedPageSchema | null>(
    null
  );

  // Conversation state
  const [conversationId, setConversationId] =
    useState<Id<"aiConversations"> | null>(null);
  const [messages, setMessages] = useState<BuilderMessage[]>([]);

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // UI state
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(
    null
  );
  const [isEditMode, setIsEditMode] = useState(false);

  // Model selection
  const [selectedModel, setSelectedModel] = useState<string | undefined>(undefined);

  // Planning mode - AI discusses specs before executing tools
  const [isPlanningMode, setIsPlanningMode] = useState(false);

  // ============================================================================
  // V0 INTEGRATION STATE
  // ============================================================================

  // AI provider: "built-in" uses our JSON schema, "v0" uses v0.dev's Platform API
  const [aiProvider, setAiProvider] = useState<"built-in" | "v0">("v0");

  // v0 chat session ID (for continuing conversations)
  const [v0ChatId, setV0ChatId] = useState<string | null>(null);

  // v0 demo URL (for iframe preview)
  const [v0DemoUrl, setV0DemoUrl] = useState<string | null>(null);

  // v0 web URL (link to edit on v0.dev)
  const [v0WebUrl, setV0WebUrl] = useState<string | null>(null);

  // Builder app ID (created when connecting v0 app to platform)
  const [builderAppId, setBuilderAppId] = useState<Id<"objects"> | null>(null);

  // ============================================================================
  // THREE-MODE ARCHITECTURE STATE
  // ============================================================================

  // Builder mode: prototype (default), connect, or edit
  const [builderMode, setBuilderModeInternal] = useState<BuilderMode>("prototype");

  // Prototype page JSON (the AI-generated page before connecting to real data)
  const [prototypePageJson, setPrototypePageJson] = useState<AIGeneratedPageSchema | null>(null);

  // Connected page ID (after saving with real data)
  const [connectedPageId, setConnectedPageId] = useState<Id<"objects"> | null>(null);

  // Pending connections detected from page analysis
  const [pendingConnections, setPendingConnections] = useState<SectionConnection[]>([]);

  // Records that have been linked to the page
  const [linkedRecords, setLinkedRecords] = useState<LinkedRecord[]>([]);

  // Connection analysis loading state
  const [isAnalyzingConnections, setIsAnalyzingConnections] = useState(false);

  // ============================================================================
  // BUILDER FILES QUERY (for v0 file analysis)
  // ============================================================================

  const builderFilesRaw = useQuery(
    api.fileSystemOntology.getFilesByApp,
    sessionId && builderAppId
      ? { sessionId, appId: builderAppId }
      : "skip"
  );
  const builderFiles = useMemo(() => {
    if (!builderFilesRaw) return [];
    return builderFilesRaw.map((f) => ({ path: f.path, content: f.content }));
  }, [builderFilesRaw]);

  // ============================================================================
  // EXISTING RECORDS QUERY (for ConnectionPanel match suggestions)
  // ============================================================================

  const connectionSearchItems = useMemo(() => {
    if (pendingConnections.length === 0) return null;
    return pendingConnections.flatMap((section) =>
      section.detectedItems.map((item) => ({
        id: item.id,
        type: item.type,
        name: item.placeholderData.name || "",
      }))
    );
  }, [pendingConnections]);

  const existingRecordsResult = useQuery(
    api.builderAppOntology.getExistingRecordsForConnection,
    connectionSearchItems && sessionId && organizationId
      ? {
          sessionId,
          organizationId,
          detectedItems: connectionSearchItems,
        }
      : "skip"
  );

  // ============================================================================
  // RESTORE CONNECTION STATE FROM DB
  // ============================================================================

  const builderAppData = useQuery(
    api.builderAppOntology.getBuilderApp,
    sessionId && builderAppId ? { sessionId, appId: builderAppId } : "skip"
  );

  // Derive production URL from builder app deployment data
  const productionUrl = useMemo(() => {
    if (!builderAppData) return null;
    const deployment = (builderAppData.customProperties as Record<string, unknown>)?.deployment as { productionUrl?: string } | undefined;
    return deployment?.productionUrl || null;
  }, [builderAppData]);

  // Inspector mode state (click-to-select in live preview iframe)
  const [inspectorMode, setInspectorMode] = useState(false);

  // Restore linked records from DB on load (survives refresh)
  useEffect(() => {
    if (!builderAppData) return;
    const props = builderAppData.customProperties as Record<string, unknown>;
    if (props?.connectionStatus === "completed") {
      const linked = props?.linkedObjects as Record<string, string[]> | undefined;
      if (linked && linkedRecords.length === 0) {
        const restored: LinkedRecord[] = [];
        const typeRestoreMap: Record<string, LinkedRecord["recordType"]> = {
          contacts: "contact", forms: "form", products: "product", events: "event",
          invoices: "invoice", bookings: "booking", tickets: "ticket",
          workflows: "workflow", checkouts: "checkout",
        };
        for (const [type, ids] of Object.entries(linked)) {
          const recordType = typeRestoreMap[type] || "form";
          for (const id of ids || []) {
            restored.push({
              recordId: id,
              recordType: recordType as LinkedRecord["recordType"],
              sectionId: "restored",
              itemId: "restored",
              wasCreated: false,
            });
          }
        }
        if (restored.length > 0) {
          setLinkedRecords(restored);
        }
      }
    }
  }, [builderAppData, linkedRecords.length]);

  // ============================================================================
  // MULTI-PAGE PROJECT STATE
  // ============================================================================

  // All pages in the current project
  const [pages, setPages] = useState<ProjectPage[]>([]);

  // Currently active page ID
  const [currentPageId, setCurrentPageId] = useState<string | null>(null);

  // Project-level navigation
  const [projectNavigation, setProjectNavigation] = useState<ProjectNavigation>({
    header: [],
    footer: [],
  });

  // Page ID counter for generating unique IDs
  const pageIdCounter = useRef(0);

  // Generate unique page ID
  const generatePageId = () => {
    pageIdCounter.current += 1;
    return `page_${Date.now()}_${pageIdCounter.current}`;
  };

  // Generate slug from page name
  const generateSlugFromName = (name: string): string => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  };

  // Message counter for IDs
  const messageCounter = useRef(0);

  // Track if we've processed the initial prompt
  const hasProcessedInitialPrompt = useRef(false);

  // Track last user message for retry functionality
  const lastUserMessageRef = useRef<string | null>(null);

  // Track if we've loaded the initial conversation
  const hasLoadedInitialConversation = useRef(false);

  // Fetch initial conversation data if provided
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore - Convex type instantiation is excessively deep
  const initialConversation = useQuery(
    api.ai.conversations.getConversation,
    initialConversationId ? { conversationId: initialConversationId } : "skip"
  );

  // Look up builder app by conversation ID (restores builderAppId on page refresh)
  const builderAppByConversation = useQuery(
    api.builderAppOntology.getBuilderAppByConversationId,
    sessionId && organizationId && initialConversationId && !builderAppId
      ? { sessionId, organizationId, conversationId: initialConversationId }
      : "skip"
  );

  // Convex actions
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore - Convex type instantiation is excessively deep
  const sendChatMessage = useAction(api.ai.chat.sendMessage);
  const sendV0Message = useAction(api.integrations.v0.builderChat);
  const createBuilderAppMutation = useMutation(api.builderAppOntology.createBuilderApp);
  const updateBuilderAppMutation = useMutation(api.builderAppOntology.updateBuilderApp);
  const saveGeneratedPage = useMutation(api.pageBuilder.saveGeneratedPage);
  const sendPlatformAlert = useAction(api.ai.platformAlerts.sendPlatformAlert);

  // Generate unique message ID
  const generateMessageId = () => {
    messageCounter.current += 1;
    return `msg_${Date.now()}_${messageCounter.current}`;
  };

  // Load initial conversation data when provided
  useEffect(() => {
    if (hasLoadedInitialConversation.current) return;
    if (!initialConversationId || !initialConversation) return;

    hasLoadedInitialConversation.current = true;

    // Set the conversation ID
    setConversationId(initialConversationId);

    // Restore v0 metadata if this was a v0 conversation
    if (initialConversation.aiProvider === "v0") {
      setAiProvider("v0");
      if (initialConversation.v0ChatId) {
        setV0ChatId(initialConversation.v0ChatId);
      }
      if (initialConversation.v0DemoUrl) {
        setV0DemoUrl(initialConversation.v0DemoUrl);
      }
      if (initialConversation.v0WebUrl) {
        setV0WebUrl(initialConversation.v0WebUrl);
      }
    }

    // Convert messages from database format to BuilderMessage format
    const loadedMessages: BuilderMessage[] = initialConversation.messages.map((msg, index) => {
      const builderMsg: BuilderMessage = {
        id: `loaded_${msg._id || index}`,
        role: msg.role as "user" | "assistant" | "system",
        content: msg.content,
        timestamp: msg.timestamp,
      };

      // Try to parse page schema from assistant messages
      if (msg.role === "assistant") {
        const validation = parseAndValidateAIResponse(msg.content);
        if (validation.valid && validation.data) {
          builderMsg.pageSchema = validation.data;
          // Update the page schema state with the most recent valid schema
          setPageSchema(validation.data);
        }
      }

      return builderMsg;
    });

    setMessages(loadedMessages);

    console.log(`[Builder] Loaded conversation ${initialConversationId} with ${loadedMessages.length} messages`);
  }, [initialConversationId, initialConversation]);

  // Restore builderAppId from DB when loading a conversation (survives refresh)
  useEffect(() => {
    if (!builderAppByConversation || builderAppId) return;
    console.log("[Builder] Restored builderAppId from conversation:", builderAppByConversation._id);
    setBuilderAppId(builderAppByConversation._id);
  }, [builderAppByConversation, builderAppId]);

  // Check for pending prompt, model, and planning mode from sessionStorage on mount
  // Mode is pre-selected on landing page, so we send the message directly
  useEffect(() => {
    if (hasProcessedInitialPrompt.current) return;
    if (!organizationId || !user) return;

    // Check for pending model selection from landing page
    const pendingModel = sessionStorage.getItem("builder_pending_model");
    if (pendingModel) {
      setSelectedModel(pendingModel);
      sessionStorage.removeItem("builder_pending_model");
    }

    // Check for pending planning mode from landing page
    const pendingPlanningMode = sessionStorage.getItem("builder_pending_planning_mode");
    const shouldUsePlanningMode = pendingPlanningMode === "true";
    if (shouldUsePlanningMode) {
      setIsPlanningMode(true);
      sessionStorage.removeItem("builder_pending_planning_mode");
    }

    // Check for pending prompt and send it with the pre-selected mode
    const pendingPrompt = sessionStorage.getItem("builder_pending_prompt");
    if (pendingPrompt) {
      hasProcessedInitialPrompt.current = true;
      sessionStorage.removeItem("builder_pending_prompt");
      // Send message with explicit planning mode (don't rely on state update timing)
      sendMessageWithMode(pendingPrompt, shouldUsePlanningMode);
    } else {
      hasProcessedInitialPrompt.current = true;
    }
  }, [organizationId, user]);

  // Send message with explicit planning mode (for initial prompt from landing page)
  const sendMessageWithMode = async (message: string, usePlanningMode: boolean) => {
    if (!organizationId || !user) {
      setGenerationError("Not authenticated");
      return;
    }

    // DEBUG: Log which provider we're using
    console.log("[Builder:sendMessageWithMode] Starting with aiProvider:", aiProvider);

    setIsGenerating(true);
    setGenerationError(null);

    // Track last user message for retry
    lastUserMessageRef.current = message;

    const startTime = Date.now();

    const userMessage: BuilderMessage = {
      id: generateMessageId(),
      role: "user",
      content: message,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMessage]);

    try {
      // ========================================================================
      // V0 PROVIDER - Use v0.dev Platform API with iframe preview
      // ========================================================================
      if (aiProvider === "v0") {
        console.log("[Builder:v0] Sending initial message to v0 API...");

        const v0Result = await sendV0Message({
          organizationId,
          userId: user.id as Id<"users">,
          message,
          v0ChatId: v0ChatId || undefined,
          existingConversationId: conversationId || undefined,
        });

        const processingTime = Math.round((Date.now() - startTime) / 1000);

        // Store v0 session info for follow-up messages
        setV0ChatId(v0Result.v0ChatId);
        setV0WebUrl(v0Result.webUrl);

        // Update demo URL for iframe preview
        if (v0Result.demoUrl) {
          console.log("[Builder:v0] Got demo URL:", v0Result.demoUrl);
          setV0DemoUrl(v0Result.demoUrl);
        }

        // Update conversation ID if this is a new conversation
        if (v0Result.conversationId && !conversationId) {
          const newConversationId = v0Result.conversationId as Id<"aiConversations">;
          setConversationId(newConversationId);
          // Notify parent to update URL with slug for pretty URLs
          onConversationCreated?.(newConversationId, v0Result.slug);
        }

        // Persist v0 files to builderFiles table via builder app
        if (v0Result.files && v0Result.files.length > 0 && sessionId) {
          console.log("[Builder:v0] v0 returned", v0Result.files.length, "files:", v0Result.files.map((f: { name?: string }) => f.name));
          const v0Files = v0Result.files.map((f: { name?: string; path?: string; content: string; language?: string }) => {
            const filePath = f.path || f.name || "unknown";
            const ext = filePath.split(".").pop()?.toLowerCase() || "";
            const langMap: Record<string, string> = { ts: "typescript", tsx: "typescript", js: "javascript", jsx: "javascript", css: "css", json: "json", md: "markdown", html: "html" };
            return {
              path: filePath,
              content: f.content,
              language: f.language || langMap[ext] || "typescript",
            };
          });

          try {
            if (!builderAppId) {
              // First response — create builder app with files
              const result = await createBuilderAppMutation({
                sessionId,
                organizationId,
                name: v0Result.message.substring(0, 60) || "v0 App",
                subtype: "v0_generated",
                v0ChatId: v0Result.v0ChatId,
                v0WebUrl: v0Result.webUrl,
                v0DemoUrl: v0Result.demoUrl || undefined,
                files: v0Files,
                conversationId: v0Result.conversationId
                  ? (v0Result.conversationId as Id<"aiConversations">)
                  : undefined,
              });
              setBuilderAppId(result.appId);
              console.log("[Builder:v0] Created builder app:", result.appId, "with", v0Files.length, "files");
            } else {
              // Follow-up response — update existing app files
              await updateBuilderAppMutation({
                sessionId,
                appId: builderAppId,
                files: v0Files,
                v0DemoUrl: v0Result.demoUrl || undefined,
              });
              console.log("[Builder:v0] Updated builder app files:", v0Files.length, "files");
            }
          } catch (err) {
            console.error("[Builder:v0] Failed to persist files:", err);
          }
        }

        // Create assistant message (v0 responses are text, not JSON schemas)
        const assistantMessage: BuilderMessage = {
          id: generateMessageId(),
          role: "assistant",
          content: v0Result.message,
          timestamp: Date.now(),
          processingTime,
        };
        setMessages((prev) => [...prev, assistantMessage]);

        console.log("[Builder:v0] Initial response processed:", {
          chatId: v0Result.v0ChatId,
          hasDemoUrl: !!v0Result.demoUrl,
          filesCount: v0Result.files?.length || 0,
          conversationId: v0Result.conversationId,
          builderAppId,
        });

        return;
      }

      // ========================================================================
      // BUILT-IN PROVIDER - Use our JSON schema generation
      // ========================================================================
      const modeIndicator = usePlanningMode ? "PLANNING MODE" : "EXECUTION MODE";
      const planningInstructions = usePlanningMode
        ? "\n[PLANNING MODE ACTIVE - Do NOT generate page JSON yet. Instead, discuss the design with the user, ask clarifying questions about their preferences (colors, style, content), and create a detailed plan. Only generate the actual page after the user explicitly approves the plan.]"
        : "";
      // For edits, add a strong instruction at the END so it's the last thing the AI sees
      const editSuffix = pageSchema && !usePlanningMode
        ? "\n\n---\nIMPORTANT: Respond with the COMPLETE updated JSON code block. Start your response with ```json"
        : "";
      const contextPrefix = pageSchema
        ? `[PAGE BUILDER - ${modeIndicator}]\n\nCURRENT PAGE JSON:\n${JSON.stringify(pageSchema, null, 2)}\n\nUSER REQUEST:\n`
        : `[PAGE BUILDER - ${modeIndicator} - No page yet]${planningInstructions}\n\n`;
      const fullMessage = contextPrefix + message + editSuffix;

      const result = await sendChatMessage({
        organizationId,
        userId: user.id as Id<"users">,
        message: fullMessage,
        conversationId: conversationId || undefined,
        context: "page_builder",
        selectedModel,
        builderMode, // Pass the current builder mode for tool filtering
      });

      const processingTime = Math.round((Date.now() - startTime) / 1000);

      if (result.conversationId && !conversationId) {
        const newConversationId = result.conversationId as Id<"aiConversations">;
        setConversationId(newConversationId);
        // Notify parent to update URL with slug for pretty URLs
        onConversationCreated?.(newConversationId, result.slug);
      }

      const aiContent = result.message || "";
      console.log("[Builder:Mode] AI response received, length:", aiContent.length);
      console.log("[Builder:Mode] AI response preview:", aiContent.substring(0, 200));

      const validation = parseAndValidateAIResponse(aiContent);
      console.log("[Builder:Mode] Validation result:", {
        valid: validation.valid,
        hasData: !!validation.data,
        parseError: validation.parseError,
      });

      if (validation.valid && validation.data) {
        console.log("[Builder:Mode] Setting page schema with", validation.data.sections?.length, "sections");
        setPageSchema(validation.data);

        const assistantMessage: BuilderMessage = {
          id: generateMessageId(),
          role: "assistant",
          content: aiContent,
          timestamp: Date.now(),
          pageSchema: validation.data,
          processingTime,
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        // Show user-friendly error message instead of raw JSON
        if (validation.parseError) {
          console.log("[Builder:Mode] AI response was not JSON:", validation.parseError);
        } else if (validation.errors) {
          console.warn("[Builder:Mode] Page schema validation failed:", validation.errors);
        }

        const errorContent = validation.parseError
          ? `I tried to update the design but the response was incomplete. This can happen with complex pages. Let me try again with a simpler approach.\n\n(Technical: ${validation.parseError})`
          : `I generated an update but it had some validation issues. Let me try again.\n\n(Technical: Schema validation failed)`;

        const assistantMessage: BuilderMessage = {
          id: generateMessageId(),
          role: "assistant",
          content: errorContent,
          timestamp: Date.now(),
          processingTime,
          errorDetails: {
            type: "api",
            canRetry: true,
          },
        };
        setMessages((prev) => [...prev, assistantMessage]);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("[Builder] Chat error (with mode):", errorMessage);

      const parsedError = parseApiError(error);
      console.log("[Builder] Parsed error:", { type: parsedError.type, isAdminAlert: parsedError.isAdminAlert });

      setGenerationError(parsedError.message);

      // Send admin alert for platform issues (fire and forget)
      if (parsedError.isAdminAlert && organizationId) {
        console.log("[Builder] Sending platform alert for:", parsedError.type);
        sendPlatformAlert({
          alertType: parsedError.type === "platform_error" ? "openrouter_payment" : "openrouter_error",
          errorMessage,
          organizationId,
          userId: user?.id as Id<"users">,
          context: "page_builder",
        }).then(() => {
          console.log("[Builder] Platform alert sent successfully");
        }).catch((alertError) => {
          console.error("[Builder] Failed to send platform alert:", alertError);
        });
      }

      const errorMsg: BuilderMessage = {
        id: generateMessageId(),
        role: "system",
        content: parsedError.message,
        timestamp: Date.now(),
        errorDetails: {
          type: parsedError.type,
          canRetry: parsedError.canRetry,
          actionLabel: parsedError.actionLabel,
          actionUrl: parsedError.actionUrl,
          isAdminAlert: parsedError.isAdminAlert,
        },
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsGenerating(false);
    }
  };

  // Internal send message function (used by both sendMessage and initial prompt)
  const sendMessageInternal = async (message: string) => {
    if (!organizationId || !user) {
      setGenerationError("Not authenticated");
      return;
    }

    // DEBUG: Log which provider we're using
    console.log("[Builder:sendMessageInternal] Starting with aiProvider:", aiProvider);

    setIsGenerating(true);
    setGenerationError(null);

    // Track last user message for retry
    lastUserMessageRef.current = message;

    // Track start time for processing duration
    const startTime = Date.now();

    // Add user message
    const userMessage: BuilderMessage = {
      id: generateMessageId(),
      role: "user",
      content: message,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMessage]);

    try {
      // ========================================================================
      // V0 PROVIDER - Use v0.dev Platform API with iframe preview
      // ========================================================================
      if (aiProvider === "v0") {
        console.log("[Builder:v0] Sending message to v0 API...");

        const v0Result = await sendV0Message({
          organizationId,
          userId: user.id as Id<"users">,
          message,
          v0ChatId: v0ChatId || undefined,
          existingConversationId: conversationId || undefined,
        });

        const processingTime = Math.round((Date.now() - startTime) / 1000);

        // Store v0 session info for follow-up messages
        setV0ChatId(v0Result.v0ChatId);
        setV0WebUrl(v0Result.webUrl);

        // Update demo URL for iframe preview
        if (v0Result.demoUrl) {
          console.log("[Builder:v0] Got demo URL:", v0Result.demoUrl);
          setV0DemoUrl(v0Result.demoUrl);
        }

        // Update conversation ID if this is a new conversation
        if (v0Result.conversationId && !conversationId) {
          const newConversationId = v0Result.conversationId as Id<"aiConversations">;
          setConversationId(newConversationId);
          // Notify parent to update URL with slug for pretty URLs
          onConversationCreated?.(newConversationId, v0Result.slug);
        }

        // Persist v0 files to builderFiles table
        if (v0Result.files && v0Result.files.length > 0 && sessionId && builderAppId) {
          console.log("[Builder:v0] Follow-up: v0 returned", v0Result.files.length, "files:", v0Result.files.map((f: { name?: string }) => f.name));
          const v0Files = v0Result.files.map((f: { name?: string; path?: string; content: string; language?: string }) => {
            const filePath = f.path || f.name || "unknown";
            const ext = filePath.split(".").pop()?.toLowerCase() || "";
            const langMap: Record<string, string> = { ts: "typescript", tsx: "typescript", js: "javascript", jsx: "javascript", css: "css", json: "json", md: "markdown", html: "html" };
            return {
              path: filePath,
              content: f.content,
              language: f.language || langMap[ext] || "typescript",
            };
          });
          try {
            await updateBuilderAppMutation({
              sessionId,
              appId: builderAppId,
              files: v0Files,
              v0DemoUrl: v0Result.demoUrl || undefined,
            });
            console.log("[Builder:v0] Updated builder app files:", v0Files.length, "files");
          } catch (err) {
            console.error("[Builder:v0] Failed to update files:", err);
          }
        }

        // Create assistant message (v0 responses are text, not JSON schemas)
        const assistantMessage: BuilderMessage = {
          id: generateMessageId(),
          role: "assistant",
          content: v0Result.message,
          timestamp: Date.now(),
          processingTime,
        };
        setMessages((prev) => [...prev, assistantMessage]);

        console.log("[Builder:v0] Response processed:", {
          chatId: v0Result.v0ChatId,
          hasDemoUrl: !!v0Result.demoUrl,
          filesCount: v0Result.files?.length || 0,
          conversationId: v0Result.conversationId,
          builderAppId,
        });

        return;
      }

      // ========================================================================
      // BUILT-IN PROVIDER - Use our JSON schema generation
      // ========================================================================
      // Prepend page builder context to the message
      const modeIndicator = isPlanningMode ? "PLANNING MODE" : "EXECUTION MODE";
      const planningInstructions = isPlanningMode
        ? "\n[PLANNING MODE ACTIVE - Do NOT generate page JSON yet. Instead, discuss the design with the user, ask clarifying questions about their preferences (colors, style, content), and create a detailed plan. Only generate the actual page after the user explicitly approves the plan.]"
        : "";
      // For edits, add a strong instruction at the END so it's the last thing the AI sees
      const editSuffix = pageSchema && !isPlanningMode
        ? "\n\n---\nIMPORTANT: Respond with the COMPLETE updated JSON code block. Start your response with ```json"
        : "";
      const contextPrefix = pageSchema
        ? `[PAGE BUILDER - ${modeIndicator}]\n\nCURRENT PAGE JSON:\n${JSON.stringify(pageSchema, null, 2)}\n\nUSER REQUEST:\n`
        : `[PAGE BUILDER - ${modeIndicator} - No page yet]${planningInstructions}\n\n`;
      const fullMessage = contextPrefix + message + editSuffix;

      // Send to AI with page_builder context
      const result = await sendChatMessage({
        organizationId,
        userId: user.id as Id<"users">,
        message: fullMessage,
        conversationId: conversationId || undefined,
        context: "page_builder",
        selectedModel,
        builderMode, // Pass the current builder mode for tool filtering
      });

      // Calculate processing time
      const processingTime = Math.round((Date.now() - startTime) / 1000);

      // Update conversation ID if new
      if (result.conversationId && !conversationId) {
        const newConversationId = result.conversationId as Id<"aiConversations">;
        setConversationId(newConversationId);
        // Notify parent to update URL with slug for pretty URLs
        onConversationCreated?.(newConversationId, result.slug);
      }

      // Parse AI response
      const aiContent = result.message || "";
      console.log("[Builder] AI response received, length:", aiContent.length);
      console.log("[Builder] AI response preview:", aiContent.substring(0, 200));

      const validation = parseAndValidateAIResponse(aiContent);
      console.log("[Builder] Validation result:", {
        valid: validation.valid,
        hasData: !!validation.data,
        parseError: validation.parseError,
      });

      // Update page schema if valid
      if (validation.valid && validation.data) {
        console.log("[Builder] SUCCESS! Setting page schema with", validation.data.sections?.length, "sections");
        console.log("[Builder] Page schema metadata:", validation.data.metadata);
        setPageSchema(validation.data);

        // Create assistant message with valid schema
        const assistantMessage: BuilderMessage = {
          id: generateMessageId(),
          role: "assistant",
          content: aiContent,
          timestamp: Date.now(),
          pageSchema: validation.data,
          processingTime,
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        console.log("[Builder] VALIDATION FAILED:");
        console.log("[Builder] - parseError:", validation.parseError || "none");
        console.log("[Builder] - valid:", validation.valid);
        if (validation.errors) {
          console.log("[Builder] - schema errors:", JSON.stringify(validation.errors.issues.slice(0, 5), null, 2));
        }

        // Show user-friendly error message instead of raw JSON
        const errorContent = validation.parseError
          ? `I tried to update the design but the response was incomplete. This can happen with complex pages. Let me try again with a simpler approach.\n\n(Technical: ${validation.parseError})`
          : `I generated an update but it had some validation issues. Let me try again.\n\n(Technical: Schema validation failed)`;

        const assistantMessage: BuilderMessage = {
          id: generateMessageId(),
          role: "assistant",
          content: errorContent,
          timestamp: Date.now(),
          processingTime,
          errorDetails: {
            type: "api",
            canRetry: true,
          },
        };
        setMessages((prev) => [...prev, assistantMessage]);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("[Builder] Chat error:", errorMessage);

      const parsedError = parseApiError(error);
      console.log("[Builder] Parsed error:", { type: parsedError.type, isAdminAlert: parsedError.isAdminAlert });

      setGenerationError(parsedError.message);

      // Send admin alert for platform issues (fire and forget)
      if (parsedError.isAdminAlert && organizationId) {
        console.log("[Builder] Sending platform alert for:", parsedError.type);
        sendPlatformAlert({
          alertType: parsedError.type === "platform_error" ? "openrouter_payment" : "openrouter_error",
          errorMessage,
          organizationId,
          userId: user?.id as Id<"users">,
          context: "page_builder",
        }).then(() => {
          console.log("[Builder] Platform alert sent successfully");
        }).catch((alertError) => {
          console.error("[Builder] Failed to send platform alert:", alertError);
        });
      }

      const errorMsg: BuilderMessage = {
        id: generateMessageId(),
        role: "system",
        content: parsedError.message,
        timestamp: Date.now(),
        errorDetails: {
          type: parsedError.type,
          canRetry: parsedError.canRetry,
          actionLabel: parsedError.actionLabel,
          actionUrl: parsedError.actionUrl,
          isAdminAlert: parsedError.isAdminAlert,
        },
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsGenerating(false);
    }
  };

  // Send a message to the AI (public API - wraps internal function with useCallback)
  const sendMessage = useCallback(
    async (message: string) => {
      await sendMessageInternal(message);
    },
    [organizationId, user, conversationId, pageSchema, sendChatMessage, sendV0Message, selectedModel, isPlanningMode, aiProvider, v0ChatId, builderAppId, sessionId, createBuilderAppMutation, updateBuilderAppMutation]
  );

  // Save the current page as a project
  const saveAsProject = useCallback(
    async (name: string): Promise<Id<"objects"> | null> => {
      if (!pageSchema || !organizationId || !sessionId) {
        setGenerationError("Cannot save: missing page schema or session");
        return null;
      }

      try {
        const projectId = await saveGeneratedPage({
          sessionId,
          organizationId,
          name,
          description: pageSchema.metadata.description,
          pageSchema,
          conversationId: conversationId || undefined,
        });

        return projectId;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to save project";
        setGenerationError(errorMessage);
        return null;
      }
    },
    [pageSchema, organizationId, sessionId, conversationId, saveGeneratedPage]
  );

  // Load an existing project
  const loadProject = useCallback(async (projectId: Id<"objects">) => {
    // This would be implemented to load existing AI-generated pages
    // For now, just log
    console.log("Loading project:", projectId);
  }, []);

  // ============================================================================
  // THREE-MODE ARCHITECTURE FUNCTIONS
  // ============================================================================

  /**
   * Check if we can switch to a given mode
   */
  const canSwitchToMode = useCallback((mode: BuilderMode): boolean => {
    switch (mode) {
      case "prototype":
        // Can always go back to prototype mode
        return true;
      case "connect":
        // Need a prototype page OR v0 demo URL to connect
        return pageSchema !== null || prototypePageJson !== null || v0DemoUrl !== null;
      default:
        return false;
    }
  }, [pageSchema, prototypePageJson, v0DemoUrl]);

  /**
   * Set the builder mode with validation
   */
  const setBuilderMode = useCallback((mode: BuilderMode) => {
    if (!canSwitchToMode(mode)) {
      console.warn(`[Builder] Cannot switch to ${mode} mode - prerequisites not met`);
      return;
    }

    // When entering connect mode, save current page as prototype
    if (mode === "connect" && builderMode === "prototype" && pageSchema) {
      setPrototypePageJson(pageSchema);
    }

    // When going back to prototype from connect, restore prototype
    if (mode === "prototype" && builderMode === "connect" && prototypePageJson) {
      setPageSchema(prototypePageJson);
      setPendingConnections([]);
    }

    setBuilderModeInternal(mode);
    console.log(`[Builder] Mode changed to: ${mode}`);
  }, [builderMode, canSwitchToMode, pageSchema, prototypePageJson]);

  // Helper: get wizard-selected API categories from builder app data
  const getWizardCategories = useCallback((): string[] => {
    if (!builderAppData) return [];
    const props = builderAppData.customProperties as Record<string, unknown>;
    const config = props?.connectionConfig as { selectedCategories?: string[] } | undefined;
    return config?.selectedCategories || [];
  }, [builderAppData]);

  /**
   * Analyze current page for sections that need real data connections
   */
  const analyzePageForConnections = useCallback(async () => {
    setIsAnalyzingConnections(true);
    console.log("[Builder] Analyzing page for connections...");

    try {
      // V0 apps: analyze React source files instead of JSON schema
      if (aiProvider === "v0" && builderFiles.length > 0) {
        const v0Connections = analyzeV0FilesForConnections(builderFiles);

        // Inject empty sections for wizard-selected categories with no auto-detected items
        const wizardCategories = getWizardCategories();
        const categoryTypeMap: Record<string, DetectedItem["type"]> = {
          forms: "form", crm: "contact", events: "event", products: "product",
          invoices: "invoice", tickets: "ticket", bookings: "booking",
          workflows: "workflow", checkout: "checkout",
        };
        for (const catId of wizardCategories) {
          const itemType = categoryTypeMap[catId];
          if (!itemType) continue;
          const hasSection = v0Connections.some(s => s.detectedItems.some(i => i.type === itemType));
          if (!hasSection) {
            v0Connections.push({
              sectionId: `wizard:${catId}`,
              sectionType: catId,
              sectionLabel: API_CATEGORIES.find(c => c.id === catId)?.label || catId,
              detectedItems: [],
              connectionStatus: "pending",
            });
          }
        }

        setPendingConnections(v0Connections);
        console.log(`[Builder] v0 analysis: found ${v0Connections.length} sections with ${v0Connections.reduce((sum, c) => sum + c.detectedItems.length, 0)} items`);
        setIsAnalyzingConnections(false);
        return;
      }

      // Built-in provider: analyze JSON page schema
      const schemaToAnalyze = pageSchema || prototypePageJson;
      if (!schemaToAnalyze) {
        console.warn("[Builder] No page schema to analyze");
        setIsAnalyzingConnections(false);
        return;
      }

      const connections: SectionConnection[] = [];
      let itemIdCounter = 0;

      for (const section of schemaToAnalyze.sections) {
        const sectionConnection: SectionConnection = {
          sectionId: section.id,
          sectionType: section.type,
          sectionLabel: section.type.charAt(0).toUpperCase() + section.type.slice(1),
          detectedItems: [],
          connectionStatus: "pending",
        };

        // Analyze pricing sections for products
        if (section.type === "pricing" && section.props?.tiers) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const tiers = section.props.tiers as any[];

          for (const tier of tiers) {
            if (tier.name) {
              sectionConnection.detectedItems.push({
                id: `item_${++itemIdCounter}`,
                type: "product",
                placeholderData: {
                  name: tier.name,
                  price: tier.price,
                  description: tier.description,
                },
                existingMatches: [], // Will be populated by backend search
                connectionChoice: null,
                linkedRecordId: null,
                createdRecordId: null,
              });
            }
          }
        }

        // Analyze team sections for contacts
        if (section.type === "team" && section.props?.members) {
          const members = section.props.members as Array<{
            name?: string;
            role?: string;
            email?: string;
          }>;

          for (const member of members) {
            if (member.name) {
              sectionConnection.detectedItems.push({
                id: `item_${++itemIdCounter}`,
                type: "contact",
                placeholderData: {
                  name: member.name,
                  description: member.role,
                  email: member.email,
                },
                existingMatches: [],
                connectionChoice: null,
                linkedRecordId: null,
                createdRecordId: null,
              });
            }
          }
        }

        // Analyze CTA/hero sections for events (if they have date references)
        if ((section.type === "hero" || section.type === "cta") && section.props) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const props = section.props as any;
          // Look for date-like content that might indicate an event
          const hasDateContent = JSON.stringify(props).match(/\d{1,2}[./]\d{1,2}[./]\d{2,4}|\d{4}-\d{2}-\d{2}|January|February|March|April|May|June|July|August|September|October|November|December/i);

          if (hasDateContent && props.title) {
            sectionConnection.detectedItems.push({
              id: `item_${++itemIdCounter}`,
              type: "event",
              placeholderData: {
                name: props.title as string,
                description: props.subtitle as string || props.description as string,
                date: hasDateContent[0],
              },
              existingMatches: [],
              connectionChoice: null,
              linkedRecordId: null,
              createdRecordId: null,
            });
          }
        }

        // Only add sections that have detected items
        if (sectionConnection.detectedItems.length > 0) {
          connections.push(sectionConnection);
        }
      }

      setPendingConnections(connections);
      console.log(`[Builder] Found ${connections.length} sections with ${connections.reduce((sum, c) => sum + c.detectedItems.length, 0)} items to connect`);
    } catch (error) {
      console.error("[Builder] Error analyzing page:", error);
    } finally {
      setIsAnalyzingConnections(false);
    }
  }, [pageSchema, prototypePageJson, aiProvider, builderFiles, getWizardCategories]);

  /**
   * Update a single connection choice
   */
  const updateConnectionChoice = useCallback((
    sectionId: string,
    itemId: string,
    choice: "create" | "link" | "skip",
    linkedRecordId?: string
  ) => {
    setPendingConnections(prev => prev.map(section => {
      if (section.sectionId !== sectionId) return section;

      return {
        ...section,
        detectedItems: section.detectedItems.map(item => {
          if (item.id !== itemId) return item;

          return {
            ...item,
            connectionChoice: choice,
            linkedRecordId: choice === "link" ? (linkedRecordId || null) : null,
          };
        }),
      };
    }));
  }, []);

  // Add a manual connection item to a section (for empty wizard-injected sections)
  const addManualConnectionItem = useCallback((sectionId: string, type: DetectedItem["type"]) => {
    const defaults: Record<string, Partial<DetectedItem["placeholderData"]>> = {
      product: { name: "New Product", price: 0 },
      event: { name: "New Event", date: new Date().toISOString() },
      contact: { name: "New Contact" },
      form: { name: "New Form" },
      invoice: { name: "New Invoice" },
      ticket: { name: "New Ticket" },
      booking: { name: "New Booking" },
      workflow: { name: "New Workflow" },
      checkout: { name: "New Checkout" },
    };
    const newItem: DetectedItem = {
      id: `manual-${Date.now()}`,
      type,
      placeholderData: defaults[type] || { name: "New Item" },
      existingMatches: [],
      connectionChoice: null,
      linkedRecordId: null,
      createdRecordId: null,
    };
    setPendingConnections(prev => prev.map(s =>
      s.sectionId === sectionId
        ? { ...s, detectedItems: [...s.detectedItems, newItem] }
        : s
    ));
  }, []);

  // Merge existing record matches into pendingConnections when query returns
  useEffect(() => {
    if (!existingRecordsResult) return;
    setPendingConnections((prev) =>
      prev.map((section) => ({
        ...section,
        detectedItems: section.detectedItems.map((item): DetectedItem => {
          const matches = existingRecordsResult[item.id];
          if (!matches || matches.length === 0) return item;
          return {
            ...item,
            existingMatches: matches.map((m: { id: string; name: string; similarity: number; isExactMatch: boolean; details: Record<string, unknown> }) => ({
              id: m.id,
              name: m.name,
              similarity: m.similarity,
              isExactMatch: m.isExactMatch,
              details: m.details,
            })),
          };
        }),
      }))
    );
  }, [existingRecordsResult]);

  // Mutation references for executeConnections
  const createFormMutation = useMutation(api.formsOntology.createForm);
  const createContactMutation = useMutation(api.crmOntology.createContact);
  const createProductMutation = useMutation(api.productOntology.createProduct);
  const createEventMutation = useMutation(api.eventOntology.createEvent);
  const createInvoiceMutation = useMutation(api.invoicingOntology.createDraftInvoice);
  const createBookingMutation = useMutation(api.bookingOntology.createBooking);
  const createWorkflowMutation = useMutation(api.workflows.workflowOntology.createWorkflow);
  const createCheckoutMutation = useMutation(api.checkoutOntology.createCheckoutInstance);
  const linkObjectsMutation = useMutation(api.builderAppOntology.linkObjectsToBuilderApp);
  const updateConnectionStatusMutation = useMutation(api.builderAppOntology.updateBuilderAppConnectionStatus);

  /**
   * Execute all pending connections - create records and link them to the page
   */
  const executeConnections = useCallback(async (): Promise<boolean> => {
    if (!organizationId || !sessionId) {
      setGenerationError("Cannot execute connections: not authenticated");
      return false;
    }

    if (!builderAppId) {
      setGenerationError("Cannot execute connections: no builder app");
      return false;
    }

    console.log("[Builder] Executing connections...");
    const newLinkedRecords: LinkedRecord[] = [];
    const idsByType: Record<string, Id<"objects">[]> = {
      forms: [], contacts: [], products: [], events: [],
      invoices: [], tickets: [], bookings: [], workflows: [], checkouts: [],
    };
    // Map DetectedItem type → linkObjects key
    const typeToBucket: Record<string, string> = {
      form: "forms", contact: "contacts", product: "products", event: "events",
      invoice: "invoices", ticket: "tickets", booking: "bookings",
      workflow: "workflows", checkout: "checkouts",
    };

    try {
      for (const section of pendingConnections) {
        for (const item of section.detectedItems) {
          if (item.connectionChoice === "skip" || !item.connectionChoice) {
            continue;
          }

          const bucket = typeToBucket[item.type];

          if (item.connectionChoice === "link" && item.linkedRecordId) {
            const recordId = item.linkedRecordId as Id<"objects">;
            newLinkedRecords.push({
              recordId: item.linkedRecordId,
              recordType: item.type,
              sectionId: section.sectionId,
              itemId: item.id,
              wasCreated: false,
            });
            if (bucket) idsByType[bucket].push(recordId);
          }

          if (item.connectionChoice === "create") {
            let createdId: Id<"objects"> | null = null;

            if (item.type === "contact") {
              const nameParts = (item.placeholderData.name || "New Contact").split(" ");
              createdId = await createContactMutation({
                sessionId, organizationId, subtype: "lead",
                firstName: nameParts[0] || "New",
                lastName: nameParts.slice(1).join(" ") || "Contact",
                email: item.placeholderData.email || "",
                jobTitle: item.placeholderData.description,
                source: "builder",
              });
            } else if (item.type === "form") {
              createdId = await createFormMutation({
                sessionId, organizationId, subtype: "registration",
                name: item.placeholderData.name || "New Form",
                description: item.placeholderData.description,
                formSchema: { version: "1.0", fields: [], settings: {}, sections: [] },
              });
            } else if (item.type === "product") {
              createdId = await createProductMutation({
                sessionId, organizationId, subtype: "digital",
                name: item.placeholderData.name || "New Product",
                description: item.placeholderData.description,
                price: typeof item.placeholderData.price === "number" ? item.placeholderData.price : 0,
              });
            } else if (item.type === "event") {
              const now = Date.now();
              createdId = await createEventMutation({
                sessionId, organizationId, subtype: "meetup",
                name: item.placeholderData.name || "New Event",
                description: item.placeholderData.description,
                startDate: now + 7 * 24 * 60 * 60 * 1000,
                endDate: now + 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000,
                location: "TBD",
              });
            } else if (item.type === "invoice") {
              const invoiceResult = await createInvoiceMutation({
                sessionId, organizationId,
                billToName: item.placeholderData.name || "Draft Invoice",
                billToEmail: "draft@example.com",
                billToAddress: {},
                lineItems: [],
                subtotalInCents: 0, taxInCents: 0, totalInCents: 0,
                currency: "EUR",
                invoiceDate: Date.now(), dueDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
              });
              createdId = invoiceResult.invoiceId;
            } else if (item.type === "booking") {
              const now = Date.now();
              const bookingResult = await createBookingMutation({
                sessionId, organizationId, subtype: "appointment",
                customerName: item.placeholderData.name || "New Booking",
                customerEmail: "booking@example.com",
                startDateTime: now + 24 * 60 * 60 * 1000,
                endDateTime: now + 24 * 60 * 60 * 1000 + 60 * 60 * 1000,
                resourceIds: [],
              });
              createdId = bookingResult.bookingId;
            } else if (item.type === "workflow") {
              createdId = await createWorkflowMutation({
                sessionId, organizationId,
                workflow: {
                  name: item.placeholderData.name || "New Workflow",
                  subtype: "custom",
                  status: "draft",
                  behaviors: [],
                  execution: { triggerOn: "manual", errorHandling: "continue" },
                },
              });
            } else if (item.type === "checkout") {
              const checkoutResult = await createCheckoutMutation({
                sessionId, organizationId,
                templateCode: "default",
                name: item.placeholderData.name || "New Checkout",
              });
              createdId = checkoutResult.instanceId;
            }
            // Note: ticket type is intentionally excluded — tickets are internal-only

            if (createdId) {
              newLinkedRecords.push({
                recordId: createdId,
                recordType: item.type,
                sectionId: section.sectionId,
                itemId: item.id,
                wasCreated: true,
              });
              if (bucket) idsByType[bucket].push(createdId);

              // Update the item with the created record ID
              setPendingConnections((prev) =>
                prev.map((s) =>
                  s.sectionId !== section.sectionId
                    ? s
                    : {
                        ...s,
                        detectedItems: s.detectedItems.map((i) =>
                          i.id !== item.id ? i : { ...i, createdRecordId: createdId }
                        ),
                      }
                )
              );
            }
          }
        }
      }

      // Link all collected records to the builder app
      const hasAnyIds = Object.values(idsByType).some(arr => arr.length > 0);
      if (hasAnyIds) {
        const linkArgs: Record<string, unknown> = { sessionId, appId: builderAppId };
        for (const [key, ids] of Object.entries(idsByType)) {
          if (ids.length > 0) linkArgs[key] = ids;
        }
        await linkObjectsMutation(linkArgs as Parameters<typeof linkObjectsMutation>[0]);
      }

      setLinkedRecords((prev) => [...prev, ...newLinkedRecords]);

      // Update connection status
      setPendingConnections((prev) =>
        prev.map((section) => ({
          ...section,
          connectionStatus: "connected",
        }))
      );

      // Persist connection completion to DB
      if (builderAppId) {
        await updateConnectionStatusMutation({
          sessionId,
          appId: builderAppId,
          connectionStatus: "completed",
          connectionCompletedAt: Date.now(),
        });
      }

      console.log(`[Builder] Connections executed: ${newLinkedRecords.length} records linked`);
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to execute connections";
      console.error("[Builder] Connection execution error:", errorMessage);
      setGenerationError(errorMessage);
      return false;
    }
  }, [organizationId, sessionId, builderAppId, pendingConnections, createFormMutation, createContactMutation, createProductMutation, createEventMutation, createInvoiceMutation, createBookingMutation, createWorkflowMutation, createCheckoutMutation, linkObjectsMutation, updateConnectionStatusMutation]);

  // Reset the builder state
  const reset = useCallback(() => {
    setPageSchema(null);
    setConversationId(null);
    setMessages([]);
    setIsGenerating(false);
    setGenerationError(null);
    setSelectedSectionId(null);
    setIsEditMode(false);
    setIsPlanningMode(false);
    // Reset v0 state
    setV0ChatId(null);
    setV0DemoUrl(null);
    setV0WebUrl(null);
    setBuilderAppId(null);
    // Reset three-mode architecture state
    setBuilderModeInternal("prototype");
    setPrototypePageJson(null);
    setConnectedPageId(null);
    setPendingConnections([]);
    setLinkedRecords([]);
    // Reset multi-page state
    setPages([]);
    setCurrentPageId(null);
    setProjectNavigation({ header: [], footer: [] });
    pageIdCounter.current = 0;
    messageCounter.current = 0;
    lastUserMessageRef.current = null;
  }, []);

  // Clear error without resetting conversation
  const clearError = useCallback(() => {
    setGenerationError(null);
  }, []);

  // Programmatic message injection for deploy heal flow
  const addSystemMessage = useCallback(
    (content: string, errorDetails?: BuilderMessage["errorDetails"], healData?: BuilderMessage["healData"]) => {
      const msg: BuilderMessage = {
        id: generateMessageId(),
        role: "system",
        content,
        timestamp: Date.now(),
        errorDetails,
        healData,
      };
      setMessages((prev) => [...prev, msg]);
    },
    []
  );

  const addAssistantMessage = useCallback(
    (content: string, options?: { processingTime?: number; healData?: BuilderMessage["healData"] }) => {
      const msg: BuilderMessage = {
        id: generateMessageId(),
        role: "assistant",
        content,
        timestamp: Date.now(),
        processingTime: options?.processingTime,
        healData: options?.healData,
      };
      setMessages((prev) => [...prev, msg]);
    },
    []
  );

  // Retry the last user message (removes error message first)
  const retryLastMessage = useCallback(async () => {
    if (!lastUserMessageRef.current || isGenerating) return;

    // Remove the last error message (system message) from the list
    setMessages((prev) => {
      const filtered = [...prev];
      // Find and remove the last system error message
      for (let i = filtered.length - 1; i >= 0; i--) {
        if (filtered[i].role === "system" && filtered[i].errorDetails) {
          filtered.splice(i, 1);
          break;
        }
      }
      // Also remove the last user message since sendMessage will add it again
      for (let i = filtered.length - 1; i >= 0; i--) {
        if (filtered[i].role === "user") {
          filtered.splice(i, 1);
          break;
        }
      }
      return filtered;
    });

    // Clear the error
    setGenerationError(null);

    // Retry with the last message
    await sendMessageInternal(lastUserMessageRef.current);
  }, [isGenerating]);

  // ============================================================================
  // MULTI-PAGE PROJECT FUNCTIONS
  // ============================================================================

  // Switch to a different page in the project
  const setCurrentPage = useCallback((pageId: string) => {
    const page = pages.find(p => p.id === pageId);
    if (!page) {
      console.warn(`[Builder] Page not found: ${pageId}`);
      return;
    }

    setCurrentPageId(pageId);

    // Update the displayed page schema to the selected page's schema
    if (page.schema) {
      setPageSchema(page.schema);
    }

    console.log(`[Builder] Switched to page: ${page.name} (${page.slug})`);
  }, [pages]);

  // Add a new page to the project
  const addPage = useCallback((name: string, slug?: string): string => {
    const pageId = generatePageId();
    const pageSlug = slug || generateSlugFromName(name);

    const newPage: ProjectPage = {
      id: pageId,
      name,
      slug: pageSlug,
      schema: null,
      isDefault: pages.length === 0, // First page is default
    };

    setPages(prev => [...prev, newPage]);

    // If this is the first page, make it current
    if (pages.length === 0) {
      setCurrentPageId(pageId);
    }

    // Update project navigation to include new page
    setProjectNavigation(prev => ({
      ...prev,
      header: [
        ...prev.header,
        { label: name, href: `/${pageSlug}` },
      ],
    }));

    console.log(`[Builder] Added page: ${name} (${pageSlug})`);
    return pageId;
  }, [pages.length]);

  // Update a page's schema
  const updatePageSchema = useCallback((pageId: string, schema: AIGeneratedPageSchema) => {
    setPages(prev => prev.map(p =>
      p.id === pageId ? { ...p, schema } : p
    ));

    // If this is the current page, also update the displayed schema
    if (pageId === currentPageId) {
      setPageSchema(schema);
    }

    console.log(`[Builder] Updated schema for page: ${pageId}`);
  }, [currentPageId]);

  // Rename a page
  const renamePage = useCallback((pageId: string, newName: string) => {
    const newSlug = generateSlugFromName(newName);

    setPages(prev => prev.map(p =>
      p.id === pageId ? { ...p, name: newName, slug: newSlug } : p
    ));

    // Update navigation links
    setProjectNavigation(prev => ({
      ...prev,
      header: prev.header.map(link => {
        const page = pages.find(p => p.id === pageId);
        if (page && link.href === `/${page.slug}`) {
          return { ...link, label: newName, href: `/${newSlug}` };
        }
        return link;
      }),
    }));

    console.log(`[Builder] Renamed page ${pageId} to: ${newName}`);
  }, [pages]);

  // Delete a page from the project
  const deletePage = useCallback((pageId: string) => {
    const pageToDelete = pages.find(p => p.id === pageId);
    if (!pageToDelete) return;

    // Don't allow deleting the last page
    if (pages.length <= 1) {
      console.warn("[Builder] Cannot delete the last page");
      return;
    }

    setPages(prev => prev.filter(p => p.id !== pageId));

    // Remove from navigation
    setProjectNavigation(prev => ({
      ...prev,
      header: prev.header.filter(link => link.href !== `/${pageToDelete.slug}`),
    }));

    // If deleting current page, switch to first remaining page
    if (pageId === currentPageId) {
      const remainingPages = pages.filter(p => p.id !== pageId);
      if (remainingPages.length > 0) {
        setCurrentPage(remainingPages[0].id);
      }
    }

    console.log(`[Builder] Deleted page: ${pageToDelete.name}`);
  }, [pages, currentPageId, setCurrentPage]);

  // Duplicate a page
  const duplicatePage = useCallback((pageId: string): string => {
    const pageToDuplicate = pages.find(p => p.id === pageId);
    if (!pageToDuplicate) {
      console.warn(`[Builder] Page not found for duplication: ${pageId}`);
      return "";
    }

    const newName = `${pageToDuplicate.name} (Copy)`;
    const newPageId = addPage(newName);

    // Copy the schema to the new page
    if (pageToDuplicate.schema) {
      updatePageSchema(newPageId, {
        ...pageToDuplicate.schema,
        metadata: {
          ...pageToDuplicate.schema.metadata,
          title: newName,
          slug: generateSlugFromName(newName),
        },
      });
    }

    console.log(`[Builder] Duplicated page: ${pageToDuplicate.name}`);
    return newPageId;
  }, [pages, addPage, updatePageSchema]);

  // Navigate to a page by slug (used for link interception in preview)
  const navigateToPageBySlug = useCallback((slug: string): boolean => {
    const page = pages.find(p => p.slug === slug);
    if (page) {
      setCurrentPage(page.id);
      return true;
    }
    console.log(`[Builder] Page not found for slug: ${slug}`);
    return false;
  }, [pages, setCurrentPage]);

  // Initialize first page when pageSchema is set and no pages exist
  useEffect(() => {
    if (pageSchema && pages.length === 0) {
      const pageId = generatePageId();
      const pageName = pageSchema.metadata?.title || "Home";
      const pageSlug = pageSchema.metadata?.slug || generateSlugFromName(pageName);

      const initialPage: ProjectPage = {
        id: pageId,
        name: pageName,
        slug: pageSlug,
        schema: pageSchema,
        isDefault: true,
      };

      setPages([initialPage]);
      setCurrentPageId(pageId);
      setProjectNavigation({
        header: [{ label: pageName, href: `/${pageSlug}` }],
        footer: [],
      });

      console.log(`[Builder] Initialized project with page: ${pageName}`);
    }
  }, [pageSchema, pages.length]);

  // Sync current page schema when pageSchema changes (from AI generation)
  useEffect(() => {
    if (pageSchema && currentPageId) {
      updatePageSchema(currentPageId, pageSchema);
    }
  }, [pageSchema, currentPageId, updatePageSchema]);

  const value: BuilderContextType = {
    organizationId,
    sessionId,
    pageSchema,
    setPageSchema,
    conversationId,
    messages,
    isGenerating,
    generationError,
    selectedModel,
    setSelectedModel,
    // V0 integration
    aiProvider,
    setAiProvider,
    v0ChatId,
    v0DemoUrl,
    v0WebUrl,
    builderAppId,
    setBuilderAppId,
    selectedSectionId,
    setSelectedSectionId,
    isEditMode,
    setIsEditMode,
    isPlanningMode,
    setIsPlanningMode,
    // Three-mode architecture
    builderMode,
    setBuilderMode,
    prototypePageJson,
    setPrototypePageJson,
    connectedPageId,
    setConnectedPageId,
    pendingConnections,
    setPendingConnections,
    linkedRecords,
    setLinkedRecords,
    analyzePageForConnections,
    updateConnectionChoice,
    executeConnections,
    addManualConnectionItem,
    isAnalyzingConnections,
    productionUrl,
    inspectorMode,
    setInspectorMode,
    canSwitchToMode,
    // Multi-page project
    pages,
    currentPageId,
    projectNavigation,
    setCurrentPage,
    addPage,
    updatePageSchema,
    renamePage,
    deletePage,
    duplicatePage,
    setProjectNavigation,
    navigateToPageBySlug,
    // Actions
    sendMessage,
    retryLastMessage,
    saveAsProject,
    loadProject,
    reset,
    clearError,
    // Programmatic message injection
    addSystemMessage,
    addAssistantMessage,
  };

  return (
    <BuilderContext.Provider value={value}>{children}</BuilderContext.Provider>
  );
}

// ============================================================================
// HOOK
// ============================================================================

export function useBuilder() {
  const context = useContext(BuilderContext);
  if (context === undefined) {
    throw new Error("useBuilder must be used within a BuilderProvider");
  }
  return context;
}

// ============================================================================
// HELPER HOOKS
// ============================================================================

/**
 * Hook to check if we can generate (have auth + not currently generating)
 */
export function useCanGenerate() {
  const { organizationId, sessionId, isGenerating } = useBuilder();
  return Boolean(organizationId && sessionId && !isGenerating);
}

/**
 * Hook to check if we can save (have page schema + auth)
 */
export function useCanSave() {
  const { organizationId, sessionId, pageSchema } = useBuilder();
  return Boolean(organizationId && sessionId && pageSchema);
}

/**
 * Hook to get builder mode info
 */
export function useBuilderMode() {
  const {
    builderMode,
    setBuilderMode,
    canSwitchToMode,
    pendingConnections,
    linkedRecords,
  } = useBuilder();

  return {
    mode: builderMode,
    setMode: setBuilderMode,
    canSwitchTo: canSwitchToMode,
    isPrototype: builderMode === "prototype",
    isConnect: builderMode === "connect",
    hasPendingConnections: pendingConnections.length > 0,
    totalPendingItems: pendingConnections.reduce(
      (sum, c) => sum + c.detectedItems.filter(i => !i.connectionChoice).length,
      0
    ),
    linkedRecordsCount: linkedRecords.length,
  };
}

/**
 * Hook to check if we can connect (have prototype page)
 */
export function useCanConnect() {
  const { pageSchema, prototypePageJson } = useBuilder();
  return Boolean(pageSchema || prototypePageJson);
}
