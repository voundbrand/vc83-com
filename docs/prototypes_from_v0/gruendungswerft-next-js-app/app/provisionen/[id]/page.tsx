import { Navigation } from "@/components/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { ArrowLeft, Mail, Phone, TrendingUp } from 'lucide-react'
import Link from "next/link"
import { notFound } from 'next/navigation'

const mockCommissions = [
  {
    id: "1",
    title: "Vermittlung von Web-Entwicklern",
    description:
      "Suche qualifizierte Web-Entwickler für meine Projekte. Spezialisierung auf React, Next.js und TypeScript erwünscht.",
    fullDescription:
      "Wir suchen kontinuierlich talentierte Web-Entwickler für unsere wachsende Agentur und Kundenprojekte. Wenn du Entwickler mit mindestens 2 Jahren Erfahrung in modernen Web-Technologien kennst, kannst du attraktive Provisionen verdienen. Besonders gefragt sind Experten in React, Next.js, TypeScript und Node.js.",
    category: "Software",
    commission: "10% Provision",
    commissionDetails: "10% des ersten Jahresgehalts bzw. des Projektvolumens (bei Freelancern)",
    requirements: "Mindestens 2 Jahre Erfahrung, Portfolio erforderlich",
    detailedRequirements: [
      "Mindestens 2 Jahre Berufserfahrung in Web-Entwicklung",
      "Nachweisbare Projekte im Portfolio",
      "Erfahrung mit React und/oder Next.js",
      "TypeScript-Kenntnisse von Vorteil",
      "Deutschkenntnisse mindestens B2",
      "Remote oder Hybrid in München möglich"
    ],
    memberName: "Anna Schmidt",
    memberAvatar: "/diverse-woman-portrait.png",
    memberInitials: "AS",
    memberEmail: "anna.schmidt@example.com",
    memberPhone: "+49 151 12345678",
    process: [
      "Kontaktaufnahme und Besprechung des Kandidatenprofils",
      "Erste Screening-Gespräche durch uns",
      "Technisches Interview",
      "Vertragsverhandlung",
      "Provisionsauszahlung nach erfolgreichem Start"
    ],
  },
  {
    id: "2",
    title: "Partner für Marketing-Kampagnen",
    description:
      "Biete lukrative Provision für die Vermittlung von Neukunden für unsere Marketing-Agentur. Spezialisiert auf Performance-Marketing.",
    fullDescription:
      "Unsere Agentur ist auf datengetriebenes Performance-Marketing spezialisiert. Wir helfen B2B-Unternehmen dabei, mehr qualifizierte Leads zu generieren und ihren Umsatz zu steigern. Für die Vermittlung von Neukunden bieten wir eine der höchsten Provisionen in der Branche.",
    category: "Marketing",
    commission: "15% Provision",
    commissionDetails: "15% der ersten 12 Monatsraten. Bei Jahresverträgen sofort ausgezahlt.",
    requirements: "Netzwerk im B2B-Bereich, erste Erfahrung im Vertrieb",
    detailedRequirements: [
      "Kontakte zu Entscheidern in B2B-Unternehmen",
      "Verständnis für Marketing-Herausforderungen",
      "Erste Vertriebserfahrung von Vorteil",
      "Zielgruppe: Unternehmen mit 50+ Mitarbeitern",
      "Mindestbudget des Kunden: €2.000/Monat",
    ],
    memberName: "Michael Weber",
    memberAvatar: "/man.jpg",
    memberInitials: "MW",
    memberEmail: "m.weber@marketing-agentur.de",
    memberPhone: "+49 160 98765432",
    process: [
      "Intro-Call zur Besprechung der Zielkunden",
      "Bereitstellung von Verkaufsmaterialien",
      "Gemeinsame Pitch-Vorbereitung",
      "Sales-Meeting mit dem Interessenten",
      "Vertragsabschluss",
      "Provisionsauszahlung innerhalb von 30 Tagen"
    ],
  },
  {
    id: "3",
    title: "Startup-Berater gesucht",
    description:
      "Vermittle erfahrene Berater an Startups in unserer Region. Schwerpunkte: Geschäftsmodellentwicklung, Finanzierung, Skalierung.",
    fullDescription:
      "Wir bauen ein Netzwerk aus erfahrenen Startup-Beratern auf, die wir an Gründer in verschiedenen Phasen vermitteln. Von der ersten Geschäftsmodell-Entwicklung bis zur Skalierung und Finanzierungsrunde – wir suchen Experten mit praktischer Startup-Erfahrung.",
    category: "Beratung",
    commission: "12% Provision",
    commissionDetails: "12% des vereinbarten Beratungshonorars",
    requirements: "Berufserfahrung im Startup-Ökosystem, gutes Netzwerk",
    detailedRequirements: [
      "Mindestens 5 Jahre Erfahrung im Startup-Bereich",
      "Eigene Gründungserfahrung oder Erfahrung in Startup-Beratung",
      "Expertise in mind. einem Fachbereich (Business Model, Finance, Tech)",
      "Referenzen aus vergangenen Beratungsprojekten",
      "Verfügbarkeit für Workshops und Einzelsessions"
    ],
    memberName: "Sarah Müller",
    memberAvatar: "/professional-woman.png",
    memberInitials: "SM",
    memberEmail: "sarah@startup-hub.de",
    memberPhone: "+49 171 23456789",
    process: [
      "Erstgespräch und Aufnahme ins Berater-Netzwerk",
      "Matching mit passenden Startup-Anfragen",
      "Kennenlernen zwischen Berater und Startup",
      "Vereinbarung des Beratungsumfangs",
      "Laufende Beratungstätigkeit",
      "Provision nach Rechnungsstellung"
    ],
  },
  {
    id: "4",
    title: "Design-Projekte vermitteln",
    description:
      "Suche Designer für verschiedene Projekte: Branding, UI/UX, Printdesign. Faire Provisionen für erfolgreiche Vermittlungen.",
    fullDescription:
      "Unser Design-Studio hat mehr Projektanfragen als Kapazität. Wir suchen talentierte Designer für unterschiedliche Projekte – von Corporate Design über App-Design bis zu Printmedien. Wenn du gute Designer kennst, vermittle sie an uns und verdiene faire Provisionen.",
    category: "Design",
    commission: "8% Provision",
    commissionDetails: "8% des Projektvolumens, ausgezahlt nach Projektabschluss",
    requirements: "Portfolio mit mindestens 5 Projekten, Referenzen",
    detailedRequirements: [
      "Professionelles Design-Portfolio",
      "Mindestens 5 abgeschlossene Projekte",
      "Referenzen von vorherigen Auftraggebern",
      "Expertise in mindestens einem Bereich (Brand, UI/UX, Print)",
      "Beherrschung gängiger Design-Tools (Figma, Adobe CC)",
      "Deutschsprachig, Remote möglich"
    ],
    memberName: "Thomas Klein",
    memberAvatar: "/diverse-designers-brainstorming.png",
    memberInitials: "TK",
    memberEmail: "thomas.klein@designstudio.de",
    memberPhone: "+49 152 87654321",
    process: [
      "Sichtung des Designer-Portfolios",
      "Briefing zum aktuellen Projekt",
      "Vorstellung beim Kunden",
      "Projektdurchführung",
      "Abnahme und Rechnungsstellung",
      "Provisionsauszahlung nach Zahlungseingang"
    ],
  },
  {
    id: "5",
    title: "Steuerberater für Startups",
    description:
      "Vermittle Steuerberater mit Startup-Expertise. Besonders gefragt: Beratung zu Fördermitteln und Rechtsformen.",
    fullDescription:
      "Wir vermitteln spezialisierte Steuerberater an Startups und Gründer. Die hohe Provision spiegelt den Wert einer guten Steuerberatung wider. Gesucht werden Kanzleien und Einzelberater, die Erfahrung mit Startups, Fördermitteln und innovativen Geschäftsmodellen haben.",
    category: "Buchhaltung",
    commission: "20% Provision",
    commissionDetails: "20% der Honorare im ersten Jahr der Zusammenarbeit",
    requirements: "Steuerberater-Zulassung, Erfahrung mit Gründern",
    detailedRequirements: [
      "Aktive Steuerberater-Zulassung",
      "Nachweisliche Erfahrung mit Startups und Gründern",
      "Kenntnisse im Bereich Fördermittel (EXIST, INVEST, etc.)",
      "Beratung zu Rechtsformen und Holding-Strukturen",
      "Digitale Tools und moderne Arbeitsweise",
      "Mandatsübernahme innerhalb von 4 Wochen möglich"
    ],
    memberName: "Julia Fischer",
    memberAvatar: "/accountant-desk.png",
    memberInitials: "JF",
    memberEmail: "j.fischer@tax-network.de",
    memberPhone: "+49 162 11223344",
    process: [
      "Qualifikationsprüfung des Steuerberaters",
      "Abstimmung der Spezialisierungen",
      "Vermittlung an passende Startups",
      "Erstgespräch zwischen Berater und Gründer",
      "Mandatsvereinbarung",
      "Monatliche Provisionsabrechnung"
    ],
  },
  {
    id: "6",
    title: "Content-Marketing Aufträge",
    description:
      "Vermittle Content-Creator und Texter für unsere Kunden. Regelmäßige Aufträge, langfristige Zusammenarbeit möglich.",
    fullDescription:
      "Unsere Content-Agentur sucht ständig neue Texter und Content-Creator für Kundenprojekte. Von Blogartikeln über Social-Media-Content bis zu ausführlichen Whitepapers – wir haben regelmäßig Bedarf und bieten faire Konditionen sowohl für die Creator als auch für Vermittler.",
    category: "Marketing",
    commission: "10% Provision",
    commissionDetails: "10% aller vermittelten Aufträge, auch bei Folgeaufträgen",
    requirements: "Schreibproben erforderlich, SEO-Kenntnisse von Vorteil",
    detailedRequirements: [
      "Professionelle Schreibproben in Deutsch",
      "Erfahrung in mindestens einer Content-Form (Blog, Social, PR)",
      "SEO-Grundkenntnisse von Vorteil",
      "Zuverlässigkeit und Termintreue",
      "Fähigkeit zu Themen-Recherche",
      "Mindestens 5.000 Wörter pro Woche verfügbar"
    ],
    memberName: "Daniel Braun",
    memberAvatar: "/marketing-expert.png",
    memberInitials: "DB",
    memberEmail: "d.braun@content-agency.de",
    memberPhone: "+49 173 99887766",
    process: [
      "Sichtung der Schreibproben",
      "Test-Auftrag (vergütet)",
      "Aufnahme in den Creator-Pool",
      "Regelmäßige Projekt-Zuweisungen",
      "Qualitätssicherung und Feedback",
      "Monatliche Abrechnung und Provision"
    ],
  },
]

export default function ProvisionDetailPage({ params }: { params: { id: string } }) {
  const commission = mockCommissions.find((c) => c.id === params.id)

  if (!commission) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container py-8">
        <Link href="/provisionen">
          <Button variant="ghost" className="mb-6 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Zurück zu Provisionen
          </Button>
        </Link>

        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="space-y-6">
            <div>
              <div className="mb-4 flex items-center gap-3">
                <Badge variant="secondary" className="bg-primary/10 text-primary">
                  {commission.category}
                </Badge>
                <div className="flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-accent-foreground">
                  <TrendingUp className="h-4 w-4" />
                  <span className="font-semibold">{commission.commission}</span>
                </div>
              </div>
              <h1 className="text-balance text-4xl font-bold tracking-tight text-foreground">
                {commission.title}
              </h1>
              <p className="mt-3 text-lg text-muted-foreground">
                {commission.description}
              </p>
            </div>

            <Card>
              <CardHeader>
                <h2 className="text-xl font-semibold">Beschreibung</h2>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  {commission.fullDescription}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h2 className="text-xl font-semibold">Provisionsdetails</h2>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg bg-accent p-4">
                  <p className="font-semibold text-accent-foreground">
                    {commission.commissionDetails}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h2 className="text-xl font-semibold">Anforderungen</h2>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {commission.detailedRequirements.map((req) => (
                    <li key={req} className="flex items-start gap-2">
                      <div className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent" />
                      <span className="text-sm text-foreground">{req}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h2 className="text-xl font-semibold">Ablauf</h2>
              </CardHeader>
              <CardContent>
                <ol className="space-y-4">
                  {commission.process.map((step, index) => (
                    <li key={step} className="flex gap-4">
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                        {index + 1}
                      </div>
                      <p className="pt-1 text-sm text-foreground">{step}</p>
                    </li>
                  ))}
                </ol>
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
                    <AvatarImage src={commission.memberAvatar || "/placeholder.svg"} alt={commission.memberName} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {commission.memberInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-foreground">{commission.memberName}</p>
                    <p className="text-sm text-muted-foreground">Anbieter</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                    <TrendingUp className="mr-2 h-4 w-4" />
                    Kandidat vorschlagen
                  </Button>
                  
                  <div className="space-y-2">
                    <Button variant="outline" className="w-full justify-start gap-2" asChild>
                      <a href={`mailto:${commission.memberEmail}`}>
                        <Mail className="h-4 w-4" />
                        {commission.memberEmail}
                      </a>
                    </Button>
                    <Button variant="outline" className="w-full justify-start gap-2" asChild>
                      <a href={`tel:${commission.memberPhone}`}>
                        <Phone className="h-4 w-4" />
                        {commission.memberPhone}
                      </a>
                    </Button>
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
