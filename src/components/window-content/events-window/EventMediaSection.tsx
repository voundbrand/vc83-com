"use client";

import React, { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';
import { ChevronDown, ChevronUp, Plus, X, Video } from 'lucide-react';
import Image from 'next/image';
import { useWindowManager } from '@/hooks/use-window-manager';
import MediaLibraryWindow from '@/components/window-content/media-library-window';
import { validateVideoUrl, type VideoProvider } from '@/lib/video-utils';

interface MediaItem {
  _id: Id<"organizationMedia">;
  storageId: Id<"_storage">;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  width?: number;
  height?: number;
  url?: string | null;
}

interface VideoItem {
  id: string;
  type: 'video';
  videoUrl: string;
  videoProvider: VideoProvider;
  loop: boolean;
  autostart: boolean;
  order: number;
}

interface EventMediaSectionProps {
  eventId?: Id<"objects">;
  organizationId: Id<"organizations">;
  sessionId: string;
  linkedMediaIds: Id<"organizationMedia">[];
  onMediaLink: (mediaId: Id<"organizationMedia">) => void;
  onMediaUnlink: (mediaId: Id<"organizationMedia">) => void;
  videos?: VideoItem[];
  onVideosChange?: (videos: VideoItem[]) => void;
  showVideoFirst?: boolean;
  onShowVideoFirstChange?: (value: boolean) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export const EventMediaSection: React.FC<EventMediaSectionProps> = ({
  organizationId,
  sessionId,
  linkedMediaIds,
  onMediaLink,
  onMediaUnlink,
  videos = [],
  onVideosChange,
  showVideoFirst = false,
  onShowVideoFirstChange,
  isOpen,
  onToggle,
}) => {
  const { openWindow } = useWindowManager();

  // Video input state
  const [videoUrl, setVideoUrl] = useState('');
  const [videoLoop, setVideoLoop] = useState(false);
  const [videoAutostart, setVideoAutostart] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);

  // Mini slider state
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  // Get organization media
  const organizationMedia = useQuery(api.organizationMedia.listMedia, {
    organizationId,
    sessionId,
  });

  // Get URLs for linked media
  const linkedMedia = organizationMedia?.filter((media: MediaItem) =>
    linkedMediaIds.includes(media._id)
  ) || [];

  const handleBrowseLibrary = () => {
    openWindow(
      "media-library-select",
      "Select Media",
      <MediaLibraryWindow
        selectionMode={true}
        onSelect={(media) => {
          onMediaLink(media._id);
        }}
      />,
      { x: 240, y: 160 },
      { width: 1000, height: 700 }
    );
  };

  const handleAddVideo = () => {
    setVideoError(null);

    if (!videoUrl.trim()) {
      setVideoError('Please enter a video URL');
      return;
    }

    // Validate video URL
    const validation = validateVideoUrl(videoUrl.trim());

    if (!validation.valid || !validation.provider || !validation.videoId) {
      setVideoError('Invalid video URL. Please use a YouTube or Vimeo URL.');
      return;
    }

    // Create new video item
    const newVideo: VideoItem = {
      id: `video-${Date.now()}`,
      type: 'video',
      videoUrl: videoUrl.trim(),
      videoProvider: validation.provider,
      loop: videoLoop,
      autostart: videoAutostart,
      order: linkedMediaIds.length + videos.length,
    };

    // Update videos array
    if (onVideosChange) {
      onVideosChange([...videos, newVideo]);
    }

    // Reset form
    setVideoUrl('');
    setVideoLoop(false);
    setVideoAutostart(false);
    setVideoError(null);
  };

  const handleRemoveVideo = (videoId: string) => {
    if (onVideosChange) {
      onVideosChange(videos.filter(v => v.id !== videoId));
    }
  };

  if (!isOpen) {
    return (
      <div>
        <button
          type="button"
          onClick={onToggle}
          className="flex items-center justify-between w-full text-left py-2 px-3 border-2"
          style={{
            borderColor: "var(--win95-border)",
            background: "var(--win95-bg-light)",
            color: "var(--win95-text)",
          }}
        >
          <div className="flex-1">
            <span className="text-sm font-bold">🖼️ Images & Video</span>
            <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
              {linkedMedia.length + videos.length > 0
                ? `${linkedMedia.length + videos.length} media item${linkedMedia.length + videos.length !== 1 ? 's' : ''} selected (${linkedMedia.length} ${linkedMedia.length === 1 ? 'image' : 'images'}, ${videos.length} ${videos.length === 1 ? 'video' : 'videos'})`
                : 'No media selected'}
            </p>
          </div>
          <ChevronDown size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center justify-between w-full text-left py-2 px-3 border-2"
        style={{
          borderColor: "var(--win95-border)",
          background: "var(--win95-bg-light)",
          color: "var(--win95-text)",
        }}
      >
        <span className="text-sm font-bold">
          🖼️ Images & Video{' '}
          <span style={{ color: "var(--primary)" }}>({linkedMedia.length})</span>
        </span>
        <ChevronUp size={16} />
      </button>

      <div className="pl-4 space-y-3 border-l-2" style={{ borderColor: "var(--win95-border)" }}>
        <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
          Select from your Media Library or upload new files
        </p>

        {/* Mini Media Slider Preview */}
        {(linkedMedia.length > 0 || videos.length > 0) && (
          <div className="mb-4 border-2" style={{ borderColor: "var(--win95-border)" }}>
            <div className="relative w-full aspect-[16/9] overflow-hidden group" style={{ background: "var(--win95-bg-light)" }}>
              {/* Current Media Display */}
              {currentSlideIndex < linkedMedia.length && linkedMedia[currentSlideIndex]?.url && (
                <Image
                  src={linkedMedia[currentSlideIndex].url}
                  alt={linkedMedia[currentSlideIndex].filename}
                  fill
                  className="object-cover"
                  unoptimized
                />
              )}

              {/* Video Display */}
              {currentSlideIndex >= linkedMedia.length && videos[currentSlideIndex - linkedMedia.length] && (
                <div className="w-full h-full flex items-center justify-center">
                  <Video size={48} style={{ color: "var(--primary)" }} />
                  <div className="absolute bottom-2 left-2 px-2 py-1 text-xs font-bold border-2" style={{
                    background: "var(--primary)",
                    borderColor: "var(--win95-border)",
                    color: "white"
                  }}>
                    📹 {videos[currentSlideIndex - linkedMedia.length].videoProvider.toUpperCase()}
                  </div>
                </div>
              )}

              {/* Navigation Arrows */}
              {linkedMedia.length + videos.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setCurrentSlideIndex((prev) =>
                        prev === 0 ? linkedMedia.length + videos.length - 1 : prev - 1
                      );
                    }}
                    className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 border-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{
                      background: "var(--win95-button-face)",
                      borderColor: "var(--win95-border)"
                    }}
                    aria-label="Previous"
                  >
                    <ChevronUp size={16} style={{ color: "var(--win95-text)", transform: 'rotate(-90deg)' }} />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setCurrentSlideIndex((prev) =>
                        (prev + 1) % (linkedMedia.length + videos.length)
                      );
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 border-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{
                      background: "var(--win95-button-face)",
                      borderColor: "var(--win95-border)"
                    }}
                    aria-label="Next"
                  >
                    <ChevronUp size={16} style={{ color: "var(--win95-text)", transform: 'rotate(90deg)' }} />
                  </button>
                </>
              )}

              {/* Counter */}
              {linkedMedia.length + videos.length > 1 && (
                <div className="absolute bottom-2 right-2 px-2 py-1 text-xs font-bold border-2" style={{
                  background: "var(--win95-button-face)",
                  borderColor: "var(--win95-border)",
                  color: "var(--win95-text)"
                }}>
                  {currentSlideIndex + 1} / {linkedMedia.length + videos.length}
                </div>
              )}

              {/* Primary Badge */}
              {currentSlideIndex === 0 && (
                <div className="absolute top-2 left-2 px-2 py-1 text-xs font-bold border-2" style={{
                  background: "var(--primary)",
                  borderColor: "var(--win95-border)",
                  color: "white"
                }}>
                  Primary
                </div>
              )}
            </div>
          </div>
        )}

        {/* Media Grid - Images and Videos */}
        {(linkedMedia.length > 0 || videos.length > 0) && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {/* Images */}
            {linkedMedia.map((media, index) => (
              <div key={media._id} className="relative group">
                <div className="aspect-square relative overflow-hidden border-2" style={{ borderColor: "var(--win95-border)" }}>
                  {media.url && (
                    <Image
                      src={media.url}
                      alt={media.filename}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  )}
                  {index === 0 && videos.length === 0 && (
                    <div className="absolute top-1 left-1 px-2 py-0.5 text-xs font-bold border-2" style={{
                      background: "var(--primary)",
                      borderColor: "var(--win95-border)",
                      color: "white"
                    }}>
                      Primary
                    </div>
                  )}
                </div>
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => onMediaUnlink(media._id)}
                    className="px-2 py-1.5 text-xs font-bold border-2"
                    style={{
                      background: "var(--error)",
                      borderColor: "var(--win95-border)",
                      color: "white"
                    }}
                    aria-label="Remove media"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))}

            {/* Videos */}
            {videos.map((video, index) => (
              <div key={video.id} className="relative group">
                <div className="aspect-square relative overflow-hidden border-2 flex items-center justify-center" style={{
                  borderColor: "var(--win95-border)",
                  background: "var(--win95-bg-light)"
                }}>
                  <Video size={32} style={{ color: "var(--primary)" }} />
                  <div className="absolute bottom-1 left-1 right-1 text-center">
                    <span className="text-xs font-bold px-1" style={{
                      background: "var(--primary)",
                      color: "white",
                    }}>
                      {video.videoProvider.toUpperCase()}
                    </span>
                  </div>
                  {/* Loop and autostart indicators */}
                  <div className="absolute top-1 right-1 flex gap-1">
                    {video.loop && (
                      <div className="px-1 py-0.5 text-xs font-bold" style={{
                        background: "var(--win95-button-face)",
                        color: "var(--win95-text)",
                        fontSize: "10px"
                      }}>
                        🔁
                      </div>
                    )}
                    {video.autostart && (
                      <div className="px-1 py-0.5 text-xs font-bold" style={{
                        background: "var(--win95-button-face)",
                        color: "var(--win95-text)",
                        fontSize: "10px"
                      }}>
                        ▶️
                      </div>
                    )}
                  </div>
                  {index === 0 && linkedMedia.length === 0 && showVideoFirst && (
                    <div className="absolute top-1 left-1 px-2 py-0.5 text-xs font-bold border-2" style={{
                      background: "var(--primary)",
                      borderColor: "var(--win95-border)",
                      color: "white"
                    }}>
                      Primary
                    </div>
                  )}
                </div>
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
                  {/* Toggle Loop Button */}
                  <button
                    type="button"
                    onClick={() => {
                      if (onVideosChange) {
                        onVideosChange(videos.map(v =>
                          v.id === video.id ? { ...v, loop: !v.loop } : v
                        ));
                      }
                    }}
                    className="px-2 py-1 text-xs font-bold border-2"
                    style={{
                      background: "var(--win95-button-face)",
                      borderColor: "var(--win95-border)",
                      color: "var(--win95-text)"
                    }}
                  >
                    {video.loop ? '🔁 Loop: ON' : '🔁 Loop: OFF'}
                  </button>
                  {/* Toggle Autostart Button */}
                  <button
                    type="button"
                    onClick={() => {
                      if (onVideosChange) {
                        onVideosChange(videos.map(v =>
                          v.id === video.id ? { ...v, autostart: !v.autostart } : v
                        ));
                      }
                    }}
                    className="px-2 py-1 text-xs font-bold border-2"
                    style={{
                      background: "var(--win95-button-face)",
                      borderColor: "var(--win95-border)",
                      color: "var(--win95-text)"
                    }}
                  >
                    {video.autostart ? '▶️ Auto: ON' : '▶️ Auto: OFF'}
                  </button>
                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={() => handleRemoveVideo(video.id)}
                    className="px-2 py-1 text-xs font-bold border-2"
                    style={{
                      background: "var(--error)",
                      borderColor: "var(--win95-border)",
                      color: "white"
                    }}
                    aria-label="Remove video"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Media Button - Opens Media Library Window */}
        <button
          type="button"
          onClick={handleBrowseLibrary}
          className="w-full border-2 p-4 text-center transition-colors hover:bg-purple-50"
          style={{
            borderColor: "var(--win95-border)",
            background: "var(--win95-bg-light)",
            color: "var(--win95-text)",
          }}
        >
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 border-2 mx-auto mb-2 flex items-center justify-center" style={{
              borderColor: "var(--win95-border)",
              background: "var(--win95-button-face)"
            }}>
              <Plus size={20} style={{ color: "var(--primary)" }} />
            </div>
            <span className="text-xs font-bold" style={{ color: "var(--primary)" }}>📁 Select from Media Library</span>
            <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
              Opens Media Library window to browse and upload images
            </p>
          </div>
        </button>

        {/* Video Input Section */}
        <div className="pt-2 border-t-2" style={{ borderColor: "var(--win95-border)" }}>
          <h4 className="text-xs font-bold mb-2" style={{ color: "var(--win95-text)" }}>
            📹 Add Video
          </h4>

          <div className="space-y-2">
            {/* Video URL Input */}
            <div className="flex gap-2">
              <div className="flex-1">
                <input
                  type="url"
                  value={videoUrl}
                  onChange={(e) => {
                    setVideoUrl(e.target.value);
                    setVideoError(null);
                  }}
                  placeholder="Paste YouTube or Vimeo URL"
                  className="w-full px-2 py-1.5 text-xs border-2"
                  style={{
                    borderColor: videoError ? "var(--error)" : "var(--win95-border)",
                    background: "white",
                    color: "var(--win95-text)",
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddVideo();
                    }
                  }}
                />
              </div>

              <button
                type="button"
                disabled={!videoUrl.trim()}
                className="px-3 py-1.5 text-xs font-bold border-2 disabled:opacity-50"
                style={{
                  borderColor: "var(--win95-border)",
                  background: "var(--primary)",
                  color: "white",
                }}
                onClick={handleAddVideo}
              >
                Add Video
              </button>
            </div>

            {/* Error Message */}
            {videoError && (
              <p className="text-xs" style={{ color: "var(--error)" }}>
                ⚠️ {videoError}
              </p>
            )}

            {/* Help Text */}
            <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
              Supported: YouTube (youtube.com, youtu.be) and Vimeo (vimeo.com)
            </p>

            {/* Video Options */}
            <div className="flex items-center gap-4 text-xs flex-wrap">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={videoLoop}
                  onChange={(e) => setVideoLoop(e.target.checked)}
                  className="w-4 h-4"
                />
                <span style={{ color: "var(--win95-text)" }}>Loop video</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={videoAutostart}
                  onChange={(e) => setVideoAutostart(e.target.checked)}
                  className="w-4 h-4"
                />
                <span style={{ color: "var(--win95-text)" }}>Autostart video</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showVideoFirst}
                  onChange={(e) => {
                    if (onShowVideoFirstChange) {
                      onShowVideoFirstChange(e.target.checked);
                    }
                  }}
                  className="w-4 h-4"
                />
                <span style={{ color: "var(--win95-text)" }}>Show video first</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventMediaSection;
