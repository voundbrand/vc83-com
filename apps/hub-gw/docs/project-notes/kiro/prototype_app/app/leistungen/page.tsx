"use client"

import { Navigation } from "@/components/navigation"
import { ServiceCard } from "@/components/service-card"
import { SidebarFilters } from "@/components/sidebar-filters"
import { Input } from "@/components/ui/input"
import { Search } from 'lucide-react'

const mockServices = [
  {
    id: "1",
    title: "Webdesign & Entwicklung",
    description:
      "Ich erstelle moderne, responsive Websites und Web-Applikationen. Von der Konzeption über das Design bis zur Entwicklung - alles aus einer Hand. Spezialisiert auf React, Next.js und TypeScript.",
    category: "Webentwicklung",
    skills: ["React", "Next.js", "TypeScript", "Tailwind CSS", "Node.js"],
    memberName: "Anna Schmidt",
    memberAvatar: "/diverse-woman-portrait.png",
    memberInitials: "AS",
    location: "Hamburg",
    rating: 4.9,
  },
  {
    id: "2",
    title: "Corporate Identity & Branding",
    description:
      "Entwicklung von einzigartigen Markenidentitäten für Startups und etablierte Unternehmen. Logo-Design, Farbkonzepte, Typografie und komplette Brand Guidelines.",
    category: "Design",
    skills: ["Logo Design", "Branding", "Adobe Creative Suite", "Figma", "Corporate Design"],
    memberName: "Michael Weber",
    memberAvatar: "/man.jpg",
    memberInitials: "MW",
    location: "Berlin",
    rating: 4.8,
  },
  {
    id: "3",
    title: "Social Media Marketing",
    description:
      "Strategische Planung und Umsetzung von Social Media Kampagnen. Content-Erstellung, Community Management und Performance-Analyse für Instagram, LinkedIn und TikTok.",
    category: "Marketing",
    skills: ["Instagram", "LinkedIn", "TikTok", "Content Creation", "Analytics"],
    memberName: "Sarah Müller",
    memberAvatar: "/professional-woman.png",
    memberInitials: "SM",
    location: "München",
    rating: 4.7,
  },
  {
    id: "4",
    title: "Steuerberatung für Gründer",
    description:
      "Spezialisierte Steuerberatung für Startups und Freiberufler. Hilfe bei Gründung, Buchhaltung, Jahresabschluss und Steueroptimierung. Digital und effizient.",
    category: "Buchhaltung",
    skills: ["Steuerberatung", "Buchhaltung", "DATEV", "Jahresabschluss", "BWA"],
    memberName: "Julia Fischer",
    memberAvatar: "/accountant-desk.png",
    memberInitials: "JF",
    location: "Frankfurt",
    rating: 5.0,
  },
  {
    id: "5",
    title: "SEO & Content Marketing",
    description:
      "Ganzheitliche SEO-Strategien für nachhaltiges Wachstum. Keyword-Recherche, On-Page Optimierung, Content-Strategie und Link-Building für bessere Rankings.",
    category: "Marketing",
    skills: ["SEO", "Content Marketing", "Google Analytics", "Keyword Research", "Link Building"],
    memberName: "Daniel Braun",
    memberAvatar: "/marketing-expert.png",
    memberInitials: "DB",
    location: "Köln",
    rating: 4.6,
  },
  {
    id: "6",
    title: "UX/UI Design & Prototyping",
    description:
      "User-zentriertes Design für digitale Produkte. Von der Nutzerforschung über Wireframes bis zu interaktiven Prototypen. Spezialisiert auf SaaS und Mobile Apps.",
    category: "Design",
    skills: ["UX Design", "UI Design", "Figma", "Prototyping", "User Research"],
    memberName: "Thomas Klein",
    memberAvatar: "/diverse-designers-brainstorming.png",
    memberInitials: "TK",
    location: "Düsseldorf",
    rating: 4.9,
  },
]

export default function LeistungenPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container py-8">
        <div className="mb-8 space-y-4">
          <div>
            <h1 className="text-balance text-3xl font-bold tracking-tight text-foreground">
              Leistungen & Produkte
            </h1>
            <p className="mt-1.5 text-muted-foreground">
              Entdecke die Skills und Dienstleistungen unserer Mitglieder
            </p>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Leistungen und Skills durchsuchen..."
              className="pl-9"
            />
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <aside className="hidden lg:block">
            <SidebarFilters type="leistungen" />
          </aside>

          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {mockServices.map((service) => (
              <ServiceCard key={service.id} {...service} />
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
