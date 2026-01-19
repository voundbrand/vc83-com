"use client"

import { Navigation } from "@/components/navigation"
import { BenefitCard } from "@/components/benefit-card"
import { SidebarFilters } from "@/components/sidebar-filters"
import { CreateBenefitModal } from "@/components/create-benefit-modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Search } from 'lucide-react'
import { useState } from "react"

const mockBenefits = [
  {
    id: "1",
    title: "50% Rabatt auf Marketing-Tools",
    description:
      "Erhalte einen exklusiven Rabatt auf unser Marketing-Automation-Tool. Perfekt für Startups und kleine Unternehmen, die ihre Online-Präsenz ausbauen möchten.",
    category: "Marketing",
    memberName: "Anna Schmidt",
    memberAvatar: "/diverse-woman-portrait.png",
    memberInitials: "AS",
  },
  {
    id: "2",
    title: "Kostenlose Rechtsberatung",
    description:
      "Erste Beratungsstunde kostenfrei für alle Mitglieder. Wir helfen bei Gründung, Vertragsrecht und allen rechtlichen Fragen rund um dein Startup.",
    category: "Beratung",
    memberName: "Michael Weber",
    memberAvatar: "/man.jpg",
    memberInitials: "MW",
  },
  {
    id: "3",
    title: "Cloud-Hosting mit 30% Nachlass",
    description:
      "Professionelles Cloud-Hosting für deine Web-Anwendungen. Skalierbar, sicher und mit deutschem Support. Spezieller Tarif für Gründungswerft-Mitglieder.",
    category: "Software",
    memberName: "Sarah Müller",
    memberAvatar: "/professional-woman.png",
    memberInitials: "SM",
  },
  {
    id: "4",
    title: "Design-Sprint Workshop",
    description:
      "5-tägiger Design-Sprint Workshop zum Mitgliedspreis. Entwickle Prototypen, teste Ideen und validiere dein Produkt mit echten Nutzern.",
    category: "Design",
    memberName: "Thomas Klein",
    memberAvatar: "/diverse-designers-brainstorming.png",
    memberInitials: "TK",
  },
  {
    id: "5",
    title: "Buchhaltungs-Software kostenlos",
    description:
      "Die ersten 12 Monate unserer Buchhaltungs-Software komplett kostenfrei. Inklusive DATEV-Schnittstelle und Steuerberater-Zugang.",
    category: "Buchhaltung",
    memberName: "Julia Fischer",
    memberAvatar: "/accountant-desk.png",
    memberInitials: "JF",
  },
  {
    id: "6",
    title: "SEO-Analyse & Optimierung",
    description:
      "Umfassende SEO-Analyse deiner Website plus Optimierungsvorschläge. Steigere deine Sichtbarkeit in Suchmaschinen nachhaltig.",
    category: "Marketing",
    memberName: "Daniel Braun",
    memberAvatar: "/marketing-expert.png",
    memberInitials: "DB",
  },
]

export default function BenefitsPage() {
  const [showCreateModal, setShowCreateModal] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container py-8">
        <div className="mb-8 space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-balance text-3xl font-bold tracking-tight text-foreground">
                Benefits für Mitglieder
              </h1>
              <p className="mt-1.5 text-muted-foreground">
                Entdecke exklusive Vorteile von unseren Mitgliedern
              </p>
            </div>
            <Button
              className="bg-accent text-accent-foreground hover:bg-accent/90"
              onClick={() => setShowCreateModal(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Neuen Benefit erstellen
            </Button>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Benefits durchsuchen..."
              className="pl-9"
            />
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <aside className="hidden lg:block">
            <SidebarFilters type="benefits" />
          </aside>

          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {mockBenefits.map((benefit) => (
              <BenefitCard key={benefit.id} {...benefit} />
            ))}
          </div>
        </div>
      </main>

      <CreateBenefitModal open={showCreateModal} onOpenChange={setShowCreateModal} />
    </div>
  )
}
