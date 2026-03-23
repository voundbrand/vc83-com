"use client";

import type React from "react";
import { useEffect, useRef, useState } from "react";
import { useCmsContent, useCmsEditMode } from "../hooks";
import { LinkButtonEditor, getLinkIconLabel } from "./LinkButtonEditor";
import { LocaleFallbackIndicator } from "./LocaleFallbackIndicator";
import type { CmsContentLink, CmsTextWithLinksValue } from "../types";

const MAX_LINKS = 5;
const LINKS_PER_ROW = 4;

interface EditableTextWithLinksProps {
  page: string;
  section: string;
  contentKey: string;
  fallback?: React.ReactNode;
  className?: string;
  textClassName?: string;
  linksClassName?: string;
  as?: React.ElementType;
  allowLineBreaks?: boolean;
}

function buildLinkId(): string {
  return `cms_link_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function getFallbackText(fallback: React.ReactNode): string {
  if (typeof fallback === "string") {
    return fallback;
  }
  return "Click to edit";
}

function parseValue(
  value: unknown,
  fallbackText: string
): CmsTextWithLinksValue {
  if (!value) {
    return { text: fallbackText, links: [] };
  }

  if (typeof value === "string") {
    return { text: value, links: [] };
  }

  if (typeof value === "object" && !Array.isArray(value)) {
    const candidate = value as Partial<CmsTextWithLinksValue>;
    return {
      text: typeof candidate.text === "string" ? candidate.text : fallbackText,
      links: Array.isArray(candidate.links)
        ? (candidate.links as CmsContentLink[])
        : [],
    };
  }

  return { text: fallbackText, links: [] };
}

function chunkLinks(links: CmsContentLink[]): CmsContentLink[][] {
  const rows: CmsContentLink[][] = [];
  for (let index = 0; index < links.length; index += LINKS_PER_ROW) {
    rows.push(links.slice(index, index + LINKS_PER_ROW));
  }
  return rows;
}

export function EditableTextWithLinks({
  page,
  section,
  contentKey,
  fallback = "Loading...",
  className,
  textClassName,
  linksClassName,
  as: TextComponent = "p",
  allowLineBreaks = true,
}: EditableTextWithLinksProps) {
  const contentRef = useRef<HTMLElement>(null);
  const [isEditingText, setIsEditingText] = useState(false);
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
  const [localText, setLocalText] = useState(getFallbackText(fallback));
  const [localLinks, setLocalLinks] = useState<CmsContentLink[]>([]);
  const { isEditMode } = useCmsEditMode();
  const { record, isLoading, isSaving, save } = useCmsContent({
    page,
    section,
    key: contentKey,
  });

  const parsedValue = parseValue(record?.value, getFallbackText(fallback));

  useEffect(() => {
    if (isEditingText) {
      return;
    }

    setLocalText(parsedValue.text);
    setLocalLinks(parsedValue.links || []);
    if (contentRef.current) {
      contentRef.current.innerText = parsedValue.text;
    }
  }, [isEditingText, parsedValue.links, parsedValue.text]);

  async function persistContent(nextText: string, nextLinks: CmsContentLink[]) {
    await save({
      subtype: "text_with_links",
      value: {
        text: nextText,
        links: nextLinks,
      },
    });
  }

  async function persistText() {
    if (!contentRef.current) {
      return;
    }

    const nextText = contentRef.current.innerText.trim();
    setIsEditingText(false);

    if (!nextText) {
      contentRef.current.innerText = parsedValue.text;
      return;
    }

    if (
      nextText === parsedValue.text &&
      JSON.stringify(localLinks) === JSON.stringify(parsedValue.links || []) &&
      record?.recordId
    ) {
      return;
    }

    try {
      await persistContent(nextText, localLinks);
      setLocalText(nextText);
    } catch {
      contentRef.current.innerText = parsedValue.text;
      setLocalLinks(parsedValue.links || []);
    }
  }

  async function saveLink(updatedLink: CmsContentLink) {
    const nextLinks = localLinks.map((link) =>
      link.id === updatedLink.id ? updatedLink : link
    );
    setLocalLinks(nextLinks);
    setEditingLinkId(null);
    try {
      await persistContent(localText, nextLinks);
    } catch {
      setLocalLinks(parsedValue.links || []);
    }
  }

  async function deleteLink(linkId: string) {
    const nextLinks = localLinks.filter((link) => link.id !== linkId);
    setLocalLinks(nextLinks);
    setEditingLinkId(null);
    try {
      await persistContent(localText, nextLinks);
    } catch {
      setLocalLinks(parsedValue.links || []);
    }
  }

  function cancelLinkEdit(linkId: string) {
    const link = localLinks.find((item) => item.id === linkId);
    if (link && !link.title && !link.url) {
      setLocalLinks(localLinks.filter((item) => item.id !== linkId));
    }
    setEditingLinkId(null);
  }

  function addLink() {
    if (localLinks.length >= MAX_LINKS) {
      return;
    }

    const nextLink: CmsContentLink = {
      id: buildLinkId(),
      title: "",
      url: "",
      icon: "external",
    };
    setLocalLinks([...localLinks, nextLink]);
    setEditingLinkId(nextLink.id);
  }

  const borderStyle = isEditMode
    ? isEditingText
      ? "2px solid rgba(37, 99, 235, 0.8)"
      : "2px dashed rgba(37, 99, 235, 0.35)"
    : "2px solid transparent";

  return (
    <div style={{ display: "grid", gap: 10 }} className={className}>
      <TextComponent
        ref={contentRef as React.RefObject<HTMLElement>}
        className={textClassName}
        contentEditable={isEditMode && !isSaving && isEditingText}
        suppressContentEditableWarning
        onFocus={() => {
          if (isEditMode) {
            setIsEditingText(true);
          }
        }}
        onBlur={() => {
          void persistText();
        }}
        onKeyDown={(event: React.KeyboardEvent) => {
          if (event.key === "Escape") {
            if (contentRef.current) {
              contentRef.current.innerText = parsedValue.text;
            }
            setIsEditingText(false);
            contentRef.current?.blur();
          }
          if (event.key === "Enter" && !allowLineBreaks) {
            event.preventDefault();
            contentRef.current?.blur();
          }
        }}
        onClick={() => {
          if (!isEditMode || isEditingText) {
            return;
          }
          setIsEditingText(true);
          setTimeout(() => {
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
          }, 0);
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
        {localText}
      </TextComponent>

      <LocaleFallbackIndicator resolvedLocale={record?.resolvedLocale || null} />

      {(localLinks.length > 0 || isEditMode) && (
        <div className={linksClassName} style={{ display: "grid", gap: 8 }}>
          {chunkLinks(localLinks).map((row, rowIndex) => (
            <div
              key={`${contentKey}-row-${rowIndex}`}
              style={{ display: "flex", flexWrap: "wrap", gap: 8 }}
            >
              {row.map((link) =>
                editingLinkId === link.id ? (
                  <div key={link.id} style={{ width: "100%", maxWidth: 360 }}>
                    <LinkButtonEditor
                      link={link}
                      onSave={saveLink}
                      onDelete={() => {
                        void deleteLink(link.id);
                      }}
                      onCancel={() => cancelLinkEdit(link.id)}
                    />
                  </div>
                ) : (
                  <div
                    key={link.id}
                    style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                  >
                    {isEditMode ? (
                      <>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            border: "1px solid rgba(148, 163, 184, 0.5)",
                            borderRadius: 999,
                            padding: "8px 12px",
                            backgroundColor: "white",
                          }}
                        >
                          <strong style={{ fontSize: 12 }}>
                            {getLinkIconLabel(link.icon)}
                          </strong>
                          <span>{link.title || "Untitled"}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setEditingLinkId(link.id)}
                          style={{
                            border: "1px solid rgba(148, 163, 184, 0.5)",
                            borderRadius: 999,
                            backgroundColor: "white",
                            cursor: "pointer",
                            padding: "8px 10px",
                          }}
                        >
                          Edit
                        </button>
                      </>
                    ) : (
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          border: "1px solid rgba(148, 163, 184, 0.5)",
                          borderRadius: 999,
                          padding: "8px 12px",
                          textDecoration: "none",
                        }}
                      >
                        <strong style={{ fontSize: 12 }}>
                          {getLinkIconLabel(link.icon)}
                        </strong>
                        <span>{link.title}</span>
                      </a>
                    )}
                  </div>
                )
              )}
            </div>
          ))}

          {isEditMode && localLinks.length < MAX_LINKS && !editingLinkId && (
            <button
              type="button"
              onClick={addLink}
              style={{
                alignSelf: "flex-start",
                border: "1px dashed rgba(37, 99, 235, 0.5)",
                borderRadius: 999,
                backgroundColor: "transparent",
                color: "#1d4ed8",
                cursor: "pointer",
                padding: "8px 12px",
              }}
            >
              Add link ({localLinks.length}/{MAX_LINKS})
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function EditableParagraphWithLinks(
  props: Omit<EditableTextWithLinksProps, "as" | "allowLineBreaks">
) {
  return <EditableTextWithLinks {...props} as="p" allowLineBreaks />;
}
