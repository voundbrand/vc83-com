"use client"

import { useState } from "react"
import { SiteHeader } from "@/components/site-header"
import { BakeryMap } from "@/components/bakery-map"
import { getBakeries, getUniqueCities, type Bakery } from "@/lib/bakeries"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MapPin, Star, Truck, Store, Calendar, Map, List } from "lucide-react"
import Link from "next/link"

export default function BakeriesPage() {
  const bakeries = getBakeries()
  const cities = getUniqueCities()
  const [selectedCity, setSelectedCity] = useState<string>("all")
  const [deliveryFilter, setDeliveryFilter] = useState<"all" | "delivery" | "pickup">("all")
  const [selectedBakery, setSelectedBakery] = useState<Bakery | null>(null)

  const filteredBakeries = bakeries.filter((bakery) => {
    const cityMatch = selectedCity === "all" || bakery.location.startsWith(selectedCity)
    const deliveryMatch =
      deliveryFilter === "all" ||
      (deliveryFilter === "delivery" && bakery.deliveryAvailable) ||
      (deliveryFilter === "pickup" && bakery.pickupOnly)
    return cityMatch && deliveryMatch
  })

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto px-4 py-12">
        <div className="mb-12 text-center">
          <h1 className="mb-4 font-serif text-4xl font-bold text-foreground md:text-5xl">Unsere Partner-Bäckereien</h1>
          <p className="mx-auto max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Entdecken Sie die talentierten Bäcker und Bäckerinnen, die privatebread.com zu einem besonderen Ort machen.
          </p>
        </div>

        <div className="mb-8 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground">Stadt:</span>
            <Button
              variant={selectedCity === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCity("all")}
            >
              Alle Städte
            </Button>
            {cities.map((city) => (
              <Button
                key={city}
                variant={selectedCity === city ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCity(city)}
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
              Alle Services
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

        <Tabs defaultValue="list" className="w-full">
          <TabsList className="mb-6 grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="list" className="gap-2">
              <List className="h-4 w-4" />
              Listen-Ansicht
            </TabsTrigger>
            <TabsTrigger value="map" className="gap-2">
              <Map className="h-4 w-4" />
              Karten-Ansicht
            </TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="mt-0">
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {filteredBakeries.map((bakery) => (
                <Card key={bakery.id} className="group overflow-hidden transition-all hover:shadow-lg">
                  <div className="aspect-video overflow-hidden bg-muted">
                    <img
                      src={bakery.image || "/placeholder.svg"}
                      alt={bakery.name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                  <CardHeader className="space-y-3">
                    <div className="space-y-1">
                      <h2 className="font-serif text-2xl font-bold leading-tight">{bakery.name}</h2>
                      <p className="text-sm text-muted-foreground">von {bakery.owner}</p>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-primary text-primary" />
                        <span className="font-semibold">{bakery.rating}</span>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>Seit {bakery.founded}</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm leading-relaxed text-muted-foreground">{bakery.description}</p>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{bakery.location}</span>
                      </div>
                      {bakery.deliveryAvailable ? (
                        <Badge variant="default" className="w-fit gap-1.5">
                          <Truck className="h-3 w-3" />
                          Lieferung verfügbar ({bakery.deliveryRadius})
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="w-fit gap-1.5">
                          <Store className="h-3 w-3" />
                          Nur Abholung
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="border-t bg-muted/20">
                    <Button asChild className="w-full">
                      <Link href={`/backereien/${bakery.id}`}>Zur Bäckerei</Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>

            {filteredBakeries.length === 0 && (
              <div className="py-12 text-center">
                <p className="text-muted-foreground">Keine Bäckereien gefunden für diese Filter.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="map" className="mt-0">
            <div className="space-y-6">
              <BakeryMap
                bakeries={filteredBakeries}
                selectedBakery={selectedBakery}
                onSelectBakery={setSelectedBakery}
              />

              {selectedBakery && (
                <Card className="overflow-hidden">
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="aspect-video overflow-hidden bg-muted md:aspect-square">
                      <img
                        src={selectedBakery.image || "/placeholder.svg"}
                        alt={selectedBakery.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="flex flex-col justify-between p-6">
                      <div className="space-y-4">
                        <div>
                          <h2 className="mb-1 font-serif text-3xl font-bold">{selectedBakery.name}</h2>
                          <p className="text-muted-foreground">von {selectedBakery.owner}</p>
                        </div>
                        <p className="text-sm leading-relaxed text-muted-foreground">{selectedBakery.description}</p>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span>{selectedBakery.location}</span>
                          </div>
                          {selectedBakery.deliveryAvailable ? (
                            <Badge variant="default" className="w-fit gap-1.5">
                              <Truck className="h-3 w-3" />
                              Lieferung verfügbar ({selectedBakery.deliveryRadius})
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="w-fit gap-1.5">
                              <Store className="h-3 w-3" />
                              Nur Abholung
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button asChild className="mt-4 w-full">
                        <Link href={`/backereien/${selectedBakery.id}`}>Zur Bäckerei</Link>
                      </Button>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
