"use client";

import type React from "react";
import { useEffect, useRef, useState } from "react";
import { useCmsContent, useCmsEditMode } from "../hooks";
import { LocaleFallbackIndicator } from "./LocaleFallbackIndicator";
import type { CmsContentSubtype } from "../types";

interface EditableContentProps {
  page: string;
  section: string;
  contentKey: string;
  fallback?: React.ReactNode;
  className?: string;
  as?: React.ElementType;
  allowLineBreaks?: boolean;
  subtype?: Exclude<CmsContentSubtype, "image" | "text_with_links">;
}

function getFallbackText(fallback: React.ReactNode): string {
  if (typeof fallback === "string") {
    return fallback;
  }
  return "Click to edit";
}

export function EditableContent({
  page,
  section,
  contentKey,
  fallback = "Loading...",
  className,
  as: Component = "div",
  allowLineBreaks = false,
  subtype = "text",
}: EditableContentProps) {
  const contentRef = useRef<HTMLElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(getFallbackText(fallback));
  const { isEditMode } = useCmsEditMode();
  const { record, isLoading, isSaving, save } = useCmsContent({
    page,
    section,
    key: contentKey,
  });

  const resolvedText =
    typeof record?.value === "string"
      ? record.value
      : getFallbackText(fallback);

  useEffect(() => {
    if (isEditing) {
      return;
    }

    setLocalValue(resolvedText);
    if (contentRef.current) {
      contentRef.current.innerText = resolvedText;
    }
  }, [isEditing, resolvedText]);

  async function persistValue() {
    if (!contentRef.current) {
      return;
    }

    const nextValue = contentRef.current.innerText.trim();
    setIsEditing(false);

    if (!nextValue) {
      contentRef.current.innerText = resolvedText;
      return;
    }

    if (nextValue === resolvedText && record?.recordId) {
      return;
    }

    try {
      await save({
        subtype,
        value: nextValue,
      });
      setLocalValue(nextValue);
    } catch {
      contentRef.current.innerText = resolvedText;
    }
  }

  function focusAtEnd() {
    if (!contentRef.current) {
      return;
    }
    const range = document.createRange();
    const selection = window.getSelection();
    range.selectNodeContents(contentRef.current);
    range.collapse(false);
    selection?.removeAllRanges();
    selection?.addRange(range);
    contentRef.current.focus();
  }

  const borderStyle = isEditMode
    ? isEditing
      ? "2px solid rgba(37, 99, 235, 0.8)"
      : "2px dashed rgba(37, 99, 235, 0.35)"
    : "2px solid transparent";

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <Component
        ref={contentRef as React.RefObject<HTMLElement>}
        className={className}
        contentEditable={isEditMode && !isSaving && isEditing}
        suppressContentEditableWarning
        onFocus={() => {
          if (isEditMode) {
            setIsEditing(true);
          }
        }}
        onBlur={() => {
          void persistValue();
        }}
        onKeyDown={(event: React.KeyboardEvent) => {
          if (event.key === "Escape") {
            if (contentRef.current) {
              contentRef.current.innerText = resolvedText;
            }
            setIsEditing(false);
            contentRef.current?.blur();
          }
          if (event.key === "Enter" && !allowLineBreaks) {
            event.preventDefault();
            contentRef.current?.blur();
          }
        }}
        onClick={() => {
          if (!isEditMode || isEditing) {
            return;
          }
          setIsEditing(true);
          setTimeout(focusAtEnd, 0);
        }}
        style={{
          border: borderStyle,
          borderRadius: 10,
          cursor: isEditMode ? "text" : "inherit",
          minHeight: 24,
          opacity: isSaving || isLoading ? 0.7 : 1,
          outline: "none",
          padding: isEditMode ? "4px 6px" : undefined,
          transition: "border-color 120ms ease, opacity 120ms ease",
          whiteSpace: allowLineBreaks ? "pre-wrap" : undefined,
        }}
      >
        {localValue}
      </Component>
      <LocaleFallbackIndicator resolvedLocale={record?.resolvedLocale || null} />
    </div>
  );
}

export function EditableText(props: Omit<EditableContentProps, "as">) {
  return <EditableContent {...props} as="span" />;
}

export function EditableHeading(
  props: Omit<EditableContentProps, "as"> & {
    level?: 1 | 2 | 3 | 4 | 5 | 6;
  }
) {
  const tag = `h${props.level || 2}` as React.ElementType;
  return <EditableContent {...props} as={tag} />;
}

export function EditableParagraph(
  props: Omit<EditableContentProps, "as" | "allowLineBreaks">
) {
  return <EditableContent {...props} as="p" allowLineBreaks />;
}
