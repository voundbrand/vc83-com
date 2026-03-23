"use client"

import { use } from "react"
import Link from "next/link"
import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ArrowLeft, TrendingUp, Mail, Building2, User } from "lucide-react"
import { useData } from "@/lib/data-context"

const processSteps = [
  { step: 1, title: "Kontakt herstellen", description: "Nehmen Sie Kontakt mit dem Anbieter auf und besprechen Sie die Details." },
  { step: 2, title: "Vermittlung einleiten", description: "Leiten Sie den potenziellen Kunden oder Kandidaten an den Anbieter weiter." },
  { step: 3, title: "Dokumentation", description: "Dokumentieren Sie die Vermittlung über die Plattform." },
  { step: 4, title: "Prüfung", description: "Der Anbieter prüft und bestätigt die erfolgreiche Vermittlung." },
  { step: 5, title: "Auszahlung", description: "Die Provision wird nach erfolgreicher Vermittlung ausgezahlt." },
  { step: 6, title: "Bewertung", description: "Bewerten Sie die Zusammenarbeit und helfen Sie anderen Mitgliedern." },
]

export default function ProvisionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { provisionen } = useData()
  const provision = provisionen.find((p) => p.id === id)

  if (!provision) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="mx-auto max-w-7xl px-4 pt-24 pb-12 sm:px-6 lg:px-8">
          <p className="text-muted-foreground">Provision nicht gefunden.</p>
          <Link href="/provisionen">
            <Button variant="ghost" className="mt-4 gap-2">
              <ArrowLeft className="h-4 w-4" />
              Zurück zu Provisionen
            </Button>
          </Link>
        </main>
      </div>
    )
  }

  const initials = provision.provider.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="mx-auto max-w-7xl px-4 pt-24 pb-12 sm:px-6 lg:px-8">
        <Link href="/provisionen">
          <Button variant="ghost" className="mb-6 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Zurück zu Provisionen
          </Button>
        </Link>

        <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
          {/* Main Content */}
          <div className="space-y-6">
            <div>
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <Badge variant="secondary" className="bg-primary/10 text-primary">
                  {provision.category}
                </Badge>
                <div className="flex items-center gap-1 rounded-full bg-accent px-3 py-1 text-accent-foreground">
                  <TrendingUp className="h-4 w-4" />
                  <span className="font-semibold">{provision.commission} Provision</span>
                </div>
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                {provision.title}
              </h1>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Beschreibung</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="leading-relaxed text-muted-foreground">
                  {provision.fullDescription || provision.description}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">So funktioniert die Vermittlung</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {processSteps.map(({ step, title, description }) => (
                    <div key={step} className="flex gap-4">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                        {step}
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground">{title}</h4>
                        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Anbieter</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-foreground">{provision.provider.name}</p>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      {provision.provider.type === "startup" ? (
                        <Building2 className="h-3.5 w-3.5" />
                      ) : (
                        <User className="h-3.5 w-3.5" />
                      )}
                      <span>
                        {provision.provider.type === "startup" ? "Unternehmen" : "Person"}
                      </span>
                    </div>
                  </div>
                </div>

                <Button variant="outline" className="w-full gap-2">
                  <Mail className="h-4 w-4" />
                  Anbieter kontaktieren
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-foreground">{provision.views || 0}</p>
                    <p className="text-xs text-muted-foreground">Aufrufe</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{provision.clicks || 0}</p>
                    <p className="text-xs text-muted-foreground">Klicks</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
