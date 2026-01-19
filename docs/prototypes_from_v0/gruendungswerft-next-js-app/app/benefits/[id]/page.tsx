"use client"

import { Navigation } from "@/components/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { ArrowLeft, Heart, Mail, Phone, ExternalLink, Send } from 'lucide-react'
import Link from "next/link"
import { notFound } from 'next/navigation'
import { RequestBenefitDialog } from "@/components/request-benefit-dialog"
import { useState } from "react"

const mockBenefits = [
  {
    id: "1",
    title: "50% Rabatt auf Marketing-Tools",
    description:
      "Erhalte einen exklusiven Rabatt auf unser Marketing-Automation-Tool. Perfekt für Startups und kleine Unternehmen, die ihre Online-Präsenz ausbauen möchten.",
    fullDescription:
      "Unser Marketing-Automation-Tool bietet dir alles, was du für erfolgreiches Online-Marketing brauchst. Von E-Mail-Kampagnen über Social-Media-Planung bis hin zu detaillierten Analytics – alles in einer Plattform. Als Gründungswerft-Mitglied erhältst du 50% Rabatt auf alle Tarife für die ersten 12 Monate.",
    category: "Marketing",
    memberName: "Anna Schmidt",
    memberAvatar: "/diverse-woman-portrait.png",
    memberInitials: "AS",
    memberEmail: "anna.schmidt@example.com",
    memberPhone: "+49 151 12345678",
    features: [
      "E-Mail Marketing Automation",
      "Social Media Scheduling",
      "Landing Page Builder",
      "Analytics Dashboard",
      "A/B Testing Tools",
      "CRM Integration"
    ],
    conditions: "Der Rabatt gilt für die ersten 12 Monate. Danach regulärer Preis. Keine Mindestlaufzeit.",
  },
  {
    id: "2",
    title: "Kostenlose Rechtsberatung",
    description:
      "Erste Beratungsstunde kostenfrei für alle Mitglieder. Wir helfen bei Gründung, Vertragsrecht und allen rechtlichen Fragen rund um dein Startup.",
    fullDescription:
      "Als spezialisierte Kanzlei für Startup-Recht bieten wir umfassende Beratung in allen Rechtsfragen der Gründungsphase. Von der Wahl der Rechtsform über Gesellschaftsverträge bis hin zu Investorenverträgen – wir begleiten dich kompetent durch alle rechtlichen Herausforderungen.",
    category: "Beratung",
    memberName: "Michael Weber",
    memberAvatar: "/man.jpg",
    memberInitials: "MW",
    memberEmail: "m.weber@rechtsberatung.de",
    memberPhone: "+49 160 98765432",
    features: [
      "Rechtsformberatung",
      "Vertragsgestaltung",
      "Gesellschafterverträge",
      "Investment-Legal",
      "Datenschutzberatung",
      "Markenrecht"
    ],
    conditions: "Erste Beratungsstunde (60 Min.) kostenfrei. Folgetermine zum Mitgliederpreis.",
  },
  {
    id: "3",
    title: "Cloud-Hosting mit 30% Nachlass",
    description:
      "Professionelles Cloud-Hosting für deine Web-Anwendungen. Skalierbar, sicher und mit deutschem Support. Spezieller Tarif für Gründungswerft-Mitglieder.",
    fullDescription:
      "Unser Cloud-Hosting bietet dir die perfekte Infrastruktur für deine Web-Projekte. Mit Servern in Deutschland, automatischen Backups und 24/7 Support kannst du dich voll auf dein Produkt konzentrieren. Skaliere nach Bedarf von kleinen Projekten bis zu hochverfügbaren Enterprise-Lösungen.",
    category: "Software",
    memberName: "Sarah Müller",
    memberAvatar: "/professional-woman.png",
    memberInitials: "SM",
    memberEmail: "sarah@cloudhosting.de",
    memberPhone: "+49 171 23456789",
    features: [
      "99.9% Uptime Garantie",
      "Automatische Backups",
      "SSL Zertifikate inklusive",
      "Deutscher Support",
      "Flexible Skalierung",
      "CDN Integration"
    ],
    conditions: "30% Nachlass dauerhaft auf alle Tarife für Gründungswerft-Mitglieder.",
  },
  {
    id: "4",
    title: "Design-Sprint Workshop",
    description:
      "5-tägiger Design-Sprint Workshop zum Mitgliedspreis. Entwickle Prototypen, teste Ideen und validiere dein Produkt mit echten Nutzern.",
    fullDescription:
      "In unserem intensiven 5-Tages-Workshop begleiten wir dich durch den kompletten Design-Sprint-Prozess. Von der Problem-Definition über Ideation und Prototyping bis zum User-Testing – entwickle in nur einer Woche einen getesteten Prototypen deiner Produktidee.",
    category: "Design",
    memberName: "Thomas Klein",
    memberAvatar: "/diverse-designers-brainstorming.png",
    memberInitials: "TK",
    memberEmail: "thomas.klein@designstudio.de",
    memberPhone: "+49 152 87654321",
    features: [
      "5 Tage intensiver Workshop",
      "Erfahrene Facilitatoren",
      "Alle Materialien inklusive",
      "User Testing Setup",
      "Digitaler Prototyp",
      "Follow-up Session"
    ],
    conditions: "Mitglieder zahlen €1.999 statt €3.500. Maximal 8 Teilnehmer pro Workshop.",
  },
  {
    id: "5",
    title: "Buchhaltungs-Software kostenlos",
    description:
      "Die ersten 12 Monate unserer Buchhaltungs-Software komplett kostenfrei. Inklusive DATEV-Schnittstelle und Steuerberater-Zugang.",
    fullDescription:
      "Unsere Cloud-Buchhaltungssoftware macht die Finanzverwaltung zum Kinderspiel. Erstelle Angebote und Rechnungen, verwalte Belege, erstelle BWAs und arbeite nahtlos mit deinem Steuerberater zusammen. DATEV-kompatibel und GoBD-konform.",
    category: "Buchhaltung",
    memberName: "Julia Fischer",
    memberAvatar: "/accountant-desk.png",
    memberInitials: "JF",
    memberEmail: "j.fischer@accounting-tool.de",
    memberPhone: "+49 162 11223344",
    features: [
      "Angebote & Rechnungen",
      "Belegerfassung",
      "DATEV-Export",
      "Banking Integration",
      "Umsatzsteuer-Voranmeldung",
      "Steuerberater-Zugang"
    ],
    conditions: "12 Monate kostenlos, danach €29/Monat. Jederzeit kündbar.",
  },
  {
    id: "6",
    title: "SEO-Analyse & Optimierung",
    description:
      "Umfassende SEO-Analyse deiner Website plus Optimierungsvorschläge. Steigere deine Sichtbarkeit in Suchmaschinen nachhaltig.",
    fullDescription:
      "Wir analysieren deine Website systematisch nach allen relevanten SEO-Faktoren: Technisches SEO, Content-Qualität, Backlink-Profil und vieles mehr. Du erhältst einen detaillierten Report mit priorisierten Handlungsempfehlungen und können optional die Umsetzung durch uns durchführen lassen.",
    category: "Marketing",
    memberName: "Daniel Braun",
    memberAvatar: "/marketing-expert.png",
    memberInitials: "DB",
    memberEmail: "d.braun@seo-expert.de",
    memberPhone: "+49 173 99887766",
    features: [
      "Technisches SEO Audit",
      "Content-Analyse",
      "Keyword-Recherche",
      "Competitor-Analyse",
      "Backlink-Audit",
      "Handlungsempfehlungen"
    ],
    conditions: "SEO-Audit zum Mitgliedspreis von €499 statt €899. Umsetzung optional buchbar.",
  },
]

export default function BenefitDetailPage({ params }: { params: { id: string } }) {
  const benefit = mockBenefits.find((b) => b.id === params.id)
  const [dialogOpen, setDialogOpen] = useState(false)

  if (!benefit) {
    notFound()
  }

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
              <Badge variant="secondary" className="mb-4 bg-primary/10 text-primary">
                {benefit.category}
              </Badge>
              <h1 className="text-balance text-4xl font-bold tracking-tight text-foreground">
                {benefit.title}
              </h1>
              <p className="mt-3 text-lg text-muted-foreground">
                {benefit.description}
              </p>
            </div>

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

            <Card>
              <CardHeader>
                <h2 className="text-xl font-semibold">Features & Leistungen</h2>
              </CardHeader>
              <CardContent>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {benefit.features.map((feature) => (
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
                <p className="text-sm text-muted-foreground">{benefit.conditions}</p>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="sticky top-6">
              <CardHeader>
                <h2 className="text-xl font-semibold">Kontakt</h2>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={benefit.memberAvatar || "/placeholder.svg"} alt={benefit.memberName} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {benefit.memberInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-foreground">{benefit.memberName}</p>
                    <p className="text-sm text-muted-foreground">Anbieter</p>
                  </div>
                </div>

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
                      <a href={`mailto:${benefit.memberEmail}`}>
                        <Mail className="h-4 w-4" />
                        {benefit.memberEmail}
                      </a>
                    </Button>
                    <Button variant="outline" className="w-full justify-start gap-2" asChild>
                      <a href={`tel:${benefit.memberPhone}`}>
                        <Phone className="h-4 w-4" />
                        {benefit.memberPhone}
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
