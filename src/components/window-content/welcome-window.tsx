"use client"

import { RetroButton } from "@/components/retro-button"

export function WelcomeWindow() {
  return (
    <div className="text-center space-y-6 min-w-[600px]">
      <div className="bg-gradient-to-b from-purple-600 to-black p-8 rounded-none -m-4 mb-4">
        <h1 className="font-pixel text-lg text-white mb-4 leading-relaxed">
          VC83: Born in '83, Betting Big on Mecklenburg-Vorpommern's Startup Gems
        </h1>
        <p className="text-white text-sm leading-relaxed max-w-2xl mx-auto">
          Raw VC truths from zero to fund one—interviews and underdog plays for Eastern Germany's rising
          scene.
        </p>
      </div>

      <div className="flex justify-center gap-4 flex-wrap">
        <RetroButton size="lg">🎧 LISTEN TO EP. 1</RetroButton>
        <RetroButton size="lg" variant="outline">
          📻 SUBSCRIBE ON SPOTIFY
        </RetroButton>
      </div>

      <div className="flex items-center justify-center gap-6 pt-4">
        <div className="w-24 h-24 bg-gray-300 border-4 border-gray-500 flex items-center justify-center">
          <span className="font-pixel text-gray-700">HOST</span>
        </div>
        <div className="text-left">
          <h3 className="font-pixel text-sm text-purple-600 mb-1">[Your Name]</h3>
          <p className="text-gray-700 text-sm">Rostock Hustler Decoding VC</p>
        </div>
      </div>
    </div>
  )
}