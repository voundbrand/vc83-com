export function AboutWindow() {
  return (
    <div className="min-w-[500px] max-w-[600px]">
      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <h3 className="font-pixel text-sm text-purple-600 mb-4">THE STORY</h3>
          <p className="text-sm leading-relaxed mb-4">
            From '83 to VC83: No cash, no experience, pure hustle. Spotlighting MV's biotech, renewables, and SaaS
            unicorns. Inspired by 20VC, building seed deal networks.
          </p>
          <p className="text-sm leading-relaxed">
            Born in 1983, I'm documenting my journey from zero to fund one while uncovering the hidden startup gems in
            Eastern Germany's most overlooked region.
          </p>
        </div>
        <div className="space-y-4">
          <h3 className="font-pixel text-sm text-purple-400">STATS & INSPIRATION</h3>
          <div className="space-y-2 text-sm">
            <div>📊 Inspired by Harry Stebbings</div>
            <div>🏢 MV's 200+ startups tracked</div>
            <div>💰 Zero-to-fund grind documented</div>
            <div>🎯 Seed deal networks building</div>
          </div>
        </div>
      </div>
    </div>
  )
}
