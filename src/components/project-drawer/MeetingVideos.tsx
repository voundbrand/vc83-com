"use client";

import React, { useState } from "react";
import { Play, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { useProjectDrawer } from "./ProjectDrawerProvider";

interface VideoEmbed {
  platform: "youtube" | "vimeo" | "loom" | "google_drive" | "other";
  embedUrl: string | null;
  thumbnailUrl?: string;
  originalUrl: string;
}

interface Video {
  url: string;
  title: string;
  embed: VideoEmbed;
}

interface MeetingVideosProps {
  videos: Video[];
}

/**
 * Displays embedded videos with auto-detected platforms
 * Supports YouTube, Vimeo, Loom, Google Drive with fallback to links
 */
export function MeetingVideos({ videos }: MeetingVideosProps) {
  const { themeColors } = useProjectDrawer();
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0); // First video expanded by default

  if (videos.length === 0) return null;

  return (
    <div className="space-y-3">
      {videos.map((video, index) => (
        <VideoItem
          key={video.url}
          video={video}
          isExpanded={expandedIndex === index}
          onToggle={() => setExpandedIndex(expandedIndex === index ? null : index)}
          themeColors={themeColors}
        />
      ))}
    </div>
  );
}

interface VideoItemProps {
  video: Video;
  isExpanded: boolean;
  onToggle: () => void;
  themeColors: {
    primary: string;
    background: string;
    border: string;
    accent: string;
  };
}

function VideoItem({ video, isExpanded, onToggle, themeColors }: VideoItemProps) {
  const { embed } = video;
  const canEmbed = embed.embedUrl !== null;

  return (
    <div
      className="overflow-hidden border rounded-lg"
      style={{ borderColor: themeColors.border }}
    >
      {/* Video header - clickable to expand/collapse */}
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full gap-3 p-3 text-left transition-colors hover:bg-gray-50"
      >
        <div className="flex items-center gap-3">
          {/* Platform icon */}
          <div
            className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0"
            style={{ backgroundColor: themeColors.background }}
          >
            {getPlatformIcon(embed.platform, themeColors.primary)}
          </div>

          {/* Title and platform */}
          <div>
            <p className="font-medium text-gray-900">{video.title}</p>
            <p className="text-xs text-gray-500">
              {getPlatformLabel(embed.platform)}
            </p>
          </div>
        </div>

        {/* Expand/collapse indicator */}
        <div className="flex items-center gap-2">
          {!canEmbed && (
            <a
              href={video.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 transition-colors rounded hover:bg-gray-100"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="w-4 h-4 text-gray-400" />
            </a>
          )}
          {canEmbed && (
            isExpanded ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )
          )}
        </div>
      </button>

      {/* Embedded player (when expanded and embeddable) */}
      {isExpanded && canEmbed && embed.embedUrl && (
        <div className="border-t" style={{ borderColor: themeColors.border }}>
          <div className="relative w-full aspect-video">
            <iframe
              src={embed.embedUrl}
              title={video.title}
              className="absolute inset-0 w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}

      {/* Link fallback for non-embeddable videos */}
      {isExpanded && !canEmbed && (
        <div
          className="p-4 text-center border-t"
          style={{ borderColor: themeColors.border }}
        >
          <a
            href={video.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white transition-colors rounded-lg"
            style={{ backgroundColor: themeColors.primary }}
          >
            <ExternalLink className="w-4 h-4" />
            Video öffnen
          </a>
        </div>
      )}
    </div>
  );
}

/**
 * Get icon for video platform
 */
function getPlatformIcon(platform: string, color: string): React.ReactNode {
  // For simplicity, using Play icon for all platforms
  // Could be enhanced with platform-specific icons
  return <Play className="w-5 h-5" style={{ color }} />;
}

/**
 * Get human-readable platform label
 */
function getPlatformLabel(platform: string): string {
  switch (platform) {
    case "youtube":
      return "YouTube";
    case "vimeo":
      return "Vimeo";
    case "loom":
      return "Loom";
    case "google_drive":
      return "Google Drive";
    default:
      return "Video";
  }
}
