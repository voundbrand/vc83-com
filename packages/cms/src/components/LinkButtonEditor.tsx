"use client";

import { useState } from "react";
import type { CmsContentLink, CmsContentLinkIcon } from "../types";

interface LinkButtonEditorProps {
  link: CmsContentLink;
  onSave: (link: CmsContentLink) => void;
  onDelete: () => void;
  onCancel: () => void;
}

const ICON_OPTIONS: Array<{ value: CmsContentLinkIcon; label: string }> = [
  { value: "external", label: "External" },
  { value: "download", label: "Download" },
  { value: "music", label: "Music" },
  { value: "video", label: "Video" },
  { value: "document", label: "Document" },
  { value: "link", label: "Link" },
  { value: "play", label: "Play" },
  { value: "info", label: "Info" },
];

export function getLinkIconLabel(icon?: CmsContentLinkIcon): string {
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

export function LinkButtonEditor({
  link,
  onSave,
  onDelete,
  onCancel,
}: LinkButtonEditorProps) {
  const [title, setTitle] = useState(link.title);
  const [url, setUrl] = useState(link.url);
  const [icon, setIcon] = useState<CmsContentLinkIcon>(link.icon || "external");

  const isValid = title.trim().length > 0 && url.trim().length > 0;

  return (
    <div
      style={{
        border: "1px solid rgba(37, 99, 235, 0.25)",
        borderRadius: 12,
        padding: 12,
        backgroundColor: "rgba(248, 250, 252, 0.95)",
      }}
    >
      <div style={{ display: "grid", gap: 10 }}>
        <label style={{ display: "grid", gap: 4, fontSize: 12 }}>
          <span>Button text</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Link title"
            style={{
              border: "1px solid rgba(148, 163, 184, 0.5)",
              borderRadius: 8,
              padding: "8px 10px",
            }}
          />
        </label>

        <label style={{ display: "grid", gap: 4, fontSize: 12 }}>
          <span>URL</span>
          <input
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://..."
            style={{
              border: "1px solid rgba(148, 163, 184, 0.5)",
              borderRadius: 8,
              padding: "8px 10px",
            }}
          />
        </label>

        <label style={{ display: "grid", gap: 4, fontSize: 12 }}>
          <span>Icon</span>
          <select
            value={icon}
            onChange={(event) => setIcon(event.target.value as CmsContentLinkIcon)}
            style={{
              border: "1px solid rgba(148, 163, 184, 0.5)",
              borderRadius: 8,
              padding: "8px 10px",
              backgroundColor: "white",
            }}
          >
            {ICON_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
          <button
            type="button"
            onClick={onDelete}
            style={{
              border: "none",
              background: "none",
              color: "#b91c1c",
              cursor: "pointer",
              padding: 0,
            }}
          >
            Delete
          </button>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={onCancel}
              style={{
                border: "1px solid rgba(148, 163, 184, 0.5)",
                borderRadius: 8,
                backgroundColor: "white",
                cursor: "pointer",
                padding: "6px 10px",
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!isValid}
              onClick={() =>
                onSave({
                  ...link,
                  title: title.trim(),
                  url: url.trim(),
                  icon,
                })
              }
              style={{
                border: "1px solid #2563eb",
                borderRadius: 8,
                backgroundColor: isValid ? "#2563eb" : "#cbd5e1",
                color: "white",
                cursor: isValid ? "pointer" : "not-allowed",
                padding: "6px 10px",
              }}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
