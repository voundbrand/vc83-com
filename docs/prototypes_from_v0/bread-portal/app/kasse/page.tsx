"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { getCart, getCartTotal, clearCart, type CartItem } from "@/lib/cart"
import { getCurrentUser } from "@/lib/auth"
import { addOrder } from "@/lib/orders"
import { CreditCard, Wallet, Truck, Store, Bitcoin } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function CheckoutPage() {
  const [cart, setCart] = useState<CartItem[]>([])
  const [totals, setTotals] = useState({ totalEur: 0, totalBreadcoin: 0, itemCount: 0 })
  const [paymentMethod, setPaymentMethod] = useState("card")
  const [deliveryMethod, setDeliveryMethod] = useState("delivery")
  const [processing, setProcessing] = useState(false)
  const [isGuest, setIsGuest] = useState(false)
  const [email, setEmail] = useState("")
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    const currentCart = getCart()
    if (currentCart.length === 0) {
      router.push("/warenkorb")
      return
    }

    const user = getCurrentUser()
    setIsGuest(!user)

    setCart(currentCart)
    setTotals(getCartTotal())
  }, [router])

  const handleCheckout = async () => {
    if (isGuest && !email) {
      toast({
        title: "E-Mail erforderlich",
        description: "Bitte geben Sie Ihre E-Mail-Adresse ein",
        variant: "destructive",
      })
      return
    }

    setProcessing(true)

    await new Promise((resolve) => setTimeout(resolve, 1500))

    const user = getCurrentUser()

    if (user) {
      cart.forEach((item) => {
        addOrder({
          userId: user.id,
          breadName: item.breadName,
          breadType: item.breadType,
          baker: item.baker,
          quantity: item.quantity,
          priceEur: item.priceEur,
          priceBreadcoin: item.priceBreadcoin,
          image: item.image,
        })
      })
    }

    clearCart()

    router.push("/bestatigung")
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="font-serif text-4xl font-bold text-balance">Kasse</h1>
          <p className="mt-2 text-muted-foreground">Schließen Sie Ihre Bestellung ab</p>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {isGuest && (
              <Card>
                <CardHeader>
                  <CardTitle className="font-serif">Kontaktinformationen</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">E-Mail-Adresse *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="ihre@email.de"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                    <p className="text-xs text-muted-foreground">Wir senden Ihre Bestellbestätigung an diese Adresse</p>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="font-serif">Liefermethode</CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup value={deliveryMethod} onValueChange={setDeliveryMethod}>
                  <div className="flex items-center space-x-3 rounded-lg border p-4 cursor-pointer hover:bg-muted/50">
                    <RadioGroupItem value="delivery" id="delivery" />
                    <Label htmlFor="delivery" className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <Truck className="h-5 w-5 text-primary" />
                        <div>
                          <p className="font-medium">Lieferung nach Hause</p>
                          <p className="text-sm text-muted-foreground">Kostenlose Lieferung in 2-3 Tagen</p>
                        </div>
                      </div>
                    </Label>
                    <span className="font-semibold text-primary">Kostenlos</span>
                  </div>
                  <div className="flex items-center space-x-3 rounded-lg border p-4 cursor-pointer hover:bg-muted/50">
                    <RadioGroupItem value="pickup" id="pickup" />
                    <Label htmlFor="pickup" className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <Store className="h-5 w-5 text-primary" />
                        <div>
                          <p className="font-medium">Abholung in der Bäckerei</p>
                          <p className="text-sm text-muted-foreground">Bereit in 1-2 Stunden</p>
                        </div>
                      </div>
                    </Label>
                    <span className="font-semibold text-primary">Kostenlos</span>
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>

            {deliveryMethod === "delivery" && (
              <Card>
                <CardHeader>
                  <CardTitle className="font-serif">Lieferadresse</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">Vorname</Label>
                      <Input id="firstName" placeholder="Max" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Nachname</Label>
                      <Input id="lastName" placeholder="Mustermann" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="street">Straße und Hausnummer</Label>
                    <Input id="street" placeholder="Musterstraße 123" />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="city">Stadt</Label>
                      <Input id="city" placeholder="Berlin" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="zip">PLZ</Label>
                      <Input id="zip" placeholder="10115" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="font-serif">Zahlungsmethode</CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                  <div className="flex items-center space-x-3 rounded-lg border p-4 cursor-pointer hover:bg-muted/50">
                    <RadioGroupItem value="card" id="card" />
                    <Label htmlFor="card" className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5 text-primary" />
                        <div>
                          <p className="font-medium">Kreditkarte</p>
                          <p className="text-sm text-muted-foreground">Visa, Mastercard, Amex</p>
                        </div>
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3 rounded-lg border p-4 cursor-pointer hover:bg-muted/50">
                    <RadioGroupItem value="breadcoin" id="breadcoin" />
                    <Label htmlFor="breadcoin" className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <Bitcoin className="h-5 w-5 text-primary" />
                        <div>
                          <p className="font-medium">Breadcoin</p>
                          <p className="text-sm text-muted-foreground">Pay with cryptocurrency</p>
                        </div>
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3 rounded-lg border p-4 cursor-pointer hover:bg-muted/50">
                    <RadioGroupItem value="paypal" id="paypal" />
                    <Label htmlFor="paypal" className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <Wallet className="h-5 w-5 text-primary" />
                        <div>
                          <p className="font-medium">PayPal</p>
                          <p className="text-sm text-muted-foreground">Schnelle und sichere Zahlung</p>
                        </div>
                      </div>
                    </Label>
                  </div>
                </RadioGroup>

                {paymentMethod === "card" && (
                  <div className="mt-6 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="cardNumber">Kartennummer</Label>
                      <Input id="cardNumber" placeholder="1234 5678 9012 3456" />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="expiry">Ablaufdatum</Label>
                        <Input id="expiry" placeholder="MM/JJ" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cvc">CVC</Label>
                        <Input id="cvc" placeholder="123" />
                      </div>
                    </div>
                  </div>
                )}

                {paymentMethod === "breadcoin" && (
                  <div className="mt-6 space-y-4">
                    <div className="rounded-lg bg-muted p-4">
                      <p className="text-sm text-muted-foreground mb-2">Senden Sie</p>
                      <p className="font-mono text-lg font-bold">₿{totals.totalBreadcoin.toFixed(3)} BC</p>
                      <p className="text-sm text-muted-foreground mt-2">An Wallet-Adresse:</p>
                      <p className="font-mono text-xs break-all">bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle className="font-serif">Bestellübersicht</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {cart.map((item) => (
                    <div key={item.breadId} className="flex gap-3">
                      <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                        <img
                          src={item.image || "/placeholder.svg"}
                          alt={item.breadName}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm line-clamp-1">{item.breadName}</p>
                        <p className="text-xs text-muted-foreground">Menge: {item.quantity}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {item.breadType}
                          </Badge>
                          {item.deliveryAvailable ? (
                            <Truck className="h-3 w-3 text-muted-foreground" />
                          ) : (
                            <Store className="h-3 w-3 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-sm">€{(item.priceEur * item.quantity).toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <Separator />
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Zwischensumme</span>
                    <span>€{totals.totalEur.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Versandkosten</span>
                    <span className="text-primary">Kostenlos</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Steuern (inkl. 19% MwSt)</span>
                    <span>€{(totals.totalEur * 0.19).toFixed(2)}</span>
                  </div>
                </div>
                <Separator />
                <div className="space-y-1">
                  <div className="flex justify-between font-serif text-lg font-bold">
                    <span>Gesamt</span>
                    <span>€{totals.totalEur.toFixed(2)}</span>
                  </div>
                  {paymentMethod === "breadcoin" && (
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>oder</span>
                      <span>₿{totals.totalBreadcoin.toFixed(3)} BC</span>
                    </div>
                  )}
                </div>
                <Button className="w-full" size="lg" onClick={handleCheckout} disabled={processing}>
                  {processing ? "Wird bearbeitet..." : "Jetzt kaufen"}
                </Button>
                <p className="text-xs text-center text-muted-foreground">Mit dem Kauf stimmen Sie unseren AGB zu</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
