import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Music, Guitar, FileText, Wrench } from "lucide-react"
import Link from "next/link"

export default function HeroV1Page() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Guitar className="h-8 w-8 text-primary" />
              <h1 className="text-xl font-bold text-foreground">Guitarfingerstyle</h1>
            </div>
            <div className="hidden md:flex items-center space-x-6">
              <Link href="/" className="text-muted-foreground hover:text-primary transition-colors">
                Home
              </Link>
              <Link href="/hero-v1" className="text-primary font-medium">
                Hero V1
              </Link>
              <Link href="/hero-v2" className="text-muted-foreground hover:text-primary transition-colors">
                Hero V2
              </Link>
              <Link href="/hero-v3" className="text-muted-foreground hover:text-primary transition-colors">
                Hero V3
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero V1 - Current Cosmic Design */}
      <section className="relative py-20 px-4 overflow-hidden">
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
                Erfahrungen, Materialien und Informationen angesammelt, die ich hier zur Verfügung stelle.
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

      <div className="py-12 px-4 text-center">
        <h2 className="text-2xl font-bold mb-4">Hero Version 1 - Cosmic Galaxy</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          The current design featuring the cosmic guitar with Milky Way backdrop, animated stars, and gradient overlays.
          This version emphasizes the space theme with subtle animations and cosmic glow effects.
        </p>
      </div>
    </div>
  )
}
