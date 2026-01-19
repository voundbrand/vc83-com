import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Guitar, FileText, Wrench, Sparkles } from "lucide-react"
import Link from "next/link"

export default function HeroV3Page() {
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
              <Link href="/hero-v1" className="text-muted-foreground hover:text-primary transition-colors">
                Hero V1
              </Link>
              <Link href="/hero-v2" className="text-muted-foreground hover:text-primary transition-colors">
                Hero V2
              </Link>
              <Link href="/hero-v3" className="text-primary font-medium">
                Hero V3
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero V3 - Split Screen Cosmic */}
      <section className="relative min-h-screen overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-primary/5">
          {/* Animated cosmic particles */}
          <div className="absolute inset-0 opacity-40">
            <div className="absolute top-1/4 left-1/6 w-2 h-2 bg-primary rounded-full animate-pulse"></div>
            <div className="absolute top-1/3 left-1/4 w-1 h-1 bg-accent rounded-full animate-pulse delay-500"></div>
            <div className="absolute top-1/2 left-1/5 w-1.5 h-1.5 bg-secondary rounded-full animate-pulse delay-1000"></div>
            <div className="absolute bottom-1/3 left-1/3 w-1 h-1 bg-primary rounded-full animate-pulse delay-700"></div>
            <div className="absolute top-2/3 right-1/4 w-2 h-2 bg-accent rounded-full animate-pulse delay-300"></div>
            <div className="absolute top-1/5 right-1/3 w-1 h-1 bg-secondary rounded-full animate-pulse delay-800"></div>
            <div className="absolute bottom-1/4 right-1/5 w-1.5 h-1.5 bg-primary rounded-full animate-pulse delay-200"></div>
          </div>
        </div>

        <div className="container mx-auto max-w-7xl relative z-10 min-h-screen flex items-center">
          <div className="grid lg:grid-cols-2 gap-0 items-center w-full">
            <div className="py-20 px-4 lg:px-8 space-y-8">
              <div className="space-y-6">
                <Badge
                  variant="secondary"
                  className="w-fit bg-secondary/20 text-secondary-foreground border-secondary/30"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Cosmic Craftsmanship
                </Badge>

                <div className="space-y-4">
                  <h1 className="text-4xl lg:text-5xl xl:text-6xl font-bold text-balance leading-tight">
                    <span className="block text-foreground">Guitarfingerstyle</span>
                  </h1>
                  <h2 className="text-2xl lg:text-3xl text-primary font-semibold">Lutz M. Splettstoesser</h2>
                </div>

                <div className="space-y-4 max-w-lg">
                  <p className="text-lg text-muted-foreground text-pretty leading-relaxed">
                    Ich bin Hobbygitarrist und wollte schon immer mein eigenes Instrument bauen.
                  </p>
                  <p className="text-base text-muted-foreground/80 text-pretty leading-relaxed">
                    Dabei haben sich viele Erfahrungen, Materialien und Informationen angesammelt, die ich hier zur
                    Verfügung stelle. Auch ich kann die Finger nicht von den Saiten lassen...
                  </p>
                </div>

                <div className="flex flex-col gap-3 max-w-sm">
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
            </div>

            <div className="relative lg:min-h-screen flex items-center justify-center p-4 lg:p-8">
              <div className="relative w-full max-w-lg">
                {/* Main image container */}
                <div className="relative aspect-[3/4] rounded-3xl overflow-hidden bg-gradient-to-br from-primary/30 via-accent/20 to-secondary/30 p-3">
                  <div className="absolute inset-0 bg-gradient-to-br from-transparent via-primary/10 to-accent/20 rounded-3xl"></div>
                  <img
                    src="/cosmic-guitar-milky-way.jpg"
                    alt="Handgefertigte Akustikgitarre vor der Milchstraße"
                    className="w-full h-full object-cover rounded-2xl shadow-2xl shadow-primary/30"
                  />
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-background/20 via-transparent to-accent/10 pointer-events-none"></div>
                </div>

                {/* Floating cosmic elements */}
                <div className="absolute -top-8 -left-8 w-16 h-16 bg-gradient-to-br from-accent/30 to-primary/30 rounded-full blur-xl opacity-60 animate-pulse"></div>
                <div className="absolute -bottom-12 -right-12 w-24 h-24 bg-gradient-to-br from-secondary/30 to-accent/30 rounded-full blur-2xl opacity-40 animate-pulse delay-1000"></div>
                <div className="absolute top-1/4 -right-6 w-8 h-8 bg-gradient-to-br from-primary/40 to-secondary/40 rounded-full blur-md opacity-50 animate-pulse delay-500"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="py-12 px-4 text-center bg-muted/30">
        <h2 className="text-2xl font-bold mb-4">Hero Version 3 - Split Screen Cosmic</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          A dramatic split-screen layout with the cosmic guitar taking up the full right side. This version creates a
          strong visual impact with the large image while maintaining clean typography and cosmic particle effects.
        </p>
      </div>
    </div>
  )
}
