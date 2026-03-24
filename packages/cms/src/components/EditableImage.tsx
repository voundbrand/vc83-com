"use client";

import { useRef, useState } from "react";
import { useCmsEditMode, useCmsImage } from "../hooks";
import { LocaleFallbackIndicator } from "./LocaleFallbackIndicator";
import { EditableFieldHint } from "./editableFieldChrome";

interface EditableImageProps {
  usage: string;
  fallbackSrc?: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  aspectRatio?: string;
  fill?: boolean;
  isHeroBackground?: boolean;
  locale?: string;
  showEditHint?: boolean;
}

function getPlaceholderLabel(isUploading: boolean): string {
  return isUploading ? "Uploading image..." : "No image";
}

export function EditableImage({
  usage,
  fallbackSrc,
  alt,
  className,
  width = 800,
  height = 600,
  aspectRatio = "4 / 3",
  fill = false,
  isHeroBackground = false,
  locale,
  showEditHint = true,
}: EditableImageProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const { isEditMode } = useCmsEditMode();
  const { record, isLoading, isUploading, error, upload, remove } = useCmsImage({
    usage,
    locale,
  });

  const imageUrl = record?.fileUrl || fallbackSrc || null;
  const resolvedAlt = record?.imageMetadata?.alt || alt;

  async function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
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
        locale,
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

  return (
    <div style={{ display: "grid", gap: 8 }} className={className}>
      {showEditHint ? (
        <EditableFieldHint isEditMode={isEditMode} label="Editable image" />
      ) : null}
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          position: "relative",
          overflow: "hidden",
          borderRadius: isHeroBackground ? 0 : 12,
          border: isEditMode
            ? isHovered || isUploading
              ? "2px solid rgba(37, 99, 235, 0.85)"
              : "2px dashed rgba(37, 99, 235, 0.5)"
            : "2px solid transparent",
          boxShadow: isEditMode
            ? "0 0 0 1px rgba(37, 99, 235, 0.14)"
            : undefined,
          backgroundColor: "#e2e8f0",
          aspectRatio: fill ? undefined : aspectRatio,
          minHeight: fill ? "100%" : 160,
          transition: "border-color 120ms ease, box-shadow 120ms ease",
        }}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={resolvedAlt}
            width={fill ? undefined : width}
            height={fill ? undefined : height}
            style={{
              display: "block",
              width: "100%",
              height: fill ? "100%" : "100%",
              objectFit: "cover",
            }}
          />
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: fill ? "100%" : 160,
              color: "#475569",
              fontSize: 14,
            }}
          >
            {getPlaceholderLabel(isUploading)}
          </div>
        )}

        {isEditMode && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: isHeroBackground ? "flex-start" : "center",
              justifyContent: isHeroBackground ? "flex-end" : "center",
              gap: 8,
              padding: isHeroBackground ? 16 : 12,
              backgroundColor:
                isHeroBackground || isHovered || isUploading
                  ? "rgba(15, 23, 42, 0.45)"
                  : "rgba(15, 23, 42, 0)",
              transition: "background-color 120ms ease",
            }}
          >
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: "1px solid rgba(255, 255, 255, 0.5)",
                borderRadius: 999,
                backgroundColor: "rgba(255, 255, 255, 0.92)",
                cursor: "pointer",
                padding: "8px 12px",
              }}
            >
              {record ? "Replace image" : "Upload image"}
            </button>
            {record?.recordId ? (
              <button
                type="button"
                onClick={() => {
                  void handleDelete();
                }}
                style={{
                  border: "1px solid rgba(254, 202, 202, 0.7)",
                  borderRadius: 999,
                  backgroundColor: "rgba(239, 68, 68, 0.92)",
                  color: "white",
                  cursor: "pointer",
                  padding: "8px 12px",
                }}
              >
                Delete
              </button>
            ) : null}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          style={{ display: "none" }}
        />
      </div>

      <LocaleFallbackIndicator resolvedLocale={record?.resolvedLocale || null} />

      {isLoading ? (
        <span style={{ fontSize: 12, color: "#64748b" }}>Loading image...</span>
      ) : null}

      {error ? (
        <span style={{ fontSize: 12, color: "#b91c1c" }}>{error.message}</span>
      ) : null}
    </div>
  );
}
