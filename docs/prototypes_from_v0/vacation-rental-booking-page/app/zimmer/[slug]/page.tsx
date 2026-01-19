"use client"

import { use } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { BookingWidget } from "@/components/booking-widget"
import { Users, Bed, Maximize, Wifi, Tv, Coffee, Bath, Wind } from "lucide-react"
import { ChevronLeft } from "lucide-react"

const roomsData: Record<string, any> = {
  "doppelzimmer-komfort": {
    name: "Doppelzimmer Komfort",
    description:
      "Unser geräumiges Doppelzimmer bietet Ihnen allen Komfort für einen erholsamen Aufenthalt. Das Zimmer ist liebevoll eingerichtet und verfügt über ein modernes Badezimmer mit Dusche.",
    price: 75,
    guests: 2,
    size: "25 m²",
    images: [
      "/cozy-hotel-double-room-with-wooden-furniture-and-s.jpg",
      "/modern-hotel-bathroom-with-shower-and-wooden-detai.jpg",
      "/hotel-room-desk-area-with-window-and-natural-light.jpg",
      "/comfortable-hotel-bed-with-soft-pillows-and-warm-l.jpg",
    ],
    amenities: [
      { icon: Bed, label: "Doppelbett (180x200 cm)" },
      { icon: Bath, label: "Eigenes Bad mit Dusche" },
      { icon: Wifi, label: "Kostenloses WLAN" },
      { icon: Tv, label: "Flachbild-TV" },
      { icon: Coffee, label: "Kaffee & Tee" },
      { icon: Wind, label: "Heizung" },
    ],
    features: [
      "Schreibtisch mit Stuhl",
      "Kleiderschrank",
      "Nachttischlampen",
      "Verdunklungsvorhänge",
      "Handtücher & Bettwäsche",
      "Föhn",
    ],
  },
  einzelzimmer: {
    name: "Einzelzimmer",
    description:
      "Perfekt für Alleinreisende. Unser gemütliches Einzelzimmer bietet alles, was Sie für einen angenehmen Aufenthalt benötigen. Trotz der kompakten Größe fehlt es an nichts.",
    price: 55,
    guests: 1,
    size: "18 m²",
    images: [
      "/comfortable-single-hotel-room-with-warm-lighting-a.jpg",
      "/single-bed-with-cozy-bedding-and-reading-lamp.jpg",
      "/images/sunset-beach-villa-room-6.png",
      "/hotel-room-window-with-countryside-view.jpg",
    ],
    amenities: [
      { icon: Bed, label: "Einzelbett (90x200 cm)" },
      { icon: Bath, label: "Eigenes Bad mit Dusche" },
      { icon: Wifi, label: "Kostenloses WLAN" },
      { icon: Tv, label: "Flachbild-TV" },
      { icon: Coffee, label: "Kaffee & Tee" },
      { icon: Wind, label: "Heizung" },
    ],
    features: [
      "Kleiderschrank",
      "Nachttischlampe",
      "Verdunklungsvorhänge",
      "Handtücher & Bettwäsche",
      "Föhn",
      "Leseecke",
    ],
  },
  familienzimmer: {
    name: "Familienzimmer",
    description:
      "Großzügiges Zimmer für die ganze Familie mit separatem Schlafbereich für Kinder. Das Familienzimmer bietet viel Platz und eine gemütliche Atmosphäre für einen unvergesslichen Familienurlaub.",
    price: 120,
    guests: 4,
    size: "35 m²",
    images: [
      "/spacious-family-hotel-room-with-multiple-beds-and-.jpg",
      "/family-room-with-separate-sleeping-area-for-childr.jpg",
      "/family-hotel-room-sitting-area-with-table.jpg",
      "/large-hotel-bathroom-with-bathtub.jpg",
    ],
    amenities: [
      { icon: Bed, label: "Doppelbett + 2 Einzelbetten" },
      { icon: Bath, label: "Großes Bad mit Badewanne" },
      { icon: Wifi, label: "Kostenloses WLAN" },
      { icon: Tv, label: "Flachbild-TV" },
      { icon: Coffee, label: "Kaffee & Tee" },
      { icon: Wind, label: "Heizung" },
    ],
    features: [
      "Sitzecke mit Tisch",
      "Großer Kleiderschrank",
      "Spielecke für Kinder",
      "Verdunklungsvorhänge",
      "Handtücher & Bettwäsche",
      "Föhn",
      "Babybett auf Anfrage",
    ],
  },
  "doppelzimmer-standard": {
    name: "Doppelzimmer Standard",
    description:
      "Unser klassisches Doppelzimmer mit allem, was Sie brauchen. Gemütlich eingerichtet und mit Blick ins Grüne bietet es Ihnen einen erholsamen Aufenthalt zu einem fairen Preis.",
    price: 65,
    guests: 2,
    size: "22 m²",
    images: [
      "/classic-double-hotel-room-with-traditional-furnitu.jpg",
      "/double-bed-with-white-linens-and-wooden-headboard.jpg",
      "/standard-hotel-bathroom-with-shower.jpg",
      "/placeholder.svg?height=600&width=900",
    ],
    amenities: [
      { icon: Bed, label: "Doppelbett (160x200 cm)" },
      { icon: Bath, label: "Eigenes Bad mit Dusche" },
      { icon: Wifi, label: "Kostenloses WLAN" },
      { icon: Tv, label: "Flachbild-TV" },
      { icon: Coffee, label: "Kaffee & Tee" },
      { icon: Wind, label: "Heizung" },
    ],
    features: [
      "Kleiderschrank",
      "Nachttischlampen",
      "Verdunklungsvorhänge",
      "Handtücher & Bettwäsche",
      "Föhn",
      "Blick ins Grüne",
    ],
  },
}

export default function RoomDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const room = roomsData[slug]

  if (!room) {
    return <div>Zimmer nicht gefunden</div>
  }

  return (
    <div className="min-h-screen pt-20">
      {/* Back Button */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <Button asChild variant="ghost" className="gap-2">
          <Link href="/zimmer">
            <ChevronLeft className="w-4 h-4" />
            Zurück zur Übersicht
          </Link>
        </Button>
      </div>

      {/* Image Gallery */}
      <section className="px-4 mb-12">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="md:row-span-2">
              <img
                src={room.images[0] || "/placeholder.svg"}
                alt={room.name}
                className="w-full h-full object-cover rounded-lg min-h-[400px]"
              />
            </div>
            {room.images.slice(1, 4).map((image: string, index: number) => (
              <img
                key={index}
                src={image || "/placeholder.svg"}
                alt={`${room.name} ${index + 2}`}
                className="w-full h-48 md:h-full object-cover rounded-lg"
              />
            ))}
          </div>
        </div>
      </section>

      {/* Room Details */}
      <section className="px-4 mb-12">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <h1 className="font-serif text-4xl md:text-5xl mb-4 text-primary">{room.name}</h1>

              <div className="flex items-center gap-6 mb-6 text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  <span>
                    {room.guests} {room.guests === 1 ? "Person" : "Personen"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Maximize className="w-5 h-5" />
                  <span>{room.size}</span>
                </div>
              </div>

              <p className="text-lg leading-relaxed text-muted-foreground mb-8">{room.description}</p>

              <Card className="mb-8">
                <CardContent className="p-6">
                  <h2 className="font-semibold text-xl mb-4">Ausstattung</h2>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {room.amenities.map((amenity: any, index: number) => {
                      const Icon = amenity.icon
                      return (
                        <div key={index} className="flex items-center gap-3">
                          <Icon className="w-5 h-5 text-accent" />
                          <span>{amenity.label}</span>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <h2 className="font-semibold text-xl mb-4">Weitere Merkmale</h2>
                  <ul className="grid sm:grid-cols-2 gap-3">
                    {room.features.map((feature: string, index: number) => (
                      <li key={index} className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-1">
              <div className="sticky top-24">
                <BookingWidget roomName={room.name} price={room.price} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Additional Info */}
      <section className="py-12 px-4 bg-muted">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-serif text-3xl mb-6 text-center text-primary">Wichtige Informationen</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-3">Check-in / Check-out</h3>
                <p className="text-muted-foreground">
                  Check-in: ab 15:00 Uhr
                  <br />
                  Check-out: bis 11:00 Uhr
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-3">Stornierungsbedingungen</h3>
                <p className="text-muted-foreground">Kostenlose Stornierung bis 7 Tage vor Anreise</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-3">Frühstück</h3>
                <p className="text-muted-foreground">Optional buchbar für 12€ pro Person</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-3">Haustiere</h3>
                <p className="text-muted-foreground">Auf Anfrage erlaubt (10€ pro Nacht)</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  )
}
