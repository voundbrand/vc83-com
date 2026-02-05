"use client";

/**
 * MARKDOWN EDITOR - Split-pane markdown editing with live preview
 *
 * Left: monospace textarea with toolbar
 * Right: rendered markdown preview
 * Autosaves via debounced updateFileContent mutation.
 */

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import {
  Bold,
  Italic,
  Heading1,
  Link,
  Code,
  List,
  CheckSquare,
  Eye,
  EyeOff,
  Columns,
  Save,
  Check,
  Loader2,
} from "lucide-react";
import type { ProjectFile } from "../finder-types";

type ViewState = "edit" | "preview" | "split";

interface MarkdownEditorProps {
  file: ProjectFile;
  sessionId: string;
  onDirty: () => void;
  onClean: () => void;
}

export function MarkdownEditor({
  file,
  sessionId,
  onDirty,
  onClean,
}: MarkdownEditorProps) {
  const [content, setContent] = useState(file.content || "");
  const [viewState, setViewState] = useState<ViewState>("split");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedFadeRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateFileContent = useMutation(api.projectFileSystem.updateFileContent);

  // Sync content when file changes externally
  useEffect(() => {
    setContent(file.content || "");
  }, [file._id, file.content]);

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

  // Toolbar insert helpers
  const insertText = useCallback(
    (before: string, after: string = "") => {
      const ta = textareaRef.current;
      if (!ta) return;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const selected = content.substring(start, end);
      const replacement = `${before}${selected || "text"}${after}`;
      const newContent =
        content.substring(0, start) + replacement + content.substring(end);
      handleChange(newContent);

      // Restore cursor position
      requestAnimationFrame(() => {
        ta.focus();
        const cursorPos = start + before.length + (selected || "text").length;
        ta.setSelectionRange(cursorPos, cursorPos);
      });
    },
    [content, handleChange]
  );

  // Simple markdown to HTML rendering
  const renderedHtml = useMemo(() => {
    return renderMarkdown(content);
  }, [content]);

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
          onClick={() => insertText("**", "**")}
          disabled={viewState === "preview"}
        />
        <ToolbarButton
          icon={<Italic size={14} />}
          title="Italic"
          onClick={() => insertText("*", "*")}
          disabled={viewState === "preview"}
        />
        <ToolbarButton
          icon={<Heading1 size={14} />}
          title="Heading"
          onClick={() => insertText("## ")}
          disabled={viewState === "preview"}
        />
        <ToolbarButton
          icon={<Link size={14} />}
          title="Link"
          onClick={() => insertText("[", "](url)")}
          disabled={viewState === "preview"}
        />
        <ToolbarButton
          icon={<Code size={14} />}
          title="Code"
          onClick={() => insertText("`", "`")}
          disabled={viewState === "preview"}
        />
        <ToolbarButton
          icon={<List size={14} />}
          title="List"
          onClick={() => insertText("- ")}
          disabled={viewState === "preview"}
        />
        <ToolbarButton
          icon={<CheckSquare size={14} />}
          title="Checkbox"
          onClick={() => insertText("- [ ] ")}
          disabled={viewState === "preview"}
        />

        <div className="flex-1" />

        {/* View toggle */}
        <ToolbarButton
          icon={<EyeOff size={14} />}
          title="Edit only"
          onClick={() => setViewState("edit")}
          active={viewState === "edit"}
        />
        <ToolbarButton
          icon={<Columns size={14} />}
          title="Split view"
          onClick={() => setViewState("split")}
          active={viewState === "split"}
        />
        <ToolbarButton
          icon={<Eye size={14} />}
          title="Preview only"
          onClick={() => setViewState("preview")}
          active={viewState === "preview"}
        />

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

        <ToolbarButton
          icon={<Save size={14} />}
          title="Save (Cmd+S)"
          onClick={handleManualSave}
        />
      </div>

      {/* Editor Area */}
      <div className="flex-1 flex min-h-0">
        {/* Editor pane */}
        {viewState !== "preview" && (
          <div
            className="flex-1 min-w-0 flex flex-col"
            style={{
              borderRight:
                viewState === "split" ? "2px solid var(--win95-border)" : "none",
            }}
          >
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => handleChange(e.target.value)}
              onKeyDown={(e) => {
                // Tab key inserts spaces
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
              className="flex-1 w-full resize-none p-4 outline-none text-xs"
              style={{
                fontFamily: "'SF Mono', Monaco, 'Cascadia Code', monospace",
                lineHeight: 1.6,
                background: "var(--win95-bg-light, #fff)",
                color: "var(--win95-text)",
                tabSize: 2,
              }}
              spellCheck={false}
            />
          </div>
        )}

        {/* Preview pane */}
        {viewState !== "edit" && (
          <div
            className="flex-1 min-w-0 overflow-y-auto p-4"
            style={{ background: "var(--win95-bg-light, #fff)" }}
          >
            <div
              className="prose prose-sm max-w-none text-xs"
              style={{ color: "var(--win95-text)" }}
              dangerouslySetInnerHTML={{ __html: renderedHtml }}
            />
          </div>
        )}
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
  active,
  disabled,
}: {
  icon: React.ReactNode;
  title: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="p-1.5 rounded transition-colors"
      style={{
        background: active ? "var(--win95-highlight-bg)" : "transparent",
        color: disabled
          ? "var(--neutral-gray)"
          : active
            ? "var(--win95-highlight)"
            : "var(--win95-text)",
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {icon}
    </button>
  );
}

// ============================================================================
// SIMPLE MARKDOWN RENDERER
// ============================================================================

function renderMarkdown(md: string): string {
  let html = escapeHtml(md);

  // Code blocks (```)
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_m, _lang, code) => {
    return `<pre style="background:var(--win95-button-face);padding:8px;border-radius:4px;overflow-x:auto;font-size:11px;"><code>${code}</code></pre>`;
  });

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code style="background:var(--win95-button-face);padding:1px 4px;border-radius:2px;font-size:11px;">$1</code>');

  // Headings
  html = html.replace(/^#### (.+)$/gm, '<h4 style="font-size:13px;font-weight:700;margin:12px 0 4px;">$1</h4>');
  html = html.replace(/^### (.+)$/gm, '<h3 style="font-size:14px;font-weight:700;margin:12px 0 4px;">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 style="font-size:15px;font-weight:700;margin:16px 0 6px;">$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1 style="font-size:17px;font-weight:700;margin:16px 0 8px;">$1</h1>');

  // Bold and italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");

  // Links
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" style="color:var(--primary);text-decoration:underline;" target="_blank" rel="noopener">$1</a>'
  );

  // Checkboxes
  html = html.replace(
    /^- \[x\] (.+)$/gm,
    '<div style="display:flex;align-items:center;gap:4px;margin:2px 0;"><input type="checkbox" checked disabled /> $1</div>'
  );
  html = html.replace(
    /^- \[ \] (.+)$/gm,
    '<div style="display:flex;align-items:center;gap:4px;margin:2px 0;"><input type="checkbox" disabled /> $1</div>'
  );

  // Unordered lists
  html = html.replace(/^- (.+)$/gm, '<li style="margin-left:16px;list-style:disc;">$1</li>');

  // Ordered lists
  html = html.replace(/^\d+\. (.+)$/gm, '<li style="margin-left:16px;list-style:decimal;">$1</li>');

  // Horizontal rule
  html = html.replace(/^---$/gm, '<hr style="border:none;border-top:1px solid var(--win95-border);margin:12px 0;" />');

  // Blockquote
  html = html.replace(
    /^> (.+)$/gm,
    '<blockquote style="border-left:3px solid var(--neutral-gray);padding-left:8px;color:var(--neutral-gray);margin:8px 0;">$1</blockquote>'
  );

  // Images
  html = html.replace(
    /!\[([^\]]*)\]\(([^)]+)\)/g,
    '<img src="$2" alt="$1" style="max-width:100%;border-radius:4px;margin:8px 0;" />'
  );

  // Paragraphs (double newlines)
  html = html.replace(/\n\n/g, "</p><p>");
  html = `<p>${html}</p>`;
  // Clean up empty paragraphs
  html = html.replace(/<p>\s*<\/p>/g, "");

  // Single line breaks
  html = html.replace(/\n/g, "<br />");

  return html;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
