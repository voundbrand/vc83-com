"use client"

import { useState } from "react"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import type { Bread } from "@/components/bread-grid"
import { ShoppingCart, Weight, User, Eye, Truck, Store } from "lucide-react"
import { addToCart } from "@/lib/cart"
import Link from "next/link"

interface BreadCardProps {
  bread: Bread & { deliveryAvailable?: boolean; pickupOnly?: boolean }
}

export function BreadCard({ bread }: BreadCardProps) {
  const [adding, setAdding] = useState(false)
  const { toast } = useToast()

  const handleAddToCart = () => {
    setAdding(true)

    addToCart(
      {
        breadId: bread.id,
        breadName: bread.name,
        breadType: bread.type,
        baker: bread.baker,
        priceEur: bread.priceEur,
        priceBreadcoin: bread.priceBreadcoin,
        image: bread.image,
        deliveryAvailable: bread.deliveryAvailable,
        pickupOnly: bread.pickupOnly,
      },
      1,
    )

    setTimeout(() => {
      setAdding(false)
      toast({
        title: "Zum Warenkorb hinzugefügt!",
        description: `${bread.name} wurde erfolgreich hinzugefügt.`,
      })
    }, 300)
  }

  return (
    <Card className="group overflow-hidden transition-all hover:shadow-lg">
      <Link href={`/brot/${bread.id}`}>
        <div className="aspect-[4/3] overflow-hidden bg-muted cursor-pointer relative">
          <img
            src={bread.image || `/artisan-.jpg?height=400&width=600&query=artisan ${bread.type} bread freshly baked`}
            alt={bread.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute top-3 right-3">
            {bread.deliveryAvailable ? (
              <Badge className="gap-1 bg-primary/90 backdrop-blur-sm">
                <Truck className="h-3 w-3" />
                Lieferung
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1 backdrop-blur-sm">
                <Store className="h-3 w-3" />
                Abholung
              </Badge>
            )}
          </div>
        </div>
      </Link>
      <CardHeader className="space-y-2 pb-3">
        <div className="flex items-start justify-between gap-2">
          <Link href={`/brot/${bread.id}`} className="hover:underline">
            <h3 className="font-serif text-xl font-semibold leading-tight line-clamp-1">{bread.name}</h3>
          </Link>
          <Badge variant="secondary" className="shrink-0">
            {bread.type}
          </Badge>
        </div>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <User className="h-3.5 w-3.5" />
          <span className="line-clamp-1">{bread.baker}</span>
        </div>
      </CardHeader>
      <CardContent className="pb-3">
        <p className="text-sm leading-relaxed text-muted-foreground line-clamp-2">{bread.description}</p>
        <div className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
          <Weight className="h-3.5 w-3.5" />
          <span>{bread.weight}</span>
        </div>
      </CardContent>
      <CardFooter className="flex items-center justify-between border-t bg-muted/20 pt-4">
        <div className="flex flex-col gap-1">
          <p className="font-serif text-2xl font-bold text-primary">€{bread.priceEur.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground">oder ₿{bread.priceBreadcoin.toFixed(3)} BC</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" asChild className="gap-1.5 bg-transparent">
            <Link href={`/brot/${bread.id}`}>
              <Eye className="h-3.5 w-3.5" />
              Details
            </Link>
          </Button>
          <Button size="sm" className="gap-2" onClick={handleAddToCart} disabled={adding}>
            <ShoppingCart className="h-4 w-4" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}
