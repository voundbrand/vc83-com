"use client"

import { use } from "react"
import { SiteHeader } from "@/components/site-header"
import { getBakeryById } from "@/lib/bakeries"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { MapPin, Star, Truck, Store, Calendar, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"

interface BakeryPageProps {
  params: Promise<{ id: string }>
}

export default function BakeryPage({ params }: BakeryPageProps) {
  const { id } = use(params)
  const bakery = getBakeryById(id)

  if (!bakery) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto px-4 py-12">
        <Button variant="ghost" asChild className="mb-6 gap-2">
          <Link href="/backereien">
            <ArrowLeft className="h-4 w-4" />
            Zurück zu allen Bäckereien
          </Link>
        </Button>

        <div className="grid gap-8 lg:grid-cols-2">
          <div className="aspect-video overflow-hidden rounded-lg bg-muted lg:aspect-square">
            <img src={bakery.image || "/placeholder.svg"} alt={bakery.name} className="h-full w-full object-cover" />
          </div>

          <div className="space-y-6">
            <div>
              <h1 className="mb-2 font-serif text-4xl font-bold md:text-5xl">{bakery.name}</h1>
              <p className="text-xl text-muted-foreground">von {bakery.owner}</p>
            </div>

            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 fill-primary text-primary" />
                <span className="text-lg font-semibold">{bakery.rating} / 5.0</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-5 w-5" />
                <span>Gegründet {bakery.founded}</span>
              </div>
            </div>

            <Card>
              <CardContent className="space-y-4 pt-6">
                <div className="flex items-start gap-3">
                  <MapPin className="mt-1 h-5 w-5 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="font-semibold">Standort</p>
                    <p className="text-muted-foreground">{bakery.location}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  {bakery.deliveryAvailable ? (
                    <>
                      <Truck className="mt-1 h-5 w-5 shrink-0 text-primary" />
                      <div>
                        <p className="font-semibold">Lieferung verfügbar</p>
                        <p className="text-muted-foreground">Bis zu {bakery.deliveryRadius} Umkreis</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <Store className="mt-1 h-5 w-5 shrink-0 text-muted-foreground" />
                      <div>
                        <p className="font-semibold">Nur Abholung</p>
                        <p className="text-muted-foreground">Lieferung nicht verfügbar</p>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            <div>
              <h2 className="mb-3 font-serif text-2xl font-bold">Über uns</h2>
              <p className="text-muted-foreground leading-relaxed">{bakery.description}</p>
            </div>

            <div className="rounded-lg bg-muted/50 p-4">
              <p className="text-center text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{bakery.totalBreads}</span> verschiedene Brotsorten
                verfügbar
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
