import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Guitar, FileText, Wrench, Star } from "lucide-react"
import Link from "next/link"

export default function HeroV2Page() {
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
              <Link href="/hero-v2" className="text-primary font-medium">
                Hero V2
              </Link>
              <Link href="/hero-v3" className="text-muted-foreground hover:text-primary transition-colors">
                Hero V3
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero V2 - Minimalist Typography Focus */}
      <section className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-background to-background/80">
          <div className="absolute inset-0 opacity-20">
            {/* Subtle constellation pattern */}
            <div className="absolute top-20 left-20 w-px h-px bg-primary rounded-full"></div>
            <div className="absolute top-32 left-32 w-px h-px bg-accent rounded-full"></div>
            <div className="absolute top-24 left-40 w-px h-px bg-secondary rounded-full"></div>
            <div className="absolute top-40 left-24 w-px h-px bg-primary rounded-full"></div>
            <div className="absolute top-60 right-40 w-px h-px bg-accent rounded-full"></div>
            <div className="absolute top-80 right-60 w-px h-px bg-secondary rounded-full"></div>
            <div className="absolute bottom-40 left-60 w-px h-px bg-primary rounded-full"></div>
            <div className="absolute bottom-60 right-80 w-px h-px bg-accent rounded-full"></div>
          </div>
        </div>

        <div className="container mx-auto max-w-4xl relative z-10 text-center">
          <div className="space-y-8">
            <div className="flex items-center justify-center mb-6">
              <Badge
                variant="secondary"
                className="bg-secondary/20 text-secondary-foreground border-secondary/30 text-sm px-4 py-2"
              >
                <Star className="h-4 w-4 mr-2" />
                Handcrafted Excellence
              </Badge>
            </div>

            <h1 className="text-5xl lg:text-7xl xl:text-8xl font-bold text-balance leading-none">
              <span className="block text-foreground">Guitarfingerstyle</span>
              <span className="block text-primary mt-2">Lutz M. Splettstoesser</span>
            </h1>

            <div className="max-w-2xl mx-auto space-y-6">
              <p className="text-xl lg:text-2xl text-muted-foreground text-pretty leading-relaxed">
                Leidenschaft für Fingerstyle-Gitarre und handwerkliche Perfektion im Gitarrenbau
              </p>

              <p className="text-lg text-muted-foreground/80 text-pretty leading-relaxed">
                Ich bin Hobbygitarrist und wollte schon immer mein eigenes Instrument bauen. Dabei haben sich viele
                Erfahrungen, Materialien und Informationen angesammelt, die ich hier zur Verfügung stelle.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto pt-8">
              <Link href="/noten-und-tabs">
                <Button
                  size="lg"
                  className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/25 w-full"
                >
                  <FileText className="h-5 w-5 mr-2" />
                  Noten & Tabs
                </Button>
              </Link>
              <Link href="/gitarrenbau">
                <Button
                  variant="outline"
                  size="lg"
                  className="border-secondary/50 hover:bg-secondary/10 hover:border-secondary bg-transparent text-foreground w-full"
                >
                  <Wrench className="h-5 w-5 mr-2" />
                  Gitarrenbau
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="absolute bottom-8 right-8 opacity-30 hidden lg:block">
          <div className="w-32 h-32 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full flex items-center justify-center">
            <Guitar className="h-16 w-16 text-primary" />
          </div>
        </div>
      </section>

      <div className="py-12 px-4 text-center bg-muted/30">
        <h2 className="text-2xl font-bold mb-4">Hero Version 2 - Minimalist Typography</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          A clean, typography-focused approach with subtle cosmic elements. This version emphasizes the text and
          messaging with a minimalist constellation pattern and centered layout for maximum impact.
        </p>
      </div>
    </div>
  )
}
