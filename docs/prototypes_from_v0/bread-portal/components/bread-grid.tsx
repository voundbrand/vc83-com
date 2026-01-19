"use client"

import { useState, useEffect } from "react"
import { BreadCard } from "@/components/bread-card"
import { Button } from "@/components/ui/button"
import { Truck, Store } from "lucide-react"
import { getUniqueCities } from "@/lib/bakeries"

export interface Bread {
  id: string
  name: string
  baker: string
  description: string
  priceEur: number
  priceBreadcoin: number
  type: string
  weight: string
  available: boolean
  image?: string
  deliveryAvailable?: boolean
  pickupOnly?: boolean
}

const SAMPLE_BREADS: Bread[] = [
  {
    id: "1",
    name: "Klassisches Sauerteigbrot",
    baker: "Sarahs Backstube",
    description:
      "Traditionelles Sauerteigbrot mit knuspriger Kruste und würzigem Geschmack. Mit 72-Stunden-Fermentation hergestellt.",
    priceEur: 8.5,
    priceBreadcoin: 0.085,
    type: "Sauerteig",
    weight: "800g",
    available: true,
    image: "/bread-sourdough.jpg",
    deliveryAvailable: true,
    pickupOnly: false,
  },
  {
    id: "2",
    name: "Honig-Vollkornbrot",
    baker: "Goldene Körner Co.",
    description: "Weiches Vollkornbrot gesüßt mit lokalem Honig. Perfekt für Sandwiches.",
    priceEur: 6.0,
    priceBreadcoin: 0.06,
    type: "Vollkorn",
    weight: "600g",
    available: true,
    image: "/bread-wheat.jpg",
    deliveryAvailable: true,
    pickupOnly: false,
  },
  {
    id: "3",
    name: "Rosmarin-Focaccia",
    baker: "Mediterrane Backwaren",
    description: "Fluffige italienische Focaccia mit frischem Rosmarin und Meersalz.",
    priceEur: 7.5,
    priceBreadcoin: 0.075,
    type: "Focaccia",
    weight: "500g",
    available: true,
    image: "/bread-focaccia.jpg",
    deliveryAvailable: false,
    pickupOnly: true,
  },
  {
    id: "4",
    name: "Mehrkorn mit Samen",
    baker: "Ernte-Heim-Bäckerei",
    description: "Dichtes, nahrhaftes Brot vollgepackt mit Sonnenblumen-, Kürbis- und Sesamsamen.",
    priceEur: 9.0,
    priceBreadcoin: 0.09,
    type: "Mehrkorn",
    weight: "900g",
    available: true,
    image: "/bread-multigrain.jpg",
    deliveryAvailable: true,
    pickupOnly: false,
  },
  {
    id: "5",
    name: "Zimt-Rosinenbrot",
    baker: "Süße Morgenbrote",
    description: "Weiches geschwungenes Brot mit Zimtzucker und prallen Rosinen. Ideal zum Frühstück.",
    priceEur: 7.0,
    priceBreadcoin: 0.07,
    type: "Süßbrot",
    weight: "700g",
    available: true,
    image: "/bread-cinnamon-raisin.jpg",
    deliveryAvailable: false,
    pickupOnly: true,
  },
  {
    id: "6",
    name: "Französisches Baguette",
    baker: "La Boulangerie",
    description: "Authentisches französisches Baguette mit goldener Kruste und luftiger Krume.",
    priceEur: 5.5,
    priceBreadcoin: 0.055,
    type: "Baguette",
    weight: "400g",
    available: true,
    image: "/bread-baguette.jpg",
    deliveryAvailable: true,
    pickupOnly: false,
  },
]

export function BreadGrid() {
  const [breads, setBreads] = useState<Bread[]>(SAMPLE_BREADS)
  const [deliveryFilter, setDeliveryFilter] = useState<"all" | "delivery" | "pickup">("all")
  const [locationFilter, setLocationFilter] = useState<string>("all")

  const cities = getUniqueCities()

  useEffect(() => {
    // Load breads from localStorage
    const stored = localStorage.getItem("breads")
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setBreads([...SAMPLE_BREADS, ...parsed])
      } catch (e) {
        console.error("Failed to parse stored breads:", e)
      }
    }
  }, [])

  const filteredBreads = breads.filter((bread) => {
    const deliveryMatch =
      deliveryFilter === "all" ||
      (deliveryFilter === "delivery" && bread.deliveryAvailable) ||
      (deliveryFilter === "pickup" && bread.pickupOnly)

    const locationMatch = locationFilter === "all" || bread.baker.includes(locationFilter)

    return deliveryMatch && locationMatch
  })

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground">Stadt:</span>
          <Button
            variant={locationFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setLocationFilter("all")}
          >
            Alle Städte
          </Button>
          {cities.map((city) => (
            <Button
              key={city}
              variant={locationFilter === city ? "default" : "outline"}
              size="sm"
              onClick={() => setLocationFilter(city)}
            >
              {city}
            </Button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground">Service:</span>
          <Button
            variant={deliveryFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setDeliveryFilter("all")}
          >
            Alle Brote
          </Button>
          <Button
            variant={deliveryFilter === "delivery" ? "default" : "outline"}
            size="sm"
            onClick={() => setDeliveryFilter("delivery")}
            className="gap-1.5"
          >
            <Truck className="h-4 w-4" />
            Mit Lieferung
          </Button>
          <Button
            variant={deliveryFilter === "pickup" ? "default" : "outline"}
            size="sm"
            onClick={() => setDeliveryFilter("pickup")}
            className="gap-1.5"
          >
            <Store className="h-4 w-4" />
            Nur Abholung
          </Button>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredBreads.map((bread) => (
          <BreadCard key={bread.id} bread={bread} />
        ))}
      </div>

      {filteredBreads.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-muted-foreground">Keine Brote gefunden für diesen Filter.</p>
        </div>
      )}
    </div>
  )
}
