import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Music, Guitar, FileText, Wrench, Download, ExternalLink } from "lucide-react"
import Link from "next/link"

export default function HomePage() {
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

      {/* Hero Section */}
      <section id="home" className="relative py-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background/95 to-primary/10">
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-1/4 left-1/4 w-1 h-1 bg-white rounded-full animate-pulse"></div>
            <div className="absolute top-1/3 right-1/3 w-0.5 h-0.5 bg-accent rounded-full animate-pulse delay-1000"></div>
            <div className="absolute bottom-1/4 left-1/3 w-1 h-1 bg-secondary rounded-full animate-pulse delay-500"></div>
            <div className="absolute top-1/2 right-1/4 w-0.5 h-0.5 bg-white rounded-full animate-pulse delay-700"></div>
            <div className="absolute bottom-1/3 right-1/2 w-1 h-1 bg-accent rounded-full animate-pulse delay-300"></div>
          </div>
        </div>

        <div className="container mx-auto max-w-6xl relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <Badge
                variant="secondary"
                className="w-fit bg-secondary/20 text-secondary-foreground border-secondary/30"
              >
                <Music className="h-4 w-4 mr-2" />
                Fingerstyle Guitar
              </Badge>
              <h1 className="text-4xl lg:text-6xl font-bold text-balance leading-tight">
                Guitarfingerstyle
                <span className="text-primary block">Lutz M. Splettstoesser</span>
              </h1>
              <p className="text-lg text-muted-foreground text-pretty leading-relaxed">
                Ich bin Hobbygitarrist und wollte schon immer mein eigenes Instrument bauen. Dabei haben sich viele
                Erfahrungen, Materialien und Informationen angesammelt, die ich hier zur Verfügung stelle. Auch ich kann
                die Finger nicht von den Saiten lassen...
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/noten-und-tabs">
                  <Button
                    size="lg"
                    className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/25 w-full"
                  >
                    <FileText className="h-5 w-5 mr-2" />
                    Noten & Tabs entdecken
                  </Button>
                </Link>
                <Link href="/gitarrenbau">
                  <Button
                    variant="outline"
                    size="lg"
                    className="border-secondary/50 hover:bg-secondary/10 hover:border-secondary bg-transparent text-foreground w-full"
                  >
                    <Wrench className="h-5 w-5 mr-2" />
                    Gitarrenbau lernen
                  </Button>
                </Link>
              </div>
            </div>
            <div className="relative">
              <div className="relative aspect-square rounded-2xl overflow-hidden bg-gradient-to-br from-primary/20 via-accent/10 to-secondary/20 p-2">
                <div className="absolute inset-0 bg-gradient-to-br from-transparent via-primary/5 to-accent/10 rounded-2xl"></div>
                <img
                  src="/cosmic-guitar-milky-way.jpg"
                  alt="Handgefertigte Akustikgitarre vor der Milchstraße"
                  className="w-full h-full object-cover rounded-xl shadow-2xl shadow-primary/20"
                />
                <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-transparent via-transparent to-accent/10 pointer-events-none"></div>
              </div>
              <div className="absolute -top-4 -right-4 w-8 h-8 bg-gradient-to-br from-accent to-primary rounded-full blur-sm opacity-60 animate-pulse"></div>
              <div className="absolute -bottom-6 -left-6 w-12 h-12 bg-gradient-to-br from-secondary to-accent rounded-full blur-md opacity-40 animate-pulse delay-1000"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4 text-balance">Alles rund um die akustische Gitarre</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-pretty">
              Auf diesen Seiten erfahren Sie alles über meine Gitarren, einzelne Stile und meine Lieblingsstücke.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
              <CardHeader>
                <div className="h-12 w-12 bg-secondary/10 rounded-lg flex items-center justify-center mb-4">
                  <Wrench className="h-6 w-6 text-secondary" />
                </div>
                <CardTitle>Gitarrenbau</CardTitle>
                <CardDescription>
                  Erfahrungen, Materialien und Informationen zum Bau eigener Gitarren. Dabei haben sich viele
                  Erfahrungen angesammelt, die ich hier zur Verfügung stelle.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/gitarrenbau">
                  <Button
                    variant="outline"
                    className="w-full group-hover:bg-secondary group-hover:text-secondary-foreground transition-colors bg-transparent"
                  >
                    <Wrench className="h-4 w-4 mr-2" />
                    Bauanleitungen
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
              <CardHeader>
                <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Noten & Tabs</CardTitle>
                <CardDescription>
                  Alle Noten und Tabs werden ausschließlich für den privaten Gebrauch und für Übungszwecke
                  bereitgestellt.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/noten-und-tabs">
                  <Button
                    variant="outline"
                    className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors bg-transparent"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Sammlung ansehen
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
              <CardHeader>
                <div className="h-12 w-12 bg-accent/10 rounded-lg flex items-center justify-center mb-4">
                  <ExternalLink className="h-6 w-6 text-accent" />
                </div>
                <CardTitle>Linksammlung</CardTitle>
                <CardDescription>
                  Die Linksammlung ist vor allem eine Auswahl von Quellen für Materialien, Bausätze und Werkzeuge.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/links">
                  <Button
                    variant="outline"
                    className="w-full group-hover:bg-accent group-hover:text-accent-foreground transition-colors bg-transparent"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Links ansehen
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card/50 py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                <Guitar className="h-6 w-6 text-primary" />
                <span className="font-bold">Guitarfingerstyle</span>
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Leidenschaft für Fingerstyle-Gitarre und handwerkliche Perfektion im Gitarrenbau. Alle Inhalte für den
                privaten Gebrauch und Übungszwecke.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Navigation</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="/" className="hover:text-primary transition-colors">
                    Home
                  </Link>
                </li>
                <li>
                  <Link href="/gitarrenbau" className="hover:text-primary transition-colors">
                    Gitarrenbau
                  </Link>
                </li>
                <li>
                  <Link href="/noten-und-tabs" className="hover:text-primary transition-colors">
                    Noten/Tabs
                  </Link>
                </li>
                <li>
                  <Link href="/links" className="hover:text-primary transition-colors">
                    Links
                  </Link>
                </li>
                <li>
                  <Link href="/kontakt" className="hover:text-primary transition-colors">
                    Kontakt
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Rechtliches</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="/impressum" className="hover:text-primary transition-colors">
                    Impressum
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border mt-8 pt-8 text-center text-sm text-muted-foreground">
            <p>&copy; 2025 Lutz M. Splettstoesser. Alle Rechte vorbehalten.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
