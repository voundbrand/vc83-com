import { EVENTS } from "@/lib/events"
import { EventCard } from "@/components/event-card"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-red-600 to-red-700 text-white">
        <div className="container mx-auto px-4 py-16 md:py-24">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 text-balance">BNI Mecklenburg-Vorpommern</h1>
            <p className="text-xl md:text-2xl mb-8 text-red-50 text-pretty">
              Ihr Netzwerk für erfolgreiche Geschäftsbeziehungen. Entdecken Sie unsere Veranstaltungen und werden Sie
              Teil der größten Business-Networking-Organisation der Welt.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" variant="secondary" asChild>
                <Link href="#events">Veranstaltungen ansehen</Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="bg-transparent border-white text-white hover:bg-white hover:text-red-600"
                asChild
              >
                <Link href="/about">Über BNI erfahren</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-b bg-muted/30">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <p className="text-4xl font-bold text-primary mb-2">15+</p>
              <p className="text-muted-foreground">Chapter in MV</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold text-primary mb-2">500+</p>
              <p className="text-muted-foreground">Mitglieder</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold text-primary mb-2">2.5M€</p>
              <p className="text-muted-foreground">Vermitteltes Geschäft</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold text-primary mb-2">10K+</p>
              <p className="text-muted-foreground">Empfehlungen</p>
            </div>
          </div>
        </div>
      </section>

      {/* Events Section */}
      <section id="events" className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Kommende Veranstaltungen</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto text-pretty">
              Nehmen Sie an unseren Networking-Events, Workshops und Konferenzen teil. Erweitern Sie Ihr Netzwerk und
              Ihr Geschäft.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {EVENTS.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-muted py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Noch kein BNI-Mitglied?</h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto text-pretty">
            Besuchen Sie ein Chapter-Meeting als Gast und erleben Sie die Kraft von BNI selbst.
          </p>
          <Button size="lg" asChild>
            <Link href="/contact">Kontakt aufnehmen</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-background border-t py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="font-bold text-lg mb-4">BNI Mecklenburg-Vorpommern</h3>
              <p className="text-sm text-muted-foreground">
                Teil von Business Network International - der weltweit größten Business-Networking-Organisation.
              </p>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-4">Kontakt</h3>
              <p className="text-sm text-muted-foreground">
                E-Mail: info@bni-mv.de
                <br />
                Telefon: +49 (0) 385 123 456
              </p>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-4">Links</h3>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>
                  <Link href="/about" className="hover:text-primary">
                    Über uns
                  </Link>
                </li>
                <li>
                  <Link href="/chapters" className="hover:text-primary">
                    Chapter finden
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="hover:text-primary">
                    Kontakt
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="hover:text-primary">
                    Datenschutz
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
            <p>&copy; 2025 BNI Mecklenburg-Vorpommern. Alle Rechte vorbehalten.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
