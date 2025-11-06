"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, X, Video } from 'lucide-react';
import { extractVideoId, getVideoEmbedUrl, type VideoProvider } from '@/lib/video-utils';

interface MediaItem {
  id?: string;
  type?: 'image' | 'video';
  // Image fields
  url?: string | null;
  filename?: string;
  isPrimary?: boolean;
  // Video fields
  videoUrl?: string;
  videoProvider?: VideoProvider;
  loop?: boolean;
  autostart?: boolean;
}

interface MediaGalleryProps {
  media: MediaItem[];
  className?: string;
}

export const MediaGallery: React.FC<MediaGalleryProps> = ({ media, className = '' }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Filter out items without URLs (images) or videoUrl (videos)
  const validMedia = media.filter(item => {
    if (item.type === 'video') {
      return item.videoUrl;
    }
    return item.url;
  });

  if (validMedia.length === 0) {
    return null;
  }

  const currentMedia = validMedia[currentIndex];

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % validMedia.length);
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + validMedia.length) % validMedia.length);
  };

  const openModal = (index: number) => {
    setCurrentIndex(index);
    setIsModalOpen(true);
  };

  return (
    <>
      {/* Main Gallery Display */}
      <div className={className}>
        {/* Large Primary Media */}
        <div
          className="relative w-full aspect-[16/9] overflow-hidden cursor-pointer group border-2"
          onClick={() => currentMedia?.type !== 'video' && openModal(currentIndex)}
          style={{ borderColor: "var(--win95-border)" }}
        >
          {/* Image Display */}
          {currentMedia?.type !== 'video' && currentMedia?.url && (
            <Image
              src={currentMedia.url}
              alt={currentMedia.filename || 'Event media'}
              fill
              className="object-cover"
              unoptimized
              priority
            />
          )}

          {/* Video Display */}
          {currentMedia?.type === 'video' && currentMedia?.videoUrl && currentMedia?.videoProvider && (
            <>
              <iframe
                src={getVideoEmbedUrl(
                  extractVideoId(currentMedia.videoUrl, currentMedia.videoProvider) || '',
                  currentMedia.videoProvider,
                  currentMedia.loop,
                  currentMedia.autostart
                )}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />

              {/* Video Type Indicator */}
              <div className="absolute top-2 left-2 px-2 py-1 text-xs font-bold border-2 flex items-center gap-1" style={{
                background: "var(--primary)",
                borderColor: "var(--win95-border)",
                color: "white"
              }}>
                <Video size={12} />
                {currentMedia.videoProvider.toUpperCase()}
              </div>
            </>
          )}

          {/* Hover Overlay (Images Only) */}
          {currentMedia?.type !== 'video' && (
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-bold px-2 py-1 border-2" style={{
                background: "var(--primary)",
                borderColor: "var(--win95-border)"
              }}>
                Click to view fullscreen
              </div>
            </div>
          )}

          {/* Navigation Arrows (if multiple images) */}
          {validMedia.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  goToPrevious();
                }}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-2 border-2 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{
                  background: "var(--win95-button-face)",
                  borderColor: "var(--win95-border)"
                }}
                aria-label="Previous image"
              >
                <ChevronLeft size={20} style={{ color: "var(--win95-text)" }} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  goToNext();
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 border-2 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{
                  background: "var(--win95-button-face)",
                  borderColor: "var(--win95-border)"
                }}
                aria-label="Next image"
              >
                <ChevronRight size={20} style={{ color: "var(--win95-text)" }} />
              </button>
            </>
          )}

          {/* Image Counter */}
          {validMedia.length > 1 && (
            <div className="absolute bottom-2 right-2 px-3 py-1 text-xs font-bold border-2" style={{
              background: "var(--primary)",
              borderColor: "var(--win95-border)",
              color: "white"
            }}>
              {currentIndex + 1} / {validMedia.length}
            </div>
          )}
        </div>

        {/* Thumbnail Strip */}
        {validMedia.length > 1 && (
          <div className="grid grid-cols-4 md:grid-cols-6 gap-2 mt-2">
            {validMedia.slice(0, 6).map((item, index) => (
              <div
                key={item.id || index}
                onClick={() => {
                  setCurrentIndex(index);
                }}
                className={`relative aspect-square overflow-hidden cursor-pointer border-2 ${
                  index === currentIndex ? 'shadow-lg' : ''
                }`}
                style={{
                  borderColor: index === currentIndex ? "var(--primary)" : "var(--win95-border)"
                }}
              >
                {/* Image Thumbnail */}
                {item.type !== 'video' && item.url && (
                  <Image
                    src={item.url}
                    alt={item.filename || 'Thumbnail'}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                )}

                {/* Video Thumbnail */}
                {item.type === 'video' && (
                  <div
                    className="w-full h-full flex items-center justify-center"
                    style={{ background: "var(--win95-bg-light)" }}
                  >
                    <Video size={20} style={{ color: "var(--primary)" }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Fullscreen Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-50" style={{ background: "var(--modal-overlay-bg)" }}>
          {/* Close Button */}
          <button
            onClick={() => setIsModalOpen(false)}
            className="absolute top-4 right-4 p-2 border-2"
            style={{
              background: "var(--win95-button-face)",
              borderColor: "var(--win95-border)"
            }}
            aria-label="Close"
          >
            <X size={20} style={{ color: "var(--win95-text)" }} />
          </button>

          {/* Navigation Arrows */}
          {validMedia.length > 1 && (
            <>
              <button
                onClick={goToPrevious}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 border-2"
                style={{
                  background: "var(--win95-button-face)",
                  borderColor: "var(--win95-border)"
                }}
                aria-label="Previous image"
              >
                <ChevronLeft size={24} style={{ color: "var(--win95-text)" }} />
              </button>
              <button
                onClick={goToNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 border-2"
                style={{
                  background: "var(--win95-button-face)",
                  borderColor: "var(--win95-border)"
                }}
                aria-label="Next image"
              >
                <ChevronRight size={24} style={{ color: "var(--win95-text)" }} />
              </button>
            </>
          )}

          {/* Main Media */}
          <div className="relative w-full h-full max-w-6xl max-h-[90vh]">
            {/* Image Display */}
            {currentMedia?.type !== 'video' && currentMedia?.url && (
              <Image
                src={currentMedia.url}
                alt={currentMedia.filename || 'Event media'}
                fill
                className="object-contain"
                unoptimized
              />
            )}

            {/* Video Display */}
            {currentMedia?.type === 'video' && currentMedia?.videoUrl && currentMedia?.videoProvider && (() => {
              const videoId = extractVideoId(currentMedia.videoUrl, currentMedia.videoProvider);
              if (!videoId) return null;

              return (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="w-full max-w-5xl aspect-video border-2" style={{ borderColor: "var(--win95-border)" }}>
                    <iframe
                      src={getVideoEmbedUrl(videoId, currentMedia.videoProvider, currentMedia.loop, currentMedia.autostart)}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Image Counter */}
          {validMedia.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 border-2" style={{
              background: "var(--primary)",
              borderColor: "var(--win95-border)",
              color: "white"
            }}>
              {currentIndex + 1} / {validMedia.length}
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default MediaGallery;
