"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  KeyboardEvent,
  FocusEvent,
  createElement,
} from "react";
import { useEditMode, useCanEdit } from "./EditModeContext";
import { Loader2, Check, X, History, Edit2, AlertCircle } from "lucide-react";

type ElementType =
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "h5"
  | "h6"
  | "p"
  | "span"
  | "div"
  | "li";

interface EditableTextProps {
  blockId: string;
  defaultValue: string;
  as?: ElementType;
  className?: string;
  multiline?: boolean;
  maxLength?: number;
  sectionId?: string; // For edit session locking
  placeholder?: string;
  onSave?: (newValue: string) => void; // Optional callback after save
  blockLabel?: string; // Human-readable label for translation prompt
  skipTranslationPrompt?: boolean; // Skip the "update other language" prompt
}

export function EditableText({
  blockId,
  defaultValue,
  as: Element = "span",
  className = "",
  multiline = false,
  maxLength = 2000,
  sectionId,
  placeholder = "Click to edit...",
  onSave,
  blockLabel,
  skipTranslationPrompt = false,
}: EditableTextProps) {
  const canEdit = useCanEdit();
  const editMode = useEditMode();

  // Local state
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [hasError, setHasError] = useState(false);
  const editRef = useRef<HTMLDivElement | HTMLTextAreaElement>(null);

  // Get current content from context
  const currentValue = editMode
    ? editMode.getContent(blockId, defaultValue)
    : defaultValue;

  // Check if section is being edited by someone else
  const effectiveSection = sectionId ?? blockId.split(".")[0];
  const isLocked = editMode?.isBeingEditedByOther(effectiveSection) ?? false;
  const otherEditors = editMode?.getOtherEditors(effectiveSection) ?? [];

  // Start editing
  const handleStartEdit = useCallback(() => {
    if (!canEdit || isLocked) return;

    setLocalValue(currentValue);
    setIsEditing(true);
    setHasError(false);

    // Claim the section
    if (editMode && sectionId) {
      editMode.startEditing(sectionId);
    }
  }, [canEdit, isLocked, currentValue, editMode, sectionId]);

  // Focus the editor when editing starts
  useEffect(() => {
    if (isEditing && editRef.current) {
      editRef.current.focus();

      // For contentEditable, move cursor to end
      if (!multiline && editRef.current instanceof HTMLElement) {
        const range = document.createRange();
        const sel = window.getSelection();
        range.selectNodeContents(editRef.current);
        range.collapse(false);
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    }
  }, [isEditing, multiline]);

  // Save changes
  const handleSave = useCallback(async () => {
    if (!editMode || localValue === currentValue) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    setHasError(false);

    try {
      // Save only the current language
      const currentLang = editMode.currentLanguage;
      const content =
        currentLang === "de"
          ? { de: localValue }
          : { en: localValue };

      await editMode.saveContent(blockId, content);

      if (onSave) {
        onSave(localValue);
      }

      setIsEditing(false);

      // Show translation prompt for the other language (LinkedIn-style UX)
      if (!skipTranslationPrompt) {
        const targetLang = currentLang === "de" ? "en" : "de";
        const targetValue = editMode.getContentForLanguage(blockId, targetLang, defaultValue);

        // Only prompt if there's existing content in the other language
        // or if the user might want to add it
        editMode.showTranslationPrompt({
          blockId,
          blockLabel,
          originalLanguage: currentLang,
          targetLanguage: targetLang,
          originalValue: localValue,
          currentTargetValue: targetValue,
        });
      }
    } catch {
      setHasError(true);
    } finally {
      setIsSaving(false);
    }
  }, [editMode, localValue, currentValue, blockId, onSave, skipTranslationPrompt, blockLabel, defaultValue]);

  // Cancel editing
  const handleCancel = useCallback(() => {
    setLocalValue(currentValue);
    setIsEditing(false);
    setHasError(false);

    // Release the section
    if (editMode && sectionId) {
      editMode.stopEditing(sectionId);
    }
  }, [currentValue, editMode, sectionId]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleCancel();
      } else if (e.key === "Enter" && !multiline) {
        e.preventDefault();
        handleSave();
      } else if (e.key === "Enter" && e.ctrlKey) {
        e.preventDefault();
        handleSave();
      }
    },
    [handleCancel, handleSave, multiline]
  );

  // Handle blur (save on blur)
  const handleBlur = useCallback(
    (e: FocusEvent) => {
      // Don't save if clicking on the action buttons
      const relatedTarget = e.relatedTarget as HTMLElement;
      if (relatedTarget?.closest(".editable-actions")) {
        return;
      }
      handleSave();
    },
    [handleSave]
  );

  // Handle input for contentEditable
  const handleInput = useCallback(
    (e: React.FormEvent<HTMLDivElement>) => {
      const text = (e.target as HTMLDivElement).textContent ?? "";
      if (text.length <= maxLength) {
        setLocalValue(text);
      }
    },
    [maxLength]
  );

  // If not in edit mode context, just render the text
  if (!editMode) {
    return createElement(Element, { className }, currentValue || placeholder);
  }

  // Render based on editing state
  if (isEditing) {
    return (
      <div
        className="relative inline-block w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {multiline ? (
          <textarea
            ref={editRef as React.RefObject<HTMLTextAreaElement>}
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            onClick={(e) => e.stopPropagation()}
            maxLength={maxLength}
            className={`${className} w-full min-h-[80px] p-2 border-2 border-green-500 rounded bg-white/90 focus:outline-none focus:ring-2 focus:ring-green-500/50 resize-y`}
            placeholder={placeholder}
            disabled={isSaving}
          />
        ) : (
          <div
            ref={editRef as React.RefObject<HTMLDivElement>}
            contentEditable
            suppressContentEditableWarning
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            onClick={(e) => e.stopPropagation()}
            className={`${className} inline-block min-w-[100px] px-1 border-2 border-green-500 rounded bg-white/90 focus:outline-none focus:ring-2 focus:ring-green-500/50`}
            style={{ outline: "none" }}
          >
            {localValue}
          </div>
        )}

        {/* Action buttons */}
        <div
          className="editable-actions absolute -top-8 right-0 flex items-center gap-1 bg-white rounded shadow-lg border px-1 py-0.5 z-50"
          onClick={(e) => e.stopPropagation()}
        >
          {isSaving ? (
            <Loader2 size={14} className="animate-spin text-green-600" />
          ) : (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSave();
                }}
                className="p-1 hover:bg-green-100 rounded text-green-600"
                title="Save (Enter)"
              >
                <Check size={14} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCancel();
                }}
                className="p-1 hover:bg-red-100 rounded text-red-600"
                title="Cancel (Esc)"
              >
                <X size={14} />
              </button>
            </>
          )}
        </div>

        {/* Character count */}
        {multiline && (
          <div className="absolute bottom-1 right-2 text-xs text-gray-400">
            {localValue.length}/{maxLength}
          </div>
        )}

        {/* Error indicator */}
        {hasError && (
          <div className="absolute -bottom-6 left-0 text-xs text-red-500 flex items-center gap-1">
            <AlertCircle size={12} />
            Failed to save. Try again.
          </div>
        )}
      </div>
    );
  }

  // View mode - show content with edit affordance
  const displayValue = currentValue || placeholder;
  const isEmpty = !currentValue;

  // Base styles
  const editableStyles = canEdit
    ? `cursor-pointer transition-all hover:bg-blue-50/50 ${
        isLocked ? "cursor-not-allowed opacity-70" : ""
      }`
    : "";

  const editIndicator = canEdit && !isLocked && (
    <span className="inline-flex items-center ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
      <Edit2 size={12} className="text-blue-500" />
    </span>
  );

  const lockedIndicator = canEdit && isLocked && otherEditors.length > 0 && (
    <span className="inline-flex items-center ml-1 text-amber-500" title={`Being edited by ${otherEditors.map(e => e.name || e.email).join(", ")}`}>
      <AlertCircle size={12} />
    </span>
  );

  return createElement(
    Element,
    {
      className: `group ${className} ${editableStyles} ${isEmpty ? "italic text-gray-400" : ""}`,
      onClick: handleStartEdit,
      role: canEdit ? "button" : undefined,
      tabIndex: canEdit ? 0 : undefined,
      onKeyDown: canEdit
        ? (e: KeyboardEvent) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleStartEdit();
            }
          }
        : undefined,
    },
    <>
      {displayValue}
      {editIndicator}
      {lockedIndicator}
    </>
  );
}

// Multiline variant for convenience
export function EditableMultilineText(
  props: Omit<EditableTextProps, "multiline">
) {
  return <EditableText {...props} multiline />;
}

// Version history button (can be placed near editable content)
interface VersionHistoryButtonProps {
  blockId: string;
  onViewHistory?: () => void;
}

export function VersionHistoryButton({
  blockId,
  onViewHistory,
}: VersionHistoryButtonProps) {
  const canEdit = useCanEdit();
  const editMode = useEditMode();

  if (!canEdit || !editMode) return null;

  const block = editMode.contentMap[blockId];
  if (!block || block.version <= 1) return null;

  return (
    <button
      onClick={onViewHistory}
      className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600 transition-colors"
      title={`${block.version} versions`}
    >
      <History size={12} />
      <span>v{block.version}</span>
    </button>
  );
}
