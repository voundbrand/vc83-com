"use client";

import { RetroWindow } from "./retro-window";
import { RetroButton } from "./retro-button";

interface EpisodeCardProps {
  title: string;
  description: string;
  date: string;
  audioUrl?: string;
  embedUrl?: string;
  duration?: number;
}

function formatDuration(seconds?: number): string {
  if (!seconds) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function EpisodeCard({
  title,
  description,
  date,
  audioUrl,
  embedUrl,
  duration,
}: EpisodeCardProps) {
  const handlePlay = () => {
    if (audioUrl) {
      window.open(audioUrl, "_blank");
    } else if (embedUrl) {
      window.open(embedUrl, "_blank");
    }
  };

  const handleDownload = () => {
    if (audioUrl) {
      window.open(audioUrl, "_blank");
    }
  };

  return (
    <RetroWindow title="Episode File" className="w-full">
      <div className="space-y-3">
        <h3 className="font-pixel text-sm" style={{ color: 'var(--win95-text)' }}>{title}</h3>
        <p className="text-sm leading-relaxed">{description}</p>

        {/* Retro Audio Player Placeholder */}
        <div
          className="p-3 border-2 inset"
          style={{
            background: 'var(--audio-player-bg)',
            borderColor: 'var(--win95-border)'
          }}
        >
          <div
            className="flex items-center gap-2 font-mono text-xs"
            style={{ color: 'var(--audio-player-text)' }}
          >
            <span>♪</span>
            <div
              className="flex-1 h-2 rounded-none"
              style={{ background: 'var(--audio-player-track-bg)' }}
            >
              <div
                className="h-full w-0"
                style={{ background: 'var(--audio-player-progress)' }}
              ></div>
            </div>
            <span>00:00 / {formatDuration(duration)}</span>
          </div>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-xs font-pixel">{date}</span>
          <div className="flex gap-2">
            <RetroButton
              size="sm"
              onClick={handlePlay}
              disabled={!audioUrl && !embedUrl}
            >
              PLAY
            </RetroButton>
            <RetroButton
              size="sm"
              variant="secondary"
              onClick={handleDownload}
              disabled={!audioUrl}
            >
              DOWNLOAD
            </RetroButton>
          </div>
        </div>
      </div>
    </RetroWindow>
  );
}