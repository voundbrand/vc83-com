"use client"

import { RetroButton } from "@/components/retro-button"

export function SubscribeWindow() {
  const platforms = [
    {
      name: "Apple Podcasts",
      icon: "🍎",
      url: "#",
      color: "bg-gray-800 hover:bg-gray-700",
    },
    {
      name: "Spotify",
      icon: "🎵",
      url: "#",
      color: "bg-green-600 hover:bg-green-700",
    },
    {
      name: "Google Podcasts",
      icon: "🔍",
      url: "#",
      color: "bg-blue-600 hover:bg-blue-700",
    },
    {
      name: "Amazon Music",
      icon: "📦",
      url: "#",
      color: "bg-orange-600 hover:bg-orange-700",
    },
    {
      name: "Pocket Casts",
      icon: "📱",
      url: "#",
      color: "bg-red-600 hover:bg-red-700",
    },
    {
      name: "Overcast",
      icon: "☁️",
      url: "#",
      color: "bg-purple-600 hover:bg-purple-700",
    },
  ]

  return (
    <div className="p-6 space-y-6">
      <div className="text-center space-y-4">
        <div className="text-4xl">🔊</div>
        <h2 className="font-pixel text-lg text-purple-600">Subscribe to VC83</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
          Never miss an episode! Subscribe on your favorite podcast platform:
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {platforms.map((platform) => (
          <a
            key={platform.name}
            href={platform.url}
            className={`${platform.color} text-white p-3 rounded-none border-2 border-gray-500 hover:border-gray-400 transition-colors flex items-center gap-3 text-sm font-pixel`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="text-lg">{platform.icon}</span>
            <span>{platform.name}</span>
          </a>
        ))}
      </div>

      <div className="border-t-2 border-gray-300 dark:border-gray-600 pt-4 space-y-3">
        <h3 className="font-pixel text-sm text-purple-600">RSS Feed</h3>
        <div className="flex gap-2">
          <input
            type="text"
            value="https://vc83.com/feed.xml"
            readOnly
            className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border-2 border-gray-400 text-sm font-mono"
          />
          <RetroButton size="sm" onClick={() => navigator.clipboard.writeText("https://vc83.com/feed.xml")}>
            COPY
          </RetroButton>
        </div>
      </div>

      <div className="text-center">
        <p className="text-xs text-gray-500 dark:text-gray-400">🎧 Available on all major podcast platforms</p>
      </div>
    </div>
  )
}
