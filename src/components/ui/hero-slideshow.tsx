"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { extractVideoId, getVideoEmbedUrl, detectVideoProvider, type VideoProvider } from '@/lib/video-utils';

interface SlideItem {
  id: string;
  type: 'image' | 'video';
  url: string;
  thumbnail?: string;
  alt?: string;
  loop?: boolean;
  autostart?: boolean;
  videoProvider?: VideoProvider;
  /** Video display mode: 'cover' fills container (may crop), 'contain' shows full video (may letterbox) */
  videoFit?: 'cover' | 'contain';
}

interface HeroSlideshowProps {
  items: SlideItem[];
  autoPlayInterval?: number; // milliseconds
  className?: string;
}

export function HeroSlideshow({
  items,
  autoPlayInterval = 5000,
  className = ''
}: HeroSlideshowProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const currentItem = items[currentIndex];
  const isVideo = currentItem?.type === 'video';
  const isCurrentVideoAutostart = isVideo && currentItem?.autostart;
  const isCurrentVideoLoop = isVideo && currentItem?.loop;

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % items.length);
    setIsVideoPlaying(false);
  }, [items.length]);

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
    setIsVideoPlaying(false);
  }, [items.length]);

  const goToSlide = useCallback((index: number) => {
    setCurrentIndex(index);
    setIsVideoPlaying(false);
  }, []);

  // Handle video autoplay behavior when slide changes
  useEffect(() => {
    if (isVideo && isCurrentVideoAutostart && videoRef.current) {
      // Play the video when it becomes visible
      videoRef.current.play().catch(err => {
        console.log('Video autoplay prevented:', err);
      });
      setIsVideoPlaying(true);
    }
  }, [currentIndex, isVideo, isCurrentVideoAutostart]);

  // Auto-play functionality for slideshow
  useEffect(() => {
    if (!isPlaying || items.length <= 1) return;

    // Don't auto-advance if:
    // 1. A video is currently playing (user interaction or autostart video)
    // 2. Current item is a looping video (stays indefinitely)
    if (isVideoPlaying || isCurrentVideoLoop) {
      return;
    }

    const interval = setInterval(() => {
      goToNext();
    }, autoPlayInterval);

    return () => clearInterval(interval);
  }, [isPlaying, goToNext, autoPlayInterval, items.length, isVideoPlaying, isCurrentVideoLoop]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goToPrevious();
      if (e.key === 'ArrowRight') goToNext();
      if (e.key === ' ') {
        e.preventDefault();
        setIsPlaying(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNext, goToPrevious]);

  if (!items || items.length === 0) {
    return null;
  }


  return (
    <div className={`relative w-full h-full ${className}`}>
      {/* Slideshow Container */}
      <div className="absolute inset-0 w-full h-full">
        {items.map((item, index) => (
          <div
            key={item.id}
            className={`absolute inset-0 w-full h-full transition-opacity duration-700 ${
              index === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'
            }`}
          >
            {item.type === 'video' ? (
              (() => {
                // Detect provider if not already set
                const provider = item.videoProvider || detectVideoProvider(item.url);

                // Extract video ID
                const videoId = extractVideoId(item.url, provider);

                if (videoId && (provider === 'youtube' || provider === 'vimeo')) {
                  // YouTube/Vimeo video - use iframe with video-utils
                  const embedUrl = getVideoEmbedUrl(
                    videoId,
                    provider,
                    item.loop ?? false,
                    item.autostart ?? false
                  );

                  // Default to 'cover' if not specified
                  const fitMode = item.videoFit ?? 'cover';

                  return index === currentIndex ? (
                    <div className="absolute inset-0 w-full h-full overflow-hidden bg-black flex items-center justify-center">
                      {fitMode === 'contain' ? (
                        // Contain mode: Show full video with letterboxing (black bars)
                        // Uses aspect-video to maintain 16:9 ratio within the container
                        <iframe
                          key={`${provider}-${item.id}-${currentIndex}`}
                          src={embedUrl}
                          className="w-full h-full max-w-full max-h-full pointer-events-auto"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          title={item.alt || `Video ${index + 1}`}
                          style={{
                            border: 'none',
                            aspectRatio: '16 / 9',
                            objectFit: 'contain',
                          }}
                        />
                      ) : (
                        // Cover mode: Fill container, may crop video
                        // Scale video to cover container without black bars (like object-fit: cover)
                        // The trick: make iframe larger than container and center it
                        // For 16:9 video to cover any container, we need:
                        // - Width to be at least container width
                        // - Height to be at least container height
                        // - Maintain 16:9 ratio (1.7778)
                        <iframe
                          key={`${provider}-${item.id}-${currentIndex}`}
                          src={embedUrl}
                          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          title={item.alt || `Video ${index + 1}`}
                          style={{
                            border: 'none',
                            // Cover simulation using viewport-relative sizing
                            // This ensures the 16:9 video fills any container aspect ratio
                            width: '177.78vh', // 100vh * 16/9 - works when container is taller than 16:9
                            height: '56.25vw', // 100vw * 9/16 - works when container is wider than 16:9
                            minWidth: '100%',
                            minHeight: '100%',
                          }}
                        />
                      )}
                    </div>
                  ) : null;
                } else {
                  // Direct video file - use video tag
                  const fitMode = item.videoFit ?? 'cover';
                  return (
                    <div className="w-full h-full bg-black flex items-center justify-center">
                      <video
                        key={`video-${item.id}-${currentIndex}`}
                        ref={index === currentIndex ? videoRef : null}
                        src={item.url}
                        className={`w-full h-full ${fitMode === 'contain' ? 'object-contain' : 'object-cover'}`}
                        autoPlay={item.autostart ?? false}
                        loop={item.loop ?? false}
                        muted
                        playsInline
                        onPlay={() => setIsVideoPlaying(true)}
                        onPause={() => setIsVideoPlaying(false)}
                        onEnded={() => {
                          setIsVideoPlaying(false);
                          // If video has autostart but not loop, advance to next slide when it ends
                          if (item.autostart && !item.loop && index === currentIndex) {
                            goToNext();
                          }
                        }}
                      />
                    </div>
                  );
                }
              })()
            ) : (
              <Image
                src={item.url}
                alt={item.alt || `Slide ${index + 1}`}
                fill
                className="object-cover"
                priority={index === 0}
                sizes="100vw"
              />
            )}
          </div>
        ))}
      </div>

      {/* Navigation Controls - Only show if multiple items */}
      {items.length > 1 && (
        <>
          {/* Previous/Next Buttons */}
          <button
            onClick={goToPrevious}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-all backdrop-blur-sm"
            aria-label="Previous slide"
          >
            <ChevronLeft size={24} />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-all backdrop-blur-sm"
            aria-label="Next slide"
          >
            <ChevronRight size={24} />
          </button>

          {/* Play/Pause Button */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="absolute bottom-4 right-4 z-20 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-all backdrop-blur-sm"
            aria-label={isPlaying ? 'Pause slideshow' : 'Play slideshow'}
          >
            {isPlaying ? <Pause size={20} /> : <Play size={20} />}
          </button>

          {/* Slide Indicators */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
            {items.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentIndex
                    ? 'bg-white w-8'
                    : 'bg-white/50 hover:bg-white/75'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </>
      )}

      {/* Slide Counter */}
      {items.length > 1 && (
        <div className="absolute top-4 right-4 z-20 bg-black/50 text-white px-3 py-1 rounded-full text-sm backdrop-blur-sm">
          {currentIndex + 1} / {items.length}
        </div>
      )}
    </div>
  );
}
