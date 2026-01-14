/**
 * PROJECT EDITING COMPONENTS
 *
 * Inline editing system for project pages.
 * Enables collaborative content editing with revision history.
 *
 * Usage:
 * ```tsx
 * import {
 *   EditModeProvider,
 *   EditableText,
 *   EditModeToolbar,
 * } from "@/components/project-editing";
 *
 * // Wrap your page with the provider
 * <EditModeProvider
 *   projectId="rikscha"
 *   sessionId={sessionId}
 *   userEmail={userEmail}
 *   userName={userName}
 * >
 *   <YourPageContent />
 *   <EditModeToolbar />
 * </EditModeProvider>
 *
 * // Use EditableText for editable content
 * <EditableText
 *   blockId="hero.title"
 *   defaultValue="Default headline"
 *   as="h1"
 *   className="text-4xl font-bold"
 * />
 * ```
 */

export {
  EditModeProvider,
  useEditMode,
  useCanEdit,
} from "./EditModeContext";

export type { Language } from "./EditModeContext";

export {
  EditableText,
  EditableMultilineText,
  VersionHistoryButton,
} from "./EditableText";

export { EditModeToolbar } from "./EditModeToolbar";

export { EditableProjectWrapper } from "./EditableProjectWrapper";

export { TranslationPromptModal } from "./TranslationPromptModal";
