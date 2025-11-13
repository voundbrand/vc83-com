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

                  return index === currentIndex ? (
                    <iframe
                      key={`${provider}-${item.id}-${currentIndex}`}
                      src={embedUrl}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      title={item.alt || `Video ${index + 1}`}
                    />
                  ) : null;
                } else {
                  // Direct video file - use video tag
                  return (
                    <video
                      key={`video-${item.id}-${currentIndex}`}
                      ref={index === currentIndex ? videoRef : null}
                      src={item.url}
                      className="w-full h-full object-cover"
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
