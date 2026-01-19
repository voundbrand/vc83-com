"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { SiteHeader } from "@/components/site-header"
import { getCurrentUser, type User } from "@/lib/auth"
import { getUserOrders, type Order } from "@/lib/orders"
import { getUserSubscription, cancelSubscription, type Subscription } from "@/lib/subscriptions"
import { SubscriptionDialog } from "@/components/subscription-dialog"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ShoppingBag, Clock, Mail, Calendar, Package, Sparkles } from "lucide-react"

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [showCancelDialog, setShowCancelDialog] = useState(false)

  useEffect(() => {
    const currentUser = getCurrentUser()
    if (!currentUser) {
      router.push("/")
      return
    }
    setUser(currentUser)
    setOrders(getUserOrders(currentUser.id))
    setSubscription(getUserSubscription(currentUser.id))
  }, [router])

  const refreshData = () => {
    if (user) {
      setSubscription(getUserSubscription(user.id))
    }
  }

  const handleCancelSubscription = () => {
    setShowCancelDialog(true)
  }

  const confirmCancelSubscription = () => {
    if (subscription) {
      cancelSubscription(subscription.id)
      setSubscription(null)
      setShowCancelDialog(false)
    }
  }

  if (!user) {
    return null
  }

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  const totalSpentEur = orders.reduce((sum, order) => sum + order.priceEur * order.quantity, 0)
  const totalSpentBreadcoin = orders.reduce((sum, order) => sum + order.priceBreadcoin * order.quantity, 0)

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <div className="container mx-auto px-4 py-8 md:py-12">
        <div className="mx-auto max-w-5xl space-y-8">
          {/* Profile Header */}
          <Card>
            <CardHeader>
              <div className="flex items-start gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.name} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-2xl">{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <CardTitle className="font-serif text-3xl">{user.name}</CardTitle>
                  <CardDescription className="mt-2 space-y-1">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      <span>{user.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>
                        Mitglied seit{" "}
                        {new Date(user.createdAt).toLocaleDateString("de-DE", { year: "numeric", month: "long" })}
                      </span>
                    </div>
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <ShoppingBag className="h-4 w-4" />
                    <span className="text-sm">Bestellungen</span>
                  </div>
                  <p className="mt-2 font-serif text-2xl font-bold">{orders.length}</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="text-sm">Ausgegeben (EUR)</span>
                  </div>
                  <p className="mt-2 font-serif text-2xl font-bold">€{totalSpentEur.toFixed(2)}</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="text-sm">Ausgegeben (BC)</span>
                  </div>
                  <p className="mt-2 font-serif text-2xl font-bold">₿{totalSpentBreadcoin.toFixed(3)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="font-serif text-2xl flex items-center gap-2">
                    <Sparkles className="h-6 w-6 text-primary" />
                    Mein BrotAbo
                  </CardTitle>
                  <CardDescription>Regelmäßige Brotlieferungen direkt zu Ihnen</CardDescription>
                </div>
                {!subscription && <SubscriptionDialog />}
              </div>
            </CardHeader>
            <CardContent>
              {subscription ? (
                <div className="space-y-4">
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-3">
                        <div>
                          <h3 className="font-serif text-xl font-semibold">{subscription.planName}</h3>
                          <p className="text-sm text-muted-foreground capitalize">
                            {subscription.frequency === "weekly"
                              ? "Wöchentlich"
                              : subscription.frequency === "biweekly"
                                ? "Zweiwöchentlich"
                                : "Monatlich"}
                          </p>
                        </div>
                        <div className="flex gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Preis pro Lieferung</p>
                            <p className="font-serif text-lg font-semibold">
                              €{subscription.priceEur.toFixed(2)} / ₿{subscription.priceBreadcoin.toFixed(3)}
                            </p>
                          </div>
                          <Separator orientation="vertical" className="h-12" />
                          <div>
                            <p className="text-sm text-muted-foreground">Nächste Lieferung</p>
                            <p className="font-semibold">
                              {new Date(subscription.nextDelivery).toLocaleDateString("de-DE", {
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                              })}
                            </p>
                          </div>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-2">Brotsorten im Abo:</p>
                          <div className="flex flex-wrap gap-2">
                            {subscription.breadTypes.map((type) => (
                              <Badge key={type} variant="secondary">
                                {type}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                      <Badge variant={subscription.status === "active" ? "default" : "secondary"} className="shrink-0">
                        {subscription.status === "active"
                          ? "Aktiv"
                          : subscription.status === "paused"
                            ? "Pausiert"
                            : "Gekündigt"}
                      </Badge>
                    </div>
                    {subscription.status === "active" && (
                      <div className="mt-4 flex gap-2">
                        <Button variant="outline" size="sm" onClick={handleCancelSubscription}>
                          Abo kündigen
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Package className="h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 font-serif text-lg font-semibold">Noch kein BrotAbo</h3>
                  <p className="mt-2 text-sm text-muted-foreground max-w-md">
                    Sparen Sie Zeit und Geld mit unserem BrotAbo! Erhalten Sie regelmäßig frisches, handwerkliches Brot
                    direkt zu Ihnen nach Hause.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Order History */}
          <Card>
            <CardHeader>
              <CardTitle className="font-serif text-2xl">Bestellverlauf</CardTitle>
              <CardDescription>Ihre vergangenen Brotkäufe</CardDescription>
            </CardHeader>
            <CardContent>
              {orders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <ShoppingBag className="h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 font-serif text-lg font-semibold">Noch keine Bestellungen</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Beginnen Sie mit dem Stöbern und bestellen Sie frisches Brot von lokalen Bäckern!
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((order, index) => (
                    <div key={order.id}>
                      <div className="flex gap-4">
                        <img
                          src={order.image || "/placeholder.svg"}
                          alt={order.breadName}
                          className="h-20 w-20 rounded-lg object-cover"
                        />
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-serif font-semibold">{order.breadName}</h4>
                              <p className="text-sm text-muted-foreground">
                                Von {order.baker} • {order.breadType}
                              </p>
                              <p className="mt-1 text-sm text-muted-foreground">
                                <Clock className="mr-1 inline h-3 w-3" />
                                {new Date(order.date).toLocaleDateString("de-DE", {
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                })}
                              </p>
                            </div>
                            <div className="text-right">
                              <Badge variant={order.status === "completed" ? "default" : "secondary"}>
                                {order.status === "completed"
                                  ? "Abgeschlossen"
                                  : order.status === "pending"
                                    ? "Ausstehend"
                                    : "Storniert"}
                              </Badge>
                              <p className="mt-2 text-sm">
                                <span className="font-medium">Menge:</span> {order.quantity}x
                              </p>
                              <p className="text-sm font-semibold">
                                €{(order.priceEur * order.quantity).toFixed(2)} / ₿
                                {(order.priceBreadcoin * order.quantity).toFixed(3)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                      {index < orders.length - 1 && <Separator className="mt-4" />}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Confirm Dialog for Subscription Cancellation */}
      <ConfirmDialog
        open={showCancelDialog}
        onOpenChange={setShowCancelDialog}
        onConfirm={confirmCancelSubscription}
        title="BrotAbo kündigen"
        description="Möchten Sie Ihr BrotAbo wirklich kündigen? Diese Aktion kann nicht rückgängig gemacht werden."
      />

      {/* Footer */}
      <footer className="mt-12 border-t border-border bg-muted/30 py-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            © 2025 PrivateBread.com. Unterstützung lokaler Bäcker und handwerklicher Brothersteller.
          </p>
        </div>
      </footer>
    </div>
  )
}
