import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, Bed } from "lucide-react"

const rooms = [
  {
    id: "doppelzimmer-komfort",
    name: "Doppelzimmer Komfort",
    description:
      "Unser geräumiges Doppelzimmer bietet Ihnen allen Komfort für einen erholsamen Aufenthalt. Mit modernem Bad und gemütlicher Einrichtung.",
    price: 75,
    guests: 2,
    size: "25 m²",
    image: "/cozy-hotel-double-room-with-wooden-furniture-and-s.jpg",
    amenities: ["Doppelbett", "Eigenes Bad", "WLAN", "TV", "Schreibtisch"],
  },
  {
    id: "einzelzimmer",
    name: "Einzelzimmer",
    description:
      "Perfekt für Alleinreisende. Unser gemütliches Einzelzimmer bietet alles, was Sie für einen angenehmen Aufenthalt benötigen.",
    price: 55,
    guests: 1,
    size: "18 m²",
    image: "/comfortable-single-hotel-room-with-warm-lighting-a.jpg",
    amenities: ["Einzelbett", "Eigenes Bad", "WLAN", "TV", "Kleiderschrank"],
  },
  {
    id: "familienzimmer",
    name: "Familienzimmer",
    description:
      "Großzügiges Zimmer für die ganze Familie mit separatem Schlafbereich für Kinder. Ideal für einen Familienurlaub auf dem Land.",
    price: 120,
    guests: 4,
    size: "35 m²",
    image: "/spacious-family-hotel-room-with-multiple-beds-and-.jpg",
    amenities: ["Doppelbett", "2 Einzelbetten", "Eigenes Bad", "WLAN", "TV", "Sitzecke"],
  },
  {
    id: "doppelzimmer-standard",
    name: "Doppelzimmer Standard",
    description:
      "Unser klassisches Doppelzimmer mit allem, was Sie brauchen. Gemütlich eingerichtet und mit Blick ins Grüne.",
    price: 65,
    guests: 2,
    size: "22 m²",
    image: "/classic-double-hotel-room-with-traditional-furnitu.jpg",
    amenities: ["Doppelbett", "Eigenes Bad", "WLAN", "TV"],
  },
]

export default function ZimmerPage() {
  return (
    <div className="min-h-screen pt-20">
      {/* Header */}
      <section className="py-16 px-4 bg-muted">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="font-serif text-5xl md:text-6xl mb-6 text-primary">Unsere Zimmer</h1>
          <p className="text-xl text-muted-foreground leading-relaxed">
            Wählen Sie aus unseren gemütlich eingerichteten Zimmern das perfekte für Ihren Aufenthalt
          </p>
        </div>
      </section>

      {/* Rooms Grid */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid gap-12">
            {rooms.map((room, index) => (
              <Card key={room.id} className="overflow-hidden">
                <div className={`grid md:grid-cols-2 gap-0 ${index % 2 === 1 ? "md:grid-flow-dense" : ""}`}>
                  <div className={index % 2 === 1 ? "md:col-start-2" : ""}>
                    <img
                      src={room.image || "/placeholder.svg"}
                      alt={room.name}
                      className="w-full h-full object-cover min-h-[300px]"
                    />
                  </div>
                  <CardContent className="p-8 flex flex-col justify-center">
                    <h2 className="font-serif text-3xl mb-3 text-primary">{room.name}</h2>
                    <p className="text-muted-foreground mb-6 leading-relaxed">{room.description}</p>

                    <div className="flex items-center gap-6 mb-6 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        <span>
                          {room.guests} {room.guests === 1 ? "Person" : "Personen"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Bed className="w-4 h-4" />
                        <span>{room.size}</span>
                      </div>
                    </div>

                    <div className="mb-6">
                      <h3 className="font-semibold mb-3">Ausstattung:</h3>
                      <div className="flex flex-wrap gap-2">
                        {room.amenities.map((amenity) => (
                          <span key={amenity} className="px-3 py-1 bg-muted text-sm rounded-full">
                            {amenity}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-6 border-t border-border">
                      <div>
                        <span className="text-3xl font-bold text-primary">€{room.price}</span>
                        <span className="text-muted-foreground ml-2">/ Nacht</span>
                      </div>
                      <Button asChild className="bg-primary hover:bg-primary-hover text-white">
                        <Link href={`/zimmer/${room.id}`}>Details ansehen</Link>
                      </Button>
                    </div>
                  </CardContent>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 bg-accent/10">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-serif text-4xl mb-6 text-primary">Haben Sie Fragen?</h2>
          <p className="text-lg text-muted-foreground mb-8">
            Wir beraten Sie gerne bei der Auswahl des passenden Zimmers
          </p>
          <Button asChild size="lg" className="bg-primary hover:bg-primary-hover text-white">
            <Link href="/kontakt">Kontakt aufnehmen</Link>
          </Button>
        </div>
      </section>
    </div>
  )
}
