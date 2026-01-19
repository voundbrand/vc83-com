"use client"

import { useEffect } from "react"
import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle2, Package, Home } from "lucide-react"
import Link from "next/link"
import confetti from "canvas-confetti"

export default function ConfirmationPage() {
  useEffect(() => {
    // Trigger confetti animation
    const duration = 3000
    const end = Date.now() + duration

    const frame = () => {
      confetti({
        particleCount: 2,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ["#8B4513", "#D2691E", "#F4A460"],
      })
      confetti({
        particleCount: 2,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ["#8B4513", "#D2691E", "#F4A460"],
      })

      if (Date.now() < end) {
        requestAnimationFrame(frame)
      }
    }

    frame()
  }, [])

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto">
          <Card className="text-center border-primary/20">
            <CardContent className="pt-12 pb-12">
              <div className="mb-6 flex justify-center">
                <div className="rounded-full bg-primary/10 p-4">
                  <CheckCircle2 className="h-16 w-16 text-primary" />
                </div>
              </div>

              <h1 className="font-serif text-4xl font-bold mb-4 text-balance">Bestellung erfolgreich!</h1>
              <p className="text-lg text-muted-foreground mb-8">Vielen Dank für Ihre Bestellung bei PrivateBread.com</p>

              <div className="bg-muted rounded-lg p-6 mb-8 text-left">
                <h2 className="font-serif text-xl font-semibold mb-4">Was passiert als Nächstes?</h2>
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="rounded-full bg-primary/10 p-2 h-fit">
                      <Package className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium mb-1">Bestellung wird vorbereitet</h3>
                      <p className="text-sm text-muted-foreground">
                        Ihre Bäckerei beginnt sofort mit der Zubereitung Ihrer frischen Brote
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="rounded-full bg-primary/10 p-2 h-fit">
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium mb-1">Bestätigungs-E-Mail</h3>
                      <p className="text-sm text-muted-foreground">
                        Sie erhalten eine Bestätigung mit allen Bestelldetails
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="rounded-full bg-primary/10 p-2 h-fit">
                      <Home className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium mb-1">Lieferung oder Abholung</h3>
                      <p className="text-sm text-muted-foreground">
                        Ihr frisches Brot wird geliefert oder ist zur Abholung bereit
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button size="lg" asChild>
                  <Link href="/profil">Meine Bestellungen</Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/">Weiter einkaufen</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
