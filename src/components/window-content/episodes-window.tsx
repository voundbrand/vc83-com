"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Doc } from "../../../convex/_generated/dataModel";
import { EpisodeCard } from "@/components/episode-card";

export function EpisodesWindow() {
  // Guest access enabled - no auth required for published episodes
  const episodes = useQuery(api.app_podcasting.getEpisodes, {});

  if (episodes === undefined) {
    return (
      <div className="flex flex-col h-full items-center justify-center">
        <div className="animate-pulse" style={{ color: 'var(--win95-text)' }}>Loading episodes...</div>
      </div>
    );
  }

  if (episodes.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="text-center mb-4 flex-shrink-0">
          <h2 className="font-pixel text-lg" style={{ color: 'var(--win95-text)' }}>EPISODE ARCHIVE</h2>
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-2 flex items-center justify-center">
          <div className="text-center">
            <p className="mb-2">No episodes available yet.</p>
            <p className="text-sm">Check back soon for our first episode!</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="text-center mb-4 flex-shrink-0">
        <h2 className="font-pixel text-lg" style={{ color: 'var(--win95-text)' }}>EPISODE ARCHIVE</h2>
        <p className="text-xs mt-1">{episodes.length} episode{episodes.length !== 1 ? 's' : ''} available</p>
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        <div className="grid md:grid-cols-2 gap-4 min-w-[650px]">
          {episodes.map((episode: Doc<"app_podcasting">) => (
            <EpisodeCard
              key={episode._id}
              title={`Ep. ${episode.episodeNumber}: ${episode.title}`}
              description={episode.description}
              date={new Date(episode.publishDate).toLocaleDateString("en-US", {
                month: "short",
                year: "numeric",
              }).toUpperCase()}
              audioUrl={episode.audioUrl}
              embedUrl={episode.embedUrl}
              duration={episode.duration}
            />
          ))}
        </div>
      </div>
    </div>
  );
}