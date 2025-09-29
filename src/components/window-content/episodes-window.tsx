import { EpisodeCard } from "@/components/episode-card"

export function EpisodesWindow() {
  return (
    <div className="flex flex-col h-full">
      <div className="text-center mb-4 flex-shrink-0">
        <h2 className="font-pixel text-lg text-purple-600">EPISODE ARCHIVE</h2>
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        <div className="grid md:grid-cols-2 gap-4 min-w-[650px]">
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
        <EpisodeCard
          title="Ep. 5: Maritime Tech Revolution"
          description="How MV's shipping heritage is driving innovation in maritime technology."
          date="FEB 2026"
        />
        <EpisodeCard
          title="Ep. 6: Green Energy Gold Rush"
          description="Offshore wind investments and the renewable energy startup ecosystem."
          date="MAR 2026"
        />
        <EpisodeCard
          title="Ep. 7: The Tourism Tech Frontier"
          description="Digital transformation in MV's tourism sector - from booking to blockchain."
          date="APR 2026"
        />
        <EpisodeCard
          title="Ep. 8: University Spinoffs"
          description="How Rostock and Greifswald universities are breeding grounds for startups."
          date="MAY 2026"
        />
        </div>
      </div>
    </div>
  )
}