"use client"

import type React from "react"

import { useSearchParams } from "next/navigation"
import { useState, Suspense } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { format } from "date-fns"
import { de } from "date-fns/locale"
import { Calendar, Users, CheckCircle2 } from "lucide-react"

function BookingForm() {
  const searchParams = useSearchParams()
  const [submitted, setSubmitted] = useState(false)
  const [breakfast, setBreakfast] = useState(false)

  const room = searchParams.get("room") || ""
  const checkInStr = searchParams.get("checkIn")
  const checkOutStr = searchParams.get("checkOut")
  const guests = searchParams.get("guests") || "2"
  const basePrice = Number.parseInt(searchParams.get("price") || "0")

  const checkIn = checkInStr ? new Date(checkInStr) : null
  const checkOut = checkOutStr ? new Date(checkOutStr) : null

  const nights = checkIn && checkOut ? Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)) : 0

  const breakfastPrice = breakfast ? Number.parseInt(guests) * 12 * nights : 0
  const totalPrice = basePrice + breakfastPrice

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Here you would normally send the booking data to your backend
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="min-h-screen pt-20 px-4 py-16">
        <div className="max-w-2xl mx-auto text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-accent/20 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-accent" />
          </div>
          <h1 className="font-serif text-4xl mb-4 text-primary">Vielen Dank für Ihre Anfrage!</h1>
          <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
            Wir haben Ihre Buchungsanfrage erhalten und werden uns innerhalb von 24 Stunden bei Ihnen melden, um die
            Buchung zu bestätigen.
          </p>
          <p className="text-muted-foreground mb-8">
            Sie erhalten in Kürze eine Bestätigungs-E-Mail mit allen Details Ihrer Buchung.
          </p>
          <Button asChild className="bg-primary hover:bg-primary-hover text-white">
            <a href="/">Zurück zur Startseite</a>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-20 px-4 py-12">
      <div className="max-w-5xl mx-auto">
        <h1 className="font-serif text-4xl md:text-5xl mb-8 text-primary text-center">Buchungsanfrage</h1>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Booking Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Ihre Daten</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">Vorname *</Label>
                      <Input id="firstName" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Nachname *</Label>
                      <Input id="lastName" required />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">E-Mail *</Label>
                    <Input id="email" type="email" required />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefon *</Label>
                    <Input id="phone" type="tel" required />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Adresse</Label>
                    <Input id="address" />
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="zip">PLZ</Label>
                      <Input id="zip" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="city">Stadt</Label>
                      <Input id="city" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">Besondere Wünsche oder Anmerkungen</Label>
                    <Textarea id="message" placeholder="z.B. Ankunftszeit, besondere Anforderungen..." rows={4} />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="breakfast"
                      checked={breakfast}
                      onCheckedChange={(checked) => setBreakfast(checked as boolean)}
                    />
                    <label
                      htmlFor="breakfast"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Frühstück hinzufügen (12€ pro Person/Tag)
                    </label>
                  </div>

                  <div className="flex items-start space-x-2">
                    <Checkbox id="terms" required />
                    <label
                      htmlFor="terms"
                      className="text-sm leading-relaxed peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Ich akzeptiere die Stornierungsbedingungen und Datenschutzbestimmungen *
                    </label>
                  </div>

                  <Button type="submit" size="lg" className="w-full bg-primary hover:bg-primary-hover text-white">
                    Buchungsanfrage senden
                  </Button>

                  <p className="text-xs text-center text-muted-foreground">* Pflichtfelder</p>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Booking Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle>Buchungsübersicht</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">{room}</h3>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-3">
                    <Calendar className="w-4 h-4 mt-0.5 text-muted-foreground" />
                    <div>
                      <div className="font-medium">Check-in</div>
                      <div className="text-muted-foreground">
                        {checkIn ? format(checkIn, "PPP", { locale: de }) : "-"}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Calendar className="w-4 h-4 mt-0.5 text-muted-foreground" />
                    <div>
                      <div className="font-medium">Check-out</div>
                      <div className="text-muted-foreground">
                        {checkOut ? format(checkOut, "PPP", { locale: de }) : "-"}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Users className="w-4 h-4 mt-0.5 text-muted-foreground" />
                    <div>
                      <div className="font-medium">Gäste</div>
                      <div className="text-muted-foreground">
                        {guests} {Number.parseInt(guests) === 1 ? "Person" : "Personen"}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-border space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>
                      {nights} {nights === 1 ? "Nacht" : "Nächte"}
                    </span>
                    <span>€{basePrice}</span>
                  </div>
                  {breakfast && (
                    <div className="flex justify-between text-sm">
                      <span>Frühstück</span>
                      <span>€{breakfastPrice}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold text-lg pt-2 border-t border-border">
                    <span>Gesamt</span>
                    <span className="text-primary">€{totalPrice}</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-border text-xs text-muted-foreground space-y-2">
                  <p>✓ Kostenlose Stornierung bis 7 Tage vor Anreise</p>
                  <p>✓ Keine Vorauszahlung erforderlich</p>
                  <p>✓ Zahlung vor Ort möglich</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function BuchenPage() {
  return (
    <Suspense fallback={<div className="min-h-screen pt-20 px-4 py-16 text-center">Lädt...</div>}>
      <BookingForm />
    </Suspense>
  )
}
