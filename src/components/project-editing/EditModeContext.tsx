"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { TranslationPromptModal } from "./TranslationPromptModal";

// Types
export type Language = "de" | "en";

interface Editor {
  email: string;
  name?: string;
  since: number;
}

interface ContentBlock {
  content: { de: string; en: string };
  version: number;
  lastModifiedAt: number;
  modifiedByName?: string;
}

// Translation prompt state
interface TranslationPrompt {
  blockId: string;
  blockLabel?: string;
  originalLanguage: Language;
  targetLanguage: Language;
  originalValue: string;
  currentTargetValue: string;
}

interface EditModeContextType {
  // State
  projectId: string;
  isEditMode: boolean;
  currentLanguage: Language;
  contentMap: Record<string, ContentBlock>;
  activeEditors: Record<string, Editor[]>;
  isSaving: boolean;
  pendingChanges: Set<string>;

  // Actions
  setEditMode: (enabled: boolean) => void;
  setLanguage: (lang: Language) => void;
  getContent: (blockId: string, defaultValue: string) => string;
  getContentForLanguage: (blockId: string, lang: Language, defaultValue: string) => string;
  saveContent: (
    blockId: string,
    content: { de?: string; en?: string },
    changeNote?: string
  ) => Promise<void>;

  // Translation prompt
  translationPrompt: TranslationPrompt | null;
  showTranslationPrompt: (prompt: TranslationPrompt) => void;
  hideTranslationPrompt: () => void;
  saveTranslation: (blockId: string, targetLang: Language, value: string) => Promise<void>;

  // Session management
  sessionId: string | null;
  userEmail: string | null;
  userName: string | null;
  startEditing: (sectionId: string) => void;
  stopEditing: (sectionId: string) => void;
  isBeingEditedByOther: (sectionId: string) => boolean;
  getOtherEditors: (sectionId: string) => Editor[];
}

const EditModeContext = createContext<EditModeContextType | null>(null);

interface EditModeProviderProps {
  projectId: string;
  organizationId: Id<"organizations">; // Required for ontology-based storage
  children: ReactNode;
  // Optional: pass in user info if already authenticated
  sessionId?: string | null;
  userEmail?: string | null;
  userName?: string | null;
}

export function EditModeProvider({
  projectId,
  organizationId,
  children,
  sessionId: providedSessionId,
  userEmail: providedUserEmail,
  userName: providedUserName,
}: EditModeProviderProps) {
  // Core state
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState<Language>("de");
  const [isSaving, setIsSaving] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<Set<string>>(new Set());
  const [activeSections, setActiveSections] = useState<Set<string>>(new Set());
  const [translationPrompt, setTranslationPrompt] = useState<TranslationPrompt | null>(null);

  // User session info (from provider or could be fetched)
  const sessionId = providedSessionId ?? null;
  const userEmail = providedUserEmail ?? null;
  const userName = providedUserName ?? null;

  // Fetch all content for this project
  const projectContent = useQuery(api.projectContent.getProjectContent, {
    projectId,
  });

  // Fetch active editors
  const editors = useQuery(api.projectContent.getActiveEditors, {
    projectId,
  });

  // Mutations
  const saveContentBlock = useMutation(api.projectContent.saveContentBlock);
  const startEditSession = useMutation(api.projectContent.startEditSession);
  const endEditSession = useMutation(api.projectContent.endEditSession);
  const updateEditSession = useMutation(api.projectContent.updateEditSession);

  // Convert content to map - memoize to prevent unnecessary re-renders
  const contentMap: Record<string, ContentBlock> = useMemo(
    () => projectContent ?? {},
    [projectContent]
  );
  const activeEditors: Record<string, Editor[]> = useMemo(
    () => editors ?? {},
    [editors]
  );

  // Heartbeat for active edit sessions
  useEffect(() => {
    if (!isEditMode || !sessionId || activeSections.size === 0) return;

    const interval = setInterval(() => {
      activeSections.forEach((sectionId) => {
        updateEditSession({ projectId, sectionId, sessionId });
      });
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [isEditMode, sessionId, activeSections, projectId, updateEditSession]);

  // Cleanup edit sessions on unmount or when leaving edit mode
  useEffect(() => {
    if (!isEditMode && sessionId && activeSections.size > 0) {
      activeSections.forEach((sectionId) => {
        endEditSession({ projectId, sectionId, sessionId });
      });
      setActiveSections(new Set());
    }
  }, [isEditMode, sessionId, activeSections, projectId, endEditSession]);

  // Get content for a specific block
  const getContent = useCallback(
    (blockId: string, defaultValue: string): string => {
      const block = contentMap[blockId];
      if (!block) return defaultValue;
      return block.content[currentLanguage] || defaultValue;
    },
    [contentMap, currentLanguage]
  );

  // Get content for a specific block in a specific language
  const getContentForLanguage = useCallback(
    (blockId: string, lang: Language, defaultValue: string): string => {
      const block = contentMap[blockId];
      if (!block) return defaultValue;
      return block.content[lang] || defaultValue;
    },
    [contentMap]
  );

  // Show translation prompt
  const showTranslationPrompt = useCallback((prompt: TranslationPrompt) => {
    setTranslationPrompt(prompt);
  }, []);

  // Hide translation prompt
  const hideTranslationPrompt = useCallback(() => {
    setTranslationPrompt(null);
  }, []);

  // Save translation (for the other language)
  const saveTranslation = useCallback(
    async (blockId: string, targetLang: Language, value: string) => {
      setIsSaving(true);
      setPendingChanges((prev) => new Set(prev).add(blockId));

      try {
        const content = targetLang === "de" ? { de: value } : { en: value };
        await saveContentBlock({
          projectId,
          blockId,
          organizationId,
          content,
          modifiedBy: userEmail ?? undefined,
          modifiedByName: userName ?? undefined,
          changeNote: `Updated ${targetLang.toUpperCase()} translation`,
        });
        setTranslationPrompt(null);
      } finally {
        setIsSaving(false);
        setPendingChanges((prev) => {
          const next = new Set(prev);
          next.delete(blockId);
          return next;
        });
      }
    },
    [projectId, organizationId, userEmail, userName, saveContentBlock]
  );

  // Save content for a specific block
  const saveContent = useCallback(
    async (
      blockId: string,
      content: { de?: string; en?: string },
      changeNote?: string
    ) => {
      setIsSaving(true);
      setPendingChanges((prev) => new Set(prev).add(blockId));

      try {
        await saveContentBlock({
          projectId,
          blockId,
          organizationId,
          content,
          modifiedBy: userEmail ?? undefined,
          modifiedByName: userName ?? undefined,
          changeNote,
        });
      } finally {
        setIsSaving(false);
        setPendingChanges((prev) => {
          const next = new Set(prev);
          next.delete(blockId);
          return next;
        });
      }
    },
    [projectId, organizationId, userEmail, userName, saveContentBlock]
  );

  // Start editing a section
  const startEditing = useCallback(
    (sectionId: string) => {
      if (!sessionId || !userEmail) return;

      setActiveSections((prev) => new Set(prev).add(sectionId));
      startEditSession({
        projectId,
        sectionId,
        organizationId,
        sessionId,
        userEmail,
        userName: userName ?? undefined,
      });
    },
    [sessionId, userEmail, userName, projectId, organizationId, startEditSession]
  );

  // Stop editing a section
  const stopEditing = useCallback(
    (sectionId: string) => {
      if (!sessionId) return;

      setActiveSections((prev) => {
        const next = new Set(prev);
        next.delete(sectionId);
        return next;
      });
      endEditSession({ projectId, sectionId, sessionId });
    },
    [sessionId, projectId, endEditSession]
  );

  // Check if section is being edited by someone else
  const isBeingEditedByOther = useCallback(
    (sectionId: string): boolean => {
      const sectionEditors = activeEditors[sectionId] ?? [];
      return sectionEditors.some((e) => e.email !== userEmail);
    },
    [activeEditors, userEmail]
  );

  // Get other editors for a section
  const getOtherEditors = useCallback(
    (sectionId: string): Editor[] => {
      const sectionEditors = activeEditors[sectionId] ?? [];
      return sectionEditors.filter((e) => e.email !== userEmail);
    },
    [activeEditors, userEmail]
  );

  const value: EditModeContextType = {
    projectId,
    isEditMode,
    currentLanguage,
    contentMap,
    activeEditors,
    isSaving,
    pendingChanges,
    setEditMode: setIsEditMode,
    setLanguage: setCurrentLanguage,
    getContent,
    getContentForLanguage,
    saveContent,
    translationPrompt,
    showTranslationPrompt,
    hideTranslationPrompt,
    saveTranslation,
    sessionId,
    userEmail,
    userName,
    startEditing,
    stopEditing,
    isBeingEditedByOther,
    getOtherEditors,
  };

  // Handle translation confirmation
  const handleTranslationConfirm = useCallback(
    async (newValue: string) => {
      if (!translationPrompt) return;
      await saveTranslation(
        translationPrompt.blockId,
        translationPrompt.targetLanguage,
        newValue
      );
    },
    [translationPrompt, saveTranslation]
  );

  return (
    <EditModeContext.Provider value={value}>
      {children}

      {/* Translation prompt modal (LinkedIn-style) */}
      <TranslationPromptModal
        isOpen={translationPrompt !== null}
        onClose={hideTranslationPrompt}
        onConfirm={handleTranslationConfirm}
        onSkip={hideTranslationPrompt}
        blockId={translationPrompt?.blockId ?? ""}
        originalLanguage={translationPrompt?.originalLanguage ?? "de"}
        targetLanguage={translationPrompt?.targetLanguage ?? "en"}
        originalValue={translationPrompt?.originalValue ?? ""}
        currentTargetValue={translationPrompt?.currentTargetValue ?? ""}
        blockLabel={translationPrompt?.blockLabel}
      />
    </EditModeContext.Provider>
  );
}

export function useEditMode() {
  const context = useContext(EditModeContext);
  if (!context) {
    throw new Error("useEditMode must be used within an EditModeProvider");
  }
  return context;
}

// Helper hook for checking if we can edit
export function useCanEdit() {
  const context = useContext(EditModeContext);
  // If no context, we're not in edit mode
  if (!context) return false;
  return context.isEditMode && context.sessionId !== null;
}
