// src/providers/CmsProvider.tsx
import { createContext, useContext, useState } from "react";
import { jsx } from "react/jsx-runtime";
var CmsContext = createContext(null);
function CmsProvider({
  children,
  transport,
  defaultLocale,
  initialLocale,
  initialEditMode = false
}) {
  const [locale, setLocale] = useState(initialLocale || defaultLocale);
  const [isEditMode, setEditMode] = useState(initialEditMode);
  const toggleEditMode = () => {
    setEditMode((current) => !current);
  };
  return /* @__PURE__ */ jsx(
    CmsContext.Provider,
    {
      value: {
        transport,
        locale,
        defaultLocale,
        isEditMode,
        setLocale,
        setEditMode,
        toggleEditMode
      },
      children
    }
  );
}
function useCms() {
  const context = useContext(CmsContext);
  if (!context) {
    throw new Error("useCms must be used within a CmsProvider");
  }
  return context;
}

// src/components/EditableContent.tsx
import { useEffect as useEffect3, useRef, useState as useState4 } from "react";

// src/hooks/useCmsContent.ts
import { useEffect, useState as useState2 } from "react";
function buildContentName(page, section, key) {
  return `${page}_${section}_${key}`;
}
function toError(error) {
  return error instanceof Error ? error : new Error(String(error));
}
function normalizeContentRecord(record, fallbackName, locale) {
  if (!record) {
    return null;
  }
  return {
    recordId: record.recordId,
    name: record.name || fallbackName,
    subtype: record.subtype,
    locale: record.locale,
    resolvedLocale: record.resolvedLocale || record.locale || locale,
    value: record.value ?? null,
    description: record.description,
    status: record.status,
    customProperties: record.customProperties,
    fileUrl: record.fileUrl,
    imageMetadata: record.imageMetadata
  };
}
function resolveNextContentValue(inputValue, currentValue) {
  return inputValue === void 0 ? currentValue : inputValue;
}
function useCmsContent(options) {
  const {
    transport,
    locale: providerLocale,
    defaultLocale: providerDefaultLocale
  } = useCms();
  const [record, setRecord] = useState2(null);
  const [isLoading, setIsLoading] = useState2(options.enabled !== false);
  const [isSaving, setIsSaving] = useState2(false);
  const [error, setError] = useState2(null);
  const locale = options.locale || providerLocale;
  const defaultLocale = options.defaultLocale || providerDefaultLocale;
  const enabled = options.enabled !== false;
  const name = buildContentName(options.page, options.section, options.key);
  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    async function loadRecord() {
      setIsLoading(true);
      try {
        const nextRecord = normalizeContentRecord(
          await transport.getContent({
            page: options.page,
            section: options.section,
            key: options.key,
            locale,
            defaultLocale
          }),
          name,
          locale
        );
        if (!cancelled) {
          setRecord(nextRecord);
          setError(null);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(toError(loadError));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }
    void loadRecord();
    return () => {
      cancelled = true;
    };
  }, [
    defaultLocale,
    enabled,
    locale,
    name,
    options.key,
    options.page,
    options.section,
    transport
  ]);
  async function refresh() {
    if (!enabled) {
      return null;
    }
    setIsLoading(true);
    try {
      const nextRecord = normalizeContentRecord(
        await transport.getContent({
          page: options.page,
          section: options.section,
          key: options.key,
          locale,
          defaultLocale
        }),
        name,
        locale
      );
      setRecord(nextRecord);
      setError(null);
      return nextRecord;
    } catch (refreshError) {
      const normalizedError = toError(refreshError);
      setError(normalizedError);
      throw normalizedError;
    } finally {
      setIsLoading(false);
    }
  }
  async function save(input) {
    const targetLocale = input.locale || locale;
    const subtype = input.subtype || (record?.subtype === "image" ? "text" : record?.subtype) || "text";
    setIsSaving(true);
    try {
      const result = await transport.saveContent({
        recordId: input.recordId || record?.recordId || void 0,
        page: options.page,
        section: options.section,
        key: options.key,
        locale: targetLocale,
        subtype,
        value: resolveNextContentValue(input.value, record?.value ?? null),
        description: input.description ?? record?.description,
        status: input.status ?? record?.status,
        customProperties: input.customProperties ?? record?.customProperties
      });
      const refreshedRecord = await transport.getContent({
        page: options.page,
        section: options.section,
        key: options.key,
        locale: targetLocale,
        defaultLocale
      });
      setRecord(normalizeContentRecord(refreshedRecord, name, targetLocale));
      setError(null);
      return result;
    } catch (saveError) {
      const normalizedError = toError(saveError);
      setError(normalizedError);
      throw normalizedError;
    } finally {
      setIsSaving(false);
    }
  }
  return {
    record,
    isLoading,
    isSaving,
    error,
    refresh,
    save
  };
}

// src/hooks/useCmsEditMode.ts
function useCmsEditMode() {
  const { isEditMode, setEditMode, toggleEditMode } = useCms();
  return {
    isEditMode,
    setEditMode,
    toggleEditMode
  };
}

// src/hooks/useCmsImage.ts
import { useEffect as useEffect2, useState as useState3 } from "react";
function toError2(error) {
  return error instanceof Error ? error : new Error(String(error));
}
function normalizeImageRecord(record) {
  if (!record) {
    return null;
  }
  return {
    ...record,
    value: record.value ?? null,
    fileUrl: record.fileUrl ?? null,
    imageMetadata: record.imageMetadata ?? null
  };
}
function useCmsImage(options) {
  const { transport } = useCms();
  const [record, setRecord] = useState3(null);
  const [isLoading, setIsLoading] = useState3(options.enabled !== false);
  const [isUploading, setIsUploading] = useState3(false);
  const [error, setError] = useState3(null);
  const enabled = options.enabled !== false;
  useEffect2(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    async function loadRecord() {
      setIsLoading(true);
      try {
        const nextRecord = normalizeImageRecord(
          await transport.getImage({
            usage: options.usage,
            locale: options.locale
          })
        );
        if (!cancelled) {
          setRecord(nextRecord);
          setError(null);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(toError2(loadError));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }
    void loadRecord();
    return () => {
      cancelled = true;
    };
  }, [enabled, options.locale, options.usage, transport]);
  async function refresh() {
    if (!enabled) {
      return null;
    }
    setIsLoading(true);
    try {
      const nextRecord = normalizeImageRecord(
        await transport.getImage({
          usage: options.usage,
          locale: options.locale
        })
      );
      setRecord(nextRecord);
      setError(null);
      return nextRecord;
    } catch (refreshError) {
      const normalizedError = toError2(refreshError);
      setError(normalizedError);
      throw normalizedError;
    } finally {
      setIsLoading(false);
    }
  }
  async function upload(input) {
    setIsUploading(true);
    try {
      const result = await transport.uploadImage({
        usage: options.usage,
        file: input.file,
        alt: input.alt,
        locale: input.locale ?? options.locale
      });
      await refresh();
      return result;
    } catch (uploadError) {
      const normalizedError = toError2(uploadError);
      setError(normalizedError);
      throw normalizedError;
    } finally {
      setIsUploading(false);
    }
  }
  async function remove() {
    if (!record?.recordId) {
      return;
    }
    setIsUploading(true);
    try {
      await transport.deleteImage({ recordId: record.recordId });
      setRecord(null);
      setError(null);
    } catch (removeError) {
      const normalizedError = toError2(removeError);
      setError(normalizedError);
      throw normalizedError;
    } finally {
      setIsUploading(false);
    }
  }
  return {
    record,
    isLoading,
    isUploading,
    error,
    refresh,
    upload,
    remove
  };
}

// src/hooks/useCmsLocale.ts
function useCmsLocale() {
  const { locale, defaultLocale, setLocale } = useCms();
  return {
    locale,
    defaultLocale,
    setLocale
  };
}

// src/components/LocaleFallbackIndicator.tsx
import { jsxs } from "react/jsx-runtime";
function LocaleFallbackIndicator({
  resolvedLocale
}) {
  const { locale } = useCmsLocale();
  if (!resolvedLocale || resolvedLocale === locale) {
    return null;
  }
  return /* @__PURE__ */ jsxs(
    "span",
    {
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 12,
        color: "#92400e",
        backgroundColor: "#fef3c7",
        border: "1px solid #f59e0b",
        borderRadius: 999,
        padding: "2px 8px"
      },
      children: [
        "Fallback locale: ",
        resolvedLocale
      ]
    }
  );
}

// src/components/EditableContent.tsx
import { jsx as jsx2, jsxs as jsxs2 } from "react/jsx-runtime";
function getFallbackText(fallback) {
  if (typeof fallback === "string") {
    return fallback;
  }
  return "Click to edit";
}
function EditableContent({
  page,
  section,
  contentKey,
  fallback = "Loading...",
  className,
  as: Component = "div",
  allowLineBreaks = false,
  subtype = "text"
}) {
  const contentRef = useRef(null);
  const [isEditing, setIsEditing] = useState4(false);
  const [localValue, setLocalValue] = useState4(getFallbackText(fallback));
  const { isEditMode } = useCmsEditMode();
  const { record, isLoading, isSaving, save } = useCmsContent({
    page,
    section,
    key: contentKey
  });
  const resolvedText = typeof record?.value === "string" ? record.value : getFallbackText(fallback);
  useEffect3(() => {
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
        value: nextValue
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
  const borderStyle = isEditMode ? isEditing ? "2px solid rgba(37, 99, 235, 0.8)" : "2px dashed rgba(37, 99, 235, 0.35)" : "2px solid transparent";
  return /* @__PURE__ */ jsxs2("div", { style: { display: "grid", gap: 8 }, children: [
    /* @__PURE__ */ jsx2(
      Component,
      {
        ref: contentRef,
        className,
        contentEditable: isEditMode && !isSaving && isEditing,
        suppressContentEditableWarning: true,
        onFocus: () => {
          if (isEditMode) {
            setIsEditing(true);
          }
        },
        onBlur: () => {
          void persistValue();
        },
        onKeyDown: (event) => {
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
        },
        onClick: () => {
          if (!isEditMode || isEditing) {
            return;
          }
          setIsEditing(true);
          setTimeout(focusAtEnd, 0);
        },
        style: {
          border: borderStyle,
          borderRadius: 10,
          cursor: isEditMode ? "text" : "inherit",
          minHeight: 24,
          opacity: isSaving || isLoading ? 0.7 : 1,
          outline: "none",
          padding: isEditMode ? "4px 6px" : void 0,
          transition: "border-color 120ms ease, opacity 120ms ease",
          whiteSpace: allowLineBreaks ? "pre-wrap" : void 0
        },
        children: localValue
      }
    ),
    /* @__PURE__ */ jsx2(LocaleFallbackIndicator, { resolvedLocale: record?.resolvedLocale || null })
  ] });
}
function EditableText(props) {
  return /* @__PURE__ */ jsx2(EditableContent, { ...props, as: "span" });
}
function EditableHeading(props) {
  const tag = `h${props.level || 2}`;
  return /* @__PURE__ */ jsx2(EditableContent, { ...props, as: tag });
}
function EditableParagraph(props) {
  return /* @__PURE__ */ jsx2(EditableContent, { ...props, as: "p", allowLineBreaks: true });
}

// src/components/EditableImage.tsx
import { useRef as useRef2, useState as useState5 } from "react";
import { jsx as jsx3, jsxs as jsxs3 } from "react/jsx-runtime";
function getPlaceholderLabel(isUploading) {
  return isUploading ? "Uploading image..." : "No image";
}
function EditableImage({
  usage,
  fallbackSrc,
  alt,
  className,
  width = 800,
  height = 600,
  aspectRatio = "4 / 3",
  fill = false,
  isHeroBackground = false,
  locale
}) {
  const fileInputRef = useRef2(null);
  const [isHovered, setIsHovered] = useState5(false);
  const { isEditMode } = useCmsEditMode();
  const { record, isLoading, isUploading, error, upload, remove } = useCmsImage({
    usage,
    locale
  });
  const imageUrl = record?.fileUrl || fallbackSrc || null;
  const resolvedAlt = record?.imageMetadata?.alt || alt;
  async function handleFileSelect(event) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    if (!file.type.startsWith("image/")) {
      return;
    }
    try {
      await upload({
        file,
        alt,
        locale
      });
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }
  async function handleDelete() {
    await remove();
  }
  return /* @__PURE__ */ jsxs3("div", { style: { display: "grid", gap: 8 }, className, children: [
    /* @__PURE__ */ jsxs3(
      "div",
      {
        onMouseEnter: () => setIsHovered(true),
        onMouseLeave: () => setIsHovered(false),
        style: {
          position: "relative",
          overflow: "hidden",
          borderRadius: isHeroBackground ? 0 : 12,
          backgroundColor: "#e2e8f0",
          aspectRatio: fill ? void 0 : aspectRatio,
          minHeight: fill ? "100%" : 160
        },
        children: [
          imageUrl ? /* @__PURE__ */ jsx3(
            "img",
            {
              src: imageUrl,
              alt: resolvedAlt,
              width: fill ? void 0 : width,
              height: fill ? void 0 : height,
              style: {
                display: "block",
                width: "100%",
                height: fill ? "100%" : "100%",
                objectFit: "cover"
              }
            }
          ) : /* @__PURE__ */ jsx3(
            "div",
            {
              style: {
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: fill ? "100%" : 160,
                color: "#475569",
                fontSize: 14
              },
              children: getPlaceholderLabel(isUploading)
            }
          ),
          isEditMode && /* @__PURE__ */ jsxs3(
            "div",
            {
              style: {
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: isHeroBackground ? "flex-start" : "center",
                justifyContent: isHeroBackground ? "flex-end" : "center",
                gap: 8,
                padding: isHeroBackground ? 16 : 12,
                backgroundColor: isHeroBackground || isHovered || isUploading ? "rgba(15, 23, 42, 0.45)" : "rgba(15, 23, 42, 0)",
                transition: "background-color 120ms ease"
              },
              children: [
                /* @__PURE__ */ jsx3(
                  "button",
                  {
                    type: "button",
                    onClick: () => fileInputRef.current?.click(),
                    style: {
                      border: "1px solid rgba(255, 255, 255, 0.5)",
                      borderRadius: 999,
                      backgroundColor: "rgba(255, 255, 255, 0.92)",
                      cursor: "pointer",
                      padding: "8px 12px"
                    },
                    children: record ? "Replace image" : "Upload image"
                  }
                ),
                record?.recordId ? /* @__PURE__ */ jsx3(
                  "button",
                  {
                    type: "button",
                    onClick: () => {
                      void handleDelete();
                    },
                    style: {
                      border: "1px solid rgba(254, 202, 202, 0.7)",
                      borderRadius: 999,
                      backgroundColor: "rgba(239, 68, 68, 0.92)",
                      color: "white",
                      cursor: "pointer",
                      padding: "8px 12px"
                    },
                    children: "Delete"
                  }
                ) : null
              ]
            }
          ),
          /* @__PURE__ */ jsx3(
            "input",
            {
              ref: fileInputRef,
              type: "file",
              accept: "image/*",
              onChange: handleFileSelect,
              style: { display: "none" }
            }
          )
        ]
      }
    ),
    /* @__PURE__ */ jsx3(LocaleFallbackIndicator, { resolvedLocale: record?.resolvedLocale || null }),
    isLoading ? /* @__PURE__ */ jsx3("span", { style: { fontSize: 12, color: "#64748b" }, children: "Loading image..." }) : null,
    error ? /* @__PURE__ */ jsx3("span", { style: { fontSize: 12, color: "#b91c1c" }, children: error.message }) : null
  ] });
}

// src/components/EditableTextWithLinks.tsx
import { useEffect as useEffect4, useRef as useRef3, useState as useState7 } from "react";

// src/components/LinkButtonEditor.tsx
import { useState as useState6 } from "react";
import { jsx as jsx4, jsxs as jsxs4 } from "react/jsx-runtime";
var ICON_OPTIONS = [
  { value: "external", label: "External" },
  { value: "download", label: "Download" },
  { value: "music", label: "Music" },
  { value: "video", label: "Video" },
  { value: "document", label: "Document" },
  { value: "link", label: "Link" },
  { value: "play", label: "Play" },
  { value: "info", label: "Info" }
];
function getLinkIconLabel(icon) {
  switch (icon) {
    case "download":
      return "Download";
    case "music":
      return "Music";
    case "video":
      return "Video";
    case "document":
      return "Document";
    case "link":
      return "Link";
    case "play":
      return "Play";
    case "info":
      return "Info";
    case "external":
    default:
      return "External";
  }
}
function LinkButtonEditor({
  link,
  onSave,
  onDelete,
  onCancel
}) {
  const [title, setTitle] = useState6(link.title);
  const [url, setUrl] = useState6(link.url);
  const [icon, setIcon] = useState6(link.icon || "external");
  const isValid = title.trim().length > 0 && url.trim().length > 0;
  return /* @__PURE__ */ jsx4(
    "div",
    {
      style: {
        border: "1px solid rgba(37, 99, 235, 0.25)",
        borderRadius: 12,
        padding: 12,
        backgroundColor: "rgba(248, 250, 252, 0.95)"
      },
      children: /* @__PURE__ */ jsxs4("div", { style: { display: "grid", gap: 10 }, children: [
        /* @__PURE__ */ jsxs4("label", { style: { display: "grid", gap: 4, fontSize: 12 }, children: [
          /* @__PURE__ */ jsx4("span", { children: "Button text" }),
          /* @__PURE__ */ jsx4(
            "input",
            {
              value: title,
              onChange: (event) => setTitle(event.target.value),
              placeholder: "Link title",
              style: {
                border: "1px solid rgba(148, 163, 184, 0.5)",
                borderRadius: 8,
                padding: "8px 10px"
              }
            }
          )
        ] }),
        /* @__PURE__ */ jsxs4("label", { style: { display: "grid", gap: 4, fontSize: 12 }, children: [
          /* @__PURE__ */ jsx4("span", { children: "URL" }),
          /* @__PURE__ */ jsx4(
            "input",
            {
              value: url,
              onChange: (event) => setUrl(event.target.value),
              placeholder: "https://...",
              style: {
                border: "1px solid rgba(148, 163, 184, 0.5)",
                borderRadius: 8,
                padding: "8px 10px"
              }
            }
          )
        ] }),
        /* @__PURE__ */ jsxs4("label", { style: { display: "grid", gap: 4, fontSize: 12 }, children: [
          /* @__PURE__ */ jsx4("span", { children: "Icon" }),
          /* @__PURE__ */ jsx4(
            "select",
            {
              value: icon,
              onChange: (event) => setIcon(event.target.value),
              style: {
                border: "1px solid rgba(148, 163, 184, 0.5)",
                borderRadius: 8,
                padding: "8px 10px",
                backgroundColor: "white"
              },
              children: ICON_OPTIONS.map((option) => /* @__PURE__ */ jsx4("option", { value: option.value, children: option.label }, option.value))
            }
          )
        ] }),
        /* @__PURE__ */ jsxs4("div", { style: { display: "flex", justifyContent: "space-between", gap: 8 }, children: [
          /* @__PURE__ */ jsx4(
            "button",
            {
              type: "button",
              onClick: onDelete,
              style: {
                border: "none",
                background: "none",
                color: "#b91c1c",
                cursor: "pointer",
                padding: 0
              },
              children: "Delete"
            }
          ),
          /* @__PURE__ */ jsxs4("div", { style: { display: "flex", gap: 8 }, children: [
            /* @__PURE__ */ jsx4(
              "button",
              {
                type: "button",
                onClick: onCancel,
                style: {
                  border: "1px solid rgba(148, 163, 184, 0.5)",
                  borderRadius: 8,
                  backgroundColor: "white",
                  cursor: "pointer",
                  padding: "6px 10px"
                },
                children: "Cancel"
              }
            ),
            /* @__PURE__ */ jsx4(
              "button",
              {
                type: "button",
                disabled: !isValid,
                onClick: () => onSave({
                  ...link,
                  title: title.trim(),
                  url: url.trim(),
                  icon
                }),
                style: {
                  border: "1px solid #2563eb",
                  borderRadius: 8,
                  backgroundColor: isValid ? "#2563eb" : "#cbd5e1",
                  color: "white",
                  cursor: isValid ? "pointer" : "not-allowed",
                  padding: "6px 10px"
                },
                children: "Save"
              }
            )
          ] })
        ] })
      ] })
    }
  );
}

// src/components/EditableTextWithLinks.tsx
import { Fragment, jsx as jsx5, jsxs as jsxs5 } from "react/jsx-runtime";
var MAX_LINKS = 5;
var LINKS_PER_ROW = 4;
function buildLinkId() {
  return `cms_link_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
function getFallbackText2(fallback) {
  if (typeof fallback === "string") {
    return fallback;
  }
  return "Click to edit";
}
function parseValue(value, fallbackText) {
  if (!value) {
    return { text: fallbackText, links: [] };
  }
  if (typeof value === "string") {
    return { text: value, links: [] };
  }
  if (typeof value === "object" && !Array.isArray(value)) {
    const candidate = value;
    return {
      text: typeof candidate.text === "string" ? candidate.text : fallbackText,
      links: Array.isArray(candidate.links) ? candidate.links : []
    };
  }
  return { text: fallbackText, links: [] };
}
function chunkLinks(links) {
  const rows = [];
  for (let index = 0; index < links.length; index += LINKS_PER_ROW) {
    rows.push(links.slice(index, index + LINKS_PER_ROW));
  }
  return rows;
}
function EditableTextWithLinks({
  page,
  section,
  contentKey,
  fallback = "Loading...",
  className,
  textClassName,
  linksClassName,
  as: TextComponent = "p",
  allowLineBreaks = true
}) {
  const contentRef = useRef3(null);
  const [isEditingText, setIsEditingText] = useState7(false);
  const [editingLinkId, setEditingLinkId] = useState7(null);
  const [localText, setLocalText] = useState7(getFallbackText2(fallback));
  const [localLinks, setLocalLinks] = useState7([]);
  const { isEditMode } = useCmsEditMode();
  const { record, isLoading, isSaving, save } = useCmsContent({
    page,
    section,
    key: contentKey
  });
  const parsedValue = parseValue(record?.value, getFallbackText2(fallback));
  useEffect4(() => {
    if (isEditingText) {
      return;
    }
    setLocalText(parsedValue.text);
    setLocalLinks(parsedValue.links || []);
    if (contentRef.current) {
      contentRef.current.innerText = parsedValue.text;
    }
  }, [isEditingText, parsedValue.links, parsedValue.text]);
  async function persistContent(nextText, nextLinks) {
    await save({
      subtype: "text_with_links",
      value: {
        text: nextText,
        links: nextLinks
      }
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
    if (nextText === parsedValue.text && JSON.stringify(localLinks) === JSON.stringify(parsedValue.links || []) && record?.recordId) {
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
  async function saveLink(updatedLink) {
    const nextLinks = localLinks.map(
      (link) => link.id === updatedLink.id ? updatedLink : link
    );
    setLocalLinks(nextLinks);
    setEditingLinkId(null);
    try {
      await persistContent(localText, nextLinks);
    } catch {
      setLocalLinks(parsedValue.links || []);
    }
  }
  async function deleteLink(linkId) {
    const nextLinks = localLinks.filter((link) => link.id !== linkId);
    setLocalLinks(nextLinks);
    setEditingLinkId(null);
    try {
      await persistContent(localText, nextLinks);
    } catch {
      setLocalLinks(parsedValue.links || []);
    }
  }
  function cancelLinkEdit(linkId) {
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
    const nextLink = {
      id: buildLinkId(),
      title: "",
      url: "",
      icon: "external"
    };
    setLocalLinks([...localLinks, nextLink]);
    setEditingLinkId(nextLink.id);
  }
  const borderStyle = isEditMode ? isEditingText ? "2px solid rgba(37, 99, 235, 0.8)" : "2px dashed rgba(37, 99, 235, 0.35)" : "2px solid transparent";
  return /* @__PURE__ */ jsxs5("div", { style: { display: "grid", gap: 10 }, className, children: [
    /* @__PURE__ */ jsx5(
      TextComponent,
      {
        ref: contentRef,
        className: textClassName,
        contentEditable: isEditMode && !isSaving && isEditingText,
        suppressContentEditableWarning: true,
        onFocus: () => {
          if (isEditMode) {
            setIsEditingText(true);
          }
        },
        onBlur: () => {
          void persistText();
        },
        onKeyDown: (event) => {
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
        },
        onClick: () => {
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
        },
        style: {
          border: borderStyle,
          borderRadius: 10,
          cursor: isEditMode ? "text" : "inherit",
          minHeight: 24,
          opacity: isSaving || isLoading ? 0.7 : 1,
          outline: "none",
          padding: isEditMode ? "4px 6px" : void 0,
          transition: "border-color 120ms ease, opacity 120ms ease",
          whiteSpace: allowLineBreaks ? "pre-wrap" : void 0
        },
        children: localText
      }
    ),
    /* @__PURE__ */ jsx5(LocaleFallbackIndicator, { resolvedLocale: record?.resolvedLocale || null }),
    (localLinks.length > 0 || isEditMode) && /* @__PURE__ */ jsxs5("div", { className: linksClassName, style: { display: "grid", gap: 8 }, children: [
      chunkLinks(localLinks).map((row, rowIndex) => /* @__PURE__ */ jsx5(
        "div",
        {
          style: { display: "flex", flexWrap: "wrap", gap: 8 },
          children: row.map(
            (link) => editingLinkId === link.id ? /* @__PURE__ */ jsx5("div", { style: { width: "100%", maxWidth: 360 }, children: /* @__PURE__ */ jsx5(
              LinkButtonEditor,
              {
                link,
                onSave: saveLink,
                onDelete: () => {
                  void deleteLink(link.id);
                },
                onCancel: () => cancelLinkEdit(link.id)
              }
            ) }, link.id) : /* @__PURE__ */ jsx5(
              "div",
              {
                style: { display: "inline-flex", alignItems: "center", gap: 6 },
                children: isEditMode ? /* @__PURE__ */ jsxs5(Fragment, { children: [
                  /* @__PURE__ */ jsxs5(
                    "span",
                    {
                      style: {
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        border: "1px solid rgba(148, 163, 184, 0.5)",
                        borderRadius: 999,
                        padding: "8px 12px",
                        backgroundColor: "white"
                      },
                      children: [
                        /* @__PURE__ */ jsx5("strong", { style: { fontSize: 12 }, children: getLinkIconLabel(link.icon) }),
                        /* @__PURE__ */ jsx5("span", { children: link.title || "Untitled" })
                      ]
                    }
                  ),
                  /* @__PURE__ */ jsx5(
                    "button",
                    {
                      type: "button",
                      onClick: () => setEditingLinkId(link.id),
                      style: {
                        border: "1px solid rgba(148, 163, 184, 0.5)",
                        borderRadius: 999,
                        backgroundColor: "white",
                        cursor: "pointer",
                        padding: "8px 10px"
                      },
                      children: "Edit"
                    }
                  )
                ] }) : /* @__PURE__ */ jsxs5(
                  "a",
                  {
                    href: link.url,
                    target: "_blank",
                    rel: "noreferrer",
                    style: {
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      border: "1px solid rgba(148, 163, 184, 0.5)",
                      borderRadius: 999,
                      padding: "8px 12px",
                      textDecoration: "none"
                    },
                    children: [
                      /* @__PURE__ */ jsx5("strong", { style: { fontSize: 12 }, children: getLinkIconLabel(link.icon) }),
                      /* @__PURE__ */ jsx5("span", { children: link.title })
                    ]
                  }
                )
              },
              link.id
            )
          )
        },
        `${contentKey}-row-${rowIndex}`
      )),
      isEditMode && localLinks.length < MAX_LINKS && !editingLinkId && /* @__PURE__ */ jsxs5(
        "button",
        {
          type: "button",
          onClick: addLink,
          style: {
            alignSelf: "flex-start",
            border: "1px dashed rgba(37, 99, 235, 0.5)",
            borderRadius: 999,
            backgroundColor: "transparent",
            color: "#1d4ed8",
            cursor: "pointer",
            padding: "8px 12px"
          },
          children: [
            "Add link (",
            localLinks.length,
            "/",
            MAX_LINKS,
            ")"
          ]
        }
      )
    ] })
  ] });
}
function EditableParagraphWithLinks(props) {
  return /* @__PURE__ */ jsx5(EditableTextWithLinks, { ...props, as: "p", allowLineBreaks: true });
}
export {
  CmsProvider,
  EditableContent,
  EditableHeading,
  EditableImage,
  EditableParagraph,
  EditableParagraphWithLinks,
  EditableText,
  EditableTextWithLinks,
  LinkButtonEditor,
  useCms,
  useCmsContent,
  useCmsEditMode,
  useCmsImage,
  useCmsLocale
};
//# sourceMappingURL=index.mjs.map