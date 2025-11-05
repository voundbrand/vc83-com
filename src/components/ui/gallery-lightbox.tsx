"use client";

import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import Image from 'next/image';

interface GalleryItem {
  id: string;
  type: 'image' | 'video';
  url: string;
  thumbnail?: string;
  alt?: string;
  loop?: boolean; // For videos - whether to loop playback
}

interface GalleryLightboxProps {
  items: GalleryItem[];
  className?: string;
}

/**
 * Extract YouTube video ID from URL
 * Supports: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID
 */
function getYouTubeVideoId(url: string): string | null {
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be')) {
      let videoId: string | null = null;

      // Handle different YouTube URL formats
      if (urlObj.hostname.includes('youtube.com')) {
        videoId = urlObj.searchParams.get('v') || urlObj.pathname.split('/embed/')[1];
      } else if (urlObj.hostname.includes('youtu.be')) {
        videoId = urlObj.pathname.substring(1);
      }

      // Remove any additional query params from video ID
      if (videoId) {
        videoId = videoId.split('?')[0].split('&')[0];
      }

      return videoId;
    }
  } catch (e) {
    console.error('Error parsing YouTube URL:', e);
  }
  return null;
}

/**
 * Convert YouTube watch URL to thumbnail URL
 * Example: https://www.youtube.com/watch?v=VIDEO_ID -> https://img.youtube.com/vi/VIDEO_ID/maxresdefault.jpg
 */
function getYouTubeThumbnail(url: string): string | null {
  const videoId = getYouTubeVideoId(url);
  if (videoId) {
    return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
  }
  return null;
}

/**
 * Convert YouTube URL to embed URL
 * Example: https://www.youtube.com/watch?v=VIDEO_ID -> https://www.youtube.com/embed/VIDEO_ID
 *
 * @param url - YouTube URL
 * @param loop - Whether to loop the video (requires playlist parameter for single videos)
 */
function getYouTubeEmbedUrl(url: string, loop = false): string | null {
  const videoId = getYouTubeVideoId(url);
  if (videoId) {
    // For YouTube loop to work on a single video, we need to add it to a playlist of itself
    // See: https://developers.google.com/youtube/player_parameters#loop
    const loopParams = loop ? `&loop=1&playlist=${videoId}` : '';
    return `https://www.youtube.com/embed/${videoId}?autoplay=1${loopParams}`;
  }
  return null;
}

/**
 * Get the appropriate thumbnail URL for a gallery item
 * Handles YouTube URLs, direct thumbnail URLs, and fallback to item URL
 */
function getThumbnailUrl(item: GalleryItem): string {
  // If explicit thumbnail is provided, use it
  if (item.thumbnail) {
    return item.thumbnail;
  }

  // For videos, try to get YouTube thumbnail
  if (item.type === 'video') {
    const ytThumbnail = getYouTubeThumbnail(item.url);
    if (ytThumbnail) {
      return ytThumbnail;
    }
  }

  // Fallback to item URL (for images)
  return item.url;
}

export const GalleryLightbox: React.FC<GalleryLightboxProps> = ({ items, className = '' }) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setSelectedIndex(null);
      } else if (e.key === 'ArrowLeft') {
        if (selectedIndex === null) return;
        setSelectedIndex((selectedIndex - 1 + items.length) % items.length);
      } else if (e.key === 'ArrowRight') {
        if (selectedIndex === null) return;
        setSelectedIndex((selectedIndex + 1) % items.length);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, items.length]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const openLightbox = (index: number) => {
    setSelectedIndex(index);
    setIsOpen(true);
  };

  const closeLightbox = () => {
    setIsOpen(false);
    setSelectedIndex(null);
  };

  const goToNext = () => {
    if (selectedIndex === null) return;
    setSelectedIndex((selectedIndex + 1) % items.length);
  };

  const goToPrevious = () => {
    if (selectedIndex === null) return;
    setSelectedIndex((selectedIndex - 1 + items.length) % items.length);
  };

  if (!items || items.length === 0) return null;

  const currentItem = selectedIndex !== null ? items[selectedIndex] : null;

  // Debug logging when lightbox opens
  if (currentItem && currentItem.type === 'video') {
    console.log('[Gallery Lightbox] Current video item:', {
      id: currentItem.id,
      url: currentItem.url,
      loop: currentItem.loop,
      fullItem: currentItem
    });
  }

  return (
    <>
      {/* Gallery Grid */}
      <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 ${className}`}>
        {items.map((item, index) => (
          <button
            key={item.id}
            onClick={() => openLightbox(index)}
            className="relative aspect-square overflow-hidden rounded-lg bg-gray-200 hover:opacity-90 transition-opacity cursor-pointer group"
          >
            <Image
              src={getThumbnailUrl(item)}
              alt={item.alt || `Gallery item ${index + 1}`}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
            {item.type === 'video' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 group-hover:bg-opacity-40 transition-all">
                <div className="w-12 h-12 rounded-full bg-white bg-opacity-90 flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-gray-900 ml-1"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Lightbox Modal */}
      {isOpen && currentItem && (
        <div className="fixed inset-0 z-[9999] bg-black bg-opacity-95 flex items-center justify-center">
          {/* Close Button */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 z-50 p-2 rounded-full bg-black bg-opacity-60 hover:bg-opacity-80 transition-all text-white border border-white border-opacity-30"
            aria-label="Close"
          >
            <X size={24} />
          </button>

          {/* Counter */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 text-white text-sm font-medium bg-black bg-opacity-60 px-4 py-2 rounded-full border border-white border-opacity-30">
            {(selectedIndex ?? 0) + 1} / {items.length}
          </div>

          {/* Previous Button */}
          <button
            onClick={goToPrevious}
            className="absolute left-4 z-50 p-3 rounded-full bg-black bg-opacity-60 hover:bg-opacity-80 transition-all text-white disabled:opacity-50 border border-white border-opacity-30"
            aria-label="Previous"
          >
            <ChevronLeft size={32} />
          </button>

          {/* Next Button */}
          <button
            onClick={goToNext}
            className="absolute right-4 z-50 p-3 rounded-full bg-black bg-opacity-60 hover:bg-opacity-80 transition-all text-white disabled:opacity-50 border border-white border-opacity-30"
            aria-label="Next"
          >
            <ChevronRight size={32} />
          </button>

          {/* Media Content */}
          <div className="w-full h-full flex items-center justify-center p-8 md:p-16">
            {currentItem.type === 'image' ? (
              <div className="relative w-full h-full max-w-6xl max-h-[90vh]">
                <Image
                  src={currentItem.url}
                  alt={currentItem.alt || `Gallery item ${(selectedIndex ?? 0) + 1}`}
                  fill
                  className="object-contain"
                  sizes="100vw"
                  priority
                />
              </div>
            ) : (() => {
              // Check if it's a YouTube video
              const youtubeEmbedUrl = getYouTubeEmbedUrl(currentItem.url, currentItem.loop);

              if (youtubeEmbedUrl) {
                // YouTube video - use iframe
                return (
                  <iframe
                    src={youtubeEmbedUrl}
                    className="max-w-6xl max-h-[90vh] w-full aspect-video"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title={currentItem.alt || `Video ${(selectedIndex ?? 0) + 1}`}
                  />
                );
              } else {
                // Regular video file - use video tag
                return (
                  <video
                    src={currentItem.url}
                    controls
                    autoPlay
                    loop={currentItem.loop ?? false}
                    className="max-w-6xl max-h-[90vh] w-full h-full object-contain"
                  >
                    Your browser does not support the video tag.
                  </video>
                );
              }
            })()}
          </div>

          {/* Click outside to close */}
          <div
            className="absolute inset-0 -z-10"
            onClick={closeLightbox}
            aria-label="Close lightbox"
          />
        </div>
      )}
    </>
  );
};
