"use client"

import { Navigation } from "@/components/navigation"
import { ServiceCard } from "@/components/service-card"
import { SidebarFilters } from "@/components/sidebar-filters"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { useData } from "@/lib/data-context"

export default function LeistungenPage() {
  const { leistungen } = useData()

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="mx-auto max-w-7xl px-4 pt-24 pb-12 sm:px-6 lg:px-8">
        <div className="mb-8 space-y-4">
          <div>
            <h1 className="text-balance text-3xl font-bold tracking-tight text-foreground">
              Leistungen & Produkte
            </h1>
            <p className="mt-1.5 text-muted-foreground">
              Skills und Services unserer Mitglieder
            </p>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Leistungen durchsuchen..."
              className="bg-white pl-9"
            />
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <aside className="hidden lg:block">
            <SidebarFilters type="leistungen" />
          </aside>

          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {leistungen.map((leistung) => (
              <ServiceCard key={leistung.id} leistung={leistung} />
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
