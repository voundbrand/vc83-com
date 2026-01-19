"use client"

import { Navigation } from "@/components/navigation"
import { CommissionCard } from "@/components/commission-card"
import { SidebarFilters } from "@/components/sidebar-filters"
import { CreateCommissionDialog } from "@/components/create-commission-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Search } from 'lucide-react'
import { useState } from "react"

const mockCommissions = [
  {
    id: "1",
    title: "Vermittlung von Web-Entwicklern",
    description:
      "Suche qualifizierte Web-Entwickler für meine Projekte. Spezialisierung auf React, Next.js und TypeScript erwünscht.",
    category: "Software",
    commission: "10% Provision",
    requirements: "Mindestens 2 Jahre Erfahrung, Portfolio erforderlich",
    memberName: "Anna Schmidt",
    memberAvatar: "/diverse-woman-portrait.png",
    memberInitials: "AS",
  },
  {
    id: "2",
    title: "Partner für Marketing-Kampagnen",
    description:
      "Biete lukrative Provision für die Vermittlung von Neukunden für unsere Marketing-Agentur. Spezialisiert auf Performance-Marketing.",
    category: "Marketing",
    commission: "15% Provision",
    requirements: "Netzwerk im B2B-Bereich, erste Erfahrung im Vertrieb",
    memberName: "Michael Weber",
    memberAvatar: "/man.jpg",
    memberInitials: "MW",
  },
  {
    id: "3",
    title: "Startup-Berater gesucht",
    description:
      "Vermittle erfahrene Berater an Startups in unserer Region. Schwerpunkte: Geschäftsmodellentwicklung, Finanzierung, Skalierung.",
    category: "Beratung",
    commission: "12% Provision",
    requirements: "Berufserfahrung im Startup-Ökosystem, gutes Netzwerk",
    memberName: "Sarah Müller",
    memberAvatar: "/professional-woman.png",
    memberInitials: "SM",
  },
  {
    id: "4",
    title: "Design-Projekte vermitteln",
    description:
      "Suche Designer für verschiedene Projekte: Branding, UI/UX, Printdesign. Faire Provisionen für erfolgreiche Vermittlungen.",
    category: "Design",
    commission: "8% Provision",
    requirements: "Portfolio mit mindestens 5 Projekten, Referenzen",
    memberName: "Thomas Klein",
    memberAvatar: "/diverse-designers-brainstorming.png",
    memberInitials: "TK",
  },
  {
    id: "5",
    title: "Steuerberater für Startups",
    description:
      "Vermittle Steuerberater mit Startup-Expertise. Besonders gefragt: Beratung zu Fördermitteln und Rechtsformen.",
    category: "Buchhaltung",
    commission: "20% Provision",
    requirements: "Erfahrung mit Startups, Kenntnis Förderprogramme",
    memberName: "Julia Fischer",
    memberAvatar: "/diverse-user-avatars.png",
    memberInitials: "JF",
  },
]

const categories = [
  "Alle",
  "Software",
  "Marketing",
  "Design",
  "Beratung",
  "Buchhaltung",
]

export default function ProvisionenPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  const filteredCommissions = mockCommissions.filter((commission) => {
    const matchesSearch =
      commission.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      commission.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory =
      selectedCategories.length === 0 ||
      selectedCategories.includes(commission.category)
    return matchesSearch && matchesCategory
  })

  return (
    <>
      <Navigation />
      <div className="container mx-auto py-8">
        <div className="flex gap-8">
          <aside className="w-64 flex-shrink-0">
            <SidebarFilters
              categories={categories}
              selectedCategories={selectedCategories}
              onCategoryChange={setSelectedCategories}
            />
          </aside>

          <main className="flex-1">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-3xl font-bold text-foreground">
                Provisionen
              </h1>
              <Button
                onClick={() => setIsCreateDialogOpen(true)}
                className="bg-accent hover:bg-accent/90 text-accent-foreground"
              >
                <Plus className="w-4 h-4 mr-2" />
                Provision erstellen
              </Button>
            </div>

            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                <Input
                  type="text"
                  placeholder="Provisionen durchsuchen..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="grid gap-4">
              {filteredCommissions.map((commission) => (
                <CommissionCard key={commission.id} {...commission} />
              ))}
              {filteredCommissions.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  Keine Provisionen gefunden
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

      <CreateCommissionDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />
    </>
  )
}
