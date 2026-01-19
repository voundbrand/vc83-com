import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Guitar, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function ImpressumPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
              <Guitar className="h-8 w-8 text-primary" />
              <h1 className="text-xl font-bold text-foreground">Guitarfingerstyle</h1>
            </Link>
            <div className="hidden md:flex items-center space-x-6">
              <Link href="/gitarrenbau" className="text-muted-foreground hover:text-primary transition-colors">
                Gitarrenbau
              </Link>
              <Link href="/noten-und-tabs" className="text-muted-foreground hover:text-primary transition-colors">
                Noten/Tabs
              </Link>
              <Link href="/links" className="text-muted-foreground hover:text-primary transition-colors">
                Links
              </Link>
              <Link href="/kontakt" className="text-muted-foreground hover:text-primary transition-colors">
                Kontakt
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <Link href="/">
          <Button variant="ghost" className="mb-8">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Zurück zur Startseite
          </Button>
        </Link>

        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">Impressum</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold mb-2">Angaben gemäß § 5 TMG</h3>
              <p className="text-muted-foreground">
                Lutz M. Splettstoesser
                <br />
                Guitarfingerstyle
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-2">Kontakt</h3>
              <p className="text-muted-foreground">E-Mail: [E-Mail-Adresse]</p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-2">Haftungsausschluss</h3>
              <p className="text-muted-foreground leading-relaxed">
                Die Inhalte dieser Seiten wurden mit größter Sorgfalt erstellt. Für die Richtigkeit, Vollständigkeit und
                Aktualität der Inhalte kann ich jedoch keine Gewähr übernehmen. Als Diensteanbieter bin ich gemäß § 7
                Abs.1 TMG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-2">Urheberrecht</h3>
              <p className="text-muted-foreground leading-relaxed">
                Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen
                Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der
                Grenzen des Urheberrechtes bedürfen der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers.
                Downloads und Kopien dieser Seite sind nur für den privaten, nicht kommerziellen Gebrauch gestattet.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
