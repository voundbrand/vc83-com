"use client"

import { RetroWindow } from "./retro-window"
import { RetroButton } from "./retro-button"

interface EpisodeCardProps {
  title: string
  description: string
  date: string
  audioUrl?: string
}

export function EpisodeCard({ title, description, date }: EpisodeCardProps) {
  return (
    <RetroWindow title="Episode File" className="w-full">
      <div className="space-y-3">
        <h3 className="font-pixel text-sm text-purple-600 dark:text-purple-400">{title}</h3>
        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{description}</p>

        {/* Retro Audio Player Placeholder */}
        <div className="bg-black p-3 border-2 inset border-gray-400">
          <div className="flex items-center gap-2 text-green-400 font-mono text-xs">
            <span>♪</span>
            <div className="flex-1 bg-gray-800 h-2 rounded-none">
              <div className="bg-green-400 h-full w-1/3"></div>
            </div>
            <span>00:42 / 02:15</span>
          </div>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-500 font-pixel">{date}</span>
          <div className="flex gap-2">
            <RetroButton size="sm">PLAY</RetroButton>
            <RetroButton size="sm" variant="secondary">
              DOWNLOAD
            </RetroButton>
          </div>
        </div>
      </div>
    </RetroWindow>
  )
}