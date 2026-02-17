"use client";

/**
 * NOTE EDITOR - Rich text editing via contentEditable
 *
 * For plain text files (.txt). Uses contentEditable for a clean
 * writing experience. Content stored as plain text.
 * Autosaves via debounced updateFileContent mutation.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import {
  Bold,
  Italic,
  Underline,
  Heading1,
  Heading2,
  List,
  Minus,
  Save,
  Check,
  Loader2,
} from "lucide-react";
import type { ProjectFile } from "../finder-types";

interface NoteEditorProps {
  file: ProjectFile;
  sessionId: string;
  onDirty: () => void;
  onClean: () => void;
}

export function NoteEditor({
  file,
  sessionId,
  onDirty,
  onClean,
}: NoteEditorProps) {
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const editorRef = useRef<HTMLDivElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedFadeRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initializedRef = useRef(false);

  const updateFileContent = useMutation(api.projectFileSystem.updateFileContent);

  // Initialize editor content
  useEffect(() => {
    if (editorRef.current && !initializedRef.current) {
      editorRef.current.innerText = file.content || "";
      initializedRef.current = true;
    }
  }, [file._id, file.content]);

  // Reset when file changes
  useEffect(() => {
    initializedRef.current = false;
    if (editorRef.current) {
      editorRef.current.innerText = file.content || "";
      initializedRef.current = true;
    }
  }, [file._id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Save function
  const doSave = useCallback(
    async (text: string) => {
      setSaveStatus("saving");
      try {
        await updateFileContent({
          sessionId,
          fileId: file._id as Id<"projectFiles">,
          content: text,
        });
        setSaveStatus("saved");
        onClean();
        savedFadeRef.current = setTimeout(() => setSaveStatus("idle"), 2000);
      } catch (err) {
        console.error("Save failed:", err);
        setSaveStatus("idle");
      }
    },
    [sessionId, file._id, updateFileContent, onClean]
  );

  // Debounced autosave on input
  const handleInput = useCallback(() => {
    onDirty();
    const text = editorRef.current?.innerText || "";

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    if (savedFadeRef.current) clearTimeout(savedFadeRef.current);
    saveTimerRef.current = setTimeout(() => doSave(text), 800);
  }, [onDirty, doSave]);

  // Manual save
  const handleManualSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    const text = editorRef.current?.innerText || "";
    doSave(text);
  }, [doSave]);

  // Cmd+S handler
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleManualSave();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleManualSave]);

  // Cleanup timers
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (savedFadeRef.current) clearTimeout(savedFadeRef.current);
    };
  }, []);

  // execCommand helpers
  const execCmd = useCallback((cmd: string, value?: string) => {
    document.execCommand(cmd, false, value);
    editorRef.current?.focus();
  }, []);

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--win95-bg)" }}>
      {/* Toolbar */}
      <div
        className="flex items-center gap-1 px-3 py-1.5 border-b-2 flex-shrink-0"
        style={{ borderColor: "var(--win95-border)" }}
      >
        <ToolbarButton
          icon={<Bold size={14} />}
          title="Bold"
          onClick={() => execCmd("bold")}
        />
        <ToolbarButton
          icon={<Italic size={14} />}
          title="Italic"
          onClick={() => execCmd("italic")}
        />
        <ToolbarButton
          icon={<Underline size={14} />}
          title="Underline"
          onClick={() => execCmd("underline")}
        />

        <div className="w-px h-4 mx-1" style={{ background: "var(--win95-border)" }} />

        <ToolbarButton
          icon={<Heading1 size={14} />}
          title="Heading 1"
          onClick={() => execCmd("formatBlock", "h1")}
        />
        <ToolbarButton
          icon={<Heading2 size={14} />}
          title="Heading 2"
          onClick={() => execCmd("formatBlock", "h2")}
        />

        <div className="w-px h-4 mx-1" style={{ background: "var(--win95-border)" }} />

        <ToolbarButton
          icon={<List size={14} />}
          title="Unordered List"
          onClick={() => execCmd("insertUnorderedList")}
        />
        <ToolbarButton
          icon={<Minus size={14} />}
          title="Horizontal Rule"
          onClick={() => execCmd("insertHorizontalRule")}
        />

        <div className="flex-1" />

        {/* Save status */}
        <div className="flex items-center gap-1 text-[10px] min-w-[60px]">
          {saveStatus === "saving" && (
            <>
              <Loader2 size={10} className="animate-spin" style={{ color: "var(--neutral-gray)" }} />
              <span style={{ color: "var(--neutral-gray)" }}>Saving...</span>
            </>
          )}
          {saveStatus === "saved" && (
            <>
              <Check size={10} style={{ color: "var(--success-green)" }} />
              <span style={{ color: "var(--success-green)" }}>Saved</span>
            </>
          )}
        </div>

        <ToolbarButton
          icon={<Save size={14} />}
          title="Save (Cmd+S)"
          onClick={handleManualSave}
        />
      </div>

      {/* Editor area */}
      <div className="flex-1 overflow-y-auto">
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          className="min-h-full p-6 outline-none text-sm"
          style={{
            background: "var(--win95-bg-light, #fff)",
            color: "var(--win95-text)",
            lineHeight: 1.8,
          }}
          suppressContentEditableWarning
        />
      </div>
    </div>
  );
}

// ============================================================================
// TOOLBAR BUTTON
// ============================================================================

function ToolbarButton({
  icon,
  title,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="p-1.5 rounded transition-colors"
      style={{ color: "var(--win95-text)" }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--finder-selection-bg)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
      }}
    >
      {icon}
    </button>
  );
}
