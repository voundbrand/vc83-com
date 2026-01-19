"use client"

import { useRef, useState } from "react"
import type { Bakery } from "@/lib/bakeries"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, Store, Truck } from "lucide-react"

interface BakeryMapProps {
  bakeries: Bakery[]
  selectedBakery?: Bakery | null
  onSelectBakery?: (bakery: Bakery) => void
}

export function BakeryMap({ bakeries, selectedBakery, onSelectBakery }: BakeryMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [hoveredBakery, setHoveredBakery] = useState<Bakery | null>(null)

  return (
    <div className="relative h-[500px] w-full overflow-hidden rounded-lg border bg-muted">
      {/* Static Map with Markers */}
      <div ref={mapRef} className="relative h-full w-full bg-gradient-to-br from-blue-50 to-green-50">
        {/* Map grid background */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `
              linear-gradient(to right, #cbd5e1 1px, transparent 1px),
              linear-gradient(to bottom, #cbd5e1 1px, transparent 1px)
            `,
            backgroundSize: "40px 40px",
          }}
        />

        {/* Bakery Markers */}
        {bakeries.map((bakery) => {
          // Simple positioning based on lat/lng (simplified map projection)
          const top = ((52.52 - bakery.lat) / (52.52 - 48.1351)) * 80 + 10
          const left = ((bakery.lng - 6.9603) / (13.405 - 6.9603)) * 80 + 10
          const isSelected = selectedBakery?.id === bakery.id
          const isHovered = hoveredBakery?.id === bakery.id

          return (
            <button
              key={bakery.id}
              onClick={() => onSelectBakery?.(bakery)}
              onMouseEnter={() => setHoveredBakery(bakery)}
              onMouseLeave={() => setHoveredBakery(null)}
              className="group absolute z-10 -translate-x-1/2 -translate-y-full transition-transform hover:scale-110"
              style={{
                top: `${top}%`,
                left: `${left}%`,
              }}
            >
              {/* Marker Pin */}
              <div
                className={`relative flex h-10 w-10 items-center justify-center rounded-full border-2 shadow-lg transition-all ${
                  isSelected
                    ? "scale-125 border-primary bg-primary text-primary-foreground"
                    : "border-white bg-background text-primary hover:border-primary"
                }`}
              >
                <Store className="h-5 w-5" />
              </div>

              {/* Tooltip on hover */}
              {(isHovered || isSelected) && (
                <Card className="absolute left-1/2 top-full mt-2 w-64 -translate-x-1/2 shadow-xl">
                  <CardContent className="p-4">
                    <h3 className="mb-1 font-serif text-lg font-bold">{bakery.name}</h3>
                    <p className="mb-2 text-sm text-muted-foreground">{bakery.location}</p>
                    <div className="flex items-center gap-2">
                      {bakery.deliveryAvailable ? (
                        <Badge variant="default" className="gap-1 text-xs">
                          <Truck className="h-3 w-3" />
                          Lieferung
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1 text-xs">
                          <Store className="h-3 w-3" />
                          Abholung
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </button>
          )
        })}

        {/* City Labels */}
        <div className="absolute left-[15%] top-[20%] text-sm font-semibold text-muted-foreground">Berlin</div>
        <div className="absolute left-[60%] top-[85%] text-sm font-semibold text-muted-foreground">München</div>
        <div className="absolute left-[25%] top-[10%] text-sm font-semibold text-muted-foreground">Hamburg</div>
        <div className="absolute left-[12%] top-[50%] text-sm font-semibold text-muted-foreground">Köln</div>
        <div className="absolute left-[40%] top-[65%] text-sm font-semibold text-muted-foreground">Frankfurt</div>
        <div className="absolute left-[50%] top-[80%] text-sm font-semibold text-muted-foreground">Stuttgart</div>
      </div>

      {/* Map Legend */}
      <div className="absolute bottom-4 left-4 rounded-lg border bg-background/95 p-3 shadow-lg backdrop-blur">
        <div className="flex items-center gap-2 text-sm">
          <MapPin className="h-4 w-4 text-primary" />
          <span className="font-medium">{bakeries.length} Bäckereien</span>
        </div>
      </div>
    </div>
  )
}
