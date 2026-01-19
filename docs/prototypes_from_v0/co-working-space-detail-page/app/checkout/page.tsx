"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { useBooking } from "@/lib/booking-context"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Calendar, MapPin, Clock, CreditCard, Lock } from "lucide-react"
import { format } from "date-fns"
import Image from "next/image"
import { AuthModal } from "@/components/auth-modal"

export default function CheckoutPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { bookingDetails, calculateTotal } = useBooking()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  // Payment form state
  const [cardNumber, setCardNumber] = useState("")
  const [cardName, setCardName] = useState("")
  const [expiryDate, setExpiryDate] = useState("")
  const [cvv, setCvv] = useState("")

  useEffect(() => {
    // Redirect if no workspace selected
    if (!bookingDetails.workspace) {
      router.push("/floor-plan")
    }
  }, [bookingDetails.workspace, router])

  if (!bookingDetails.workspace) {
    return null
  }

  const total = calculateTotal()
  const serviceFee = total * 0.1
  const finalTotal = total + serviceFee

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsProcessing(true)

    // Simulate payment processing
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Redirect to confirmation
    router.push("/booking-confirmation")
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8 md:py-12">
        <div className="max-w-6xl mx-auto">
          <h1 className="font-serif text-3xl md:text-4xl font-bold mb-2">Confirm and pay</h1>
          <p className="text-muted-foreground mb-8">Review your booking details and complete your reservation</p>

          <div className="grid lg:grid-cols-[1fr_400px] gap-8">
            {/* Left Column - Forms */}
            <div className="space-y-6">
              {/* User Info Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Your Information</span>
                    {!user && (
                      <Button variant="link" onClick={() => setShowAuthModal(true)} className="text-primary">
                        Sign in for faster checkout
                      </Button>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {user ? (
                    <div className="space-y-2">
                      <div>
                        <Label>Name</Label>
                        <p className="text-lg">{user.name}</p>
                      </div>
                      <div>
                        <Label>Email</Label>
                        <p className="text-lg">{user.email}</p>
                      </div>
                      {user.isGuest && (
                        <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
                          You're checking out as a guest. Sign up to save your bookings and access member benefits.
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input id="name" placeholder="John Doe" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" placeholder="you@example.com" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input id="phone" type="tel" placeholder="+1 (555) 000-0000" />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Payment Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Payment Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="cardNumber">Card Number</Label>
                      <Input
                        id="cardNumber"
                        placeholder="1234 5678 9012 3456"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        maxLength={19}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cardName">Name on Card</Label>
                      <Input
                        id="cardName"
                        placeholder="John Doe"
                        value={cardName}
                        onChange={(e) => setCardName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="expiry">Expiry Date</Label>
                        <Input
                          id="expiry"
                          placeholder="MM/YY"
                          value={expiryDate}
                          onChange={(e) => setExpiryDate(e.target.value)}
                          maxLength={5}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cvv">CVV</Label>
                        <Input
                          id="cvv"
                          placeholder="123"
                          value={cvv}
                          onChange={(e) => setCvv(e.target.value)}
                          maxLength={4}
                          type="password"
                          required
                        />
                      </div>
                    </div>

                    <div className="flex items-start gap-2 p-4 bg-muted/50 rounded-lg">
                      <Lock className="h-4 w-4 mt-0.5 text-primary" />
                      <p className="text-sm text-muted-foreground">
                        Your payment information is encrypted and secure. We never store your card details.
                      </p>
                    </div>

                    <Button type="submit" className="w-full" size="lg" disabled={isProcessing}>
                      {isProcessing ? "Processing..." : `Confirm and Pay $${finalTotal.toFixed(2)}`}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Booking Summary */}
            <div className="lg:sticky lg:top-24 h-fit">
              <Card>
                <CardHeader>
                  <CardTitle>Booking Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Workspace Image and Details */}
                  <div className="relative aspect-video rounded-lg overflow-hidden">
                    <Image
                      src={bookingDetails.workspace.image || "/placeholder.svg"}
                      alt={bookingDetails.workspace.name}
                      fill
                      className="object-cover"
                    />
                  </div>

                  <div>
                    <h3 className="font-semibold text-lg">{bookingDetails.workspace.name}</h3>
                    <p className="text-sm text-muted-foreground">{bookingDetails.workspace.type}</p>
                  </div>

                  <Separator />

                  {/* Booking Details */}
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <Calendar className="h-4 w-4 mt-1 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Dates</p>
                        <p className="text-sm text-muted-foreground">
                          {bookingDetails.checkInDate && format(bookingDetails.checkInDate, "MMM dd, yyyy")}
                          {bookingDetails.checkOutDate && ` - ${format(bookingDetails.checkOutDate, "MMM dd, yyyy")}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Clock className="h-4 w-4 mt-1 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Booking Type</p>
                        <p className="text-sm text-muted-foreground capitalize">
                          {bookingDetails.bookingType}
                          {bookingDetails.hours && ` (${bookingDetails.hours} hours)`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <MapPin className="h-4 w-4 mt-1 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Location</p>
                        <p className="text-sm text-muted-foreground">Traditional Marketplace House</p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Price Breakdown */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>
                        {bookingDetails.bookingType === "hourly"
                          ? `${bookingDetails.workspace.hourlyRate} x ${bookingDetails.hours} hours`
                          : `$${bookingDetails.workspace.dailyRate} x ${
                              bookingDetails.checkOutDate && bookingDetails.checkInDate
                                ? Math.ceil(
                                    (bookingDetails.checkOutDate.getTime() - bookingDetails.checkInDate.getTime()) /
                                      (1000 * 60 * 60 * 24),
                                  )
                                : 1
                            } days`}
                      </span>
                      <span>${total.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Service fee</span>
                      <span>${serviceFee.toFixed(2)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-semibold text-lg">
                      <span>Total</span>
                      <span>${finalTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <AuthModal open={showAuthModal} onOpenChange={setShowAuthModal} />
    </div>
  )
}
