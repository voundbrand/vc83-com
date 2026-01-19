import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ArrowRight, FileText, Clock, Shield, Zap } from "lucide-react"
import Link from "next/link"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-semibold text-foreground">HörDok</span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="#funktionen" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Funktionen
            </Link>
            <Link href="#preise" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Preise
            </Link>
            <Link href="#kontakt" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Kontakt
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link href="/dashboard">Demo ansehen</Link>
            </Button>
            <Button asChild>
              <Link href="/dashboard">Kostenlos testen</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 md:py-32">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <Zap className="w-4 h-4" />
            <span>Sparen Sie bis zu 15 Stunden pro Woche</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6 text-balance leading-tight">
            Automatisierte Berichterstellung für Hörakkustiker
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-8 text-pretty max-w-2xl mx-auto leading-relaxed">
            Verbringen Sie weniger Zeit mit Papierkram und mehr Zeit mit Ihren Patienten. HörDok automatisiert Ihre
            Versicherungsberichte mit modernster KI-Technologie.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="text-base" asChild>
              <Link href="/dashboard">
                Jetzt kostenlos starten
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="text-base bg-transparent" asChild>
              <Link href="/dashboard">Demo ansehen</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="funktionen" className="container mx-auto px-4 py-20 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Alles, was Sie für effiziente Dokumentation benötigen
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Entwickelt von Entwicklern für Hörakkustiker – mit Fokus auf Datenschutz und Benutzerfreundlichkeit
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">KI-gestützte Berichterstellung</h3>
              <p className="text-muted-foreground leading-relaxed">
                Generieren Sie vollständige Versicherungsberichte in Sekunden. Unsere KI versteht audiometrische Daten
                und erstellt konforme Dokumentation.
              </p>
            </Card>

            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center mb-4">
                <Clock className="w-6 h-6 text-secondary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Zeitersparnis</h3>
              <p className="text-muted-foreground leading-relaxed">
                Reduzieren Sie Ihre abendliche Dokumentationszeit von 3 Stunden auf wenige Minuten. Mehr Zeit für das
                Wesentliche.
              </p>
            </Card>

            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">DSGVO-konform</h3>
              <p className="text-muted-foreground leading-relaxed">
                Höchste Sicherheitsstandards für Patientendaten. Hosting in Deutschland, vollständige DSGVO-Compliance.
              </p>
            </Card>

            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center mb-4">
                <FileText className="w-6 h-6 text-secondary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Alle Versicherungen</h3>
              <p className="text-muted-foreground leading-relaxed">
                Vorlagen für alle gängigen Krankenkassen. Automatische Anpassung an spezifische Anforderungen.
              </p>
            </Card>

            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Schnelle Integration</h3>
              <p className="text-muted-foreground leading-relaxed">
                Einfacher Import von Audiogrammen und Messdaten. Kompatibel mit gängiger Audiometrie-Software.
              </p>
            </Card>

            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-secondary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Multi-Praxis-fähig</h3>
              <p className="text-muted-foreground leading-relaxed">
                Perfekt für Praxisketten und Filialen. Zentrale Verwaltung mit individuellen Zugriffsrechten.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto">
          <Card className="p-8 md:p-12 bg-primary text-primary-foreground">
            <div className="text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Bereit, Ihre Dokumentation zu revolutionieren?</h2>
              <p className="text-lg mb-8 text-primary-foreground/90 max-w-2xl mx-auto">
                Starten Sie noch heute kostenlos und erleben Sie, wie einfach professionelle Berichterstellung sein
                kann.
              </p>
              <Button size="lg" variant="secondary" className="text-base" asChild>
                <Link href="/dashboard">
                  Kostenlos registrieren
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
            </div>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card/50">
        <div className="container mx-auto px-4 py-12">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-primary-foreground" />
                </div>
                <span className="text-lg font-semibold text-foreground">HörDok</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Professionelle Dokumentationslösung für Hörakkustiker-Praxen
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">Produkt</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="#funktionen" className="hover:text-foreground transition-colors">
                    Funktionen
                  </Link>
                </li>
                <li>
                  <Link href="#preise" className="hover:text-foreground transition-colors">
                    Preise
                  </Link>
                </li>
                <li>
                  <Link href="#demo" className="hover:text-foreground transition-colors">
                    Demo
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">Unternehmen</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="#" className="hover:text-foreground transition-colors">
                    Über uns
                  </Link>
                </li>
                <li>
                  <Link href="#kontakt" className="hover:text-foreground transition-colors">
                    Kontakt
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-foreground transition-colors">
                    Karriere
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">Rechtliches</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="#" className="hover:text-foreground transition-colors">
                    Datenschutz
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-foreground transition-colors">
                    Impressum
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-foreground transition-colors">
                    AGB
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border mt-8 pt-8 text-center text-sm text-muted-foreground">
            <p>&copy; 2025 HörDok. Alle Rechte vorbehalten.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
