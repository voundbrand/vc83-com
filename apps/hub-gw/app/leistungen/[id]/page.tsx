"use client"

import { use } from "react"
import Link from "next/link"
import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ArrowLeft, Star, MapPin, Mail, Building2, User } from "lucide-react"
import { useData } from "@/lib/data-context"

export default function LeistungDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { leistungen } = useData()
  const leistung = leistungen.find((l) => l.id === id)

  if (!leistung) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="mx-auto max-w-7xl px-4 pt-24 pb-12 sm:px-6 lg:px-8">
          <p className="text-muted-foreground">Leistung nicht gefunden.</p>
          <Link href="/leistungen">
            <Button variant="ghost" className="mt-4 gap-2">
              <ArrowLeft className="h-4 w-4" />
              Zurück zu Leistungen
            </Button>
          </Link>
        </main>
      </div>
    )
  }

  const initials = leistung.provider.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="mx-auto max-w-7xl px-4 pt-24 pb-12 sm:px-6 lg:px-8">
        <Link href="/leistungen">
          <Button variant="ghost" className="mb-6 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Zurück zu Leistungen
          </Button>
        </Link>

        <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
          {/* Main Content */}
          <div className="space-y-6">
            <div>
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <Badge variant="secondary">{leistung.category}</Badge>
                <div className="flex items-center gap-1 text-amber-500">
                  <Star className="h-4 w-4 fill-current" />
                  <span className="font-medium">{leistung.rating}</span>
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  {leistung.location}
                </div>
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                {leistung.title}
              </h1>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Beschreibung</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="leading-relaxed text-muted-foreground">
                  {leistung.fullDescription || leistung.description}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Skills & Kompetenzen</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {leistung.skills.map((skill) => (
                    <Badge key={skill} variant="outline" className="px-3 py-1 text-sm">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {leistung.hourlyRate && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Preisgestaltung</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-lg bg-muted p-4">
                    <p className="text-sm text-muted-foreground">Stundensatz</p>
                    <p className="text-2xl font-bold text-foreground">
                      {leistung.hourlyRate}/h
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
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
                    <p className="font-semibold text-foreground">{leistung.provider.name}</p>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      {leistung.provider.type === "startup" ? (
                        <Building2 className="h-3.5 w-3.5" />
                      ) : (
                        <User className="h-3.5 w-3.5" />
                      )}
                      <span>
                        {leistung.provider.type === "startup" ? "Unternehmen" : "Person"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  {leistung.location}
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
                    <p className="text-2xl font-bold text-foreground">{leistung.views || 0}</p>
                    <p className="text-xs text-muted-foreground">Aufrufe</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{leistung.clicks || 0}</p>
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
