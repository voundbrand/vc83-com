"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Guitar, ArrowLeft, Download } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { guitarData } from "@/lib/data"

export default function GitarrenbauPage() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
              <Guitar className="h-8 w-8 text-primary" />
              <h1 className="text-xl font-bold text-foreground">Guitarfingerstyle</h1>
            </Link>
            <div className="hidden md:flex items-center space-x-6">
              <Link href="/gitarrenbau" className="text-primary font-medium">
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

      <div className="container mx-auto px-4 py-12 max-w-6xl">
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center text-muted-foreground hover:text-primary transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Zurück zur Startseite
          </Link>
          <h1 className="text-4xl font-bold mb-4 text-foreground">Gitarrenbau</h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Auf diesen Seiten geht es um die Basis meiner Musik - meine Gitarren und wie sie entstanden sind.
          </p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Über meine Gitarrensammlung</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="leading-relaxed">
              Jeder Hobby-Musiker hat sicher ganz eigene und unterschiedliche Kriterien, wenn es um die Auswahl und den
              Kauf des eigenen Instruments geht. Schließlich verbringt man mit diesem "treuen Gefährten" eine Menge
              Zeit, man teilt die Freude über eine gelungene Komposition - oder aber den Frust, wenn das Üben mal nicht
              so leicht von der Hand gehen will.
            </p>
            <p className="leading-relaxed">
              Die Entscheidung welches Instrument ich mir gekauft habe, war meist Zufall oder wie bei der Breedlove ein
              Spontankauf nach dem Antesten. Als Hobbygitarrist wollte ich schon immer mein eigenes Instrument bauen.
              Dabei haben sich viele Erfahrungen, Materialien und Informationen angesammelt, die ich hier zur Verfügung
              stelle.
            </p>
          </CardContent>
        </Card>

        <div className="space-y-8">
          <h2 className="text-2xl font-semibold mb-6">Meine Gitarren</h2>
          <div className="grid gap-8">
            {guitarData.map((guitar, index) => (
              <Link key={index} href={`/gitarrenbau/${guitar.slug}`} className="block">
                <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer group">
                  <div className="md:flex">
                    <div className="md:w-1/3">
                      <div className="relative h-64 md:h-full">
                        <Image
                          src={guitar.images[0] || "/placeholder.svg"}
                          alt={guitar.name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        {/* Gallery thumbnails overlay */}
                        <div className="absolute bottom-2 left-2 right-2 flex gap-1">
                          {guitar.images.slice(1, 5).map((img, i) => (
                            <div key={i} className="relative w-12 h-12 rounded overflow-hidden border border-white/50">
                              <Image
                                src={img || "/placeholder.svg"}
                                alt={`${guitar.name} ${i + 2}`}
                                fill
                                className="object-cover"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="md:w-2/3 p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-xl font-semibold mb-2 text-foreground group-hover:text-primary transition-colors">
                            {guitar.name}
                          </h3>
                          <div className="flex items-center space-x-2 mb-3">
                            <Guitar className="h-4 w-4 text-primary" />
                            <span className="text-sm text-muted-foreground">Akustische Gitarre</span>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="shrink-0 bg-transparent"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            // Trigger download of first plan
                            const link = document.createElement("a")
                            link.href = "#"
                            link.download = guitar.plans[0].filename
                            link.click()
                          }}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Bauplan
                        </Button>
                      </div>
                      <p className="text-muted-foreground leading-relaxed mb-4">{guitar.description}</p>
                      <div className="text-primary hover:underline text-sm font-medium inline-flex items-center">
                        Mehr erfahren und alle Baupläne herunterladen
                        <ArrowLeft className="h-4 w-4 ml-1 rotate-180" />
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
