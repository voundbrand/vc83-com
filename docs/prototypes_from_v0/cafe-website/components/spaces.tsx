"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Coffee, Laptop, Building2, Bed } from "lucide-react"
import { BookingModal } from "./booking-modal"

const spaces = [
  {
    icon: Coffee,
    title: "Café",
    description:
      "Genießen Sie hausgemachte Kuchen, frisch gebrühten Kaffee und regionale Spezialitäten in historischem Ambiente.",
    image: "/cozy-rustic-cafe-interior-with-wooden-tables.jpg",
  },
  {
    icon: Laptop,
    title: "Co-Working Space",
    description:
      "Arbeiten Sie produktiv in inspirierender Umgebung mit schnellem WLAN, ergonomischen Arbeitsplätzen und Kaffee-Flatrate.",
    image: "/modern-coworking-space-in-historic-building.jpg",
  },
  {
    icon: Building2,
    title: "Gutsmuseum",
    description:
      "Tauchen Sie ein in die faszinierende Geschichte des Ritterguts und der Region. Wechselnde Ausstellungen und Führungen.",
    image: "/historic-estate-museum-with-artifacts-and-exhibits.jpg",
  },
  {
    icon: Bed,
    title: "Gästezimmer",
    description: "Übernachten Sie in stilvoll eingerichteten Zimmern mit modernem Komfort und historischem Charme.",
    image: "/elegant-guest-room-in-historic-manor.jpg",
  },
]

export function Spaces() {
  const [bookingOpen, setBookingOpen] = useState(false)

  return (
    <>
      <section id="spaces" className="py-20 md:py-32 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4 text-balance">
              Unsere Räume
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-balance">
              Vier einzigartige Bereiche unter einem Dach – jeder mit seinem eigenen Charakter
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
            {spaces.map((space, index) => {
              const Icon = space.icon
              return (
                <Card key={index} className="overflow-hidden border-0 shadow-lg hover:shadow-xl transition-shadow">
                  <div className="relative h-64 overflow-hidden">
                    <img
                      src={space.image || "/placeholder.svg"}
                      alt={space.title}
                      className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                    />
                  </div>
                  <CardContent className="p-6 md:p-8">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Icon className="w-6 h-6 text-primary" />
                      </div>
                      <h3 className="font-serif text-2xl font-bold text-foreground">{space.title}</h3>
                    </div>
                    <p className="text-foreground/70 leading-relaxed mb-6">{space.description}</p>
                    <Button onClick={() => setBookingOpen(true)} className="w-full">
                      Buchen
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      <BookingModal open={bookingOpen} onOpenChange={setBookingOpen} />
    </>
  )
}
