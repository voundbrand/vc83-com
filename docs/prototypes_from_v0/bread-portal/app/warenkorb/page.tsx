"use client"

import { useEffect, useState } from "react"
import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { getCart, removeFromCart, updateCartItemQuantity, getCartTotal, type CartItem } from "@/lib/cart"
import { ShoppingBag, Trash2, Plus, Minus, Truck, Store, User, UserPlus } from "lucide-react"
import Link from "next/link"
import { getCurrentUser } from "@/lib/auth"
import { AuthDialog } from "@/components/auth-dialog"

export default function CartPage() {
  const [cart, setCart] = useState<CartItem[]>([])
  const [totals, setTotals] = useState({ totalEur: 0, totalBreadcoin: 0, itemCount: 0 })
  const [user, setUser] = useState(getCurrentUser())

  useEffect(() => {
    updateCart()
    window.addEventListener("cartUpdated", updateCart)
    return () => window.removeEventListener("cartUpdated", updateCart)
  }, [])

  const updateCart = () => {
    setCart(getCart())
    setTotals(getCartTotal())
  }

  const handleAuthSuccess = () => {
    setUser(getCurrentUser())
  }

  const handleQuantityChange = (breadId: number, newQuantity: number) => {
    if (newQuantity >= 1) {
      updateCartItemQuantity(breadId, newQuantity)
    }
  }

  const handleRemove = (breadId: number) => {
    removeFromCart(breadId)
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="font-serif text-4xl font-bold text-balance">Warenkorb</h1>
          <p className="mt-2 text-muted-foreground">Überprüfen Sie Ihre Artikel vor dem Kauf</p>
        </div>

        {cart.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <ShoppingBag className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
              <h2 className="font-serif text-2xl font-semibold mb-2">Ihr Warenkorb ist leer</h2>
              <p className="text-muted-foreground mb-6">Fügen Sie einige köstliche Brote hinzu, um zu beginnen</p>
              <Button asChild>
                <Link href="/">Zum Marktplatz</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4">
              {cart.map((item) => (
                <Card key={item.breadId}>
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                        <img
                          src={item.image || "/placeholder.svg"}
                          alt={item.breadName}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="flex flex-1 flex-col justify-between">
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h3 className="font-serif text-lg font-semibold">{item.breadName}</h3>
                              <p className="text-sm text-muted-foreground">{item.baker}</p>
                            </div>
                            <div className="flex gap-2">
                              <Badge variant="secondary">{item.breadType}</Badge>
                              {item.deliveryAvailable ? (
                                <Badge className="gap-1">
                                  <Truck className="h-3 w-3" />
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="gap-1">
                                  <Store className="h-3 w-3" />
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-8 w-8 bg-transparent"
                              onClick={() => handleQuantityChange(item.breadId, item.quantity - 1)}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => handleQuantityChange(item.breadId, Number.parseInt(e.target.value) || 1)}
                              className="h-8 w-16 text-center"
                              min="1"
                            />
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-8 w-8 bg-transparent"
                              onClick={() => handleQuantityChange(item.breadId, item.quantity + 1)}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="font-serif text-lg font-bold">
                                €{(item.priceEur * item.quantity).toFixed(2)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                ₿{(item.priceBreadcoin * item.quantity).toFixed(3)} BC
                              </p>
                            </div>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-destructive hover:bg-destructive/10"
                              onClick={() => handleRemove(item.breadId)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="lg:col-span-1 space-y-4">
              {!user && (
                <Card className="border-primary/50">
                  <CardHeader>
                    <CardTitle className="font-serif text-lg">Vor dem Checkout</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground text-pretty">
                      Möchten Sie ein Konto erstellen oder als Gast fortfahren?
                    </p>
                    <div className="space-y-2">
                      <AuthDialog
                        onAuthSuccess={handleAuthSuccess}
                        trigger={
                          <Button variant="default" className="w-full gap-2">
                            <UserPlus className="h-4 w-4" />
                            Konto erstellen
                          </Button>
                        }
                      />
                      <Button variant="outline" className="w-full gap-2 bg-transparent" asChild>
                        <Link href="/kasse">
                          <User className="h-4 w-4" />
                          Als Gast fortfahren
                        </Link>
                      </Button>
                    </div>
                    <div className="pt-2 border-t text-xs text-muted-foreground space-y-1">
                      <p className="font-medium">Mit einem Konto:</p>
                      <ul className="list-disc list-inside space-y-0.5 ml-2">
                        <li>Bestellhistorie verfolgen</li>
                        <li>BrotAbo verwalten</li>
                        <li>Schneller erneut bestellen</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card className="sticky top-4">
                <CardHeader>
                  <CardTitle className="font-serif">Bestellübersicht</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Artikel ({totals.itemCount})</span>
                      <span>€{totals.totalEur.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Versandkosten</span>
                      <span className="text-primary">Kostenlos</span>
                    </div>
                  </div>
                  <Separator />
                  <div className="space-y-1">
                    <div className="flex justify-between font-serif text-lg font-bold">
                      <span>Gesamt</span>
                      <span>€{totals.totalEur.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>oder in Breadcoins</span>
                      <span>₿{totals.totalBreadcoin.toFixed(3)} BC</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button className="w-full" size="lg" asChild>
                    <Link href="/kasse">Zur Kasse</Link>
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
