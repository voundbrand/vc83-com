"use client";

/**
 * MUX PLAYER WRAPPER
 *
 * A wrapper component for @mux/mux-player-react with webinar-specific features:
 * - Progress tracking
 * - Offer reveal timing
 * - Watch time analytics
 * - Engagement tracking
 */

import MuxPlayer from "@mux/mux-player-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface MuxPlayerWrapperProps {
  playbackId: string;
  registrantId?: string;
  registrationCode?: string;
  webinarId?: string;

  // Offer configuration
  offerEnabled?: boolean;
  offerRevealTime?: number; // Seconds into video when offer appears
  onOfferReveal?: () => void;

  // Tracking callbacks
  onJoin?: () => void;
  onProgress?: (currentTime: number, totalWatchTime: number) => void;
  onLeave?: (totalWatchTime: number, maxPosition: number) => void;

  // Styling
  className?: string;

  // Player options
  autoPlay?: boolean;
  muted?: boolean;
  poster?: string;
  title?: string;
  accentColor?: string;
  primaryColor?: string;

  // Mux Data
  envKey?: string;
  metadata?: Record<string, string>;
}

export function MuxPlayerWrapper({
  playbackId,
  registrantId,
  registrationCode,
  webinarId,
  offerEnabled = false,
  offerRevealTime,
  onOfferReveal,
  onJoin,
  onProgress,
  onLeave,
  className,
  autoPlay = false,
  muted = false,
  poster,
  title,
  accentColor = "#6B46C1",
  primaryColor,
  envKey,
  metadata,
}: MuxPlayerWrapperProps) {
  const playerRef = useRef<HTMLVideoElement | null>(null);
  const [hasJoined, setHasJoined] = useState(false);
  const [totalWatchTime, setTotalWatchTime] = useState(0);
  const [maxPosition, setMaxPosition] = useState(0);
  const [offerRevealed, setOfferRevealed] = useState(false);
  const lastProgressTime = useRef(0);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Track join event
  const handlePlay = useCallback(() => {
    if (!hasJoined) {
      setHasJoined(true);
      onJoin?.();

      // Start progress tracking interval
      progressIntervalRef.current = setInterval(() => {
        if (playerRef.current) {
          const currentTime = playerRef.current.currentTime || 0;
          const timeDelta = currentTime - lastProgressTime.current;

          // Only count positive time (not seeking backwards)
          if (timeDelta > 0 && timeDelta < 5) {
            setTotalWatchTime((prev) => prev + timeDelta);
          }

          lastProgressTime.current = currentTime;
          setMaxPosition((prev) => Math.max(prev, currentTime));
        }
      }, 1000);
    }
  }, [hasJoined, onJoin]);

  // Track time update for offer reveal
  const handleTimeUpdate = useCallback(
    (event: Event) => {
      const target = event.target as HTMLVideoElement;
      const currentTime = target.currentTime;

      // Check if we should reveal the offer
      if (
        offerEnabled &&
        offerRevealTime !== undefined &&
        currentTime >= offerRevealTime &&
        !offerRevealed
      ) {
        setOfferRevealed(true);
        onOfferReveal?.();
      }

      // Update max position
      setMaxPosition((prev) => Math.max(prev, currentTime));
    },
    [offerEnabled, offerRevealTime, offerRevealed, onOfferReveal]
  );

  // Track leave/pause
  const handlePause = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);

  // Send progress updates periodically
  useEffect(() => {
    if (!hasJoined || !onProgress) return;

    const progressReportInterval = setInterval(() => {
      const currentTime = playerRef.current?.currentTime || 0;
      onProgress(currentTime, totalWatchTime);
    }, 30000); // Report every 30 seconds

    return () => clearInterval(progressReportInterval);
  }, [hasJoined, onProgress, totalWatchTime]);

  // Handle component unmount (leave tracking)
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }

      if (hasJoined && onLeave) {
        onLeave(totalWatchTime, maxPosition);
      }
    };
  }, [hasJoined, onLeave, totalWatchTime, maxPosition]);

  // Handle page visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && playerRef.current) {
        handlePause();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [handlePause]);

  // Handle beforeunload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (hasJoined && onLeave) {
        // Use sendBeacon for reliable tracking on page close
        const trackingData = {
          registrationCode,
          totalWatchTimeSeconds: Math.round(totalWatchTime),
          maxPositionSeconds: Math.round(maxPosition),
          timestamp: Date.now(),
        };

        // Attempt to send tracking data
        if (navigator.sendBeacon && webinarId) {
          navigator.sendBeacon(
            `/api/v1/webinars/${webinarId}/track/leave`,
            JSON.stringify(trackingData)
          );
        }
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasJoined, onLeave, registrationCode, webinarId, totalWatchTime, maxPosition]);

  return (
    <MuxPlayer
      ref={(el) => {
        if (el) {
          // MuxPlayer exposes the video element
          playerRef.current = el as unknown as HTMLVideoElement;
        }
      }}
      playbackId={playbackId}
      streamType="on-demand"
      autoPlay={autoPlay}
      muted={muted}
      poster={poster}
      title={title}
      accentColor={accentColor}
      primaryColor={primaryColor || accentColor}
      className={className}
      // Mux Data for analytics
      envKey={envKey}
      metadata={{
        video_id: webinarId,
        video_title: title,
        viewer_user_id: registrantId,
        ...metadata,
      }}
      // Event handlers
      onPlay={handlePlay}
      onPause={handlePause}
      onTimeUpdate={handleTimeUpdate}
      // Disable features for webinar experience
      forwardSeekOffset={10}
      backwardSeekOffset={10}
    />
  );
}

export default MuxPlayerWrapper;
