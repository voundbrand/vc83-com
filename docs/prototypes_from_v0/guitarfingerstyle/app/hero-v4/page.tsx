import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Music, Guitar, FileText, Wrench, ChevronDown } from "lucide-react"
import Link from "next/link"

export default function HeroV4Page() {
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="text-primary font-medium p-0 h-auto hover:bg-transparent">
                    Home
                    <ChevronDown className="h-4 w-4 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  <DropdownMenuItem asChild>
                    <Link href="/" className="w-full">
                      Current Design
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/hero-v1" className="w-full">
                      Hero Version 1
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/hero-v2" className="w-full">
                      Hero Version 2
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/hero-v3" className="w-full">
                      Hero Version 3
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/hero-v4" className="w-full">
                      Full Background V1
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/hero-v5" className="w-full">
                      Full Background V2
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/hero-v6" className="w-full">
                      Full Background V3
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Link href="/meine-gitarren" className="text-muted-foreground hover:text-primary transition-colors">
                Meine Gitarren
              </Link>
              <Link href="/gitarrenbau" className="text-muted-foreground hover:text-primary transition-colors">
                Gitarrenbau
              </Link>
              <Link href="/bauplaene" className="text-muted-foreground hover:text-primary transition-colors">
                Baupläne
              </Link>
              <Link href="/noten-und-tabs" className="text-muted-foreground hover:text-primary transition-colors">
                Noten & Tabs
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

      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: "url('/cosmic-guitar-milky-way.jpg')",
          }}
        />

        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-black/60" />

        {/* Gradient overlay for better text contrast */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />

        {/* Content */}
        <div className="container mx-auto px-4 relative z-10 text-center">
          <div className="max-w-4xl mx-auto space-y-8">
            <Badge
              variant="secondary"
              className="w-fit mx-auto bg-white/20 text-white border-white/30 backdrop-blur-sm"
            >
              <Music className="h-4 w-4 mr-2" />
              Fingerstyle Guitar
            </Badge>

            <h1 className="text-5xl lg:text-7xl font-bold text-white text-balance leading-tight">
              Guitarfingerstyle
              <span className="block text-primary mt-2">Lutz M. Splettstoesser</span>
            </h1>

            <p className="text-xl lg:text-2xl text-white/90 text-pretty leading-relaxed max-w-3xl mx-auto">
              Ich bin Hobbygitarrist und wollte schon immer mein eigenes Instrument bauen. Dabei haben sich viele
              Erfahrungen, Materialien und Informationen angesammelt, die ich hier zur Verfügung stelle.
            </p>

            <div className="flex flex-col sm:flex-row gap-6 justify-center pt-4">
              <Link href="/noten-und-tabs">
                <Button
                  size="lg"
                  className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xl shadow-primary/25 px-8 py-4 text-lg"
                >
                  <FileText className="h-5 w-5 mr-2" />
                  Noten & Tabs entdecken
                </Button>
              </Link>
              <Link href="/gitarrenbau">
                <Button
                  variant="outline"
                  size="lg"
                  className="border-white/50 hover:bg-white/10 hover:border-white bg-white/10 text-white backdrop-blur-sm px-8 py-4 text-lg"
                >
                  <Wrench className="h-5 w-5 mr-2" />
                  Gitarrenbau lernen
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-white/50 rounded-full flex justify-center">
            <div className="w-1 h-3 bg-white/70 rounded-full mt-2 animate-pulse"></div>
          </div>
        </div>
      </section>

      {/* Rest of the page content remains the same */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4 text-balance">Alles rund um die akustische Gitarre</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-pretty">
              Auf diesen Seiten erfahren Sie alles über meine Gitarren, einzelne Stile und meine Lieblingsstücke.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
