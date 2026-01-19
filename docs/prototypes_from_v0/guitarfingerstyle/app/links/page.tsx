import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Guitar, ArrowLeft, ExternalLink, AlertTriangle } from "lucide-react"
import Link from "next/link"

export default function LinksPage() {
  const linkCategories = [
    {
      title: "Materialien & Hölzer",
      links: [
        { name: "Tonewood Suppliers", url: "#", description: "Hochwertige Tonhölzer für den Gitarrenbau" },
        { name: "Guitar Wood Shop", url: "#", description: "Spezialist für Gitarrenhölzer und Zubehör" },
        { name: "European Tonewood", url: "#", description: "Europäische Tonhölzer in Premium-Qualität" },
      ],
    },
    {
      title: "Bausätze & Kits",
      links: [
        { name: "Stewart-MacDonald", url: "#", description: "Komplette Gitarren-Bausätze und Werkzeuge" },
        { name: "Martin Guitar Kits", url: "#", description: "Offizielle Martin Gitarren-Bausätze" },
        { name: "Acoustic Guitar Kits", url: "#", description: "Verschiedene Akustikgitarren-Bausätze" },
      ],
    },
    {
      title: "Werkzeuge & Hardware",
      links: [
        { name: "Luthier Tools", url: "#", description: "Spezialisierte Werkzeuge für Gitarrenbauer" },
        { name: "Guitar Hardware", url: "#", description: "Mechaniken, Brücken und weiteres Zubehör" },
        { name: "Precision Tools", url: "#", description: "Präzisionswerkzeuge für den Instrumentenbau" },
      ],
    },
    {
      title: "Wissen & Anleitungen",
      links: [
        { name: "Guitar Building Forum", url: "#", description: "Community für Gitarrenbauer" },
        { name: "Luthier Tutorials", url: "#", description: "Video-Anleitungen zum Gitarrenbau" },
        { name: "Acoustic Guitar Magazine", url: "#", description: "Fachzeitschrift für Akustikgitarren" },
      ],
    },
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
              <Link href="/noten-und-tabs" className="text-muted-foreground hover:text-primary transition-colors">
                Noten/Tabs
              </Link>
              <Link href="/links" className="text-primary font-medium">
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
          <h1 className="text-4xl font-bold mb-4 text-foreground">Links</h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Nutzen Sie das ganze World Wide Web! Ich habe auf dieser Seite informative Links für alle Interessierten
            zusammengestellt.
          </p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Über diese Linksammlung</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="leading-relaxed">
              So können Sie ganz entspannt surfen und sich zum Thema Ihrer Wahl noch umfassender informieren. Diese
              Links aktualisieren wir ständig, sodass Sie hier immer wieder den einen oder anderen zusätzlichen Verweis
              finden. Schauen Sie also einfach öfter mal vorbei - es lohnt sich!
            </p>
            <p className="leading-relaxed">
              Die Linksammlung ist vor allem eine Auswahl von Quellen für Materialien, Bausätze und Werkzeuge.
            </p>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          {linkCategories.map((category, index) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ExternalLink className="h-5 w-5 mr-2" />
                  {category.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {category.links.map((link, linkIndex) => (
                  <div key={linkIndex} className="border-l-2 border-primary/20 pl-4 py-2">
                    <h4 className="font-semibold text-foreground">{link.name}</h4>
                    <p className="text-sm text-muted-foreground mb-2">{link.description}</p>
                    <Button size="sm" variant="outline" className="text-xs bg-transparent">
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Link besuchen
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-amber-200 bg-amber-50/10">
          <CardHeader>
            <CardTitle className="flex items-center text-amber-600">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Rechtlicher Hinweis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p className="leading-relaxed">
              Das Landgericht Hamburg hat mit Urteil vom 12.05.1998 entschieden, dass man durch das Setzen eines Links
              die Inhalte der verlinkten Seiten ggf. mit zu verantworten hat. Dies kann - so das LG - nur dadurch
              verhindert werden, dass man sich ausdrücklich von diesen Inhalten distanziert.
            </p>
            <p className="leading-relaxed font-medium">
              Wir haben auf unserer Homepage Links zu anderen Seiten gesetzt. Für all diese Links gilt: "Wir möchten
              ausdrücklich betonen, dass wir keinerlei Einfluß auf die Gestaltung und die Inhalte der hier verlinkten
              Seiten haben. Deshalb distanzieren wir uns hiermit ausdrücklich von allen Inhalten aller verlinkten
              Seiten, auf die von unserer Homepage aus verwiesen wird. Diese Erklärung gilt für alle auf unserer
              Homepage ausgebrachten Links und für alle Inhalte der Seiten, zu denen Links oder Banner führen."
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
