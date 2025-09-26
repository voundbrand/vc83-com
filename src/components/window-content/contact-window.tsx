import { RetroButton } from "@/components/retro-button"

export function ContactWindow() {
  return (
    <div className="min-w-[400px] max-w-[500px]">
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="font-pixel text-sm text-purple-600 mb-2">JOIN THE VC83 NETWORK</h3>
          <p className="text-sm">Join for episode drops, MV deal alerts, VC tips.</p>
        </div>

        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              type="email"
              placeholder="your.email@domain.com"
              className="flex-1 px-3 py-2 bg-white dark:bg-gray-700 border-2 border-gray-400 text-sm font-mono"
            />
            <RetroButton>SUBSCRIBE</RetroButton>
          </div>
          <p className="text-xs text-gray-500 text-center">No spam, just pure VC insights from the Baltic coast.</p>
        </div>

        <div className="border-t border-gray-400 pt-4">
          <h4 className="font-pixel text-xs text-purple-400 mb-3">CONNECT</h4>
          <div className="space-y-2 text-sm">
            <div>📧 hello@vc83.com</div>
            <div>🐦 @vc83pod</div>
            <div>💼 LinkedIn/vc83</div>
            <div>🎵 Spotify Podcasts</div>
          </div>
        </div>
      </div>
    </div>
  )
}