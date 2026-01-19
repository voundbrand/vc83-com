import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Guitar, ArrowLeft, Download, FileText } from "lucide-react"
import Link from "next/link"

export default function NotenUndTabsPage() {
  const allPieces = [
    { title: "Angie", artist: "The Rolling Stones", format: "PDF", size: "1.9 MB" },
    { title: "Blackbird", artist: "The Beatles", format: "PDF", size: "1.5 MB" },
    { title: "Classical Gas", artist: "Mason Williams", format: "PDF", size: "2.4 MB" },
    { title: "Creep", artist: "Radiohead", format: "PDF", size: "2.0 MB" },
    { title: "Dust in the Wind", artist: "Kansas", format: "PDF", size: "1.2 MB" },
    { title: "Greensleeves", artist: "Traditional", format: "PDF", size: "0.9 MB" },
    { title: "Hallelujah", artist: "Leonard Cohen", format: "PDF", size: "2.2 MB" },
    { title: "Hotel California", artist: "Eagles", format: "PDF", size: "2.8 MB" },
    { title: "House of the Rising Sun", artist: "Traditional", format: "PDF", size: "1.7 MB" },
    { title: "Hurt", artist: "Johnny Cash", format: "PDF", size: "1.8 MB" },
    { title: "Mad World", artist: "Gary Jules", format: "PDF", size: "1.4 MB" },
    { title: "More Than Words", artist: "Extreme", format: "PDF", size: "2.0 MB" },
    { title: "Scarborough Fair", artist: "Traditional", format: "PDF", size: "1.1 MB" },
    {
      title: "Stairway to Heaven",
      artist: "Led Zeppelin",
      format: "PDF",
      size: "3.2 MB",
    },
    { title: "Tears in Heaven", artist: "Eric Clapton", format: "PDF", size: "1.8 MB" },
    { title: "The Boxer", artist: "Simon & Garfunkel", format: "PDF", size: "2.1 MB" },
    { title: "The Sound of Silence", artist: "Simon & Garfunkel", format: "PDF", size: "1.6 MB" },
    { title: "Wonderwall", artist: "Oasis", format: "PDF", size: "1.3 MB" },
    { title: "Zombie", artist: "The Cranberries", format: "PDF", size: "1.5 MB" },
  ]

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
              <Link href="/noten-und-tabs" className="text-primary font-medium">
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

      <div className="container mx-auto px-4 py-12 max-w-6xl">
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center text-muted-foreground hover:text-primary transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Zurück zur Startseite
          </Link>
          <h1 className="text-4xl font-bold mb-4 text-foreground">Noten & Tabs</h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Sammlung von Fingerstyle-Arrangements und Tabs für akustische Gitarre.
          </p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Wichtiger Hinweis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="leading-relaxed">
              Alle Noten und Tabs werden ausschließlich für den privaten Gebrauch und für Übungszwecke bereitgestellt.
            </p>
            <p className="leading-relaxed">
              Einige Stücke habe ich nach meinen Vorstellungen nachbearbeitet. Der Hinweis auf die Urheberrechte bleibt
              dabei erhalten.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-xl flex items-center justify-between">
              <span className="flex items-center">
                <FileText className="h-5 w-5 mr-2 text-primary" />
                Alle Noten & Tabs
              </span>
              <Badge variant="secondary">
                {allPieces.length} {allPieces.length === 1 ? "Stück" : "Stücke"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {allPieces.map((piece, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between px-6 py-3 hover:bg-muted/50 transition-colors group"
                >
                  <div className="flex items-center space-x-4 flex-1 min-w-0">
                    <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-foreground truncate">{piece.title}</div>
                      <div className="text-sm text-muted-foreground">{piece.artist}</div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="text-sm text-muted-foreground hidden md:block w-20 text-right">{piece.format}</div>
                    <div className="text-sm text-muted-foreground hidden lg:block w-16 text-right">{piece.size}</div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="mt-12">
          <CardHeader>
            <CardTitle>Über die Arrangements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="leading-relaxed">
              Diese Sammlung enthält sorgfältig ausgewählte Stücke für Fingerstyle-Gitarre in verschiedenen
              Schwierigkeitsgraden. Von einfachen Folk-Songs bis hin zu anspruchsvollen instrumentalen Arrangements ist
              für jeden Geschmack und jedes Können etwas dabei.
            </p>
            <p className="leading-relaxed">
              Alle Arrangements sind für akustische Gitarre optimiert und berücksichtigen die besonderen Eigenschaften
              des Fingerstyle-Spiels. Sowohl Standard-Notation als auch Tabulatur sind in den PDF-Dateien enthalten.
            </p>
            <p className="text-muted-foreground">Ich wünsche viel Spaß beim Üben und Musizieren!</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
