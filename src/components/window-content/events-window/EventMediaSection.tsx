"use client";

import React, { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';
import { AlertTriangle, ChevronDown, ChevronUp, Copy, ExternalLink, Images, Play, Plus, Repeat, Scan, Video, X } from 'lucide-react';
import Image from 'next/image';
import { useWindowManager } from '@/hooks/use-window-manager';
import MediaLibraryWindow from '@/components/window-content/media-library-window';
import { validateVideoUrl, extractVideoId, getVideoEmbedUrl, type VideoProvider } from '@/lib/video-utils';
import { useNamespaceTranslations } from '@/hooks/use-namespace-translations';

interface MediaItem {
  _id: Id<"organizationMedia">;
  storageId?: Id<"_storage">; // Optional - not present for Layer Cake documents
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
  /** Video display mode: 'cover' fills container (may crop), 'contain' shows full video (may letterbox) */
  videoFit?: 'cover' | 'contain';
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
  const { t } = useNamespaceTranslations("ui.events");
  const { openWindow } = useWindowManager();

  // Video input state
  const [videoUrl, setVideoUrl] = useState('');
  const [videoLoop, setVideoLoop] = useState(false);
  const [videoAutostart, setVideoAutostart] = useState(false);
  const [videoFit, setVideoFit] = useState<'cover' | 'contain'>('cover');
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
      setVideoError(t('ui.events.form.video_error_required'));
      return;
    }

    // Validate video URL
    const validation = validateVideoUrl(videoUrl.trim());

    if (!validation.valid || !validation.provider || !validation.videoId) {
      setVideoError(t('ui.events.form.video_error_invalid'));
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
      videoFit: videoFit,
    };

    // Update videos array
    if (onVideosChange) {
      onVideosChange([...videos, newVideo]);
    }

    // Reset form
    setVideoUrl('');
    setVideoLoop(false);
    setVideoAutostart(false);
    setVideoFit('cover');
    setVideoError(null);
  };

  const handleRemoveVideo = (videoId: string) => {
    if (onVideosChange) {
      onVideosChange(videos.filter(v => v.id !== videoId));
    }
  };

  const totalMediaCount = linkedMedia.length + videos.length;
  const imagePlural = linkedMedia.length === 1 ? t('ui.events.form.image') : t('ui.events.form.images');
  const videoPlural = videos.length === 1 ? t('ui.events.form.video') : t('ui.events.form.videos');

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
            <span className="text-sm font-bold flex items-center gap-1">
              <Images size={14} />
              {t('ui.events.form.images_video')}
            </span>
            <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
              {totalMediaCount > 0
                ? `${totalMediaCount} ${totalMediaCount === 1 ? 'media item' : 'media items'} (${linkedMedia.length} ${imagePlural}, ${videos.length} ${videoPlural})`
                : t('ui.events.form.no_media_selected')}
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
        <span className="text-sm font-bold flex items-center gap-1">
          <Images size={14} />
          {t('ui.events.form.images_video')}{' '}
          <span style={{ color: "var(--primary)" }}>({linkedMedia.length})</span>
        </span>
        <ChevronUp size={16} />
      </button>

      <div className="pl-4 space-y-3 border-l-2" style={{ borderColor: "var(--win95-border)" }}>
        <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
          {t('ui.events.form.select_media_library')}
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

              {/* Video Display - Embedded Player */}
              {currentSlideIndex >= linkedMedia.length && videos[currentSlideIndex - linkedMedia.length] && (() => {
                const currentVideo = videos[currentSlideIndex - linkedMedia.length];
                const videoId = extractVideoId(currentVideo.videoUrl, currentVideo.videoProvider);
                const embedUrl = videoId ? getVideoEmbedUrl(videoId, currentVideo.videoProvider, false, false) : null;

                return (
                  <div className="w-full h-full">
                    {embedUrl ? (
                      <iframe
                        src={embedUrl}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        title={`${currentVideo.videoProvider} video`}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Video size={48} style={{ color: "var(--primary)" }} />
                      </div>
                    )}
                    <div className="absolute bottom-2 left-2 px-2 py-1 text-xs font-bold border-2 flex items-center gap-1" style={{
                      background: "var(--primary)",
                      borderColor: "var(--win95-border)",
                      color: "white"
                    }}>
                      <Video size={12} />
                      {currentVideo.videoProvider.toUpperCase()}
                    </div>
                  </div>
                );
              })()}

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
                  {t('ui.events.form.primary')}
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
                      {t('ui.events.form.primary')}
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
                    aria-label={t('ui.events.form.remove_video')}
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
                  {/* Loop, autostart, and videoFit indicators */}
                  <div className="absolute top-1 right-1 flex gap-1">
                    {video.loop && (
                      <div className="px-1 py-0.5 text-xs font-bold" style={{
                        background: "var(--win95-button-face)",
                        color: "var(--win95-text)",
                        fontSize: "10px"
                      }}>
                        <Repeat size={10} />
                      </div>
                    )}
                    {video.autostart && (
                      <div className="px-1 py-0.5 text-xs font-bold" style={{
                        background: "var(--win95-button-face)",
                        color: "var(--win95-text)",
                        fontSize: "10px"
                      }}>
                        <Play size={10} />
                      </div>
                    )}
                    {(video.videoFit === 'contain') && (
                      <div className="px-1 py-0.5 text-xs font-bold" style={{
                        background: "var(--win95-button-face)",
                        color: "var(--win95-text)",
                        fontSize: "10px"
                      }} title="Contain (letterbox)">
                        <Scan size={10} />
                      </div>
                    )}
                  </div>
                  {index === 0 && linkedMedia.length === 0 && showVideoFirst && (
                    <div className="absolute top-1 left-1 px-2 py-0.5 text-xs font-bold border-2" style={{
                      background: "var(--primary)",
                      borderColor: "var(--win95-border)",
                      color: "white"
                    }}>
                      {t('ui.events.form.primary')}
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
                    {video.loop ? t('ui.events.form.loop_on') : t('ui.events.form.loop_off')}
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
                    {video.autostart ? t('ui.events.form.auto_on') : t('ui.events.form.auto_off')}
                  </button>
                  {/* Toggle Video Fit Button */}
                  <button
                    type="button"
                    onClick={() => {
                      if (onVideosChange) {
                        onVideosChange(videos.map(v =>
                          v.id === video.id ? { ...v, videoFit: v.videoFit === 'contain' ? 'cover' : 'contain' } : v
                        ));
                      }
                    }}
                    className="px-2 py-1 text-xs font-bold border-2"
                    style={{
                      background: "var(--win95-button-face)",
                      borderColor: "var(--win95-border)",
                      color: "var(--win95-text)"
                    }}
                    title={video.videoFit === 'contain' ? 'Show video cropped (fill container)' : 'Show full video (letterbox)'}
                  >
                    {video.videoFit === 'contain' ? (t('ui.events.form.fit_cover') || 'Cover') : (t('ui.events.form.fit_contain') || 'Contain')}
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
                    aria-label={t('ui.events.form.remove_video')}
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Video URL Display - Shows URL for selected video with copy/open buttons */}
        {videos.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-bold flex items-center gap-1" style={{ color: "var(--win95-text)" }}>
              <Video size={12} />
              {t('ui.events.form.existing_videos') || 'Existing Videos'}
            </h4>
            {videos.map((video) => (
              <div
                key={video.id}
                className="flex items-center gap-2 p-2 border-2"
                style={{
                  borderColor: "var(--win95-border)",
                  background: "var(--win95-bg-light)",
                }}
              >
                <div className="flex-shrink-0 px-2 py-0.5 text-xs font-bold" style={{
                  background: "var(--primary)",
                  color: "white",
                }}>
                  {video.videoProvider.toUpperCase()}
                </div>
                <input
                  type="text"
                  value={video.videoUrl}
                  readOnly
                  className="flex-1 px-2 py-1 text-xs border-2 bg-white"
                  style={{
                    borderColor: "var(--win95-border)",
                    color: "var(--win95-text)",
                  }}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(video.videoUrl);
                  }}
                  className="px-2 py-1 border-2 hover:opacity-80"
                  style={{
                    borderColor: "var(--win95-border)",
                    background: "var(--win95-button-face)",
                  }}
                  title={t('ui.events.form.copy_url') || 'Copy URL'}
                >
                  <Copy size={14} style={{ color: "var(--win95-text)" }} />
                </button>
                <a
                  href={video.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2 py-1 border-2 hover:opacity-80"
                  style={{
                    borderColor: "var(--win95-border)",
                    background: "var(--win95-button-face)",
                  }}
                  title={t('ui.events.form.open_video') || 'Open in new tab'}
                >
                  <ExternalLink size={14} style={{ color: "var(--win95-text)" }} />
                </a>
                <div className="flex gap-1 text-xs items-center">
                  {video.loop && <Repeat size={12} aria-label="Loop" />}
                  {video.autostart && <Play size={12} aria-label="Autostart" />}
                  {video.videoFit === 'contain' && <Scan size={12} aria-label="Contain (letterbox)" />}
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
            <span className="text-xs font-bold" style={{ color: "var(--primary)" }}>{t('ui.events.form.browse_library')}</span>
            <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
              {t('ui.events.form.browse_library_help')}
            </p>
          </div>
        </button>

        {/* Video Input Section */}
        <div className="pt-2 border-t-2" style={{ borderColor: "var(--win95-border)" }}>
          <h4 className="text-xs font-bold mb-2" style={{ color: "var(--win95-text)" }}>
            {t('ui.events.form.add_video_section')}
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
                  placeholder={t('ui.events.form.video_url_placeholder')}
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
                {t('ui.events.form.add_video')}
              </button>
            </div>

            {/* Error Message */}
            {videoError && (
              <p className="text-xs flex items-center gap-1" style={{ color: "var(--error)" }}>
                <AlertTriangle size={12} />
                {videoError}
              </p>
            )}

            {/* Help Text */}
            <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
              {t('ui.events.form.video_supported')}
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
                <span style={{ color: "var(--win95-text)" }}>{t('ui.events.form.video_loop')}</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={videoAutostart}
                  onChange={(e) => setVideoAutostart(e.target.checked)}
                  className="w-4 h-4"
                />
                <span style={{ color: "var(--win95-text)" }}>{t('ui.events.form.video_autostart')}</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={videoFit === 'contain'}
                  onChange={(e) => setVideoFit(e.target.checked ? 'contain' : 'cover')}
                  className="w-4 h-4"
                />
                <span style={{ color: "var(--win95-text)" }} title="Show full video with letterboxing (black bars) instead of cropping to fill">
                  {t('ui.events.form.video_contain') || 'Show full video (letterbox)'}
                </span>
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
                <span style={{ color: "var(--win95-text)" }}>{t('ui.events.form.show_video_first')}</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventMediaSection;
