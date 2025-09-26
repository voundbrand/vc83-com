import { EpisodeCard } from "@/components/episode-card"

export function EpisodesWindow() {
  return (
    <div className="min-w-[700px] max-w-[800px]">
      <div className="text-center mb-6">
        <h2 className="font-pixel text-lg text-purple-600 mb-4">EPISODE ARCHIVE</h2>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <EpisodeCard
          title="Ep. 1: Legal Landmines Every Startup Can Dodge"
          description="My zero-knowledge sprint through startup legal pitfalls—cap tables, contracts, MV fixes."
          date="OCT 2025"
        />
        <EpisodeCard
          title="Ep. 2: Biotech Boom in the Baltic"
          description="Why Mecklenburg-Vorpommern is becoming Germany's unexpected biotech hub."
          date="NOV 2025"
        />
        <EpisodeCard
          title="Ep. 3: From Rostock to Unicorn"
          description="Tracking the journey of MV's most promising SaaS startups and their funding rounds."
          date="DEC 2025"
        />
        <EpisodeCard
          title="Ep. 4: Angel Networks in the East"
          description="Building investor relationships from Berlin to the Baltic Sea."
          date="JAN 2026"
        />
      </div>
    </div>
  )
}