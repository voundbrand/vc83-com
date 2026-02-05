"use client";

/**
 * IMAGE VIEWER - Zoom, pan, metadata display for media_ref images
 *
 * Loads the image URL from organizationMedia, supports zoom via
 * buttons and scroll wheel, pan via click-and-drag when zoomed.
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import {
  ZoomIn,
  ZoomOut,
  Maximize,
  Download,
  Clock,
  HardDrive,
  Tag,
  Loader2,
} from "lucide-react";
import type { ProjectFile } from "../finder-types";

interface ImageViewerProps {
  file: ProjectFile;
}

export function ImageViewer({ file }: ImageViewerProps) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const panStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch media URL
  const media = useQuery(
    api.organizationMedia.getMedia,
    file.mediaId ? { mediaId: file.mediaId as Id<"organizationMedia"> } : "skip"
  );

  const imageUrl = media?.url;

  // Reset zoom/pan when file changes
  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setNaturalSize(null);
  }, [file._id]);

  // Zoom handlers
  const handleZoomIn = useCallback(() => {
    setZoom((z) => Math.min(z * 1.25, 5));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((z) => Math.max(z / 1.25, 0.1));
  }, []);

  const handleFitToWindow = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  // Scroll wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom((z) => Math.min(Math.max(z * delta, 0.1), 5));
  }, []);

  // Pan handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (zoom <= 1) return;
      e.preventDefault();
      setIsPanning(true);
      panStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        panX: pan.x,
        panY: pan.y,
      };
    },
    [zoom, pan]
  );

  useEffect(() => {
    if (!isPanning) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      setPan({
        x: panStartRef.current.panX + dx,
        y: panStartRef.current.panY + dy,
      });
    };

    const handleMouseUp = () => {
      setIsPanning(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isPanning]);

  // Image load
  const handleImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
  }, []);

  // Download
  const handleDownload = useCallback(() => {
    if (!imageUrl) return;
    const a = document.createElement("a");
    a.href = imageUrl;
    a.download = file.name;
    a.click();
  }, [imageUrl, file.name]);

  if (!file.mediaId) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="text-xs" style={{ color: "var(--neutral-gray)" }}>
          No media reference
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--win95-bg)" }}>
      {/* Toolbar */}
      <div
        className="flex items-center gap-2 px-3 py-1.5 border-b-2 flex-shrink-0"
        style={{ borderColor: "var(--win95-border)" }}
      >
        <button
          onClick={handleZoomOut}
          title="Zoom out"
          className="p-1.5 rounded transition-colors"
          style={{ color: "var(--win95-text)" }}
        >
          <ZoomOut size={14} />
        </button>

        <span className="text-[10px] min-w-[40px] text-center" style={{ color: "var(--neutral-gray)" }}>
          {Math.round(zoom * 100)}%
        </span>

        <button
          onClick={handleZoomIn}
          title="Zoom in"
          className="p-1.5 rounded transition-colors"
          style={{ color: "var(--win95-text)" }}
        >
          <ZoomIn size={14} />
        </button>

        <button
          onClick={handleFitToWindow}
          title="Fit to window"
          className="p-1.5 rounded transition-colors"
          style={{ color: "var(--win95-text)" }}
        >
          <Maximize size={14} />
        </button>

        <div className="flex-1" />

        {naturalSize && (
          <span className="text-[10px]" style={{ color: "var(--neutral-gray)" }}>
            {naturalSize.w} x {naturalSize.h}
          </span>
        )}

        <button
          onClick={handleDownload}
          title="Download"
          className="p-1.5 rounded transition-colors"
          style={{ color: "var(--win95-text)" }}
        >
          <Download size={14} />
        </button>
      </div>

      {/* Image area */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden flex items-center justify-center"
        style={{
          background: "var(--win95-button-face)",
          cursor: zoom > 1 ? (isPanning ? "grabbing" : "grab") : "default",
          // Checkerboard for transparency
          backgroundImage:
            "linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)",
          backgroundSize: "16px 16px",
          backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0px",
        }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
      >
        {!imageUrl ? (
          <div className="flex items-center gap-2">
            <Loader2 size={16} className="animate-spin" style={{ color: "var(--neutral-gray)" }} />
            <span className="text-xs" style={{ color: "var(--neutral-gray)" }}>
              Loading...
            </span>
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={file.name}
            onLoad={handleImageLoad}
            draggable={false}
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: "center center",
              maxWidth: zoom <= 1 ? "100%" : "none",
              maxHeight: zoom <= 1 ? "100%" : "none",
              objectFit: "contain",
              transition: isPanning ? "none" : "transform 0.15s ease",
            }}
          />
        )}
      </div>

      {/* Metadata bar */}
      <div
        className="flex items-center gap-4 px-3 py-1.5 border-t-2 flex-shrink-0 text-[10px]"
        style={{
          borderColor: "var(--win95-border)",
          color: "var(--neutral-gray)",
        }}
      >
        {file.mimeType && (
          <span className="flex items-center gap-1">
            <Tag size={10} /> {file.mimeType}
          </span>
        )}
        {file.sizeBytes && (
          <span className="flex items-center gap-1">
            <HardDrive size={10} /> {formatSize(file.sizeBytes)}
          </span>
        )}
        {file.createdAt && (
          <span className="flex items-center gap-1">
            <Clock size={10} /> {formatDate(file.createdAt)}
          </span>
        )}
      </div>
    </div>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
