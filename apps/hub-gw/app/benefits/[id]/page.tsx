"use client"

import { use } from "react"
import Link from "next/link"
import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ArrowLeft, Copy, ExternalLink, Mail, Building2, User } from "lucide-react"
import { useData } from "@/lib/data-context"

export default function BenefitDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { benefits } = useData()
  const benefit = benefits.find((b) => b.id === id)

  if (!benefit) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="mx-auto max-w-7xl px-4 pt-24 pb-12 sm:px-6 lg:px-8">
          <p className="text-muted-foreground">Benefit nicht gefunden.</p>
          <Link href="/benefits">
            <Button variant="ghost" className="mt-4 gap-2">
              <ArrowLeft className="h-4 w-4" />
              Zurück zu Benefits
            </Button>
          </Link>
        </main>
      </div>
    )
  }

  const initials = benefit.provider.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="mx-auto max-w-7xl px-4 pt-24 pb-12 sm:px-6 lg:px-8">
        <Link href="/benefits">
          <Button variant="ghost" className="mb-6 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Zurück zu Benefits
          </Button>
        </Link>

        <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
          {/* Main Content */}
          <div className="space-y-6">
            <div>
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <Badge variant="secondary" className="bg-primary/10 text-primary">
                  {benefit.category}
                </Badge>
                {benefit.discount && (
                  <Badge className="bg-accent text-accent-foreground">
                    {benefit.discount} Rabatt
                  </Badge>
                )}
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                {benefit.title}
              </h1>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Beschreibung</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="leading-relaxed text-muted-foreground">
                  {benefit.fullDescription || benefit.description}
                </p>
              </CardContent>
            </Card>

            {benefit.redemptionInstructions && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">So lösen Sie den Benefit ein</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="leading-relaxed text-muted-foreground">
                    {benefit.redemptionInstructions}
                  </p>

                  {benefit.redemptionCode && (
                    <div className="flex items-center gap-3 rounded-lg bg-muted p-4">
                      <code className="flex-1 text-lg font-mono font-semibold text-foreground">
                        {benefit.redemptionCode}
                      </code>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          navigator.clipboard.writeText(benefit.redemptionCode!)
                        }
                      >
                        <Copy className="mr-2 h-4 w-4" />
                        Kopieren
                      </Button>
                    </div>
                  )}

                  {benefit.redemptionLink && (
                    <a
                      href={benefit.redemptionLink}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button className="gap-2">
                        <ExternalLink className="h-4 w-4" />
                        Benefit einlösen
                      </Button>
                    </a>
                  )}
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
                    <p className="font-semibold text-foreground">{benefit.provider.name}</p>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      {benefit.provider.type === "startup" ? (
                        <Building2 className="h-3.5 w-3.5" />
                      ) : (
                        <User className="h-3.5 w-3.5" />
                      )}
                      <span>
                        {benefit.provider.type === "startup" ? "Unternehmen" : "Person"}
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
                    <p className="text-2xl font-bold text-foreground">{benefit.views || 0}</p>
                    <p className="text-xs text-muted-foreground">Aufrufe</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{benefit.clicks || 0}</p>
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
