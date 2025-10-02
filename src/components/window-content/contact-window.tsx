import { RetroButton } from "@/components/retro-button"

export function ContactWindow() {
  return (
    <div className="min-w-[400px] max-w-[500px]">
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="font-pixel text-sm mb-2" style={{ color: 'var(--win95-highlight)' }}>JOIN THE VC83 NETWORK</h3>
          <p className="text-sm" style={{ color: 'var(--win95-text)' }}>Join for episode drops, MV deal alerts, VC tips.</p>
        </div>

        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              type="email"
              placeholder="your.email@domain.com"
              className="flex-1 px-3 py-2 border-2 text-sm font-mono retro-input"
            />
            <RetroButton>SUBSCRIBE</RetroButton>
          </div>
          <p className="text-xs text-center" style={{ color: 'var(--neutral-gray)' }}>No spam, just pure VC insights from the Baltic coast.</p>
        </div>

        <div className="border-t pt-4" style={{ borderColor: 'var(--win95-border)' }}>
          <h4 className="font-pixel text-xs mb-3" style={{ color: 'var(--win95-highlight)' }}>CONNECT</h4>
          <div className="space-y-2 text-sm" style={{ color: 'var(--win95-text)' }}>
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
