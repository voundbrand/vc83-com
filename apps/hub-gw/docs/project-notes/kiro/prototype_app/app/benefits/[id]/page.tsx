"use client"

import { Navigation } from "@/components/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { ArrowLeft, Mail, Phone, ExternalLink, Send, Copy, Building2, User, Eye, MousePointerClick } from 'lucide-react'
import Link from "next/link"
import { notFound } from 'next/navigation'
import { RequestBenefitDialog } from "@/components/request-benefit-dialog"
import { useState } from "react"
import { useData } from "@/lib/data-context"

// Extended benefit data for detail view (mock data that supplements the context)
const benefitDetails: Record<string, {
  features: string[]
  conditions: string
  memberEmail: string
  memberPhone: string
}> = {
  "1": {
    features: [
      "E-Mail Marketing Automation",
      "Social Media Scheduling",
      "Landing Page Builder",
      "Analytics Dashboard",
      "A/B Testing Tools",
      "CRM Integration"
    ],
    conditions: "Der Rabatt gilt für die ersten 12 Monate. Danach regulärer Preis. Keine Mindestlaufzeit.",
    memberEmail: "info@marketingpro.de",
    memberPhone: "+49 151 12345678",
  },
  "2": {
    features: [
      "Rechtsformberatung",
      "Vertragsgestaltung",
      "Gesellschafterverträge",
      "Investment-Legal",
      "Datenschutzberatung",
      "Markenrecht"
    ],
    conditions: "Erste Beratungsstunde (60 Min.) kostenfrei. Folgetermine zum Mitgliederpreis.",
    memberEmail: "m.weber@rechtsberatung.de",
    memberPhone: "+49 160 98765432",
  },
  "3": {
    features: [
      "99.9% Uptime Garantie",
      "Automatische Backups",
      "SSL Zertifikate inklusive",
      "Deutscher Support",
      "Flexible Skalierung",
      "CDN Integration"
    ],
    conditions: "30% Nachlass dauerhaft auf alle Tarife für Gründungswerft-Mitglieder.",
    memberEmail: "sales@cloudtech.de",
    memberPhone: "+49 171 23456789",
  },
}

export default function BenefitDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { benefits } = useData()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const resolvedParams = require('react').use(params)
  
  const benefit = benefits.find((b) => b.id === resolvedParams.id)
  const details = benefitDetails[resolvedParams.id] || {
    features: ["Detaillierte Informationen werden noch ergänzt"],
    conditions: "Bitte kontaktiere den Anbieter für genaue Konditionen.",
    memberEmail: "info@example.com",
    memberPhone: "+49 123 456789",
  }

  if (!benefit) {
    notFound()
  }

  const copyCode = () => {
    if (benefit.redemptionCode) {
      navigator.clipboard.writeText(benefit.redemptionCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const providerInitials = benefit.provider.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container py-8">
        <Link href="/benefits">
          <Button variant="ghost" className="mb-6 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Zurück zu Benefits
          </Button>
        </Link>

        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="space-y-6">
            <div>
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="bg-primary/10 text-primary">
                  {benefit.category}
                </Badge>
                {benefit.discount && (
                  <Badge className="bg-accent text-accent-foreground">
                    {benefit.discount} Rabatt
                  </Badge>
                )}
              </div>
              <h1 className="text-balance text-4xl font-bold tracking-tight text-foreground">
                {benefit.title}
              </h1>
              <p className="mt-3 text-lg text-muted-foreground">
                {benefit.description}
              </p>
              
              {/* Stats */}
              <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Eye className="h-4 w-4" />
                  {benefit.views || 0} Aufrufe
                </span>
                <span className="flex items-center gap-1">
                  <MousePointerClick className="h-4 w-4" />
                  {benefit.clicks || 0} Klicks
                </span>
              </div>
            </div>

            {benefit.fullDescription && (
              <Card>
                <CardHeader>
                  <h2 className="text-xl font-semibold">Beschreibung</h2>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    {benefit.fullDescription}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Redemption Instructions */}
            <Card className="border-accent/50 bg-accent/5">
              <CardHeader>
                <h2 className="text-xl font-semibold">So löst du den Benefit ein</h2>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground leading-relaxed">
                  {benefit.redemptionInstructions || "Kontaktiere den Anbieter direkt, um diesen Benefit zu nutzen. Erwähne dabei deine Gründungswerft-Mitgliedschaft."}
                </p>
                
                {benefit.redemptionCode && (
                  <div className="flex items-center gap-3 rounded-lg border bg-card p-4">
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Dein Rabattcode:</p>
                      <p className="font-mono text-lg font-semibold text-foreground">
                        {benefit.redemptionCode}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={copyCode}>
                      <Copy className="mr-2 h-4 w-4" />
                      {copied ? "Kopiert!" : "Kopieren"}
                    </Button>
                  </div>
                )}
                
                {benefit.redemptionLink && (
                  <Button asChild className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                    <a href={benefit.redemptionLink} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Jetzt einlösen
                    </a>
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h2 className="text-xl font-semibold">Features & Leistungen</h2>
              </CardHeader>
              <CardContent>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {details.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <div className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent" />
                      <span className="text-sm text-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h2 className="text-xl font-semibold">Bedingungen</h2>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{details.conditions}</p>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="sticky top-6">
              <CardHeader>
                <h2 className="text-xl font-semibold">Anbieter</h2>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={benefit.provider.avatar || benefit.image} alt={benefit.provider.name} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {providerInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">{benefit.provider.name}</p>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      {benefit.provider.type === 'startup' ? (
                        <>
                          <Building2 className="h-3.5 w-3.5" />
                          <span>Startup</span>
                        </>
                      ) : (
                        <>
                          <User className="h-3.5 w-3.5" />
                          <span>Mitglied</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {benefit.provider.profileLink && (
                  <Button variant="outline" className="w-full justify-start gap-2" asChild>
                    <a href={benefit.provider.profileLink} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                      Gründungswerft Profil ansehen
                    </a>
                  </Button>
                )}

                <div className="space-y-3">
                  <Button 
                    className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
                    onClick={() => setDialogOpen(true)}
                  >
                    <Send className="mr-2 h-4 w-4" />
                    Benefit anfragen
                  </Button>
                  
                  <div className="space-y-2">
                    <Button variant="outline" className="w-full justify-start gap-2" asChild>
                      <a href={`mailto:${details.memberEmail}`}>
                        <Mail className="h-4 w-4" />
                        {details.memberEmail}
                      </a>
                    </Button>
                    <Button variant="outline" className="w-full justify-start gap-2" asChild>
                      <a href={`tel:${details.memberPhone}`}>
                        <Phone className="h-4 w-4" />
                        {details.memberPhone}
                      </a>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <RequestBenefitDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        benefitTitle={benefit.title}
        benefitId={benefit.id}
      />
    </div>
  )
}
