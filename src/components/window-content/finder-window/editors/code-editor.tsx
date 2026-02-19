"use client";

/**
 * CODE EDITOR - Monospace textarea with line numbers and find/replace
 *
 * For JSON, YAML, HTML, CSS, JS, TS, and other code-like virtual files.
 * Autosaves via debounced updateFileContent mutation.
 */

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import {
  Save,
  Copy,
  Check,
  Loader2,
  Search,
  WrapText,
  X,
  Replace,
  CaseSensitive,
} from "lucide-react";
import type { ProjectFile } from "../finder-types";

interface CodeEditorProps {
  file: ProjectFile;
  sessionId: string;
  onDirty: () => void;
  onClean: () => void;
  onSaveAs?: (content: string) => void;
}

export function CodeEditor({
  file,
  sessionId,
  onDirty,
  onClean,
  onSaveAs,
}: CodeEditorProps) {
  const { translationsMap } = useNamespaceTranslations("ui.finder");
  const [content, setContent] = useState(file.content || "");
  const [wordWrap, setWordWrap] = useState(true);
  const [showFind, setShowFind] = useState(false);
  const [findText, setFindText] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const tx = useCallback(
    (key: string, fallback: string): string => translationsMap?.[key] ?? fallback,
    [translationsMap],
  );

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedFadeRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // @ts-ignore TS2589: Convex generated mutation types can exceed instantiation depth in this component.
  const updateFileContent = useMutation((api as any).projectFileSystem.updateFileContent);

  // Sync content when file changes externally
  useEffect(() => {
    setContent(file.content || "");
  }, [file._id, file.content]);

  // Keep keyboard-first flow by focusing the editor when tab/file changes.
  useEffect(() => {
    textareaRef.current?.focus();
  }, [file._id]);

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

  // Debounced autosave
  const handleChange = useCallback(
    (newContent: string) => {
      setContent(newContent);
      onDirty();

      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (savedFadeRef.current) clearTimeout(savedFadeRef.current);
      saveTimerRef.current = setTimeout(() => doSave(newContent), 800);
    },
    [onDirty, doSave]
  );

  // Manual save
  const handleManualSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    doSave(content);
  }, [content, doSave]);

  const handleSaveAs = useCallback(() => {
    onSaveAs?.(content);
  }, [onSaveAs, content]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        if (e.shiftKey) {
          handleSaveAs();
          return;
        }
        handleManualSave();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "f") {
        e.preventDefault();
        setShowFind((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleManualSave, handleSaveAs]);

  // Cleanup timers
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (savedFadeRef.current) clearTimeout(savedFadeRef.current);
    };
  }, []);

  // Sync scroll between textarea and line numbers
  const handleScroll = useCallback(() => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }, []);

  // Line numbers
  const lines = useMemo(() => content.split("\n"), [content]);
  const lineCount = lines.length;

  // Find match count
  const matchCount = useMemo(() => {
    if (!findText) return 0;
    const flags = caseSensitive ? "g" : "gi";
    try {
      const regex = new RegExp(escapeRegex(findText), flags);
      return (content.match(regex) || []).length;
    } catch {
      return 0;
    }
  }, [content, findText, caseSensitive]);

  // Find and Replace
  const handleReplace = useCallback(() => {
    if (!findText) return;
    const flags = caseSensitive ? "" : "i";
    try {
      const regex = new RegExp(escapeRegex(findText), flags);
      const newContent = content.replace(regex, replaceText);
      handleChange(newContent);
    } catch {
      // Invalid regex — no-op
    }
  }, [content, findText, replaceText, caseSensitive, handleChange]);

  const handleReplaceAll = useCallback(() => {
    if (!findText) return;
    const flags = caseSensitive ? "g" : "gi";
    try {
      const regex = new RegExp(escapeRegex(findText), flags);
      const newContent = content.replace(regex, replaceText);
      handleChange(newContent);
    } catch {
      // Invalid regex — no-op
    }
  }, [content, findText, replaceText, caseSensitive, handleChange]);

  const langLabel = file.language || file.mimeType || "text";

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--win95-bg)" }}>
      {/* Toolbar */}
      <div
        className="flex items-center gap-2 px-3 py-1.5 border-b-2 flex-shrink-0"
        style={{ borderColor: "var(--win95-border)" }}
      >
        <span
          className="text-[10px] px-2 py-0.5 rounded"
          style={{
            background: "var(--finder-selection-bg)",
            color: "var(--finder-selection-text)",
          }}
        >
          {langLabel}
        </span>

        <div className="flex-1" />

        <button
          onClick={() => setWordWrap((w) => !w)}
          title="Toggle word wrap"
          className="p-1.5 rounded transition-colors"
          style={{
            background: wordWrap ? "var(--finder-selection-bg)" : "transparent",
            color: wordWrap ? "var(--finder-selection-text)" : "var(--win95-text)",
          }}
        >
          <WrapText size={14} />
        </button>

        <button
          onClick={() => setShowFind((s) => !s)}
          title="Find (Cmd+F)"
          className="p-1.5 rounded transition-colors"
          style={{
            background: showFind ? "var(--finder-selection-bg)" : "transparent",
            color: showFind ? "var(--finder-selection-text)" : "var(--win95-text)",
          }}
        >
          <Search size={14} />
        </button>

        <div className="w-px h-4 mx-1" style={{ background: "var(--win95-border)" }} />

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

        <button
          onClick={handleManualSave}
          title="Save (Cmd+S)"
          className="p-1.5 rounded transition-colors"
          style={{ color: "var(--win95-text)" }}
        >
          <Save size={14} />
        </button>
        <button
          onClick={handleSaveAs}
          title={tx("ui.finder.editor.actions.save_as_shortcut", "Save As (Cmd+Shift+S)")}
          className="p-1.5 rounded transition-colors"
          style={{ color: "var(--win95-text)" }}
        >
          <Copy size={14} />
        </button>
      </div>

      {/* Find/Replace bar */}
      {showFind && (
        <div
          className="flex items-center gap-2 px-3 py-1.5 border-b-2 flex-shrink-0"
          style={{ borderColor: "var(--win95-border)", background: "var(--win95-button-face)" }}
        >
          <Search size={12} style={{ color: "var(--neutral-gray)" }} />
          <input
            type="text"
            placeholder="Find..."
            value={findText}
            onChange={(e) => setFindText(e.target.value)}
            className="text-xs px-2 py-1 border rounded flex-1 min-w-0"
            style={{
              borderColor: "var(--win95-border)",
              background: "var(--win95-bg)",
              color: "var(--win95-text)",
              outline: "none",
              maxWidth: 200,
            }}
          />
          {findText && (
            <span className="text-[10px]" style={{ color: "var(--neutral-gray)" }}>
              {matchCount} match{matchCount !== 1 ? "es" : ""}
            </span>
          )}
          <button
            onClick={() => setCaseSensitive((c) => !c)}
            title="Case sensitive"
            className="p-1 rounded"
            style={{
              background: caseSensitive ? "var(--finder-selection-bg)" : "transparent",
              color: caseSensitive ? "var(--finder-selection-text)" : "var(--neutral-gray)",
            }}
          >
            <CaseSensitive size={12} />
          </button>

          <div className="w-px h-4" style={{ background: "var(--win95-border)" }} />

          <Replace size={12} style={{ color: "var(--neutral-gray)" }} />
          <input
            type="text"
            placeholder="Replace..."
            value={replaceText}
            onChange={(e) => setReplaceText(e.target.value)}
            className="text-xs px-2 py-1 border rounded min-w-0"
            style={{
              borderColor: "var(--win95-border)",
              background: "var(--win95-bg)",
              color: "var(--win95-text)",
              outline: "none",
              maxWidth: 150,
            }}
          />
          <button
            onClick={handleReplace}
            className="text-[10px] px-2 py-1 rounded border"
            style={{
              borderColor: "var(--win95-border)",
              background: "var(--win95-button-face)",
              color: "var(--win95-text)",
            }}
          >
            Replace
          </button>
          <button
            onClick={handleReplaceAll}
            className="text-[10px] px-2 py-1 rounded border"
            style={{
              borderColor: "var(--win95-border)",
              background: "var(--win95-button-face)",
              color: "var(--win95-text)",
            }}
          >
            All
          </button>

          <button
            onClick={() => setShowFind(false)}
            className="p-1 rounded"
            style={{ color: "var(--neutral-gray)" }}
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* Editor with line numbers */}
      <div className="flex-1 flex min-h-0">
        {/* Line numbers gutter */}
        <div
          ref={lineNumbersRef}
          className="flex-shrink-0 overflow-hidden select-none text-right py-4 pr-2 pl-3"
          style={{
            fontFamily: "'SF Mono', Monaco, 'Cascadia Code', monospace",
            fontSize: 11,
            lineHeight: 1.6,
            color: "var(--neutral-gray)",
            background: "var(--win95-button-face)",
            borderRight: "1px solid var(--win95-border)",
            minWidth: 40,
          }}
        >
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => handleChange(e.target.value)}
          onScroll={handleScroll}
          onKeyDown={(e) => {
            if (e.key === "Tab") {
              e.preventDefault();
              const start = e.currentTarget.selectionStart;
              const end = e.currentTarget.selectionEnd;
              const newContent =
                content.substring(0, start) + "  " + content.substring(end);
              handleChange(newContent);
              requestAnimationFrame(() => {
                e.currentTarget.setSelectionRange(start + 2, start + 2);
              });
            }
          }}
          className="flex-1 w-full resize-none p-4 outline-none"
          style={{
            fontFamily: "'SF Mono', Monaco, 'Cascadia Code', monospace",
            fontSize: 11,
            lineHeight: 1.6,
            background: "var(--win95-bg-light, #fff)",
            color: "var(--win95-text)",
            tabSize: 2,
            whiteSpace: wordWrap ? "pre-wrap" : "pre",
            overflowWrap: wordWrap ? "break-word" : "normal",
          }}
          spellCheck={false}
        />
      </div>
    </div>
  );
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
