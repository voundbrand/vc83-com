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
  type ReactNode,
} from "react";
import { useMutation, useAction } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import type { AIGeneratedPageSchema } from "@/lib/page-builder/page-schema";
import { parseAndValidateAIResponse } from "@/lib/page-builder/validators";
import { useAuth } from "@/hooks/use-auth";

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

  // Selected section (for highlighting)
  selectedSectionId: string | null;
  setSelectedSectionId: (id: string | null) => void;

  // Edit mode
  isEditMode: boolean;
  setIsEditMode: (enabled: boolean) => void;

  // Actions
  sendMessage: (message: string) => Promise<void>;
  saveAsProject: (name: string) => Promise<Id<"objects"> | null>;
  loadProject: (projectId: Id<"objects">) => Promise<void>;
  reset: () => void;
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
}

export function BuilderProvider({
  children,
  organizationId,
  sessionId,
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

  // Message counter for IDs
  const messageCounter = useRef(0);

  // Convex actions
  const sendChatMessage = useAction(api.ai.chat.sendMessage);
  const saveGeneratedPage = useMutation(api.pageBuilder.saveGeneratedPage);

  // Generate unique message ID
  const generateMessageId = () => {
    messageCounter.current += 1;
    return `msg_${Date.now()}_${messageCounter.current}`;
  };

  // Send a message to the AI
  const sendMessage = useCallback(
    async (message: string) => {
      if (!organizationId || !user) {
        setGenerationError("Not authenticated");
        return;
      }

      setIsGenerating(true);
      setGenerationError(null);

      // Add user message
      const userMessage: BuilderMessage = {
        id: generateMessageId(),
        role: "user",
        content: message,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMessage]);

      try {
        // Prepend page builder context to the message
        // This tells the AI we're in page builder mode
        const contextPrefix = pageSchema
          ? `[PAGE BUILDER MODE - Current page JSON: ${JSON.stringify(pageSchema)}]\n\n`
          : "[PAGE BUILDER MODE - No page yet]\n\n";
        const fullMessage = contextPrefix + message;

        // Send to AI with page_builder context to use specialized system prompt
        const result = await sendChatMessage({
          organizationId,
          userId: user.id as Id<"users">,
          message: fullMessage,
          conversationId: conversationId || undefined,
          context: "page_builder",
        });

        // Update conversation ID if new
        if (result.conversationId && !conversationId) {
          setConversationId(result.conversationId as Id<"aiConversations">);
        }

        // Parse AI response
        const aiContent = result.message || "";
        const validation = parseAndValidateAIResponse(aiContent);

        // Create assistant message
        const assistantMessage: BuilderMessage = {
          id: generateMessageId(),
          role: "assistant",
          content: aiContent,
          timestamp: Date.now(),
          pageSchema: validation.valid ? validation.data : undefined,
        };
        setMessages((prev) => [...prev, assistantMessage]);

        // Update page schema if valid
        if (validation.valid && validation.data) {
          setPageSchema(validation.data);
        } else if (validation.parseError) {
          // AI might have responded with just text, that's OK
          console.log("AI response was not JSON:", validation.parseError);
        } else if (validation.errors) {
          console.warn("Page schema validation failed:", validation.errors);
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to generate page";
        setGenerationError(errorMessage);

        // Add error message
        const errorMsg: BuilderMessage = {
          id: generateMessageId(),
          role: "system",
          content: `Error: ${errorMessage}`,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setIsGenerating(false);
      }
    },
    [organizationId, user, conversationId, pageSchema, sendChatMessage]
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

  // Reset the builder state
  const reset = useCallback(() => {
    setPageSchema(null);
    setConversationId(null);
    setMessages([]);
    setIsGenerating(false);
    setGenerationError(null);
    setSelectedSectionId(null);
    setIsEditMode(false);
    messageCounter.current = 0;
  }, []);

  const value: BuilderContextType = {
    organizationId,
    sessionId,
    pageSchema,
    setPageSchema,
    conversationId,
    messages,
    isGenerating,
    generationError,
    selectedSectionId,
    setSelectedSectionId,
    isEditMode,
    setIsEditMode,
    sendMessage,
    saveAsProject,
    loadProject,
    reset,
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
