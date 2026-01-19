"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Wifi, Coffee, Car, Trees, ChevronLeft, ChevronRight } from "lucide-react"
import { useState, useEffect } from "react"
import { BookingModal } from "@/components/booking-modal"

const heroImages = [
  {
    src: "/charming-traditional-german-half-timbered-house-at.jpg",
    alt: "Pension Landstübchen Außenansicht",
  },
  {
    src: "/cozy-hotel-double-room-with-wooden-furniture-and-s.jpg",
    alt: "Gemütliches Doppelzimmer",
  },
  {
    src: "/spacious-family-hotel-room-with-multiple-beds-and-.jpg",
    alt: "Familienzimmer",
  },
  {
    src: "/comfortable-single-hotel-room-with-warm-lighting-a.jpg",
    alt: "Einzelzimmer",
  },
  {
    src: "/beautiful-german-countryside-with-forest-and-meado.jpg",
    alt: "Naturnahe Umgebung",
  },
  {
    src: "/cozy-breakfast-room-with-regional-products.jpg",
    alt: "Frühstücksraum",
  },
]

export default function HomePage() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [bookingModalOpen, setBookingModalOpen] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroImages.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [])

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % heroImages.length)
  }

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + heroImages.length) % heroImages.length)
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section - Made full width with slider */}
      <section className="relative h-[85vh] flex items-center justify-center overflow-hidden">
        {/* Slider Images */}
        {heroImages.map((image, index) => (
          <img
            key={index}
            src={image.src || "/placeholder.svg"}
            alt={image.alt}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${
              index === currentSlide ? "opacity-100" : "opacity-0"
            }`}
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/60" />

        {/* Slider Controls */}
        <button
          onClick={prevSlide}
          className="absolute left-4 z-20 p-3 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm transition-colors"
          aria-label="Vorheriges Bild"
        >
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>
        <button
          onClick={nextSlide}
          className="absolute right-4 z-20 p-3 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm transition-colors"
          aria-label="Nächstes Bild"
        >
          <ChevronRight className="w-6 h-6 text-white" />
        </button>

        {/* Slider Indicators */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex gap-2">
          {heroImages.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentSlide ? "bg-white w-8" : "bg-white/50"
              }`}
              aria-label={`Gehe zu Bild ${index + 1}`}
            />
          ))}
        </div>

        <div className="relative z-10 text-center text-white px-4 max-w-4xl mx-auto">
          <h1 className="font-serif text-5xl md:text-7xl mb-6 text-balance">Pension Landstübchen</h1>
          <p className="text-xl md:text-2xl mb-8 text-balance leading-relaxed">Romantik auf dem Land in Viereck</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="bg-primary hover:bg-primary-hover text-white text-lg px-8">
              <Link href="/zimmer">Zimmer ansehen</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="bg-white/95 hover:bg-white text-foreground border-0 text-lg px-8"
            >
              <Link href="/kontakt">Kontakt aufnehmen</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Welcome Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-serif text-4xl md:text-5xl mb-6 text-primary">Herzlich willkommen</h2>
          <p className="text-lg leading-relaxed text-muted-foreground mb-4">
            Herzlich willkommen im "Landstübchen" in Viereck! Eingebettet von Wald und Wiesen befindet sich das kleine
            Dorf Viereck direkt am Radfernweg Berlin-Usedom. Die Nähe zum Haff, der Ueckermark sowie dem polnischen
            Stettin macht die Region für Sie attraktiv.
          </p>
          <p className="text-lg leading-relaxed text-muted-foreground">
            Ideal für alle, die Ruhe und Entspannung suchen.
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4 bg-muted">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-accent/20 flex items-center justify-center">
                <Trees className="w-8 h-8 text-accent" />
              </div>
              <h3 className="font-semibold mb-2">Naturnahe Lage</h3>
              <p className="text-sm text-muted-foreground">Umgeben von Wald und Wiesen</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-accent/20 flex items-center justify-center">
                <Wifi className="w-8 h-8 text-accent" />
              </div>
              <h3 className="font-semibold mb-2">Moderne Ausstattung</h3>
              <p className="text-sm text-muted-foreground">WLAN in allen Zimmern</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-accent/20 flex items-center justify-center">
                <Coffee className="w-8 h-8 text-accent" />
              </div>
              <h3 className="font-semibold mb-2">Frühstück</h3>
              <p className="text-sm text-muted-foreground">Regionale Produkte</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-accent/20 flex items-center justify-center">
                <Car className="w-8 h-8 text-accent" />
              </div>
              <h3 className="font-semibold mb-2">Kostenlose Parkplätze</h3>
              <p className="text-sm text-muted-foreground">Direkt am Haus</p>
            </div>
          </div>
        </div>
      </section>

      {/* Rooms Preview */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-serif text-4xl md:text-5xl mb-4 text-primary">Unsere Zimmer</h2>
            <p className="text-lg text-muted-foreground">
              Gemütlich eingerichtete Zimmer für Ihren perfekten Aufenthalt
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="overflow-hidden hover:shadow-xl transition-shadow">
              <Link href="/zimmer/doppelzimmer-komfort">
                <img
                  src="/cozy-hotel-double-room-with-wooden-furniture-and-s.jpg"
                  alt="Doppelzimmer Komfort"
                  className="w-full h-64 object-cover"
                />
                <CardContent className="p-6">
                  <h3 className="font-serif text-2xl mb-2">Doppelzimmer Komfort</h3>
                  <p className="text-muted-foreground mb-4">Geräumiges Zimmer mit Doppelbett und modernem Bad</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">2 Personen</span>
                    <span className="font-semibold text-primary">ab 75€ / Nacht</span>
                  </div>
                </CardContent>
              </Link>
            </Card>

            <Card className="overflow-hidden hover:shadow-xl transition-shadow">
              <Link href="/zimmer/einzelzimmer">
                <img
                  src="/comfortable-single-hotel-room-with-warm-lighting-a.jpg"
                  alt="Einzelzimmer"
                  className="w-full h-64 object-cover"
                />
                <CardContent className="p-6">
                  <h3 className="font-serif text-2xl mb-2">Einzelzimmer</h3>
                  <p className="text-muted-foreground mb-4">Gemütliches Zimmer für Alleinreisende</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">1 Person</span>
                    <span className="font-semibold text-primary">ab 55€ / Nacht</span>
                  </div>
                </CardContent>
              </Link>
            </Card>

            <Card className="overflow-hidden hover:shadow-xl transition-shadow">
              <Link href="/zimmer/familienzimmer">
                <img
                  src="/spacious-family-hotel-room-with-multiple-beds-and-.jpg"
                  alt="Familienzimmer"
                  className="w-full h-64 object-cover"
                />
                <CardContent className="p-6">
                  <h3 className="font-serif text-2xl mb-2">Familienzimmer</h3>
                  <p className="text-muted-foreground mb-4">Großzügiges Zimmer für die ganze Familie</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">4 Personen</span>
                    <span className="font-semibold text-primary">ab 120€ / Nacht</span>
                  </div>
                </CardContent>
              </Link>
            </Card>
          </div>

          <div className="text-center mt-12">
            <Button asChild size="lg" className="bg-primary hover:bg-primary-hover text-white">
              <Link href="/zimmer">Alle Zimmer ansehen</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-primary text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-serif text-4xl md:text-5xl mb-6">Bereit für Ihren Urlaub?</h2>
          <p className="text-xl mb-8 leading-relaxed">
            Buchen Sie jetzt Ihr Zimmer und erleben Sie die Ruhe des Landlebens
          </p>
          <Button
            onClick={() => setBookingModalOpen(true)}
            size="lg"
            variant="outline"
            className="bg-white text-primary hover:bg-white/90 border-0 text-lg px-8"
          >
            Jetzt anfragen
          </Button>
        </div>
      </section>

      {/* Booking Modal */}
      <BookingModal open={bookingModalOpen} onOpenChange={setBookingModalOpen} />
    </div>
  )
}
